import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { OpenAIService } from './openai.service';

export interface EmbeddingResult {
  productId: string;
  similarity: number;
  normalizedProduct: NormalizedProduct;
}

export interface StoreEmbeddingSearchOptions {
  queryText: string;
  merchant: string;
  similarityThreshold?: number;
  limit?: number;
  includeDiscounts?: boolean;
  includeAdjustments?: boolean;
}

interface SimilarityQueryRawResult {
  similarity: string | number;
}

@Injectable()
export class VectorEmbeddingService {
  private readonly logger = new Logger(VectorEmbeddingService.name);

  // In-memory cache for recent embedding lookups to avoid duplicate API calls
  private readonly embeddingCache = new Map<
    string,
    { embedding: number[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Prevent memory bloat

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    private readonly openAIService: OpenAIService,
  ) {}

  /**
   * Generate vector embedding for text using OpenAI with caching
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = `${text.toLowerCase().trim()}`;
    const now = Date.now();

    // Check cache first
    const cached = this.embeddingCache.get(cacheKey);
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.embedding;
    }

    try {
      // Check if OpenAI is configured, fall back to simple embedding if not
      if (!this.openAIService.isConfigured()) {
        this.logger.warn(
          'OpenAI not configured, using fallback embedding generation',
        );
        return this.generateFallbackEmbedding(text);
      }

      const result = await this.openAIService.generateEmbedding({
        text,
        model: 'text-embedding-3-small',
      });

      // Cache the result
      this.cacheEmbedding(cacheKey, result.embedding, now);

      return result.embedding;
    } catch (error) {
      this.logger.error(
        `Failed to generate OpenAI embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Fall back to simple embedding on error
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Cache an embedding with LRU-style cleanup
   */
  private cacheEmbedding(
    key: string,
    embedding: number[],
    timestamp: number,
  ): void {
    // Clean up expired entries and enforce size limit
    if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.embeddingCache.entries());
      // Remove oldest 20% of entries
      const toRemove = Math.floor(entries.length * 0.2);
      entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, toRemove)
        .forEach(([key]) => this.embeddingCache.delete(key));
    }

    this.embeddingCache.set(key, { embedding, timestamp });
  }

  /**
   * Fallback embedding generation using simple bag-of-words
   * Used when OpenAI is not available
   */
  private generateFallbackEmbedding(text: string): number[] {
    const cleanText = text.toLowerCase().trim();
    const words = cleanText.split(/\s+/);

    // Create a simple bag-of-words vector with common food/product terms
    const vocabulary = this.getProductVocabulary();
    const vector = new Array(vocabulary.length).fill(0) as number[];

    words.forEach((word) => {
      const index = vocabulary.indexOf(word);
      if (index !== -1) {
        vector[index] += 1;
      }
    });

    // Normalize the vector
    const magnitude = Math.sqrt(
      vector.reduce((sum: number, val: number) => sum + val * val, 0),
    );
    if (magnitude > 0) {
      return vector.map((val: number) => val / magnitude);
    }

    // Pad to 1536 dimensions to match OpenAI embedding size
    const paddedVector = [...vector];
    while (paddedVector.length < 1536) {
      paddedVector.push(0);
    }
    return paddedVector.slice(0, 1536);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find similar products using pgvector similarity search
   */
  async findSimilarProducts(
    queryText: string,
    merchant: string,
    threshold = 0.7,
    limit = 10,
  ): Promise<EmbeddingResult[]> {
    this.logger.debug(`Finding similar products for: ${queryText}`);

    // Generate embedding for query text
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Using pgvector's cosine similarity operator <=>
    // Note: 1 - (embedding <=> query) gives us cosine similarity (0 to 1)
    // where 1 is most similar and 0 is least similar
    // Optimized query with minimal field selection for performance
    const results = await this.normalizedProductRepository
      .createQueryBuilder('np')
      .select([
        'np.normalizedProductSk',
        'np.normalizedName',
        'np.brand',
        'np.category',
        'np.confidenceScore',
        'np.isDiscount',
        'np.isAdjustment',
        'np.matchCount',
      ])
      .addSelect(`1 - (np.embedding <=> :queryEmbedding::vector)`, 'similarity')
      .where('np.merchant = :merchant', { merchant })
      .andWhere('np.embedding IS NOT NULL')
      .andWhere('np.isDiscount = false') // Early filter for performance
      .andWhere('np.isAdjustment = false') // Early filter for performance
      .andWhere(`1 - (np.embedding <=> :queryEmbedding::vector) >= :threshold`)
      .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
      .setParameter('threshold', threshold)
      .orderBy('similarity', 'DESC')
      .limit(limit)
      .getRawAndEntities();

    return results.entities.map((entity, index) => ({
      productId: entity.normalizedProductSk,
      similarity: (results.raw[index] as { similarity: number }).similarity,
      normalizedProduct: {
        ...entity,
        // Add back missing fields that might be needed downstream
        rawName: entity.normalizedName, // Use normalized name as fallback
        merchant: merchant,
        itemCode: undefined,
        embedding: undefined,
        lastMatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));
  }

  /**
   * Batch version of findSimilarProductsEnhanced for processing multiple queries at once
   * Much faster than individual calls due to batch embedding generation and query optimization
   */
  async batchFindSimilarProducts(
    queries: { queryText: string; options: StoreEmbeddingSearchOptions }[],
  ): Promise<EmbeddingResult[][]> {
    if (queries.length === 0) {
      return [];
    }

    const batchStartTime = performance.now();
    this.logger.debug(
      `Starting batch similarity search for ${queries.length} queries`,
    );

    try {
      // Extract unique query texts for batch embedding generation
      const embeddingStartTime = performance.now();
      const uniqueTexts = [...new Set(queries.map((q) => q.queryText))];

      // Check cache for existing embeddings
      const now = Date.now();
      const uncachedTexts: string[] = [];
      const cachedEmbeddings = new Map<string, number[]>();

      for (const text of uniqueTexts) {
        const cacheKey = `${text.toLowerCase().trim()}`;
        const cached = this.embeddingCache.get(cacheKey);
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
          cachedEmbeddings.set(text, cached.embedding);
        } else {
          uncachedTexts.push(text);
        }
      }

      this.logger.debug(
        `Processing ${uniqueTexts.length} unique texts from ${queries.length} queries (${cachedEmbeddings.size} cached, ${uncachedTexts.length} new)`,
      );

      // Generate embeddings only for uncached texts
      let embeddingResponses: { embedding: number[] }[] = [];
      if (uncachedTexts.length > 0) {
        embeddingResponses = await this.openAIService.generateBatchEmbeddings(
          uncachedTexts,
          'text-embedding-3-small',
        );

        // Cache new embeddings
        uncachedTexts.forEach((text, index) => {
          const cacheKey = `${text.toLowerCase().trim()}`;
          const embeddingResponse = embeddingResponses[index];
          if (embeddingResponse?.embedding) {
            this.cacheEmbedding(cacheKey, embeddingResponse.embedding, now);
          }
        });
      }

      const embeddingDuration = performance.now() - embeddingStartTime;
      this.logger.debug(
        `Batch embedding generation: ${embeddingDuration.toFixed(1)}ms (${uncachedTexts.length} API calls, ${cachedEmbeddings.size} cached)`,
      );

      // Create a map from text to embedding (combining cached and new)
      const embeddingMap = new Map<string, number[]>();

      // Add cached embeddings
      cachedEmbeddings.forEach((embedding, text) => {
        embeddingMap.set(text, embedding);
      });

      // Add newly generated embeddings
      uncachedTexts.forEach((text, index) => {
        const embeddingResponse = embeddingResponses[index];
        if (embeddingResponse?.embedding) {
          embeddingMap.set(text, embeddingResponse.embedding);
        }
      });

      // Process each query using the pre-generated embeddings
      const queryStartTime = performance.now();
      const results = await Promise.all(
        queries.map(async ({ queryText, options }) => {
          const queryEmbedding = embeddingMap.get(queryText);
          if (!queryEmbedding) {
            return [];
          }

          return await this.findSimilarProductsWithEmbedding(
            queryEmbedding,
            options,
          );
        }),
      );
      const queryDuration = performance.now() - queryStartTime;
      this.logger.debug(`Database queries: ${queryDuration.toFixed(1)}ms`);

      const totalDuration = performance.now() - batchStartTime;
      const hitRate =
        (results.filter((r) => r.length > 0).length /
          Math.max(results.length, 1)) *
        100;
      this.logger.debug(
        `Batch complete: ${totalDuration.toFixed(1)}ms (${hitRate.toFixed(1)}% hit rate)`,
      );

      return results;
    } catch (error) {
      this.logger.error('Batch similarity search failed', error);
      // Fallback to individual calls if batch fails
      const fallbackStartTime = performance.now();
      const fallbackResults = await Promise.all(
        queries.map(({ options }) => this.findSimilarProductsEnhanced(options)),
      );
      const fallbackDuration = performance.now() - fallbackStartTime;
      this.logger.warn(`Fallback processing: ${fallbackDuration.toFixed(1)}ms`);
      return fallbackResults;
    }
  }

  /**
   * Internal method to search using pre-generated embedding
   */
  private async findSimilarProductsWithEmbedding(
    queryEmbedding: number[],
    options: StoreEmbeddingSearchOptions,
  ): Promise<EmbeddingResult[]> {
    const {
      merchant,
      similarityThreshold = 0.8,
      limit = 5,
      includeDiscounts = false,
      includeAdjustments = false,
    } = options;

    // Build optimized query with performance-focused field selection
    let query = this.normalizedProductRepository
      .createQueryBuilder('np')
      .select([
        'np.normalizedProductSk',
        'np.normalizedName',
        'np.brand',
        'np.category',
        'np.confidenceScore',
        'np.isDiscount',
        'np.isAdjustment',
        'np.matchCount',
      ])
      .addSelect(`1 - (np.embedding <=> :queryEmbedding::vector)`, 'similarity')
      .where('np.merchant = :merchant', { merchant })
      .andWhere('np.embedding IS NOT NULL')
      .andWhere(
        `1 - (np.embedding <=> :queryEmbedding::vector) >= :threshold`,
        {
          queryEmbedding: `[${queryEmbedding.join(',')}]`,
          threshold: similarityThreshold,
        },
      )
      .orderBy('similarity', 'DESC')
      .limit(limit);

    // Apply filters
    if (!includeDiscounts) {
      query = query.andWhere('np.isDiscount = false');
    }

    if (!includeAdjustments) {
      query = query.andWhere('np.isAdjustment = false');
    }

    const results = await query.getRawAndEntities();

    return results.entities.map((entity, index) => {
      const rawResult = results.raw[index] as SimilarityQueryRawResult;
      const similarityValue = rawResult?.similarity
        ? String(rawResult.similarity)
        : '0';

      return {
        productId: entity.normalizedProductSk,
        similarity: parseFloat(similarityValue),
        normalizedProduct: entity,
      };
    });
  }

  /**
   * Enhanced similar product search with more options
   */
  async findSimilarProductsEnhanced(
    options: StoreEmbeddingSearchOptions,
  ): Promise<EmbeddingResult[]> {
    const {
      queryText,
      merchant,
      similarityThreshold = 0.85, // Higher threshold for production use
      limit = 5,
      includeDiscounts = false,
      includeAdjustments = false,
    } = options;

    this.logger.debug(
      `Finding similar products for: ${queryText} at ${merchant}`,
    );

    // Generate embedding for query text
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Build optimized query with minimal field selection for performance
    let query = this.normalizedProductRepository
      .createQueryBuilder('np')
      .select([
        'np.normalizedProductSk',
        'np.normalizedName',
        'np.brand',
        'np.category',
        'np.confidenceScore',
        'np.isDiscount',
        'np.isAdjustment',
        'np.matchCount',
      ])
      .addSelect(`1 - (np.embedding <=> :queryEmbedding::vector)`, 'similarity')
      .where('np.merchant = :merchant', { merchant })
      .andWhere('np.embedding IS NOT NULL')
      .andWhere(`1 - (np.embedding <=> :queryEmbedding::vector) >= :threshold`)
      .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
      .setParameter('threshold', similarityThreshold);

    // Filter out discounts and adjustments unless specifically requested
    if (!includeDiscounts) {
      query = query.andWhere('np.isDiscount = false');
    }
    if (!includeAdjustments) {
      query = query.andWhere('np.isAdjustment = false');
    }

    // Order by similarity first for optimal performance
    // Secondary ordering by match count and confidence for tie-breaking
    query = query
      .orderBy('similarity', 'DESC')
      .addOrderBy('np.matchCount', 'DESC')
      .addOrderBy('np.confidenceScore', 'DESC')
      .limit(limit);

    const results = await query.getRawAndEntities();

    return results.entities.map((entity, index) => {
      const rawResult = results.raw[index] as SimilarityQueryRawResult;
      const similarityValue = rawResult?.similarity
        ? String(rawResult.similarity)
        : '0';

      return {
        productId: entity.normalizedProductSk,
        similarity: parseFloat(similarityValue),
        normalizedProduct: entity,
      };
    });
  }

  /**
   * Update embedding for a normalized product
   */
  async updateProductEmbedding(
    normalizedProduct: NormalizedProduct,
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(
        normalizedProduct.normalizedName,
      );
      normalizedProduct.embedding = embedding;
      await this.normalizedProductRepository.save(normalizedProduct);

      this.logger.debug(
        `Updated embedding for product: ${normalizedProduct.normalizedName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update embedding for product ${normalizedProduct.normalizedProductSk}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Batch update embeddings for products without them
   */
  async batchUpdateEmbeddings(batchSize = 50): Promise<number> {
    const productsWithoutEmbeddings =
      await this.normalizedProductRepository.find({
        where: { embedding: IsNull() },
        take: batchSize,
      });

    if (productsWithoutEmbeddings.length === 0) {
      this.logger.log('No products found without embeddings');
      return 0;
    }

    let updatedCount = 0;

    // Check if OpenAI is configured for batch processing
    if (this.openAIService.isConfigured()) {
      try {
        // Process in smaller batches for OpenAI API limits
        const batchChunkSize = 10;
        for (
          let i = 0;
          i < productsWithoutEmbeddings.length;
          i += batchChunkSize
        ) {
          const batch = productsWithoutEmbeddings.slice(i, i + batchChunkSize);
          const texts = batch.map((p) => p.normalizedName);

          const embeddings =
            await this.openAIService.generateBatchEmbeddings(texts);

          // Update products with embeddings
          for (let j = 0; j < batch.length; j++) {
            batch[j].embedding = embeddings[j].embedding;
            await this.normalizedProductRepository.save(batch[j]);
            updatedCount++;
          }

          this.logger.debug(`Processed batch ${i / batchChunkSize + 1}`);
        }
      } catch (error) {
        this.logger.error(
          `Batch embedding generation failed: ${(error as Error).message}`,
        );
        // Fall back to individual processing on error
      }
    }

    // Process remaining products individually or if batch processing failed
    const remainingProducts = productsWithoutEmbeddings.slice(updatedCount);
    for (const product of remainingProducts) {
      try {
        await this.updateProductEmbedding(product);
        updatedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to update embedding for product ${product.normalizedProductSk}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Updated embeddings for ${updatedCount} products`);
    return updatedCount;
  }

  /**
   * Find products with outdated embeddings (created before embedding was added)
   */
  async findProductsNeedingEmbeddings(
    limit = 100,
  ): Promise<NormalizedProduct[]> {
    return await this.normalizedProductRepository.find({
      where: { embedding: IsNull() },
      order: { matchCount: 'DESC', confidenceScore: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get basic product vocabulary for simple embedding generation
   * In production, this would be replaced by a proper embedding model
   */
  private getProductVocabulary(): string[] {
    return [
      // Common food categories
      'organic',
      'fresh',
      'frozen',
      'canned',
      'dried',
      'natural',
      'whole',
      'raw',
      'cooked',
      'baked',

      // Dairy
      'milk',
      'cheese',
      'yogurt',
      'butter',
      'cream',
      'lactose',
      'dairy',
      'cottage',
      'cheddar',
      'mozzarella',

      // Produce
      'apple',
      'banana',
      'orange',
      'grape',
      'berry',
      'lettuce',
      'tomato',
      'onion',
      'potato',
      'carrot',
      'broccoli',
      'spinach',
      'cucumber',
      'pepper',

      // Meat
      'chicken',
      'beef',
      'pork',
      'turkey',
      'fish',
      'salmon',
      'tuna',
      'ground',
      'breast',
      'thigh',

      // Bakery
      'bread',
      'bagel',
      'muffin',
      'cake',
      'cookie',
      'wheat',
      'white',
      'grain',
      'sourdough',

      // Beverages
      'soda',
      'juice',
      'water',
      'coffee',
      'tea',
      'beer',
      'wine',
      'cola',
      'pepsi',
      'sprite',

      // Brands (common ones)
      'coca',
      'pepsi',
      'kraft',
      'heinz',
      'campbell',
      'tide',
      'downy',
      'apple',
      'samsung',
      'google',

      // Sizes/Quantities
      'oz',
      'lb',
      'gallon',
      'quart',
      'pint',
      'cup',
      'large',
      'medium',
      'small',
      'pack',
      'box',

      // Package types
      'bottle',
      'can',
      'jar',
      'bag',
      'container',
      'pack',
      'bundle',
      'case',
      'carton',
    ];
  }

  /**
   * Debug method to get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalProducts: number;
    productsWithEmbeddings: number;
    productsWithoutEmbeddings: number;
    averageEmbeddingLength: number;
  }> {
    const [total, withEmbeddings] = await Promise.all([
      this.normalizedProductRepository.count(),
      this.normalizedProductRepository.count({
        where: { embedding: Not(IsNull()) },
      }),
    ]);

    // Sample a few embeddings to get average length
    const sampleProducts = await this.normalizedProductRepository.find({
      where: { embedding: Not(IsNull()) },
      take: 10,
    });

    let totalLength = 0;
    let validEmbeddings = 0;

    for (const product of sampleProducts) {
      if (product.embedding && Array.isArray(product.embedding)) {
        totalLength += product.embedding.length;
        validEmbeddings++;
      }
    }

    const averageLength =
      validEmbeddings > 0 ? totalLength / validEmbeddings : 0;

    return {
      totalProducts: total,
      productsWithEmbeddings: withEmbeddings,
      productsWithoutEmbeddings: total - withEmbeddings,
      averageEmbeddingLength: Math.round(averageLength),
    };
  }
}
