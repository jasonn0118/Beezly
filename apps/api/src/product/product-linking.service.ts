import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Product } from '../entities/product.entity';
import { VectorEmbeddingService } from './vector-embedding.service';

interface DatabaseError extends Error {
  code?: string;
}

export interface ProductLinkingResult {
  success: boolean;
  linkedProductSk?: string;
  linkingConfidence: number;
  linkingMethod: string;
  reason?: string;
}

export interface ProductMatchCandidate {
  productSk: string;
  name: string;
  brand?: string;
  barcode?: string;
  score: number;
  method: string;
  originalScore?: number;
  brandCompatibilityScore?: number;
}

export interface ProductLinkingOptions {
  confidenceThreshold?: number; // Default: 0.80
  embeddingSimilarityThreshold?: number; // Default: 0.85
  forceBarcodeMatch?: boolean; // Default: true
  dryRun?: boolean; // Default: false
}

/**
 * Service for linking normalized receipt products with catalog products.
 *
 * BUSINESS RULE: Only normalized products with confidence_score >= 0.8 are eligible
 * for product linking. This ensures we only link high-quality, properly normalized
 * receipt items to our catalog products.
 */
@Injectable()
export class ProductLinkingService {
  private readonly logger = new Logger(ProductLinkingService.name);
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
  private readonly DEFAULT_EMBEDDING_SIMILARITY_THRESHOLD = 0.85;

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly vectorEmbeddingService: VectorEmbeddingService,
  ) {}

  /**
   * Link normalized products with catalog products based on confidence threshold
   */
  async linkNormalizedProducts(options: ProductLinkingOptions = {}): Promise<{
    processed: number;
    linked: number;
    skipped: number;
    errors: number;
  }> {
    const {
      confidenceThreshold = this.DEFAULT_CONFIDENCE_THRESHOLD,
      dryRun = false,
    } = options;

    this.logger.log(
      `Starting product linking with confidence threshold: ${confidenceThreshold}`,
    );

    // Get all unlinked normalized products with confidence above threshold
    const unlinkeds =
      await this.getUnlinkedNormalizedProducts(confidenceThreshold);

    let processed = 0;
    let linked = 0;
    let skipped = 0;
    let errors = 0;

    for (const normalized of unlinkeds) {
      try {
        processed++;
        const result = await this.linkSingleProduct(normalized, options);

        if (result.success && !dryRun) {
          await this.saveProductLink(normalized, result);
          linked++;
          this.logger.debug(
            `Linked normalized product ${normalized.normalizedProductSk} to ${result.linkedProductSk} using ${result.linkingMethod}`,
          );
        } else if (!result.success) {
          skipped++;
          this.logger.debug(
            `Skipped linking for ${normalized.normalizedProductSk}: ${result.reason}`,
          );
        }
      } catch (error) {
        errors++;
        this.logger.error(
          `Error linking normalized product ${normalized.normalizedProductSk}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Product linking completed. Processed: ${processed}, Linked: ${linked}, Skipped: ${skipped}, Errors: ${errors}`,
    );

    return { processed, linked, skipped, errors };
  }

  /**
   * Link a single normalized product to a catalog product
   */
  async linkSingleProduct(
    normalizedProduct: NormalizedProduct,
    options: ProductLinkingOptions = {},
  ): Promise<ProductLinkingResult> {
    const {
      embeddingSimilarityThreshold = this
        .DEFAULT_EMBEDDING_SIMILARITY_THRESHOLD,
      // forceBarcodeMatch = true, // Not used in current implementation
    } = options;

    // Skip if already linked
    if (normalizedProduct.linkedProductSk) {
      return {
        success: false,
        linkingConfidence: 0,
        linkingMethod: 'already_linked',
        reason: 'Product already linked',
      };
    }

    // Get all potential matches
    const candidates = await this.findProductCandidates(normalizedProduct);

    if (candidates.length === 0) {
      return {
        success: false,
        linkingConfidence: 0,
        linkingMethod: 'no_candidates',
        reason: 'No matching product candidates found',
      };
    }

    // Apply matching hierarchy
    const bestMatch = this.selectBestMatch(
      candidates,
      embeddingSimilarityThreshold,
      normalizedProduct,
    );

    if (!bestMatch) {
      return {
        success: false,
        linkingConfidence: 0,
        linkingMethod: 'no_match',
        reason: 'No candidates met matching criteria',
      };
    }

    return {
      success: true,
      linkedProductSk: bestMatch.productSk,
      linkingConfidence: bestMatch.score,
      linkingMethod: bestMatch.method,
    };
  }

  /**
   * Get unlinked normalized products above confidence threshold
   */
  private async getUnlinkedNormalizedProducts(
    confidenceThreshold: number,
  ): Promise<NormalizedProduct[]> {
    return this.normalizedProductRepository.find({
      where: {
        confidenceScore: MoreThanOrEqual(confidenceThreshold),
        linkedProductSk: IsNull(),
      },
      order: {
        confidenceScore: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find potential product candidates for a normalized product
   */
  private async findProductCandidates(
    normalizedProduct: NormalizedProduct,
  ): Promise<ProductMatchCandidate[]> {
    const candidates: ProductMatchCandidate[] = [];

    // 1. Exact barcode match (if available)
    if (normalizedProduct.itemCode) {
      const barcodeMatches = await this.findByBarcode(
        normalizedProduct.itemCode,
      );
      candidates.push(...barcodeMatches);
    }

    // 2. Embedding similarity search
    if (normalizedProduct.embedding) {
      const embeddingMatches =
        await this.findByEmbeddingSimilarity(normalizedProduct);
      candidates.push(...embeddingMatches);
    }

    // 3. Brand + Category matching
    if (normalizedProduct.brand && normalizedProduct.category) {
      const brandCategoryMatches =
        await this.findByBrandCategory(normalizedProduct);
      candidates.push(...brandCategoryMatches);
    }

    // 4. Fuzzy name matching
    const nameMatches = await this.findByNameSimilarity(normalizedProduct);
    candidates.push(...nameMatches);

    return this.deduplicateCandidates(candidates);
  }

  /**
   * Find products by exact barcode match
   */
  private async findByBarcode(
    barcode: string,
  ): Promise<ProductMatchCandidate[]> {
    const products = await this.productRepository.find({
      where: { barcode },
    });

    return products.map((product) => ({
      productSk: product.productSk,
      name: product.name,
      brand: product.brandName,
      barcode: product.barcode,
      score: 1.0, // Perfect match
      method: 'barcode_match',
    }));
  }

  /**
   * Find products by embedding similarity
   */
  private async findByEmbeddingSimilarity(
    normalizedProduct: NormalizedProduct,
  ): Promise<ProductMatchCandidate[]> {
    if (!normalizedProduct.embedding) {
      return [];
    }

    try {
      // Use existing vector search against product names
      const similarProducts =
        await this.vectorEmbeddingService.findSimilarProducts(
          normalizedProduct.normalizedName,
          normalizedProduct.merchant,
          0.7, // Lower threshold for candidate search
          10, // Get more candidates
        );

      const candidates: ProductMatchCandidate[] = [];

      for (const similar of similarProducts) {
        // Try to find the actual product by searching for the normalized name
        const products = await this.productRepository
          .createQueryBuilder('product')
          .where('LOWER(product.name) LIKE LOWER(:name)', {
            name: `%${similar.normalizedProduct.normalizedName}%`,
          })
          .orWhere('LOWER(product.name) LIKE LOWER(:brand)', {
            brand: `%${similar.normalizedProduct.brand || ''}%`,
          })
          .limit(5)
          .getMany();

        for (const product of products) {
          candidates.push({
            productSk: product.productSk,
            name: product.name,
            brand: product.brandName,
            barcode: product.barcode,
            score: similar.similarity,
            method: 'embedding_similarity',
          });
        }
      }

      return candidates;
    } catch (error) {
      this.logger.warn(
        `Embedding similarity search failed for ${normalizedProduct.normalizedProductSk}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Find products by brand and category matching
   */
  private async findByBrandCategory(
    normalizedProduct: NormalizedProduct,
  ): Promise<ProductMatchCandidate[]> {
    const query = this.productRepository.createQueryBuilder('product');

    // Fuzzy brand matching
    if (normalizedProduct.brand) {
      query.where('LOWER(product.brandName) LIKE LOWER(:brand)', {
        brand: `%${normalizedProduct.brand}%`,
      });
    }

    // Add category matching if we have category relationships
    // For now, we'll use text similarity on product names
    const products = await query.limit(10).getMany();

    return products.map((product) => {
      let score = 0.6; // Base score for brand match

      // Boost score if names are similar
      const nameSimilarity = this.calculateStringSimilarity(
        normalizedProduct.normalizedName.toLowerCase(),
        product.name.toLowerCase(),
      );
      score = Math.max(score, nameSimilarity);

      return {
        productSk: product.productSk,
        name: product.name,
        brand: product.brandName,
        barcode: product.barcode,
        score,
        method: 'brand_category_match',
      };
    });
  }

  /**
   * Find products by name similarity using fuzzy matching
   */
  private async findByNameSimilarity(
    normalizedProduct: NormalizedProduct,
  ): Promise<ProductMatchCandidate[]> {
    try {
      // Try to use PostgreSQL fuzzy matching with pg_trgm
      const products = await this.productRepository
        .createQueryBuilder('product')
        .where('product.name % :name', {
          name: normalizedProduct.normalizedName,
        })
        .orWhere('LOWER(product.name) LIKE LOWER(:likeName)', {
          likeName: `%${normalizedProduct.normalizedName}%`,
        })
        .limit(10)
        .getMany();

      return this.mapProductsToMatchCandidates(products, normalizedProduct);
    } catch (error) {
      // If pg_trgm is not available, fall back to LIKE-only matching
      const dbError = error as DatabaseError;
      if (dbError.code === '42883') {
        console.warn(
          'pg_trgm extension not available, falling back to LIKE matching',
        );

        const products = await this.productRepository
          .createQueryBuilder('product')
          .where('LOWER(product.name) LIKE LOWER(:likeName)', {
            likeName: `%${normalizedProduct.normalizedName}%`,
          })
          .limit(10)
          .getMany();

        return this.mapProductsToMatchCandidates(products, normalizedProduct);
      }
      throw error;
    }
  }

  /**
   * Map products to match candidates with calculated scores
   */
  private mapProductsToMatchCandidates(
    products: Product[],
    normalizedProduct: NormalizedProduct,
  ): ProductMatchCandidate[] {
    return products.map((product) => {
      const score = this.calculateStringSimilarity(
        normalizedProduct.normalizedName.toLowerCase(),
        product.name.toLowerCase(),
      );

      return {
        productSk: product.productSk,
        name: product.name,
        brand: product.brandName,
        barcode: product.barcode,
        score,
        method: 'name_similarity',
      };
    });
  }

  /**
   * Select the best match from candidates using hierarchy with brand compatibility
   */
  private selectBestMatch(
    candidates: ProductMatchCandidate[],
    embeddingSimilarityThreshold: number,
    normalizedProduct: NormalizedProduct,
  ): ProductMatchCandidate | null {
    if (candidates.length === 0) return null;

    // Apply brand compatibility scoring to all candidates
    const scoredCandidates = candidates.map((candidate) => {
      const brandCompatibilityScore = this.calculateBrandCompatibility(
        normalizedProduct.brand,
        candidate.brand,
      );

      // Adjust the candidate's score based on brand compatibility
      const adjustedScore = candidate.score * brandCompatibilityScore;

      this.logger.debug(
        `Candidate ${candidate.name} (${candidate.brand}): original=${candidate.score}, brand_compatibility=${brandCompatibilityScore}, adjusted=${adjustedScore}`,
      );

      return {
        ...candidate,
        score: adjustedScore,
        originalScore: candidate.score,
        brandCompatibilityScore,
      };
    });

    // Sort by priority: barcode_match > embedding_similarity > others, then by adjusted score
    const prioritizedCandidates = scoredCandidates.sort((a, b) => {
      // Barcode matches always win (unless brand is completely incompatible)
      if (a.method === 'barcode_match' && b.method !== 'barcode_match') {
        return a.brandCompatibilityScore > 0 ? -1 : 1;
      }
      if (b.method === 'barcode_match' && a.method !== 'barcode_match') {
        return b.brandCompatibilityScore > 0 ? 1 : -1;
      }

      // Then by adjusted score (which includes brand compatibility)
      return b.score - a.score;
    });

    const bestCandidate = prioritizedCandidates[0];

    // Apply thresholds with brand compatibility consideration
    if (bestCandidate.method === 'barcode_match') {
      // Even barcode matches need some brand compatibility (> 0)
      if (bestCandidate.brandCompatibilityScore > 0) {
        return bestCandidate;
      } else {
        this.logger.warn(
          `Barcode match rejected due to brand incompatibility: normalized=${normalizedProduct.brand} vs product=${bestCandidate.brand}`,
        );
        return null;
      }
    }

    if (
      bestCandidate.method === 'embedding_similarity' &&
      bestCandidate.score >= embeddingSimilarityThreshold
    ) {
      return bestCandidate;
    }

    // For other methods, require a higher threshold (adjusted score includes brand compatibility)
    if (bestCandidate.score >= 0.6) {
      return bestCandidate;
    }

    this.logger.debug(
      `No suitable match found. Best candidate: ${bestCandidate.name} (score: ${bestCandidate.score}, brand: ${bestCandidate.brand})`,
    );

    return null;
  }

  /**
   * Calculate brand compatibility score between normalized and product brands
   * Returns: 1.0 = perfect match, 0.8 = partial match, 0.1 = no match but acceptable, 0.0 = incompatible
   */
  private calculateBrandCompatibility(
    normalizedBrand?: string,
    productBrand?: string,
  ): number {
    // If either brand is missing, give neutral score
    if (!normalizedBrand || !productBrand) {
      return 0.7; // Neutral - neither helps nor hurts
    }

    const normalizedLower = normalizedBrand.toLowerCase().trim();
    const productLower = productBrand.toLowerCase().trim();

    // Exact match
    if (normalizedLower === productLower) {
      return 1.0;
    }

    // Partial matches (one contains the other)
    if (
      normalizedLower.includes(productLower) ||
      productLower.includes(normalizedLower)
    ) {
      return 0.8;
    }

    // Check for common brand variations and abbreviations
    const brandMappings = new Map([
      ['kirkland signature', ['kirkland', 'ks', 'costco']],
      ['great value', ['walmart', 'gv']],
      ['market pantry', ['target', 'mp']],
      ['365', ['whole foods', 'wf', '365 organic']],
      ['trader joes', ['tj', 'trader joe']],
      ['simple truth', ['kroger', 'st']],
    ]);

    // Check if brands are related through mappings
    for (const [mainBrand, variations] of brandMappings) {
      const isNormalizedMain = normalizedLower.includes(mainBrand);
      const isProductMain = productLower.includes(mainBrand);
      const isNormalizedVariation = variations.some((v) =>
        normalizedLower.includes(v),
      );
      const isProductVariation = variations.some((v) =>
        productLower.includes(v),
      );

      if (
        (isNormalizedMain && (isProductMain || isProductVariation)) ||
        (isNormalizedVariation && (isProductMain || isProductVariation))
      ) {
        return 0.8;
      }
    }

    // If brands are completely different, severely penalize
    // but don't completely block in case of data issues
    return 0.1;
  }

  /**
   * Remove duplicate candidates (same product with different methods)
   */
  private deduplicateCandidates(
    candidates: ProductMatchCandidate[],
  ): ProductMatchCandidate[] {
    const seen = new Map<string, ProductMatchCandidate>();

    for (const candidate of candidates) {
      const existing = seen.get(candidate.productSk);
      if (!existing || candidate.score > existing.score) {
        seen.set(candidate.productSk, candidate);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
      matrix[i] = new Array(len2 + 1).fill(0) as number[];
    }

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Save the product link to the database
   */
  private async saveProductLink(
    normalizedProduct: NormalizedProduct,
    linkingResult: ProductLinkingResult,
  ): Promise<void> {
    await this.normalizedProductRepository.update(
      normalizedProduct.normalizedProductSk,
      {
        linkedProductSk: linkingResult.linkedProductSk,
        linkingConfidence: linkingResult.linkingConfidence,
        linkingMethod: linkingResult.linkingMethod,
        linkedAt: new Date(),
      },
    );
  }

  /**
   * Get statistics about product linking
   */
  async getLinkingStatistics(): Promise<{
    totalNormalizedProducts: number;
    highConfidenceProducts: number;
    linkedProducts: number;
    unlinkeds: number;
    linkingCoverage: number;
  }> {
    const [totalNormalizedProducts, highConfidenceProducts, linkedProducts] =
      await Promise.all([
        this.normalizedProductRepository.count(),
        this.normalizedProductRepository.count({
          where: {
            confidenceScore: MoreThanOrEqual(this.DEFAULT_CONFIDENCE_THRESHOLD),
          },
        }),
        this.normalizedProductRepository.count({
          where: { linkedProductSk: Not(IsNull()) },
        }),
      ]);

    const unlinkeds = highConfidenceProducts - linkedProducts;
    const linkingCoverage =
      highConfidenceProducts > 0
        ? (linkedProducts / highConfidenceProducts) * 100
        : 0;

    return {
      totalNormalizedProducts,
      highConfidenceProducts,
      linkedProducts,
      unlinkeds: Math.max(0, unlinkeds),
      linkingCoverage: Math.round(linkingCoverage * 100) / 100,
    };
  }

  /**
   * Get unlinked high-confidence products for review
   */
  async getUnlinkedHighConfidenceProducts(
    limit: number = 50,
    offset: number = 0,
  ): Promise<NormalizedProduct[]> {
    return this.getUnlinkedNormalizedProducts(
      this.DEFAULT_CONFIDENCE_THRESHOLD,
    ).then((products) => products.slice(offset, offset + limit));
  }
}
