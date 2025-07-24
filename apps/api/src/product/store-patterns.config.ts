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
      'Walmart Supercenter',
      'WALMART SUPERCENTER',
      'Walmart Neighborhood Market',
      'WALMART NEIGHBORHOOD MARKET',
      /Walmart\s*(Supercenter|Neighborhood\s*Market)?\s*#?\d*/i,
      /WAL-MART\s*(SUPERCENTER|SUPERSTORE)?\s*#?\d*/i,
    ],
    chain: 'Walmart Inc.',
    country: 'CA',
    receiptPatterns: {
      itemFormat: [
        // Standard item format with optional tax code
        /^(.+?)\s+\$?[\d,]+\.\d{2}\s*[TNFX]?$/,
        // UPC/barcode format
        /^\d{12,13}\s+(.+?)\s+\$?[\d,]+\.\d{2}\s*[TNFX]?$/,
        // Department code format (e.g., "001234567890 ITEM NAME 12.99 T")
        /^\d{3,4}\d{8,10}\s+(.+?)\s+\$?[\d,]+\.\d{2}\s*[TNFX]?$/,
        // Weight-based items (e.g., "BANANAS @ 1.48/LB 2.96 N")
        /^(.+?)\s+@\s+[\d.]+\/[A-Z]+\s+\$?[\d,]+\.\d{2}\s*[TNFX]?$/,
        // Pharmacy format (e.g., "RX 1234567 MEDICATION NAME 15.99 N")
        /^RX\s+\d+\s+(.+?)\s+\$?[\d,]+\.\d{2}\s*[TNFX]?$/,
      ],
      priceFormat: [
        /\$[\d,]+\.\d{2}/,
        /[\d,]+\.\d{2}/,
        // Rollback format
        /Was\s+\$[\d,]+\.\d{2}\s+Now\s+\$[\d,]+\.\d{2}/i,
        // Price with savings
        /\$[\d,]+\.\d{2}\s+\(Save\s+\$[\d,]+\.\d{2}\)/i,
        // Weight-based pricing
        /@\s*\$?[\d,]+\.\d{2}\/[A-Z]+/,
      ],
      discountIndicators: [
        'ROLLBACK',
        'CLEARANCE',
        'SPECIAL BUY',
        'SPECIAL PURCHASE',
        'SAVINGS',
        'REDUCED PRICE',
        'MANAGER SPECIAL',
        'MARKDOWN',
        'Was',
        'Now',
        'Save',
        'PRICE MATCH',
        'AD MATCH',
        // Store coupons and discounts
        'WALMART COUPON',
        'STORE COUPON',
        'MANUFACTURER COUPON',
        'DIGITAL COUPON',
        'SCAN & GO DISCOUNT',
        // Walmart+ and membership discounts
        'WALMART+ DISCOUNT',
        'MEMBER PRICE',
        // Department-specific discounts
        'GROCERY PICKUP DISCOUNT',
        'ONLINE GROCERY DISCOUNT',
      ],
      taxCodes: ['T', 'N', 'F', 'X'], // Taxable, Non-taxable, Food, Tax-exempt
      brandPatterns: [
        'GREAT VALUE',
        'EQUATE',
        'MAINSTAYS',
        "PARENT'S CHOICE",
        'PARENTS CHOICE',
        'MARKETSIDE',
        'FRESHNESS GUARANTEED',
        'FADED GLORY',
        'TIME AND TRU',
        'TERRA & SKY',
        'ATHLETIC WORKS',
        'STARTER',
        'OZARK TRAIL',
        'HYPER TOUGH',
        'HART',
        'BETTER HOMES',
        'PIONEER WOMAN',
        'BEAUTIFUL',
        'DREW BARRYMORE',
        'WALMART BRAND',
      ],
    },
    normalizationHints: {
      commonBrands: [
        'Great Value',
        'Equate',
        'Mainstays',
        "Parent's Choice",
        'Marketside',
        'Freshness Guaranteed',
        'Faded Glory',
        'Time and Tru',
        'Terra & Sky',
        'Athletic Works',
        'Starter',
        'Ozark Trail',
        'Hyper Tough',
        'Hart',
        'Better Homes & Gardens',
        'The Pioneer Woman',
        'Beautiful',
        'Drew Barrymore Flower Home',
      ],
      categoryMappings: {
        GROCERY: 'Pantry & Dry Goods',
        PRODUCE: 'Fresh Produce',
        DAIRY: 'Dairy & Refrigerated',
        MEAT: 'Meat & Seafood',
        DELI: 'Deli & Prepared Foods',
        BAKERY: 'Bakery & Bread',
        FROZEN: 'Frozen Foods',
        PHARMACY: 'Health & Wellness',
        ELECTRONICS: 'Electronics & Tech',
        CLOTHING: 'Clothing & Accessories',
        HOME: 'Home & Garden',
        AUTOMOTIVE: 'Automotive',
        TOYS: 'Toys & Games',
        SPORTS: 'Sports & Outdoors',
        BABY: 'Baby & Toddler',
        PETS: 'Pet Supplies',
      },
      unitPatterns: [
        /\d+\s*CT/i, // Count
        /\d+\s*LB/i, // Pounds
        /\d+\s*OZ/i, // Ounces
        /\d+\s*PK/i, // Pack
        /\d+\s*FL\s*OZ/i, // Fluid ounces
        /\d+\s*GAL/i, // Gallon
        /\d+\s*QT/i, // Quart
        /\d+\s*PT/i, // Pint
        /@\s*[\d.]+\/[A-Z]+/i, // Per unit pricing (e.g., @ 1.48/LB)
      ],
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
CRITICAL BRAND RECOGNITION:
- Great Value = Walmart's main grocery/food brand (use ONLY for actual Great Value products)
- Equate = Health, beauty & pharmacy brand (vitamins, medications, personal care)
- Mainstays = Home goods & furniture brand (bedding, decor, small appliances)
- Parent's Choice = Baby & infant products (diapers, formula, baby food)
- Marketside = Fresh, premium food brand (deli, bakery, prepared foods)
- Freshness Guaranteed = Fresh food & produce brand
- Athletic Works = Fitness & sports apparel brand
- Ozark Trail = Outdoor & camping gear brand
- Hyper Tough = Tools & hardware brand
- The Pioneer Woman = Kitchen & home decor brand
- Drew Barrymore Flower Home = Home decor & beauty brand

RECEIPT PATTERN HANDLING:
- "ROLLBACK" indicates temporary price reduction (current promotion, not separate discount line)
- "Was $X.XX Now $Y.YY" format should extract current price as $Y.YY
- Handle UPC/barcode numbers that appear before product names (ignore in normalization)
- Weight-based items use "@" symbol (e.g., "BANANAS @ 1.48/LB" = per-pound pricing)
- Tax codes T/N/F/X at end of lines indicate taxation, not part of product name
- Department codes (3-4 digits + 8-10 digits) should be ignored in product name
- "MANAGER SPECIAL" indicates clearance/markdown pricing
- Pharmacy items may have "RX" prefix with prescription numbers

NORMALIZATION RULES:
- Remove UPC codes, department codes, and tax indicators from product names
- Preserve weight/unit information in product name (e.g., "16 OZ", "2 LB", "12 CT")
- For weight-based pricing, focus on the product name before the "@" symbol
- Convert abbreviated product names to full names:
  * "GV" → "Great Value" (e.g., GVLASAGNA = Great Value Lasagna)
  * "EQ" → "Equate"
  * "MS" → "Mainstays"
  * "PC" → "Parent's Choice"
  * "MKS" → "Marketside"
  * "FG" → "Freshness Guaranteed"
  * "OT" → "Ozark Trail"
  * "AW" → "Athletic Works"
  * "HT" → "Hyper Tough"
- Handle generic product descriptions (make them more specific when possible)
- Recognize common Walmart product line extensions (e.g., "Signature" = premium line)

DISCOUNT & COUPON HANDLING:
- Digital coupons, manufacturer coupons, and store coupons are separate discount lines
- "WALMART+ DISCOUNT" is membership-based pricing, not a separate product
- "SCAN & GO DISCOUNT" is app-based discount, treat as price adjustment
- "GROCERY PICKUP DISCOUNT" is service-based discount
- Price matching ("AD MATCH", "PRICE MATCH") should be treated as price adjustments`,

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
