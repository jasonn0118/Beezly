/**
 * Store-specific receipt processing patterns and configurations
 */

export interface StorePattern {
  storeId: string;
  aliases: (string | RegExp)[]; // Different variations of store names
  chain?: string; // Parent company/chain
  country: string;
  receiptPatterns: {
    itemFormat: (string | RegExp)[]; // Common item line formats
    priceFormat: (string | RegExp)[]; // Price display patterns
    discountIndicators: string[]; // Discount/sale indicators
    taxCodes?: string[]; // Tax code patterns
    brandPatterns?: string[]; // Store brand identifiers
  };
  normalizationHints: {
    commonBrands: string[]; // Store brands to prioritize
    categoryMappings?: Record<string, string>; // Store-specific category names
    unitPatterns?: (string | RegExp)[]; // Unit/weight patterns
  };
}

export const STORE_PATTERNS: Record<string, StorePattern> = {
  COSTCO: {
    storeId: 'COSTCO',
    aliases: [
      'Costco',
      'Costco Wholesale',
      'COSTCO WHOLESALE',
      /Costco\s*(Wholesale)?\s*#?\d*/i,
    ],
    chain: 'Costco Wholesale Corporation',
    country: 'CA',
    receiptPatterns: {
      itemFormat: [
        /^\d+\s+(.+?)\s+\$?[\d,]+\.\d{2}$/,
        /^(.+?)\s+\$?[\d,]+\.\d{2}\s*[A-Z]?$/,
        /^TPD\/\d+\s+(.+?)\s+\$?[\d,]+\.\d{2}$/, // TPD discount format
      ],
      priceFormat: [
        /\$[\d,]+\.\d{2}/,
        /[\d,]+\.\d{2}/,
        /\$[\d,]+\.\d{2}\s*-\s*\$[\d,]+\.\d{2}/, // Instant savings format
      ],
      discountIndicators: [
        'INSTANT SAVINGS',
        'MEMBER SAVINGS',
        'MANUFACTURER COUPON',
        'WAREHOUSE COUPON',
        'TPD/', // Total Price Discount indicator
        '*', // Asterisk indicates sale price
      ],
      brandPatterns: ['KIRKLAND', 'KIRKLAND SIGNATURE'],
    },
    normalizationHints: {
      commonBrands: ['Kirkland Signature', 'Kirkland'],
      categoryMappings: {
        ORGANIC: 'Organic',
        FROZEN: 'Frozen Foods',
        PHARMACY: 'Health & Beauty',
      },
      unitPatterns: [
        /\d+\s*CT/i, // Count
        /\d+\s*LB/i, // Pounds
        /\d+\s*OZ/i, // Ounces
        /\d+\s*PK/i, // Pack
      ],
    },
  },

  WALMART: {
    storeId: 'WALMART',
    aliases: [
      'Walmart',
      'WALMART',
      'Wal-Mart',
      'WAL-MART',
      /Walmart\s*(Supercenter)?\s*#?\d*/i,
    ],
    chain: 'Walmart Inc.',
    country: 'CA',
    receiptPatterns: {
      itemFormat: [
        /^(.+?)\s+\$?[\d,]+\.\d{2}\s*[A-Z]*$/,
        /^\d{12,13}\s+(.+?)\s+\$?[\d,]+\.\d{2}$/,
      ],
      priceFormat: [
        /\$[\d,]+\.\d{2}/,
        /[\d,]+\.\d{2}/,
        /Was\s+\$[\d,]+\.\d{2}\s+Now\s+\$[\d,]+\.\d{2}/i,
      ],
      discountIndicators: [
        'ROLLBACK',
        'CLEARANCE',
        'SPECIAL BUY',
        'SAVINGS',
        'Was',
        'Now',
      ],
      taxCodes: ['T', 'N', 'F'], // Taxable, Non-taxable, Food
      brandPatterns: ['GREAT VALUE', 'EQUATE', 'MAINSTAYS', "PARENT'S CHOICE"],
    },
    normalizationHints: {
      commonBrands: ['Great Value', 'Equate', 'Mainstays', "Parent's Choice"],
      categoryMappings: {
        GROCERY: 'Pantry & Dry Goods',
        PRODUCE: 'Produce',
        DAIRY: 'Dairy & Eggs',
        MEAT: 'Meat & Seafood',
      },
    },
  },

  // TODO: Implement Canadian grocery chains
  // SAVE_ON_FOODS: { ... },
  // SAFEWAY: { ... },
  // LOBLAWS: { ... },
  // METRO: { ... },
  // SOBEYS: { ... },
};

/**
 * Store identification and normalization utilities
 */
export class StorePatternMatcher {
  /**
   * Identify store pattern from merchant name
   */
  static identifyStore(merchantName: string): StorePattern | null {
    if (!merchantName) return null;

    const cleanMerchant = merchantName.trim();

    for (const pattern of Object.values(STORE_PATTERNS)) {
      for (const alias of pattern.aliases) {
        if (typeof alias === 'string') {
          if (cleanMerchant.toLowerCase().includes(alias.toLowerCase())) {
            return pattern;
          }
        } else if (alias instanceof RegExp) {
          if (alias.test(cleanMerchant)) {
            return pattern;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get store-specific normalization prompt
   */
  static getStoreSpecificPrompt(
    storePattern: StorePattern,
    basePrompt: string,
  ): string {
    const storeContext = `
Store Context: ${storePattern.storeId} (${storePattern.chain || 'Unknown Chain'})
Common Store Brands: ${storePattern.normalizationHints.commonBrands.join(', ')}
${
  storePattern.normalizationHints.categoryMappings
    ? `Store Category Mappings: ${JSON.stringify(storePattern.normalizationHints.categoryMappings)}`
    : ''
}

Special Instructions for ${storePattern.storeId}:
${this.getStoreSpecificInstructions(storePattern.storeId)}

${basePrompt}`;

    return storeContext;
  }

  /**
   * Get store-specific processing instructions
   */
  private static getStoreSpecificInstructions(storeId: string): string {
    const instructions: Record<string, string> = {
      COSTCO: `
- Prioritize Kirkland Signature as the brand for store-brand items
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
   * Check if a price format matches store-specific discount patterns
   */
  static isStoreSpecificDiscount(
    priceString: string,
    storePattern: StorePattern,
  ): boolean {
    return storePattern.receiptPatterns.discountIndicators.some((indicator) =>
      priceString.toLowerCase().includes(indicator.toLowerCase()),
    );
  }
}
