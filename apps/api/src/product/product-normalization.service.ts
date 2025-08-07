import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  findGroceryChainByName,
  getStoreNormalizationCriteria,
} from '../constants';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { OpenAIService } from './openai.service';
import { StorePatternMatcher } from './store-patterns.config';
import { VectorEmbeddingService } from './vector-embedding.service';

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
  isFee?: boolean; // If this is a fee/additional charge
  itemCode?: string;
  method?: string; // How the normalization was performed
  similarProducts?: SimilarProduct[]; // Similar products found
  linkedDiscounts?: DiscountLink[]; // Discounts that apply to this product
  appliedToProductId?: string; // If this is a discount/fee, which product it applies to
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
   * Parse price strings that may contain discount indicators with store-specific patterns
   * Examples: "5.88", "5.88-O", "-5.88", "$5.88-", "5.88-", "-$5.88", "ROLLBACK $5.88", "Was $10.99 Now $8.99"
   */
  public parsePrice(priceString: string, merchant?: string): ParsedPrice {
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

    // Store-specific discount pattern detection
    if (merchant) {
      const storePattern = StorePatternMatcher.identifyStore(merchant);
      if (storePattern) {
        // Check store-specific discount indicators
        for (const indicator of storePattern.receiptPatterns
          .discountIndicators) {
          if (cleanPrice.toLowerCase().includes(indicator.toLowerCase())) {
            isNegative = true;
            // Remove the discount indicator from price
            cleanPrice = cleanPrice
              .replace(new RegExp(indicator, 'gi'), '')
              .trim();
            break;
          }
        }

        // Handle store-specific price formats
        switch (storePattern.storeId) {
          case 'COSTCO': {
            // Costco asterisk indicates sale price
            if (cleanPrice.includes('*')) {
              isNegative = true; // Consider asterisk items as discounts
              cleanPrice = cleanPrice.replace(/\*/g, '');
            }
            // Handle instant savings format: "$5.88 - $1.00"
            const costcoSavingsMatch = cleanPrice.match(
              /\$?([\d,]+\.\d{2})\s*-\s*\$?([\d,]+\.\d{2})/,
            );
            if (costcoSavingsMatch) {
              isNegative = true;
              cleanPrice = costcoSavingsMatch[1]; // Use the discounted price
            }
            break;
          }

          case 'WALMART': {
            // Handle "Was $X Now $Y" format
            const walmartWasNowMatch = cleanPrice.match(
              /was\s+\$?([\d,]+\.\d{2})\s+now\s+\$?([\d,]+\.\d{2})/i,
            );
            if (walmartWasNowMatch) {
              isNegative = true;
              cleanPrice = walmartWasNowMatch[2]; // Use the "Now" price
            }
            break;
          }

          // TODO: Add Canadian grocery chains when implemented
          // case 'SAVE_ON_FOODS':
          // case 'SAFEWAY':
          // case 'LOBLAWS':
          // case 'METRO':
          // case 'SOBEYS':
          //   // Handle club/loyalty pricing formats
          //   break;
        }
      }
    }

    // Generic discount patterns (existing logic)
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
    // Costco patterns
    /^TPD\/.*$/i, // TPD/1858985 or TPD/BATTERY
    /^\d+\s+TPD\/.*$/i, // 1955651 TPD/1648955 (with item number prefix)
    /^INSTANT\s*SAVINGS/i, // INSTANT SAVINGS
    /^MEMBER\s*(DISC|SAVINGS)/i, // MEMBER DISC, MEMBER SAVINGS
    /^WAREHOUSE\s*COUPON/i, // WAREHOUSE COUPON
    /^MANUFACTURER\s*COUPON/i, // MANUFACTURER COUPON

    // Walmart patterns
    /^ROLLBACK/i, // ROLLBACK
    /^CLEARANCE/i, // CLEARANCE
    /^SPECIAL\s*(BUY|PURCHASE)/i, // SPECIAL BUY, SPECIAL PURCHASE
    /^MANAGER\s*SPECIAL/i, // MANAGER SPECIAL
    /^MARKDOWN/i, // MARKDOWN
    /^WALMART\s*COUPON/i, // WALMART COUPON
    /^STORE\s*COUPON/i, // STORE COUPON
    /^DIGITAL\s*COUPON/i, // DIGITAL COUPON
    /^MFR\s*COUPON/i, // MFR COUPON (manufacturer coupon)
    /^WALMART\+\s*DISCOUNT/i, // WALMART+ DISCOUNT
    /^MEMBER\s*PRICE/i, // MEMBER PRICE
    /^SCAN\s*&\s*GO\s*DISCOUNT/i, // SCAN & GO DISCOUNT
    /^GROCERY\s*PICKUP\s*DISCOUNT/i, // GROCERY PICKUP DISCOUNT
    /^ONLINE\s*GROCERY\s*DISCOUNT/i, // ONLINE GROCERY DISCOUNT
    /^PRICE\s*MATCH/i, // PRICE MATCH
    /^AD\s*MATCH/i, // AD MATCH
    /^WAS\s+\$[\d,]+\.\d{2}\s+NOW\s+\$[\d,]+\.\d{2}/i, // Was $5.99 Now $3.99

    // Generic patterns
    /^DISC(OUNT)?/i, // DISCOUNT, DISC
    /^ADJ(USTMENT)?/i, // ADJUSTMENT, ADJ
    /^REFUND/i, // REFUND
    /^CREDIT/i, // CREDIT
    /^COUPON/i, // Generic COUPON
    /^\$?\d+\.?\d*\s*(OFF|DISCOUNT)/i, // $5 OFF, 10% DISCOUNT
    /^-\$?\d+/, // -$5.00
    /^STORE\s*CREDIT/i, // STORE CREDIT
    /^SAVINGS/i, // Generic SAVINGS
  ];

  // Fee patterns (additional charges, not discounts)
  private readonly feePatterns = [
    /^ECO\s*FEE/i, // ECO FEE BAT, ECO FEE
    /^ENV(?:IRO)?\s*FEE/i, // ENVIRONMENTAL FEE, ENVIRO FEE
    /^(BOTTLE\s*)?DEPOSIT/i, // DEPOSIT, BOTTLE DEPOSIT
    /^RECYCLING\s*FEE/i, // RECYCLING FEE
    /^BAG\s*FEE/i, // BAG FEE
    /^SERVICE\s*FEE/i, // SERVICE FEE
  ];

  // Non-product patterns (receipt metadata, store fixtures, etc.)
  private readonly nonProductPatterns = [
    // Receipt metadata
    /^CUSTOMER\s*COPY/i, // CUSTOMER COPY
    /^MERCHANT\s*COPY/i, // MERCHANT COPY
    /^STORE\s*COPY/i, // STORE COPY
    /^RECEIPT\s*(#|NO|NUMBER)/i, // RECEIPT #, RECEIPT NO
    /^TRANSACTION\s*(#|NO|ID)/i, // TRANSACTION #
    /^CASHIER\s*(#|NO|ID)/i, // CASHIER #
    /^REGISTER\s*(#|NO)/i, // REGISTER #
    /^TILL\s*(#|NO)/i, // TILL #
    /^THANK\s*YOU/i, // THANK YOU
    /^HAVE\s*A\s*(NICE|GREAT)\s*DAY/i, // HAVE A NICE DAY
    /^PLEASE\s*COME\s*AGAIN/i, // PLEASE COME AGAIN
    /^SURVEY/i, // SURVEY

    // Store fixtures and infrastructure
    /^SHOPPING\s*CART/i, // SHOPPING CART
    /^BASKET/i, // BASKET (unless clearly food product)
    /^HANGAR/i, // HANGAR
    /^DISPLAY/i, // DISPLAY
    /^SHELF/i, // SHELF
    /^FIXTURE/i, // FIXTURE

    // Partial/incomplete product names that are too generic
    /^[A-Z]{1,3}$/, // Single letters or very short abbreviations (A, B, AB, etc.)
    /^\d+$/, // Pure numbers
    /^\.+$/, // Just dots
    /^-+$/, // Just dashes

    // Common OCR errors
    /^[^A-Z0-9\s]+$/, // Only special characters
    /^\s*$/, // Only whitespace

    // Store operational items
    /^TRAINING\s*MODE/i, // TRAINING MODE
    /^TEST\s*TRANSACTION/i, // TEST TRANSACTION
    /^VOID\s*RECEIPT/i, // VOID RECEIPT
    /^NO\s*SALE/i, // NO SALE
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
    private readonly vectorEmbeddingService: VectorEmbeddingService,
  ) {}

  /**
   * Main normalization method - orchestrates the entire process
   */
  async normalizeProduct(
    options: ProductNormalizationOptions,
  ): Promise<NormalizationResult> {
    const {
      merchant: originalMerchant,
      rawName,
      itemCode,
      useAI = true,
      similarityThreshold = 0.85,
    } = options;

    // Normalize merchant name for consistency
    const merchant = this.normalizeMerchantName(originalMerchant);

    this.logger.debug(`Normalizing product: ${rawName} from ${merchant}`);

    // Step 1: Clean the raw name (with store context)
    const cleanedName = this.cleanRawName(rawName, merchant);

    // Step 2: Check if it's a non-product item first (highest priority filter)
    const isNonProduct = this.isNonProduct(cleanedName);
    if (isNonProduct) {
      this.logger.debug(`Skipping non-product item: ${rawName}`);
      // Return a special result indicating this should be ignored
      return {
        normalizedName: cleanedName,
        confidenceScore: 0.0, // Zero confidence to indicate this shouldn't be stored
        isDiscount: false,
        isAdjustment: false,
        isFee: false,
        itemCode,
        method: 'non_product_filtered',
      };
    }

    // Step 3: Check if it's a discount, adjustment, or fee line (with store-specific patterns)
    const isDiscount = this.isDiscountLine(cleanedName, merchant);
    const isAdjustment = this.isAdjustmentLine(cleanedName);
    const isFee = this.isFee(cleanedName);

    if (isDiscount || isAdjustment || isFee) {
      const result: NormalizationResult = {
        normalizedName: cleanedName,
        confidenceScore: isFee ? 0.0 : 1.0, // Don't store fees as products (set confidence to 0)
        isDiscount,
        isAdjustment,
        isFee,
        itemCode,
        method: isDiscount
          ? 'discount_detected'
          : isAdjustment
            ? 'adjustment_detected'
            : 'fee_detected',
      };

      // Store discounts and adjustments, but skip storing fees as products
      if (!isFee) {
        await this.storeNormalizationResult(merchant, rawName, result);
      } else {
        this.logger.debug(`Fee detected but not stored as product: ${rawName}`);
      }
      return result;
    }

    // Step 4: Check for exact match
    const exactMatch = await this.findExactMatch(rawName, merchant);
    if (exactMatch) {
      await this.updateMatchingStatistics(exactMatch);
      const result = this.convertEntityToResult(exactMatch);
      result.method = 'exact_match';
      return result;
    }

    // Step 5: Check for similar products using embeddings
    try {
      const embeddingSimilarProducts =
        await this.vectorEmbeddingService.findSimilarProductsEnhanced({
          queryText: cleanedName,
          merchant, // Use the already normalized merchant from step above
          similarityThreshold,
          limit: 5,
          includeDiscounts: false,
          includeAdjustments: false,
        });

      if (embeddingSimilarProducts.length > 0) {
        const bestMatch = embeddingSimilarProducts[0];

        // Only use embedding match if similarity is very high
        if (bestMatch.similarity >= similarityThreshold) {
          await this.updateMatchingStatistics(bestMatch.normalizedProduct);
          const result = this.convertEntityToResult(
            bestMatch.normalizedProduct,
          );
          result.method = 'embedding_match';
          result.confidenceScore = bestMatch.similarity; // Use similarity as confidence

          // Add similar products info
          result.similarProducts = embeddingSimilarProducts.map(
            (embedResult) => ({
              productId: embedResult.productId,
              similarity: embedResult.similarity,
              normalizedName: embedResult.normalizedProduct.normalizedName,
              merchant: embedResult.normalizedProduct.merchant,
            }),
          );

          this.logger.debug(
            `Found embedding match with similarity ${bestMatch.similarity}`,
          );
          return result;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Embedding search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue with other methods if embedding search fails
    }

    // Step 6: Use AI normalization if enabled
    if (useAI) {
      const aiResult = await this.callLLMNormalization(
        cleanedName,
        merchant,
        itemCode,
      );
      aiResult.method = 'ai_generated';
      await this.storeNormalizationResult(merchant, rawName, aiResult);
      return aiResult;
    }

    // Step 7: Fallback - return cleaned name with low confidence
    const fallbackResult: NormalizationResult = {
      normalizedName: cleanedName,
      confidenceScore: 0.3,
      isDiscount: false,
      isAdjustment: false,
      itemCode,
      method: 'fallback',
    };

    await this.storeNormalizationResult(merchant, rawName, fallbackResult);
    return fallbackResult;
  }

  /**
   * Clean and preprocess the raw product name
   */
  cleanRawName(rawName: string, merchant?: string): string {
    let cleaned = rawName
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-./&]/g, '') // Remove special chars except common ones
      .toUpperCase(); // Standardize casing

    // Expand store-specific abbreviated brand names if merchant is known
    if (merchant) {
      cleaned = this.expandStoreBrandAbbreviations(cleaned, merchant);
    }

    return cleaned;
  }

  /**
   * Expand common Walmart brand abbreviations
   */
  private expandWalmartAbbreviations(name: string): string {
    // Common Walmart brand abbreviations
    const abbreviations: Array<[RegExp, string]> = [
      [/^GV\s+/i, 'GREAT VALUE '], // GV followed by space
      [/^GV([A-Z])/i, 'GREAT VALUE $1'], // GV followed by uppercase letter (e.g., GVLASAGNA)
      [/^EQ\s+/i, 'EQUATE '],
      [/^EQ([A-Z])/i, 'EQUATE $1'],
      [/^MS\s+/i, 'MAINSTAYS '],
      [/^MS([A-Z])/i, 'MAINSTAYS $1'],
      [/^PC\s+/i, 'PARENTS CHOICE '],
      [/^PC([A-Z])/i, 'PARENTS CHOICE $1'],
      [/^MKS\s+/i, 'MARKETSIDE '],
      [/^MKS([A-Z])/i, 'MARKETSIDE $1'],
      [/^FG\s+/i, 'FRESHNESS GUARANTEED '],
      [/^FG([A-Z])/i, 'FRESHNESS GUARANTEED $1'],
      [/^OT\s+/i, 'OZARK TRAIL '],
      [/^OT([A-Z])/i, 'OZARK TRAIL $1'],
      [/^AW\s+/i, 'ATHLETIC WORKS '],
      [/^AW([A-Z])/i, 'ATHLETIC WORKS $1'],
      [/^HT\s+/i, 'HYPER TOUGH '],
      [/^HT([A-Z])/i, 'HYPER TOUGH $1'],
    ];

    // Check if name starts with any abbreviation
    for (const [pattern, replacement] of abbreviations) {
      if (pattern.test(name)) {
        name = name.replace(pattern, replacement);
        break; // Only expand one abbreviation
      }
    }

    return name;
  }

  /**
   * Expand store-specific brand abbreviations using grocery store constants
   */
  private expandStoreBrandAbbreviations(
    name: string,
    merchant: string,
  ): string {
    const storeNormalizationCriteria = getStoreNormalizationCriteria(merchant);

    if (!storeNormalizationCriteria.commonPatterns) {
      // Fallback to Walmart-specific logic for backward compatibility
      const groceryChain = findGroceryChainByName(merchant);
      if (groceryChain?.normalizedName === 'Walmart') {
        return this.expandWalmartAbbreviations(name);
      }
      return name;
    }

    // Apply store-specific pattern expansions
    let expandedName = name;

    for (const pattern of storeNormalizationCriteria.commonPatterns) {
      // Handle common abbreviation patterns
      if (pattern.includes(' ')) {
        // Full brand name pattern - expand common abbreviations
        const brandWords = pattern.trim().split(' ');
        const abbreviation = brandWords.map((word) => word.charAt(0)).join('');

        // Create regex patterns for abbreviation matching
        const patterns = [
          new RegExp(`^${abbreviation}\\s+`, 'i'), // "GV " -> "GREAT VALUE "
          new RegExp(`^${abbreviation}([A-Z])`, 'i'), // "GV" followed by uppercase -> "GREAT VALUE $1"
        ];

        for (const regex of patterns) {
          if (regex.test(expandedName)) {
            const replacement = regex.source.includes('\\s+')
              ? `${pattern.toUpperCase()} `
              : `${pattern.toUpperCase()} $1`;
            expandedName = expandedName.replace(regex, replacement);
            break;
          }
        }
      }
    }

    return expandedName;
  }

  /**
   * Check if the line represents a discount
   * Enhanced with store-specific discount indicators
   */
  isDiscountLine(cleanedName: string, merchant?: string): boolean {
    // First check general discount patterns
    const hasGeneralDiscountPattern = this.discountPatterns.some((pattern) =>
      pattern.test(cleanedName),
    );

    if (hasGeneralDiscountPattern) {
      return true;
    }

    // If merchant is provided, check store-specific discount indicators
    if (merchant) {
      const storeNormalizationCriteria =
        getStoreNormalizationCriteria(merchant);

      if (storeNormalizationCriteria.discountIndicators) {
        const upperCleanedName = cleanedName.toUpperCase();
        return storeNormalizationCriteria.discountIndicators.some((indicator) =>
          upperCleanedName.includes(indicator.toUpperCase()),
        );
      }
    }

    return false;
  }

  /**
   * Check if the line represents an adjustment
   */
  isAdjustmentLine(cleanedName: string): boolean {
    return this.adjustmentPatterns.some((pattern) => pattern.test(cleanedName));
  }

  /**
   * Check if the line represents a fee (additional charge)
   */
  isFee(cleanedName: string): boolean {
    return this.feePatterns.some((pattern) => pattern.test(cleanedName));
  }

  /**
   * Check if the line represents a non-product item (receipt metadata, store fixtures, etc.)
   */
  isNonProduct(cleanedName: string): boolean {
    return this.nonProductPatterns.some((pattern) => pattern.test(cleanedName));
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
    this.logger.debug(`AI normalization for: ${cleanedName} at ${merchant}`);

    try {
      // Check if OpenAI is configured
      if (!this.openAIService.isConfigured()) {
        this.logger.debug(
          'OpenAI not configured, using fallback normalization',
        );
        return this.getFallbackNormalizationWithStoreContext(
          cleanedName,
          merchant,
          itemCode,
        );
      }

      // Identify store pattern for enhanced context
      const storePattern = StorePatternMatcher.identifyStore(merchant);

      // Build store-specific context
      let context = `This is a receipt item from ${merchant}`;
      if (storePattern) {
        this.logger.debug(`Identified store pattern: ${storePattern.storeId}`);

        // Add store-specific context
        context = `This is a receipt item from ${merchant} (${storePattern.storeId} - ${storePattern.chain || 'Unknown Chain'})
        
Store-specific context:
- Store brands available (use ONLY when item is actually that brand): ${storePattern.normalizationHints.commonBrands.join(', ')}
${
  storePattern.normalizationHints.categoryMappings
    ? `- Store category mappings: ${JSON.stringify(storePattern.normalizationHints.categoryMappings)}`
    : ''
}

Store-specific instructions for ${storePattern.storeId}:
${this.getStoreSpecificInstructions(storePattern.storeId)}`;
      }

      // Call OpenAI for normalization with enhanced context
      const llmResponse = await this.openAIService.normalizeProductWithLLM({
        rawName: cleanedName,
        merchant,
        itemCode,
        context,
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

      // Fall back to pattern-based normalization on error with store context
      return this.getFallbackNormalizationWithStoreContext(
        cleanedName,
        merchant,
        itemCode,
      );
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
   * Enhanced fallback normalization with store context
   */
  private getFallbackNormalizationWithStoreContext(
    cleanedName: string,
    merchant: string,
    itemCode?: string,
  ): NormalizationResult {
    const storePattern = StorePatternMatcher.identifyStore(merchant);

    if (!storePattern) {
      // Use regular fallback if no store pattern found
      return this.getFallbackNormalization(cleanedName, itemCode);
    }

    this.logger.debug(
      `Using store-specific fallback for ${storePattern.storeId}`,
    );

    let brand: string | undefined;
    let category: string | undefined;

    // Check for store-specific brands first
    for (const storeBrand of storePattern.normalizationHints.commonBrands) {
      if (cleanedName.toLowerCase().includes(storeBrand.toLowerCase())) {
        brand = storeBrand;
        break;
      }
    }

    // If no store brand found, check common patterns
    if (!brand) {
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
    }

    // Apply store-specific category mappings
    if (storePattern.normalizationHints.categoryMappings) {
      for (const [storeCategory, standardCategory] of Object.entries(
        storePattern.normalizationHints.categoryMappings,
      )) {
        if (cleanedName.toLowerCase().includes(storeCategory.toLowerCase())) {
          category = standardCategory;
          break;
        }
      }
    }

    // Generic category inference if no store-specific mapping found
    if (!category) {
      if (
        cleanedName.includes('MILK') ||
        cleanedName.includes('CHEESE') ||
        cleanedName.includes('YOGURT')
      ) {
        category = 'Dairy & Eggs';
      } else if (
        cleanedName.includes('BREAD') ||
        cleanedName.includes('BAGEL') ||
        cleanedName.includes('MUFFIN')
      ) {
        category = 'Bakery & Bread';
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
        category = 'Meat & Seafood';
      }
    }

    return {
      normalizedName: cleanedName,
      brand,
      category,
      confidenceScore: 0.6, // Slightly higher confidence due to store context
      isDiscount: false,
      isAdjustment: false,
      itemCode,
    };
  }

  /**
   * Get store-specific normalization instructions
   */
  private getStoreSpecificInstructions(storeId: string): string {
    const instructions: Record<string, string> = {
      COSTCO: `
- ONLY use "Kirkland Signature" as the brand for items that are actually Kirkland store-brand products
- Recognize and preserve actual brand names: CK = Calvin Klein, HLSTN = Houston, Nike, Adidas, etc.
- Do NOT default to Kirkland Signature for all items - identify the correct brand from the product name
- Items are typically sold in bulk quantities - normalize to individual units when possible
- Look for membership pricing indicators (* asterisk means sale price)
- Handle "INSTANT SAVINGS" as discounts, not separate products
- TPD/[number] format indicates "Total Price Discount" on item with that number
- Item numbers usually appear at the beginning of product lines`,

      WALMART: `
- Prioritize Great Value, Equate, Mainstays, Parent's Choice as store brands
- "ROLLBACK" indicates temporary price reduction, not a separate discount item
- Handle department codes that may appear before item names
- "Was/Now" pricing should be processed as current price with original price context`,

      // TODO: Add instructions for Canadian grocery chains when implemented
      // SAVE_ON_FOODS: `...`,
      // SAFEWAY: `...`,
      // LOBLAWS: `...`,
      // METRO: `...`,
      // SOBEYS: `...`,
    };

    return (
      instructions[storeId] || 'Apply standard product normalization rules.'
    );
  }

  /**
   * Public method to store normalization result (used by OCR service)
   */
  async storeResult(
    merchant: string,
    rawName: string,
    result: NormalizationResult,
  ): Promise<NormalizedProduct> {
    // Normalize merchant name to prevent duplicates
    const normalizedMerchant = this.normalizeMerchantName(merchant);
    return await this.storeNormalizationResult(
      normalizedMerchant,
      rawName,
      result,
    );
  }

  /**
   * Normalize merchant names to prevent duplicates from inconsistent naming
   * Uses canonical merchant names to ensure consistency across the system
   */
  private normalizeMerchantName(merchant: string): string {
    const normalized = merchant.trim().toLowerCase();

    // Define merchant name mappings for common variations
    // IMPORTANT: All variations of the same merchant should map to the same canonical name
    const merchantMappings: Record<string, string> = {
      // Costco variations - use "Costco Wholesale" as canonical
      costco: 'Costco Wholesale',
      'costco wholesale': 'Costco Wholesale',

      // Walmart variations - use "Walmart" as canonical
      walmart: 'Walmart',
      'walmart supercenter': 'Walmart',

      // Other major retailers
      target: 'Target',
      'whole foods': 'Whole Foods Market',
      'whole foods market': 'Whole Foods Market',
      'trader joes': "Trader Joe's",
      "trader joe's": "Trader Joe's",
      kroger: 'Kroger',
      safeway: 'Safeway',
      albertsons: 'Albertsons',
      publix: 'Publix',
      'harris teeter': 'Harris Teeter',
      wegmans: 'Wegmans',
      'stop & shop': 'Stop & Shop',
      giant: 'Giant',
      'food lion': 'Food Lion',
      'king soopers': 'King Soopers',
      'fred meyer': 'Fred Meyer',
      qfc: 'QFC',
      "ralph's": "Ralph's",
      ralphs: "Ralph's",
    };

    // Return mapped value or properly capitalized original
    const mappedName = merchantMappings[normalized];
    if (mappedName) {
      this.logger.debug(`Normalized merchant: "${merchant}" → "${mappedName}"`);
      return mappedName;
    }

    return this.capitalizeWords(merchant.trim());
  }

  /**
   * Capitalize each word in a string (for unknown merchants)
   */
  private capitalizeWords(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Store normalization result in the database with embedding
   * Skip storage for non-product items (confidence score 0.0)
   */
  private async storeNormalizationResult(
    merchant: string,
    rawName: string,
    result: NormalizationResult,
  ): Promise<NormalizedProduct> {
    // Skip storing non-product items and fees
    if (
      (result.confidenceScore === 0.0 &&
        result.method === 'non_product_filtered') ||
      (result.confidenceScore === 0.0 && result.method === 'fee_detected')
    ) {
      this.logger.debug(`Skipping storage for non-product item: ${rawName}`);
      // Create a dummy normalized product object to satisfy the return type
      // This won't be saved to the database
      return this.normalizedProductRepository.create({
        rawName,
        merchant,
        itemCode: result.itemCode,
        normalizedName: result.normalizedName,
        brand: result.brand,
        category: result.category,
        confidenceScore: result.confidenceScore,
        embedding: undefined,
        isDiscount: result.isDiscount,
        isAdjustment: result.isAdjustment,
        matchCount: 0, // Zero match count for non-products
        lastMatchedAt: new Date(),
      });
    }
    // Normalize merchant name for consistent lookups
    const normalizedMerchant = this.normalizeMerchantName(merchant);

    // First check for exact match to avoid duplicate key errors
    const exactMatch = await this.findExactMatch(rawName, normalizedMerchant);
    if (exactMatch) {
      this.logger.debug(
        `Exact match found for ${rawName} from ${normalizedMerchant}. Using existing record.`,
      );

      // IMPORTANT: Re-validate if this should be a discount/adjustment based on current rules
      // This handles cases where items were previously saved incorrectly as products
      const cleanedName = this.cleanRawName(rawName);
      const isDiscount = this.isDiscountLine(cleanedName, normalizedMerchant);
      const isAdjustment = this.isAdjustmentLine(cleanedName);

      if (isDiscount || isAdjustment) {
        this.logger.debug(
          `Existing record for ${rawName} should be a ${isDiscount ? 'discount' : 'adjustment'}. Updating database record.`,
        );
        // Update the existing record's flags in database and return it
        exactMatch.isDiscount = isDiscount;
        exactMatch.isAdjustment = isAdjustment;
        await this.normalizedProductRepository.save(exactMatch);
        await this.updateMatchingStatistics(exactMatch);
        return exactMatch;
      }

      // Update match statistics and return existing product (unchanged)
      await this.updateMatchingStatistics(exactMatch);
      return exactMatch;
    }

    // Check for comprehensive duplicates (similar products)
    const existingProduct = await this.findComprehensiveDuplicate(
      normalizedMerchant,
      rawName,
      result,
    );

    if (existingProduct) {
      this.logger.debug(
        `Comprehensive duplicate found for ${rawName} from ${normalizedMerchant}. Using existing record.`,
      );
      // Update match statistics and return existing product
      await this.updateMatchingStatistics(existingProduct);
      return existingProduct;
    }

    // Create product without embedding first for faster response
    const normalizedProduct = this.normalizedProductRepository.create({
      rawName,
      merchant: normalizedMerchant, // Use normalized merchant name
      itemCode: result.itemCode,
      normalizedName: result.normalizedName,
      brand: result.brand,
      category: result.category,
      confidenceScore: result.confidenceScore,
      embedding: undefined, // Will be generated asynchronously
      isDiscount: result.isDiscount,
      isAdjustment: result.isAdjustment,
      matchCount: 1,
      lastMatchedAt: new Date(),
    });

    try {
      const savedProduct =
        await this.normalizedProductRepository.save(normalizedProduct);

      // Generate embedding asynchronously in the background
      this.generateAndUpdateEmbeddingAsync(savedProduct);

      return savedProduct;
    } catch (error: any) {
      // Handle ANY duplicate key error (PostgreSQL error code 23505)
      // Don't rely on specific constraint names since they can change
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      if (error.code === '23505') {
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        this.logger.debug(
          `Concurrent insert detected for ${rawName} from ${normalizedMerchant}. Retrieving existing record.`,
        );

        // Another request created this product concurrently, retrieve the existing one
        const concurrentExistingProduct = await this.findExactMatch(
          rawName,
          normalizedMerchant,
        );
        if (concurrentExistingProduct) {
          // Update the existing product's match statistics and return it
          await this.updateMatchingStatistics(concurrentExistingProduct);
          return concurrentExistingProduct;
        }

        // If we still can't find it, log warning but don't crash
        this.logger.warn(
          `Could not find product after duplicate key error: ${rawName} from ${normalizedMerchant}`,
        );
        // Return a minimal product object to prevent crash
        return normalizedProduct;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Find comprehensive duplicate based on core criteria: normalized_name, brand, confidence_score
   * Enhanced with merchant normalization and semantic duplicate detection
   */
  private async findComprehensiveDuplicate(
    merchant: string,
    rawName: string,
    result: NormalizationResult,
  ): Promise<NormalizedProduct | null> {
    // Normalize merchant to catch variations like "Costco" vs "Costco Wholesale"
    const normalizedMerchant = this.normalizeMerchantName(merchant);

    // Strategy 1: Search by semantic product information (normalized_name + brand)
    // This catches the same product with different raw_name variations or merchant name inconsistencies
    const semanticSearchConditions: {
      normalizedName: string;
      brand?: string;
      isDiscount: boolean;
      isAdjustment: boolean;
    } = {
      normalizedName: result.normalizedName,
      isDiscount: result.isDiscount,
      isAdjustment: result.isAdjustment,
    };

    // Add brand to semantic search if available
    if (result.brand) {
      semanticSearchConditions.brand = result.brand;
    }

    // First check with normalized merchant name
    const semanticCandidates = await this.normalizedProductRepository.find({
      where: {
        ...semanticSearchConditions,
        merchant: normalizedMerchant,
      },
    });

    // Check semantic candidates first (highest chance of being duplicates)
    for (const candidate of semanticCandidates) {
      const isDuplicate = this.isSemanticDuplicate(candidate, result);
      if (isDuplicate) {
        this.logger.debug(
          `Found semantic duplicate: ${candidate.normalizedName} (brand: ${candidate.brand}) from ${candidate.merchant}`,
        );
        return candidate;
      }
    }

    // Strategy 2: Search across merchant name variations for the same semantic product
    // This handles cases where the same store has different name formats
    const merchantVariations = this.getMerchantVariations(merchant);
    for (const merchantVariation of merchantVariations) {
      if (merchantVariation === normalizedMerchant) continue; // Skip already checked

      const variationCandidates = await this.normalizedProductRepository.find({
        where: {
          ...semanticSearchConditions,
          merchant: merchantVariation,
        },
      });

      for (const candidate of variationCandidates) {
        const isDuplicate = this.isSemanticDuplicate(candidate, result);
        if (isDuplicate) {
          this.logger.debug(
            `Found semantic duplicate across merchant variations: ${candidate.normalizedName} from ${candidate.merchant}`,
          );
          return candidate;
        }
      }
    }

    // Strategy 3: Search by core product information with exact merchant match (legacy behavior)
    const coreSearchConditions: {
      merchant: string;
      normalizedName: string;
      brand?: string;
    } = {
      merchant: normalizedMerchant,
      normalizedName: result.normalizedName,
    };

    // Add brand to core search if available
    if (result.brand) {
      coreSearchConditions.brand = result.brand;
    }

    const coreCandidates = await this.normalizedProductRepository.find({
      where: coreSearchConditions,
    });

    // Check core candidates
    for (const candidate of coreCandidates) {
      const isDuplicate = this.isComprehensiveDuplicate(candidate, result);
      if (isDuplicate) {
        this.logger.debug(
          `Found duplicate via core search: ${candidate.normalizedName} (brand: ${candidate.brand})`,
        );
        return candidate;
      }
    }

    // Strategy 4: Search by raw_name + merchant (exact match fallback)
    const rawNameCandidates = await this.normalizedProductRepository.find({
      where: {
        rawName,
        merchant: normalizedMerchant,
        // Include item_code in the search if provided
        ...(result.itemCode && { itemCode: result.itemCode }),
      },
    });

    // Check raw name candidates
    for (const candidate of rawNameCandidates) {
      const isDuplicate = this.isComprehensiveDuplicate(candidate, result);
      if (isDuplicate) {
        this.logger.debug(
          `Found duplicate via raw name search: ${candidate.normalizedName}`,
        );
        return candidate;
      }
    }

    return null;
  }

  /**
   * Check if a candidate product is a semantic duplicate
   * Focuses on core product identity: normalized_name + brand + product type flags
   */
  private isSemanticDuplicate(
    candidate: NormalizedProduct,
    result: NormalizationResult,
  ): boolean {
    // Helper function to normalize null/undefined values for comparison
    const normalizeValue = (
      value: string | undefined | null,
    ): string | null => {
      return value === undefined ? null : value;
    };

    // Core semantic matching: product identity should be the same
    const sameNormalizedName =
      candidate.normalizedName === result.normalizedName;
    const sameBrand =
      normalizeValue(candidate.brand) === normalizeValue(result.brand);
    const sameIsDiscount = candidate.isDiscount === result.isDiscount;
    const sameIsAdjustment = candidate.isAdjustment === result.isAdjustment;

    // For semantic duplicates, we care about the core product identity
    const isSemanticDuplicate =
      sameNormalizedName && sameBrand && sameIsDiscount && sameIsAdjustment;

    if (isSemanticDuplicate) {
      this.logger.debug(
        `Found semantic duplicate: ${candidate.normalizedName} with brand ${candidate.brand}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Get possible merchant name variations to check for duplicates
   */
  private getMerchantVariations(merchant: string): string[] {
    const variations: string[] = [];
    const normalizedMerchant = merchant.trim().toLowerCase();

    // Define common merchant name variations
    const merchantVariationsMap: Record<string, string[]> = {
      costco: ['Costco', 'Costco Wholesale'],
      'costco wholesale': ['Costco', 'Costco Wholesale'],
      walmart: ['Walmart', 'Walmart Supercenter'],
      'walmart supercenter': ['Walmart', 'Walmart Supercenter'],
      target: ['Target'],
      'whole foods': ['Whole Foods', 'Whole Foods Market'],
      'whole foods market': ['Whole Foods', 'Whole Foods Market'],
      'trader joes': ["Trader Joe's"],
      "trader joe's": ["Trader Joe's"],
    };

    // Get variations for this merchant
    if (merchantVariationsMap[normalizedMerchant]) {
      variations.push(...merchantVariationsMap[normalizedMerchant]);
    } else {
      // If no specific variations defined, use the normalized version
      variations.push(this.normalizeMerchantName(merchant));
    }

    // Remove duplicates and return
    return [...new Set(variations)];
  }

  /**
   * Check if a candidate product is a comprehensive duplicate
   * Primary check: normalized_name, brand, and confidence_score must match
   * Secondary check: ALL fields must match for complete duplicate
   */
  private isComprehensiveDuplicate(
    candidate: NormalizedProduct,
    result: NormalizationResult,
  ): boolean {
    // Helper function to normalize null/undefined values for comparison
    const normalizeValue = (
      value: string | undefined | null,
    ): string | null => {
      return value === undefined ? null : value;
    };

    // PRIMARY DUPLICATE CHECK: Core product information
    const sameNormalizedName =
      candidate.normalizedName === result.normalizedName;
    const sameBrand =
      normalizeValue(candidate.brand) === normalizeValue(result.brand);

    // Check if confidence scores are the same (within a small tolerance)
    const confidenceThreshold = 0.001; // Allow small floating point differences
    const sameConfidenceScore =
      Math.abs(candidate.confidenceScore - result.confidenceScore) <
      confidenceThreshold;

    // If core product info matches, consider it a duplicate
    const isCoreProductDuplicate =
      sameNormalizedName && sameBrand && sameConfidenceScore;

    if (isCoreProductDuplicate) {
      this.logger.debug(
        `Found core duplicate: ${candidate.normalizedName} with brand ${candidate.brand} and confidence ${candidate.confidenceScore}`,
      );
      return true;
    }

    // SECONDARY CHECK: All fields must match for complete duplicate (legacy logic)
    const sameCategory =
      normalizeValue(candidate.category) === normalizeValue(result.category);
    const sameItemCode =
      normalizeValue(candidate.itemCode) === normalizeValue(result.itemCode);
    const sameIsDiscount = candidate.isDiscount === result.isDiscount;
    const sameIsAdjustment = candidate.isAdjustment === result.isAdjustment;

    const isCompleteDuplicate =
      sameNormalizedName &&
      sameBrand &&
      sameCategory &&
      sameItemCode &&
      sameIsDiscount &&
      sameIsAdjustment &&
      sameConfidenceScore;

    if (isCompleteDuplicate) {
      this.logger.debug(
        `Found comprehensive duplicate: ${candidate.normalizedName} (all fields match)`,
      );
      return true;
    }

    // Log detailed comparison for debugging
    if (!isCompleteDuplicate) {
      this.logger.debug(`Not a duplicate - differences found:`, {
        normalizedName: {
          candidate: candidate.normalizedName,
          result: result.normalizedName,
          match: sameNormalizedName,
        },
        brand: {
          candidate: candidate.brand,
          result: result.brand,
          match: sameBrand,
        },
        category: {
          candidate: candidate.category,
          result: result.category,
          match: sameCategory,
        },
        itemCode: {
          candidate: candidate.itemCode,
          result: result.itemCode,
          match: sameItemCode,
        },
        isDiscount: {
          candidate: candidate.isDiscount,
          result: result.isDiscount,
          match: sameIsDiscount,
        },
        isAdjustment: {
          candidate: candidate.isAdjustment,
          result: result.isAdjustment,
          match: sameIsAdjustment,
        },
        confidenceScore: {
          candidate: candidate.confidenceScore,
          result: result.confidenceScore,
          match: sameConfidenceScore,
        },
      });
    }

    return false;
  }

  /**
   * Generate embedding asynchronously and update the product in the background
   */
  private generateAndUpdateEmbeddingAsync(product: NormalizedProduct): void {
    // Use setImmediate to make this truly asynchronous and non-blocking
    setImmediate(() => {
      this.performEmbeddingGeneration(product).catch((error) => {
        this.logger.warn(
          `Background embedding generation failed for ${product.normalizedName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      });
    });
  }

  /**
   * Perform the actual embedding generation and update
   */
  private async performEmbeddingGeneration(
    product: NormalizedProduct,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Generating embedding asynchronously for product: ${product.normalizedName}`,
      );

      const embedding = await this.vectorEmbeddingService.generateEmbedding(
        product.normalizedName,
      );

      // Update the product with the generated embedding
      await this.normalizedProductRepository.update(
        { normalizedProductSk: product.normalizedProductSk },
        { embedding },
      );

      this.logger.debug(
        `Successfully updated embedding for product: ${product.normalizedName}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to generate/update embedding for ${product.normalizedName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Re-throw so the caller can handle it
      throw error;
    }
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
    // Normalize merchant name for consistency
    const normalizedMerchant = this.normalizeMerchantName(merchant);
    // Step 1: Normalize all items first
    const normalizedItems: NormalizationResult[] = [];

    for (const item of items) {
      // Parse the price to detect negative/discount amounts
      const parsedPrice = this.parsePrice(item.price, normalizedMerchant);

      // Check if price format indicates this is a discount
      const isPriceBasedDiscount = parsedPrice.isNegative;

      const result = await this.normalizeProduct({
        rawName: item.name,
        merchant: normalizedMerchant,
        itemCode: item.itemCode,
        useAI: true,
      });

      // Override discount detection if price format indicates discount
      if (isPriceBasedDiscount && !result.isDiscount) {
        result.isDiscount = true;
        result.isAdjustment = false;
        result.method = 'price_format_discount';
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
    return this.linkDiscountsToProducts(normalizedItems, merchant);
  }

  /**
   * Link discount items to their corresponding products
   */
  private linkDiscountsToProducts(
    items: NormalizationResult[],
    merchant?: string,
  ): NormalizationResult[] {
    const products = items.filter(
      (item) => !item.isDiscount && !item.isAdjustment && !item.isFee,
    );
    const discounts = items.filter((item) => item.isDiscount);
    const fees = items.filter((item) => item.isFee);

    // For Costco, use sequential linking (fees/deposits follow products)
    if (merchant && merchant.toUpperCase().includes('COSTCO')) {
      return this.linkDiscountsSequentially(items);
    }

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

    // For each fee, try to find the product it applies to (similar to discounts)
    for (const fee of fees) {
      const linkedProduct = this.findProductForFee(fee, products);

      if (linkedProduct) {
        // Add fee to product (similar to discounts but as positive charge)
        if (!linkedProduct.linkedDiscounts) {
          linkedProduct.linkedDiscounts = [];
        }

        const feeAmount = isExtendedNormalizationResult(fee)
          ? fee.originalPrice // Fees are positive amounts
          : 0;

        const feeLink: DiscountLink = {
          discountId: isExtendedNormalizationResult(fee)
            ? fee.originalIndex.toString()
            : 'unknown',
          discountAmount: feeAmount, // Positive for fees
          discountType: 'fixed',
          discountDescription: fee.normalizedName,
          confidence: this.calculateDiscountLinkConfidence(fee, linkedProduct),
        };

        linkedProduct.linkedDiscounts.push(feeLink);

        // Mark fee as applied to this product
        fee.appliedToProductId = isExtendedNormalizationResult(linkedProduct)
          ? linkedProduct.originalIndex.toString()
          : 'unknown';
      }
    }

    return items;
  }

  /**
   * Link discounts and fees sequentially for Costco receipts
   * In Costco receipts, fees and deposits immediately follow the product they apply to
   */
  private linkDiscountsSequentially(
    items: NormalizationResult[],
  ): NormalizationResult[] {
    let lastProduct: NormalizationResult | null = null;

    for (const item of items) {
      if (!item.isDiscount && !item.isAdjustment && !item.isFee) {
        // This is a product, update lastProduct
        lastProduct = item;
      } else if ((item.isDiscount || item.isFee) && lastProduct) {
        // This is a discount/fee that follows a product
        if (!lastProduct.linkedDiscounts) {
          lastProduct.linkedDiscounts = [];
        }

        const amount = isExtendedNormalizationResult(item)
          ? item.isFee
            ? item.originalPrice
            : Math.abs(item.originalPrice)
          : 0;

        const link: DiscountLink = {
          discountId: isExtendedNormalizationResult(item)
            ? item.originalIndex.toString()
            : 'unknown',
          discountAmount: amount,
          discountType: this.determineDiscountType(item.normalizedName, amount),
          discountDescription: item.normalizedName,
          confidence: 1.0, // High confidence for sequential linking
        };

        lastProduct.linkedDiscounts.push(link);

        // Mark as applied
        item.appliedToProductId = isExtendedNormalizationResult(lastProduct)
          ? lastProduct.originalIndex.toString()
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

    // Strategy 1: Costco TPD pattern handling
    // Handle both "TPD/1648955" and "1955651 TPD/1648955" formats
    let tpdMatch = discount.normalizedName.match(/^TPD\/(.+)$/i);
    if (!tpdMatch) {
      // Try pattern with item number prefix: "1955651 TPD/1648955"
      tpdMatch = discount.normalizedName.match(/^\d+\s+TPD\/(.+)$/i);
    }

    if (tpdMatch) {
      const tpdReference = tpdMatch[1].trim();

      // Pattern 1: TPD/[exact_item_number] - direct item number match
      if (/^\d+$/.test(tpdReference)) {
        const targetItemNumber = tpdReference;
        const targetProduct = products.find((product) => {
          return product.itemCode === targetItemNumber;
        });

        if (targetProduct) {
          return targetProduct;
        }
      }

      // Pattern 2: TPD/[product_type] - contextual matching (e.g., TPD/BATTERY)
      else {
        const targetProductType = tpdReference.toUpperCase();

        // For cases like TPD/BATTERY, we need to find the most recent product
        // that would logically be associated with this discount type
        // In Costco receipts, TPD items usually appear after their associated product

        // First, try to find products with similar keywords
        const keywordMatchProduct = products.find((product) => {
          const productName = product.normalizedName.toUpperCase();

          // Special case mappings for common Costco TPD patterns
          const productTypeKeywords: Record<string, string[]> = {
            BATTERY: [
              'OPTIMUM',
              'DURACELL',
              'ENERGIZER',
              'BATTERY',
              'ALKALINE',
            ],
            APPLE: ['APPLE', 'FRUIT'],
            ORGANIC: ['ORGANIC', 'ORG'],
            MILK: ['MILK', 'DAIRY'],
            MEAT: ['BEEF', 'CHICKEN', 'PORK', 'MEAT'],
          };

          if (productTypeKeywords[targetProductType]) {
            return productTypeKeywords[targetProductType].some((keyword) =>
              productName.includes(keyword),
            );
          }

          // Direct substring match
          return productName.includes(targetProductType);
        });

        if (keywordMatchProduct) {
          return keywordMatchProduct;
        }

        // Fallback: For TPD/[type] patterns, use the most recent product before this discount
        // This handles cases where the product type doesn't match exactly
        const recentProduct = products
          .filter(
            (p) =>
              isExtendedNormalizationResult(p) &&
              p.originalIndex < discountIndex,
          )
          .sort((a, b) => {
            const aIndex = isExtendedNormalizationResult(a)
              ? a.originalIndex
              : 0;
            const bIndex = isExtendedNormalizationResult(b)
              ? b.originalIndex
              : 0;
            return bIndex - aIndex;
          })[0];

        if (recentProduct) {
          return recentProduct;
        }
      }
    }

    // Strategy 2: Look for adjacent products (most common)
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

    // Strategy 3: Look for products with matching price patterns
    const matchingProducts = products.filter((product) => {
      const productPrice = isExtendedNormalizationResult(product)
        ? product.originalPrice
        : 0;
      return this.isDiscountAmountReasonable(discountAmount, productPrice);
    });

    if (matchingProducts.length === 1) {
      return matchingProducts[0];
    }

    // Strategy 4: Look for specific discount patterns that mention products
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

    // Strategy 5: Default to the most recent product if no clear match
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
   * Find the product that a fee should be linked to
   */
  private findProductForFee(
    fee: NormalizationResult,
    products: NormalizationResult[],
  ): NormalizationResult | null {
    const feeIndex = isExtendedNormalizationResult(fee) ? fee.originalIndex : 0;
    const feeName = fee.normalizedName.toUpperCase();

    // Strategy 1: Handle beverage-specific fees (DEPOSIT, ENVIRO FEE for bottles/cans)
    if (feeName.includes('DEPOSIT') || feeName.includes('ENVIRO FEE')) {
      // These fees only apply to beverages
      const beverageKeywords = [
        'WATER',
        'COKE',
        'COLA',
        'PEPSI',
        'SPRITE',
        'FANTA',
        '7UP',
        'BUBLY',
        'PERRIER',
        'SODA',
        'POP',
        'JUICE',
        'DRINK',
        'BEVERAGE',
        'BEER',
        'WINE',
        'LIQUOR',
        'ALCOHOL',
      ];

      // First, check the immediately preceding product (most common pattern)
      for (let i = 1; i <= 2; i++) {
        const adjacentIndex = feeIndex - i;
        const adjacentProduct = products.find(
          (p) =>
            isExtendedNormalizationResult(p) &&
            p.originalIndex === adjacentIndex,
        );

        if (adjacentProduct) {
          const productName = adjacentProduct.normalizedName.toUpperCase();
          const isBeverage = beverageKeywords.some((keyword) =>
            productName.includes(keyword),
          );

          if (isBeverage) {
            return adjacentProduct;
          }
        }
      }

      // If no adjacent beverage found, look for any beverage product before this fee
      const beverageProducts = products
        .filter((p) => {
          if (
            !isExtendedNormalizationResult(p) ||
            p.originalIndex >= feeIndex
          ) {
            return false;
          }
          const productName = p.normalizedName.toUpperCase();
          return beverageKeywords.some((keyword) =>
            productName.includes(keyword),
          );
        })
        .sort((a, b) => {
          const aIndex = isExtendedNormalizationResult(a) ? a.originalIndex : 0;
          const bIndex = isExtendedNormalizationResult(b) ? b.originalIndex : 0;
          return bIndex - aIndex; // Most recent first
        });

      if (beverageProducts.length > 0) {
        return beverageProducts[0];
      }

      // Don't link beverage fees to non-beverage products
      return null;
    }

    // Strategy 2: ECO FEE pattern handling (e.g., "ECO FEE BAT" links to battery products)
    // Note: "ECO FEE BAT" is treated as a product name, not an environmental fee
    const ecoFeeMatch = fee.normalizedName.match(/^ECO\s*FEE\s*(.+)$/i);
    if (ecoFeeMatch) {
      const feeType = ecoFeeMatch[1].trim().toUpperCase();

      // Find products with keywords matching the fee type
      const keywordMatchProduct = products.find((product) => {
        const productName = product.normalizedName.toUpperCase();

        // Special case mappings for common ECO FEE patterns
        const feeTypeKeywords: Record<string, string[]> = {
          BAT: ['OPTIMUM', 'DURACELL', 'ENERGIZER', 'BATTERY', 'ALKALINE'],
          BATTERY: ['OPTIMUM', 'DURACELL', 'ENERGIZER', 'BATTERY', 'ALKALINE'],
          ELECTRONIC: ['ELECTRONIC', 'DEVICE', 'GADGET'],
          TIRE: ['TIRE', 'WHEEL'],
          OIL: ['OIL', 'MOTOR', 'ENGINE'],
        };

        if (feeTypeKeywords[feeType]) {
          return feeTypeKeywords[feeType].some((keyword) =>
            productName.includes(keyword),
          );
        }

        // Direct substring match
        return productName.includes(feeType);
      });

      if (keywordMatchProduct) {
        return keywordMatchProduct;
      }
    }

    // Strategy 3: Look for adjacent products (for other non-specific fees)
    // Only check immediately adjacent items to avoid incorrect long-distance linking
    for (let i = 1; i <= 2; i++) {
      const adjacentIndex = feeIndex - i;
      const adjacentProduct = products.find(
        (p) =>
          isExtendedNormalizationResult(p) && p.originalIndex === adjacentIndex,
      );

      if (
        adjacentProduct &&
        !adjacentProduct.isDiscount &&
        !adjacentProduct.isAdjustment
      ) {
        return adjacentProduct;
      }
    }

    // Don't link fees to distant products - return null if no clear match
    return null;
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
