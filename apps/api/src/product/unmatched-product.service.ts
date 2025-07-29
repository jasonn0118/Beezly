import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThanOrEqual, In } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';

export interface UnmatchedProductSummary {
  normalizedProductSk: string;
  normalizedName: string;
  brand?: string;
  category?: string;
  merchant: string;
  confidenceScore: number;
  rawName: string;
  occurrenceCount: number;
  lastSeen: Date;
  suggestedProductName: string;
  suggestedBrand?: string;
  suggestedCategory?: string;
}

export interface ProductCreationSuggestion {
  name: string;
  brandName?: string;
  category?: number;
  estimatedPopularity: number;
  sourceNormalizedProducts: string[];
  reasonForSuggestion: string;
}

export interface ReviewQueueStats {
  totalUnmatched: number;
  highConfidenceUnmatched: number;
  pendingReview: number;
  averageConfidenceScore: number;
  topCategories: Array<{ category: string; count: number }>;
  topBrands: Array<{ brand: string; count: number }>;
  topMerchants: Array<{ merchant: string; count: number }>;
}

/**
 * Service for managing unmatched normalized products that could become new catalog products.
 *
 * BUSINESS RULE: Only normalized products with confidence_score >= 0.8 are considered
 * for product creation suggestions. This ensures we only suggest creating products
 * from high-quality, reliable receipt normalization results.
 */
@Injectable()
export class UnmatchedProductService {
  private readonly logger = new Logger(UnmatchedProductService.name);
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Get unmatched products that are good candidates for creating new Product entities
   */
  async getUnmatchedProductCandidates(
    limit: number = 50,
    offset: number = 0,
    minConfidence: number = this.HIGH_CONFIDENCE_THRESHOLD,
  ): Promise<UnmatchedProductSummary[]> {
    // Get unmatched normalized products with high confidence
    const unmatchedProducts = await this.normalizedProductRepository.find({
      where: {
        confidenceScore: MoreThanOrEqual(minConfidence),
        linkedProductSk: IsNull(),
      },
      order: {
        confidenceScore: 'DESC',
        matchCount: 'DESC', // Prioritize frequently seen items
        createdAt: 'DESC',
      },
      skip: offset,
      take: limit,
    });

    // Group by similar normalized names to identify popular products
    const summaries: UnmatchedProductSummary[] = [];

    for (const product of unmatchedProducts) {
      // Count occurrences of similar products
      const similarProducts = await this.findSimilarUnmatchedProducts(product);

      const summary: UnmatchedProductSummary = {
        normalizedProductSk: product.normalizedProductSk,
        normalizedName: product.normalizedName,
        brand: product.brand,
        category: product.category,
        merchant: product.merchant,
        confidenceScore: product.confidenceScore,
        rawName: product.rawName,
        occurrenceCount: similarProducts.length + 1, // Include itself
        lastSeen: product.lastMatchedAt || product.createdAt,
        suggestedProductName: this.generateSuggestedProductName(product),
        suggestedBrand: this.cleanBrandName(product.brand),
        suggestedCategory: product.category,
      };

      summaries.push(summary);
    }

    // Remove duplicates and sort by popularity
    const uniqueSummaries = this.deduplicateSummaries(summaries);

    return uniqueSummaries
      .sort((a, b) => {
        // Sort by confidence score first, then by occurrence count
        if (Math.abs(a.confidenceScore - b.confidenceScore) > 0.1) {
          return b.confidenceScore - a.confidenceScore;
        }
        return b.occurrenceCount - a.occurrenceCount;
      })
      .slice(0, limit);
  }

  /**
   * Generate product creation suggestions based on unmatched items
   */
  async generateProductCreationSuggestions(
    minOccurrences: number = 3,
    minConfidence: number = this.HIGH_CONFIDENCE_THRESHOLD,
  ): Promise<ProductCreationSuggestion[]> {
    // Get all high-confidence unmatched products
    const unmatchedProducts = await this.normalizedProductRepository.find({
      where: {
        confidenceScore: MoreThanOrEqual(minConfidence),
        linkedProductSk: IsNull(),
      },
    });

    // Group by normalized name and brand to find popular products
    const productGroups = new Map<string, NormalizedProduct[]>();

    for (const product of unmatchedProducts) {
      const key = this.generateGroupingKey(product);
      if (!productGroups.has(key)) {
        productGroups.set(key, []);
      }
      productGroups.get(key)!.push(product);
    }

    const suggestions: ProductCreationSuggestion[] = [];

    for (const [, products] of productGroups.entries()) {
      if (products.length < minOccurrences) continue;

      const representative = products[0];
      const averageConfidence =
        products.reduce((sum, p) => sum + p.confidenceScore, 0) /
        products.length;

      // Find the best category by consensus
      const categoryCount = new Map<string, number>();
      products.forEach((p) => {
        if (p.category) {
          categoryCount.set(
            p.category,
            (categoryCount.get(p.category) || 0) + 1,
          );
        }
      });

      const bestCategory = Array.from(categoryCount.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];

      const suggestion: ProductCreationSuggestion = {
        name: this.generateSuggestedProductName(representative),
        brandName: this.cleanBrandName(representative.brand),
        category: await this.findOrCreateCategoryId(bestCategory),
        estimatedPopularity: products.length,
        sourceNormalizedProducts: products.map((p) => p.normalizedProductSk),
        reasonForSuggestion: this.generateSuggestionReason(
          products,
          averageConfidence,
        ),
      };

      suggestions.push(suggestion);
    }

    return suggestions
      .sort((a, b) => b.estimatedPopularity - a.estimatedPopularity)
      .slice(0, 20); // Limit to top 20 suggestions
  }

  /**
   * Create a new Product entity from an unmatched normalized product
   */
  async createProductFromUnmatched(
    normalizedProductSk: string,
    overrides?: Partial<Product>,
  ): Promise<Product> {
    const normalizedProduct = await this.normalizedProductRepository.findOne({
      where: { normalizedProductSk },
    });

    if (!normalizedProduct) {
      throw new Error(`Normalized product ${normalizedProductSk} not found`);
    }

    if (normalizedProduct.linkedProductSk) {
      throw new Error(
        `Normalized product ${normalizedProductSk} is already linked`,
      );
    }

    // Create new product entity
    const product = this.productRepository.create({
      name:
        overrides?.name || this.generateSuggestedProductName(normalizedProduct),
      brandName:
        overrides?.brandName || this.cleanBrandName(normalizedProduct.brand),
      category:
        overrides?.category ||
        (await this.findOrCreateCategoryId(normalizedProduct.category)),
      creditScore: normalizedProduct.confidenceScore,
      verifiedCount: 1,
      flaggedCount: 0,
      ...overrides,
    });

    const savedProduct = await this.productRepository.save(product);

    // Link the normalized product to the new product
    await this.normalizedProductRepository.update(normalizedProductSk, {
      linkedProductSk: savedProduct.productSk,
      linkingConfidence: 1.0, // Perfect match since we created it
      linkingMethod: 'manual_creation',
      linkedAt: new Date(),
    });

    // Also link any similar unmatched products
    await this.linkSimilarUnmatchedProducts(
      normalizedProduct,
      savedProduct.productSk,
    );

    this.logger.log(
      `Created new product ${savedProduct.productSk} from unmatched normalized product ${normalizedProductSk}`,
    );

    return savedProduct;
  }

  /**
   * Get review queue statistics
   */
  async getReviewQueueStats(): Promise<ReviewQueueStats> {
    const unmatchedProducts = await this.normalizedProductRepository.find({
      where: {
        linkedProductSk: IsNull(),
      },
    });

    const highConfidenceUnmatched = unmatchedProducts.filter(
      (p) => p.confidenceScore >= this.HIGH_CONFIDENCE_THRESHOLD,
    );

    // Calculate statistics
    const totalUnmatched = unmatchedProducts.length;
    const highConfidenceCount = highConfidenceUnmatched.length;
    const averageConfidence =
      unmatchedProducts.length > 0
        ? unmatchedProducts.reduce((sum, p) => sum + p.confidenceScore, 0) /
          unmatchedProducts.length
        : 0;

    // Top categories
    const categoryCount = new Map<string, number>();
    unmatchedProducts.forEach((p) => {
      if (p.category) {
        categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
      }
    });
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    // Top brands
    const brandCount = new Map<string, number>();
    unmatchedProducts.forEach((p) => {
      if (p.brand) {
        brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1);
      }
    });
    const topBrands = Array.from(brandCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([brand, count]) => ({ brand, count }));

    // Top merchants
    const merchantCount = new Map<string, number>();
    unmatchedProducts.forEach((p) => {
      merchantCount.set(p.merchant, (merchantCount.get(p.merchant) || 0) + 1);
    });
    const topMerchants = Array.from(merchantCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([merchant, count]) => ({ merchant, count }));

    return {
      totalUnmatched,
      highConfidenceUnmatched: highConfidenceCount,
      pendingReview: highConfidenceCount, // Simplified - in practice, track actual review status
      averageConfidenceScore: Math.round(averageConfidence * 1000) / 1000,
      topCategories,
      topBrands,
      topMerchants,
    };
  }

  /**
   * Bulk approve product creation suggestions
   */
  async bulkCreateProductsFromSuggestions(
    suggestionIds: string[], // normalized product SKs
  ): Promise<{
    created: number;
    errors: number;
    errorMessages: string[];
  }> {
    const result = {
      created: 0,
      errors: 0,
      errorMessages: [] as string[],
    };

    for (const normalizedProductSk of suggestionIds) {
      try {
        await this.createProductFromUnmatched(normalizedProductSk);
        result.created++;
      } catch (error) {
        result.errors++;
        result.errorMessages.push(
          `Failed to create product from ${normalizedProductSk}: ${(error as Error).message}`,
        );
        this.logger.error(
          `Error creating product from ${normalizedProductSk}:`,
          error,
        );
      }
    }

    return result;
  }

  // Private helper methods

  private async findSimilarUnmatchedProducts(
    targetProduct: NormalizedProduct,
  ): Promise<NormalizedProduct[]> {
    // Find products with similar normalized names
    return this.normalizedProductRepository.find({
      where: {
        normalizedName: targetProduct.normalizedName,
        brand: targetProduct.brand || IsNull(),
        linkedProductSk: IsNull(),
      },
    });
  }

  private generateGroupingKey(product: NormalizedProduct): string {
    const name = product.normalizedName.toLowerCase().trim();
    const brand = product.brand?.toLowerCase().trim() || 'no-brand';
    return `${name}|${brand}`;
  }

  private generateSuggestedProductName(product: NormalizedProduct): string {
    let name = product.normalizedName;

    // Clean up common receipt artifacts
    name = name.replace(/\b(ORGANIC|ORG)\b/gi, 'Organic');
    name = name.replace(/\b(GREAT VALUE|GV)\b/gi, 'Great Value');
    name = name.replace(/\b\d+(\.\d+)?\s?(OZ|LB|CT|PK)\b/gi, ''); // Remove sizes

    // Title case
    name = name.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

    return name.trim();
  }

  private cleanBrandName(brand?: string): string | undefined {
    if (!brand) return undefined;

    // Clean up common brand name issues
    let cleanBrand = brand.trim();
    cleanBrand = cleanBrand.replace(/\b(BRAND|CO\.?|INC\.?)\b/gi, '');
    cleanBrand = cleanBrand.replace(/\s+/g, ' ').trim();

    // Title case
    cleanBrand = cleanBrand
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return cleanBrand || undefined;
  }

  private async findOrCreateCategoryId(
    categoryName?: string,
  ): Promise<number | undefined> {
    if (!categoryName) return undefined;

    // Try to find existing category by category1 field
    let category = await this.categoryRepository.findOne({
      where: { category1: categoryName },
    });

    if (!category) {
      // Create new category
      category = this.categoryRepository.create({
        category1: categoryName,
      });
      category = await this.categoryRepository.save(category);
    }

    return category.id;
  }

  private generateSuggestionReason(
    products: NormalizedProduct[],
    averageConfidence: number,
  ): string {
    const reasons: string[] = [];

    if (products.length >= 5) {
      reasons.push(`High frequency (${products.length} occurrences)`);
    }

    if (averageConfidence >= 0.9) {
      reasons.push('Very high confidence');
    } else if (averageConfidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      reasons.push('High confidence');
    }

    const uniqueMerchants = new Set(products.map((p) => p.merchant)).size;
    if (uniqueMerchants > 1) {
      reasons.push(`Seen at ${uniqueMerchants} different merchants`);
    }

    return reasons.join(', ') || 'Consistent normalization results';
  }

  private deduplicateSummaries(
    summaries: UnmatchedProductSummary[],
  ): UnmatchedProductSummary[] {
    const seen = new Map<string, UnmatchedProductSummary>();

    for (const summary of summaries) {
      const key = `${summary.normalizedName}|${summary.brand || ''}`;
      const existing = seen.get(key);

      if (!existing || summary.confidenceScore > existing.confidenceScore) {
        seen.set(key, summary);
      }
    }

    return Array.from(seen.values());
  }

  private async linkSimilarUnmatchedProducts(
    templateProduct: NormalizedProduct,
    linkedProductSk: string,
  ): Promise<void> {
    const similarProducts =
      await this.findSimilarUnmatchedProducts(templateProduct);

    const similarProductIds = similarProducts
      .filter(
        (p) => p.normalizedProductSk !== templateProduct.normalizedProductSk,
      )
      .map((p) => p.normalizedProductSk);

    if (similarProductIds.length > 0) {
      await this.normalizedProductRepository.update(
        { normalizedProductSk: In(similarProductIds) },
        {
          linkedProductSk,
          linkingConfidence: 0.95, // High confidence for similar products
          linkingMethod: 'similarity_linking',
          linkedAt: new Date(),
        },
      );

      this.logger.log(
        `Linked ${similarProductIds.length} similar products to ${linkedProductSk}`,
      );
    }
  }
}
