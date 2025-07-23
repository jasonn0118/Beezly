import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { OpenAIService } from './openai.service';

export interface ParsedPrice {
  amount: number;
  isNegative: boolean;
  originalString: string;
}

export interface SimilarProduct {
  productId: string;
  similarity: number;
  normalizedName: string;
  merchant: string;
}

export interface DiscountLink {
  discountId: string; // Reference to the discount item
  discountAmount: number;
  discountType: 'percentage' | 'fixed' | 'unknown';
  discountDescription: string;
  confidence: number; // How confident we are in the link
}

export interface NormalizationResult {
  normalizedName: string;
  brand?: string;
  category?: string;
  confidenceScore: number;
  isDiscount: boolean;
  isAdjustment: boolean;
  itemCode?: string;
  method?: string; // How the normalization was performed
  similarProducts?: SimilarProduct[]; // Similar products found
  linkedDiscounts?: DiscountLink[]; // Discounts that apply to this product
  appliedToProductId?: string; // If this is a discount, which product it applies to
}

export interface ExtendedNormalizationResult extends NormalizationResult {
  originalIndex: number;
  originalPrice: number;
  originalQuantity: number;
  parsedPrice?: ParsedPrice;
}

// Type guard to check if a NormalizationResult has extended properties
function isExtendedNormalizationResult(
  result: NormalizationResult,
): result is ExtendedNormalizationResult {
  return (
    'originalIndex' in result &&
    'originalPrice' in result &&
    'originalQuantity' in result
  );
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

  /**
   * Parse price strings that may contain discount indicators
   * Examples: "5.88", "5.88-O", "-5.88", "$5.88-", "5.88-", "-$5.88"
   */
  public parsePrice(priceString: string): ParsedPrice {
    if (!priceString || typeof priceString !== 'string') {
      return {
        amount: 0,
        isNegative: false,
        originalString: priceString || '',
      };
    }

    const originalString = priceString.trim();
    let cleanPrice = originalString;

    // Check for various negative/discount indicators
    let isNegative = false;

    // Pattern 1: Starts with minus sign: "-5.88", "-$5.88"
    if (cleanPrice.startsWith('-')) {
      isNegative = true;
      cleanPrice = cleanPrice.substring(1);
    }

    // Pattern 2: Ends with dash and letter: "5.88-O", "5.88-D", "5.88-"
    if (cleanPrice.match(/-[A-Za-z]*$/)) {
      isNegative = true;
      cleanPrice = cleanPrice.replace(/-[A-Za-z]*$/, '');
    }

    // Pattern 3: Contains dash in middle with letters: "5.88-DISC"
    if (cleanPrice.match(/\d+-[A-Za-z]+/)) {
      isNegative = true;
      cleanPrice = cleanPrice.replace(/-[A-Za-z]+/, '');
    }

    // Remove currency symbols and extra spaces
    cleanPrice = cleanPrice.replace(/[$£€¥]/g, '').trim();

    // Parse the numeric value
    const numericValue = parseFloat(cleanPrice);
    const amount = isNaN(numericValue) ? 0 : Math.abs(numericValue);

    return {
      amount,
      isNegative,
      originalString,
    };
  }

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
    private readonly openAIService: OpenAIService,
  ) {}

  /**
   * Main normalization method - orchestrates the entire process
   */
  async normalizeProduct(
    options: ProductNormalizationOptions,
  ): Promise<NormalizationResult> {
    const { merchant, rawName, itemCode, useAI = true } = options;

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
        method: isDiscount ? 'discount_detected' : 'adjustment_detected',
      };

      // Store the discount/adjustment mapping
      // TODO: Enable when entity is properly loaded
      // await this.storeNormalizationResult(merchant, rawName, result);
      return Promise.resolve(result);
    }

    // Step 3: Check for exact match
    // TODO: Enable when entity is properly loaded
    // const exactMatch = await this.findExactMatch(rawName, merchant);
    // if (exactMatch) {
    //   await this.updateMatchingStatistics(exactMatch);
    //   const result = this.convertEntityToResult(exactMatch);
    //   result.method = 'exact_match';
    //   return result;
    // }

    // Step 4: Check for similar products (semantic similarity)
    // TODO: Enable when entity is properly loaded
    // const similarProducts = await this.findSimilarProducts(
    //   cleanedName,
    //   merchant,
    //   similarityThreshold,
    // );
    // if (similarProducts.length > 0) {
    //   const bestMatch = similarProducts[0];
    //   await this.updateMatchingStatistics(bestMatch);
    //   const result = this.convertEntityToResult(bestMatch);
    //   result.method = 'similarity_match';
    //   // Add similar products info for test endpoint
    //   result.similarProducts = similarProducts.slice(0, 5).map((product) => ({
    //     productId: product.normalizedProductSk,
    //     similarity: 0.8, // Placeholder, would be calculated in real implementation
    //     normalizedName: product.normalizedName,
    //     merchant: product.merchant,
    //   }));
    //   return result;
    // }

    // Step 5: Use AI normalization if enabled
    if (useAI) {
      const aiResult = await this.callLLMNormalization(
        cleanedName,
        merchant,
        itemCode,
      );
      aiResult.method = 'ai_generated';
      // TODO: Enable when entity is properly loaded
      // await this.storeNormalizationResult(merchant, rawName, aiResult);
      return aiResult;
    }

    // Step 6: Fallback - return cleaned name with low confidence
    const fallbackResult: NormalizationResult = {
      normalizedName: cleanedName,
      confidenceScore: 0.3,
      isDiscount: false,
      isAdjustment: false,
      itemCode,
      method: 'fallback',
    };

    // TODO: Enable when entity is properly loaded
    // await this.storeNormalizationResult(merchant, rawName, fallbackResult);
    return Promise.resolve(fallbackResult);
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
   * Call LLM for product normalization using OpenAI
   */
  async callLLMNormalization(
    cleanedName: string,
    merchant: string,
    itemCode?: string,
  ): Promise<NormalizationResult> {
    this.logger.debug(`AI normalization for: ${cleanedName}`);

    try {
      // Check if OpenAI is configured
      if (!this.openAIService.isConfigured()) {
        this.logger.debug(
          'OpenAI not configured, using fallback normalization',
        );
        return this.getFallbackNormalization(cleanedName, itemCode);
      }

      // Call OpenAI for normalization
      const llmResponse = await this.openAIService.normalizeProductWithLLM({
        rawName: cleanedName,
        merchant,
        itemCode,
        context: `This is a receipt item from ${merchant}`,
      });

      // Convert LLM response to our interface
      return {
        normalizedName: llmResponse.normalizedName,
        brand: llmResponse.brand || undefined,
        category: llmResponse.category || undefined,
        confidenceScore: llmResponse.confidenceScore,
        isDiscount: false,
        isAdjustment: false,
        itemCode,
      };
    } catch (error) {
      this.logger.error(
        `LLM normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Fall back to pattern-based normalization on error
      return this.getFallbackNormalization(cleanedName, itemCode);
    }
  }

  /**
   * Fallback normalization using pattern matching (used when LLM is unavailable)
   */
  private getFallbackNormalization(
    cleanedName: string,
    itemCode?: string,
  ): NormalizationResult {
    let brand: string | undefined;
    let category: string | undefined;

    // Extract potential brand from common patterns
    const brandPatterns = [
      /^(PEPSI|COCA COLA|COKE|SPRITE|FANTA)/i,
      /^(APPLE|SAMSUNG|GOOGLE|MICROSOFT)/i,
      /^(TIDE|DOWNY|GAIN|PERSIL)/i,
      /^(KRAFT|HEINZ|CAMPBELL)/i,
      /^(ORG|ORGANIC)/i,
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
      normalizedName: cleanedName,
      brand,
      category,
      confidenceScore: 0.5, // Lower confidence for fallback results
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
      embedding: undefined as number[] | undefined, // Will be set by VectorEmbeddingService
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

  /**
   * Process a list of receipt items and link discounts to products
   */
  async normalizeReceiptWithDiscountLinking(
    items: Array<{
      name: string;
      price: string;
      quantity: string;
      itemCode?: string;
      index: number; // Position in the receipt
    }>,
    merchant: string,
  ): Promise<NormalizationResult[]> {
    // Step 1: Normalize all items first
    const normalizedItems: NormalizationResult[] = [];

    for (const item of items) {
      // Parse the price to detect negative/discount amounts
      const parsedPrice = this.parsePrice(item.price);

      // Check if price format indicates this is a discount
      const isPriceBasedDiscount = parsedPrice.isNegative;

      const result = await this.normalizeProduct({
        rawName: item.name,
        merchant,
        itemCode: item.itemCode,
        useAI: true,
      });

      // Override discount detection if price format indicates discount
      if (isPriceBasedDiscount && !result.isDiscount) {
        result.isDiscount = true;
        result.isAdjustment = false;
        result.method = 'price_format_discount';
        this.logger.debug(
          `Price-based discount detected: ${item.name} with price ${item.price}`,
        );
      }

      // Add item index for discount linking by creating an extended result
      const extendedResult: ExtendedNormalizationResult = {
        ...result,
        originalIndex: item.index,
        originalPrice: parsedPrice.amount, // Use parsed amount (always positive)
        originalQuantity: parseInt(item.quantity) || 1,
        // Add the price info for reference
        parsedPrice,
      };

      normalizedItems.push(extendedResult);
    }

    // Step 2: Link discounts to products
    return this.linkDiscountsToProducts(normalizedItems);
  }

  /**
   * Link discount items to their corresponding products
   */
  private linkDiscountsToProducts(
    items: NormalizationResult[],
  ): NormalizationResult[] {
    const products = items.filter(
      (item) => !item.isDiscount && !item.isAdjustment,
    );
    const discounts = items.filter((item) => item.isDiscount);

    // For each discount, try to find the product it applies to
    for (const discount of discounts) {
      const linkedProduct = this.findProductForDiscount(discount, products);

      if (linkedProduct) {
        // Add discount to product
        if (!linkedProduct.linkedDiscounts) {
          linkedProduct.linkedDiscounts = [];
        }

        const discountAmount = isExtendedNormalizationResult(discount)
          ? Math.abs(discount.originalPrice)
          : 0;
        const discountLink: DiscountLink = {
          discountId: isExtendedNormalizationResult(discount)
            ? discount.originalIndex.toString()
            : 'unknown',
          discountAmount,
          discountType: this.determineDiscountType(
            discount.normalizedName,
            discountAmount,
          ),
          discountDescription: discount.normalizedName,
          confidence: this.calculateDiscountLinkConfidence(
            discount,
            linkedProduct,
          ),
        };

        linkedProduct.linkedDiscounts.push(discountLink);

        // Mark discount as applied to this product
        discount.appliedToProductId = isExtendedNormalizationResult(
          linkedProduct,
        )
          ? linkedProduct.originalIndex.toString()
          : 'unknown';
      }
    }

    return items;
  }

  /**
   * Find the most likely product that a discount applies to
   */
  private findProductForDiscount(
    discount: NormalizationResult,
    products: NormalizationResult[],
  ): NormalizationResult | null {
    const discountIndex = isExtendedNormalizationResult(discount)
      ? discount.originalIndex
      : 0;
    const discountAmount = isExtendedNormalizationResult(discount)
      ? Math.abs(discount.originalPrice)
      : 0;

    // Strategy 1: Look for adjacent products (most common)
    // Check items immediately before the discount
    for (let i = 1; i <= 3; i++) {
      const adjacentIndex = discountIndex - i;
      const adjacentProduct = products.find(
        (p) =>
          isExtendedNormalizationResult(p) && p.originalIndex === adjacentIndex,
      );

      if (adjacentProduct) {
        const productPrice = isExtendedNormalizationResult(adjacentProduct)
          ? adjacentProduct.originalPrice
          : 0;

        // If discount amount makes sense relative to product price
        if (this.isDiscountAmountReasonable(discountAmount, productPrice)) {
          return adjacentProduct;
        }
      }
    }

    // Strategy 2: Look for products with matching price patterns
    const matchingProducts = products.filter((product) => {
      const productPrice = isExtendedNormalizationResult(product)
        ? product.originalPrice
        : 0;
      return this.isDiscountAmountReasonable(discountAmount, productPrice);
    });

    if (matchingProducts.length === 1) {
      return matchingProducts[0];
    }

    // Strategy 3: Look for specific discount patterns that mention products
    const productKeywords = this.extractProductKeywordsFromDiscount(
      discount.normalizedName,
    );
    if (productKeywords.length > 0) {
      for (const product of products) {
        const productName = product.normalizedName.toLowerCase();
        if (productKeywords.some((keyword) => productName.includes(keyword))) {
          return product;
        }
      }
    }

    // Strategy 4: Default to the most recent product if no clear match
    const recentProducts = products
      .filter(
        (p) =>
          isExtendedNormalizationResult(p) && p.originalIndex < discountIndex,
      )
      .sort((a, b) => {
        const aIndex = isExtendedNormalizationResult(a) ? a.originalIndex : 0;
        const bIndex = isExtendedNormalizationResult(b) ? b.originalIndex : 0;
        return bIndex - aIndex;
      });

    return recentProducts[0] || null;
  }

  /**
   * Determine if a discount amount is reasonable for a product price
   */
  private isDiscountAmountReasonable(
    discountAmount: number,
    productPrice: number,
  ): boolean {
    if (productPrice <= 0) return false;

    const discountPercentage = (discountAmount / productPrice) * 100;

    // Reasonable discount range: 5% to 100% (free item)
    return discountPercentage >= 5 && discountPercentage <= 100;
  }

  /**
   * Extract product keywords from discount description
   */
  private extractProductKeywordsFromDiscount(discountName: string): string[] {
    const keywords: string[] = [];
    const lowercaseName = discountName.toLowerCase();

    // Common patterns: "APPLE DISC", "MILK COUPON", etc.
    const productTerms = lowercaseName
      .replace(/\b(disc|discount|coupon|off|member|savings|tpd)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((term) => term.length > 2);

    keywords.push(...productTerms);

    return keywords;
  }

  /**
   * Determine the type of discount
   */
  private determineDiscountType(
    discountName: string,
    discountAmount: number,
  ): 'percentage' | 'fixed' | 'unknown' {
    const name = discountName.toLowerCase();

    if (name.includes('%') || name.includes('percent')) {
      return 'percentage';
    }

    if (name.includes('$') || /\d+\.\d{2}/.test(name) || discountAmount > 0) {
      return 'fixed';
    }

    return 'unknown';
  }

  /**
   * Calculate confidence score for discount-product linking
   */
  private calculateDiscountLinkConfidence(
    discount: NormalizationResult,
    product: NormalizationResult,
  ): number {
    let confidence = 0.5; // Base confidence

    const discountIndex = isExtendedNormalizationResult(discount)
      ? discount.originalIndex
      : 0;
    const productIndex = isExtendedNormalizationResult(product)
      ? product.originalIndex
      : 0;
    const discountAmount = isExtendedNormalizationResult(discount)
      ? Math.abs(discount.originalPrice)
      : 0;
    const productPrice = isExtendedNormalizationResult(product)
      ? product.originalPrice
      : 0;

    // Higher confidence if discount is adjacent to product
    const distance = Math.abs(discountIndex - productIndex);
    if (distance === 1) confidence += 0.3;
    else if (distance === 2) confidence += 0.2;
    else if (distance === 3) confidence += 0.1;

    // Higher confidence if discount amount is reasonable
    if (this.isDiscountAmountReasonable(discountAmount, productPrice)) {
      confidence += 0.2;
    }

    // Higher confidence if discount mentions product keywords
    const keywords = this.extractProductKeywordsFromDiscount(
      discount.normalizedName,
    );
    if (
      keywords.some((keyword) =>
        product.normalizedName.toLowerCase().includes(keyword),
      )
    ) {
      confidence += 0.2;
    }

    return Math.min(1.0, confidence);
  }
}
