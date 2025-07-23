import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';

export interface EmbeddingResult {
  productId: string;
  similarity: number;
  normalizedProduct: NormalizedProduct;
}

@Injectable()
export class VectorEmbeddingService {
  private readonly logger = new Logger(VectorEmbeddingService.name);

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
  ) {}

  /**
   * Generate vector embedding for text
   * This is a placeholder implementation - in production would use OpenAI embeddings API
   */
  generateEmbedding(text: string): number[] {
    // Placeholder: Simple TF-IDF-like vector for demonstration
    // In production, this would call OpenAI's text-embedding-ada-002 or similar

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

    return vector;
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
   * Find similar products using vector similarity
   */
  async findSimilarProducts(
    queryText: string,
    merchant: string,
    threshold = 0.7,
    limit = 10,
  ): Promise<EmbeddingResult[]> {
    this.logger.debug(`Finding similar products for: ${queryText}`);

    // Generate embedding for query text
    const queryEmbedding = this.generateEmbedding(queryText);

    // Get all products for the merchant that have embeddings
    const products = await this.normalizedProductRepository.find({
      where: {
        merchant,
        embedding: Not(IsNull()),
      },
      order: { confidenceScore: 'DESC', matchCount: 'DESC' },
      take: 500, // Limit for performance
    });

    const similarities: EmbeddingResult[] = [];

    for (const product of products) {
      if (!product.embedding) continue;

      try {
        // Parse stored embedding (stored as JSON string)
        const productEmbedding = JSON.parse(product.embedding) as number[];
        const similarity = this.calculateCosineSimilarity(
          queryEmbedding,
          productEmbedding,
        );

        if (similarity >= threshold) {
          similarities.push({
            productId: product.normalizedProductSk,
            similarity,
            normalizedProduct: product,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse embedding for product ${product.normalizedProductSk}: ${(error as Error).message}`,
        );
      }
    }

    // Sort by similarity score (descending) and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Update embedding for a normalized product
   */
  async updateProductEmbedding(
    normalizedProduct: NormalizedProduct,
  ): Promise<void> {
    try {
      const embedding = this.generateEmbedding(
        normalizedProduct.normalizedName,
      );
      normalizedProduct.embedding = JSON.stringify(embedding);
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

    let updatedCount = 0;

    for (const product of productsWithoutEmbeddings) {
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
      try {
        const embedding = JSON.parse(product.embedding!) as number[];
        totalLength += embedding.length;
        validEmbeddings++;
      } catch {
        // Ignore invalid embeddings
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
