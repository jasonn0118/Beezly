import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';

export interface NormalizationResult {
  normalizedName: string;
  brand?: string;
  category?: string;
  confidenceScore: number;
  isDiscount: boolean;
  isAdjustment: boolean;
  itemCode?: string;
}

export interface ProductNormalizationOptions {
  merchant: string;
  rawName: string;
  itemCode?: string;
  useAI?: boolean;
  similarityThreshold?: number;
}

@Injectable()
export class ProductNormalizationService {
  private readonly logger = new Logger(ProductNormalizationService.name);

  // Common discount/adjustment patterns
  private readonly discountPatterns = [
    /^TPD\/\d+$/i, // TPD/1858985
    /^DISC(OUNT)?/i, // DISCOUNT, DISC
    /^ADJ(USTMENT)?/i, // ADJUSTMENT, ADJ
    /^REFUND/i, // REFUND
    /^CREDIT/i, // CREDIT
    /^COUPON/i, // COUPON
    /^\$?\d+\.?\d*\s*(OFF|DISCOUNT)/i, // $5 OFF, 10% DISCOUNT
    /^-\$?\d+/, // -$5.00
    /^MEMBER\s*(DISC|SAVINGS)/i, // MEMBER DISC, MEMBER SAVINGS
    /^STORE\s*CREDIT/i, // STORE CREDIT
  ];

  private readonly adjustmentPatterns = [
    /^TAX\s*(ADJ|ADJUSTMENT)/i, // TAX ADJ, TAX ADJUSTMENT
    /^PRICE\s*(ADJ|ADJUSTMENT)/i, // PRICE ADJ
    /^MANAGER\s*(ADJ|OVERRIDE)/i, // MANAGER ADJ, MANAGER OVERRIDE
    /^VOID/i, // VOID
    /^CANCEL/i, // CANCEL
    /^CORRECTION/i, // CORRECTION
  ];

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
  ) {}

  /**
   * Main normalization method - orchestrates the entire process
   */
  async normalizeProduct(
    options: ProductNormalizationOptions,
  ): Promise<NormalizationResult> {
    const {
      merchant,
      rawName,
      itemCode,
      useAI = true,
      similarityThreshold = 0.8,
    } = options;

    this.logger.debug(`Normalizing product: ${rawName} from ${merchant}`);

    // Step 1: Clean the raw name
    const cleanedName = this.cleanRawName(rawName);

    // Step 2: Check if it's a discount or adjustment line
    const isDiscount = this.isDiscountLine(cleanedName);
    const isAdjustment = this.isAdjustmentLine(cleanedName);

    if (isDiscount || isAdjustment) {
      const result: NormalizationResult = {
        normalizedName: cleanedName,
        confidenceScore: 1.0,
        isDiscount,
        isAdjustment,
        itemCode,
      };

      // Store the discount/adjustment mapping
      await this.storeNormalizationResult(merchant, rawName, result);
      return result;
    }

    // Step 3: Check for exact match
    const exactMatch = await this.findExactMatch(rawName, merchant);
    if (exactMatch) {
      await this.updateMatchingStatistics(exactMatch);
      return this.convertEntityToResult(exactMatch);
    }

    // Step 4: Check for similar products (semantic similarity)
    const similarProducts = await this.findSimilarProducts(
      cleanedName,
      merchant,
      similarityThreshold,
    );
    if (similarProducts.length > 0) {
      const bestMatch = similarProducts[0];
      await this.updateMatchingStatistics(bestMatch);
      return this.convertEntityToResult(bestMatch);
    }

    // Step 5: Use AI normalization if enabled
    if (useAI) {
      const aiResult = this.callLLMNormalization(
        cleanedName,
        merchant,
        itemCode,
      );
      await this.storeNormalizationResult(merchant, rawName, aiResult);
      return aiResult;
    }

    // Step 6: Fallback - return cleaned name with low confidence
    const fallbackResult: NormalizationResult = {
      normalizedName: cleanedName,
      confidenceScore: 0.3,
      isDiscount: false,
      isAdjustment: false,
      itemCode,
    };

    await this.storeNormalizationResult(merchant, rawName, fallbackResult);
    return fallbackResult;
  }

  /**
   * Clean and preprocess the raw product name
   */
  cleanRawName(rawName: string): string {
    return rawName
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-./&]/g, '') // Remove special chars except common ones
      .toUpperCase(); // Standardize casing
  }

  /**
   * Check if the line represents a discount
   */
  isDiscountLine(cleanedName: string): boolean {
    return this.discountPatterns.some((pattern) => pattern.test(cleanedName));
  }

  /**
   * Check if the line represents an adjustment
   */
  isAdjustmentLine(cleanedName: string): boolean {
    return this.adjustmentPatterns.some((pattern) => pattern.test(cleanedName));
  }

  /**
   * Find exact match in normalized products table
   */
  async findExactMatch(
    rawName: string,
    merchant: string,
  ): Promise<NormalizedProduct | null> {
    return await this.normalizedProductRepository.findOne({
      where: {
        rawName,
        merchant,
      },
    });
  }

  /**
   * Find similar products using basic string similarity
   * In a production system, this would use vector embeddings
   */
  async findSimilarProducts(
    cleanedName: string,
    merchant: string,
    threshold: number,
  ): Promise<NormalizedProduct[]> {
    // For now, implement basic similarity matching
    // In production, this would use vector embeddings and similarity search
    const allProducts = await this.normalizedProductRepository.find({
      where: { merchant },
      order: { confidenceScore: 'DESC', matchCount: 'DESC' },
      take: 50, // Limit to top 50 for performance
    });

    const similarProducts = allProducts
      .map((product) => ({
        product,
        similarity: this.calculateStringSimilarity(
          cleanedName,
          product.rawName,
        ),
      }))
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map((item) => item.product);

    return similarProducts.slice(0, 5); // Return top 5 matches
  }

  /**
   * Calculate basic string similarity (Jaccard similarity)
   * In production, would use more sophisticated embedding-based similarity
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Call LLM for product normalization
   * This is a placeholder - in production would integrate with OpenAI/Claude/etc.
   */
  callLLMNormalization(
    cleanedName: string,
    merchant: string,
    itemCode?: string,
  ): NormalizationResult {
    this.logger.debug(`AI normalization for: ${cleanedName}`);

    // Placeholder implementation
    // In production, this would make an API call to an LLM service

    // Basic pattern-based normalization as fallback
    const normalizedName = cleanedName;
    let brand: string | undefined;
    let category: string | undefined;

    // Extract potential brand from common patterns
    const brandPatterns = [
      /^(PEPSI|COCA COLA|COKE|SPRITE|FANTA)/i,
      /^(APPLE|SAMSUNG|GOOGLE|MICROSOFT)/i,
      /^(TIDE|DOWNY|GAIN|PERSIL)/i,
      /^(KRAFT|HEINZ|CAMPBELL)/i,
    ];

    for (const pattern of brandPatterns) {
      const match = cleanedName.match(pattern);
      if (match) {
        brand = match[1];
        break;
      }
    }

    // Basic category inference
    if (
      cleanedName.includes('MILK') ||
      cleanedName.includes('CHEESE') ||
      cleanedName.includes('YOGURT')
    ) {
      category = 'Dairy';
    } else if (
      cleanedName.includes('BREAD') ||
      cleanedName.includes('BAGEL') ||
      cleanedName.includes('MUFFIN')
    ) {
      category = 'Bakery';
    } else if (
      cleanedName.includes('APPLE') ||
      cleanedName.includes('BANANA') ||
      cleanedName.includes('ORANGE')
    ) {
      category = 'Produce';
    } else if (
      cleanedName.includes('CHICKEN') ||
      cleanedName.includes('BEEF') ||
      cleanedName.includes('PORK')
    ) {
      category = 'Meat';
    }

    return {
      normalizedName,
      brand,
      category,
      confidenceScore: 0.7, // Medium confidence for AI-generated results
      isDiscount: false,
      isAdjustment: false,
      itemCode,
    };
  }

  /**
   * Store normalization result in the database
   */
  private async storeNormalizationResult(
    merchant: string,
    rawName: string,
    result: NormalizationResult,
  ): Promise<NormalizedProduct> {
    const normalizedProduct = this.normalizedProductRepository.create({
      rawName,
      merchant,
      itemCode: result.itemCode,
      normalizedName: result.normalizedName,
      brand: result.brand,
      category: result.category,
      confidenceScore: result.confidenceScore,
      embedding: undefined, // Will be set by VectorEmbeddingService
      isDiscount: result.isDiscount,
      isAdjustment: result.isAdjustment,
      matchCount: 1,
      lastMatchedAt: new Date(),
    });

    return await this.normalizedProductRepository.save(normalizedProduct);
  }

  /**
   * Update matching statistics for an existing normalized product
   */
  private async updateMatchingStatistics(
    normalizedProduct: NormalizedProduct,
  ): Promise<void> {
    normalizedProduct.matchCount += 1;
    normalizedProduct.lastMatchedAt = new Date();
    await this.normalizedProductRepository.save(normalizedProduct);
  }

  /**
   * Convert entity to result interface
   */
  private convertEntityToResult(
    entity: NormalizedProduct,
  ): NormalizationResult {
    return {
      normalizedName: entity.normalizedName,
      brand: entity.brand,
      category: entity.category,
      confidenceScore: entity.confidenceScore,
      isDiscount: entity.isDiscount,
      isAdjustment: entity.isAdjustment,
      itemCode: entity.itemCode,
    };
  }

  /**
   * Get normalization statistics for admin/analytics
   */
  async getNormalizationStats(merchant?: string) {
    const queryBuilder =
      this.normalizedProductRepository.createQueryBuilder('np');

    if (merchant) {
      queryBuilder.where('np.merchant = :merchant', { merchant });
    }

    const results = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('np.isDiscount = true').getCount(),
      queryBuilder.clone().andWhere('np.isAdjustment = true').getCount(),
      queryBuilder.clone().select('AVG(np.confidenceScore)', 'avg').getRawOne(),
      queryBuilder.clone().andWhere('np.confidenceScore < 0.5').getCount(),
    ]);

    const [
      totalCount,
      discountCount,
      adjustmentCount,
      avgConfidence,
      lowConfidenceCount,
    ] = results as [number, number, number, { avg: string }, number];

    return {
      totalNormalizedProducts: totalCount,
      discountLines: discountCount,
      adjustmentLines: adjustmentCount,
      averageConfidence: parseFloat(avgConfidence?.avg || '0'),
      lowConfidenceProducts: lowConfidenceCount,
      merchant,
    };
  }

  /**
   * Get products that need review (low confidence)
   */
  async getProductsNeedingReview(
    limit = 50,
    merchant?: string,
  ): Promise<NormalizedProduct[]> {
    const queryBuilder = this.normalizedProductRepository
      .createQueryBuilder('np')
      .where('np.confidenceScore < :threshold', { threshold: 0.6 })
      .andWhere('np.isDiscount = false')
      .andWhere('np.isAdjustment = false')
      .orderBy('np.confidenceScore', 'ASC')
      .addOrderBy('np.matchCount', 'DESC')
      .limit(limit);

    if (merchant) {
      queryBuilder.andWhere('np.merchant = :merchant', { merchant });
    }

    return await queryBuilder.getMany();
  }
}
