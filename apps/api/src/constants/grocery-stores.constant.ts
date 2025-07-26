/**
 * Grocery Store Chain Constants
 *
 * This file contains definitions for major grocery store chains to be used across
 * the application for:
 * - OCR merchant detection and normalization
 * - Store location management (branch differentiation)
 * - Product normalization logic with store-specific criteria
 * - Receipt processing workflows
 */

export interface GroceryStoreChainInfo {
  /** Official normalized name for the chain */
  normalizedName: string;
  /** Alternative names and variations found on receipts */
  aliases: string[];
  /** Common patterns found in OCR text */
  ocrPatterns: string[];
  /** Store-specific normalization criteria */
  normalizationCriteria?: {
    /** Common product name patterns specific to this store */
    commonPatterns?: string[];
    /** Store brand indicators */
    storeBrands?: string[];
    /** Discount line indicators specific to this store */
    discountIndicators?: string[];
  };
}

/**
 * Major Canadian Grocery Store Chains
 * Focused on grocery stores with multiple locations that require branch differentiation
 */
export const CANADIAN_GROCERY_CHAINS: Record<string, GroceryStoreChainInfo> = {
  WALMART: {
    normalizedName: 'Walmart',
    aliases: [
      'WALMART',
      'WAL-MART',
      'WALMART SUPERCENTER',
      'WALMART SUPERCENTRE',
    ],
    ocrPatterns: ['WALMART', 'WAL.*MART', 'SUPERCENTER', 'SUPERCENTRE'],
    normalizationCriteria: {
      storeBrands: ['GREAT VALUE', 'EQUATE', 'MAINSTAYS', 'OZARK TRAIL'],
      discountIndicators: ['ROLLBACK', 'WM DISC', 'WALMART DISC'],
      commonPatterns: ['GV ', 'GREAT VALUE'],
    },
  },

  COSTCO: {
    normalizedName: 'Costco',
    aliases: ['COSTCO', 'COSTCO WHOLESALE'],
    ocrPatterns: ['COSTCO', 'WHOLESALE'],
    normalizationCriteria: {
      storeBrands: ['KIRKLAND', 'KIRKLAND SIGNATURE'],
      commonPatterns: ['KS ', 'KIRKLAND'],
    },
  },

  LOBLAWS: {
    normalizedName: 'Loblaws',
    aliases: ['LOBLAWS', 'LOBLAW'],
    ocrPatterns: ['LOBLAWS?'],
    normalizationCriteria: {
      storeBrands: ['PRESIDENTS CHOICE', 'PC', 'NO NAME', 'JOE FRESH'],
      commonPatterns: ['PC ', 'PRES CH', 'NO NAME'],
    },
  },

  SUPERSTORE: {
    normalizedName: 'Superstore',
    aliases: [
      'SUPERSTORE',
      'REAL CANADIAN SUPERSTORE',
      'CANADIAN SUPERSTORE',
      'RCSS',
    ],
    ocrPatterns: ['SUPERSTORE', 'REAL CANADIAN', 'CANADIAN SUPERSTORE', 'RCSS'],
    normalizationCriteria: {
      storeBrands: ['PRESIDENTS CHOICE', 'PC', 'NO NAME', 'JOE FRESH'],
      commonPatterns: ['PC ', 'PRES CH', 'NO NAME'],
    },
  },

  METRO: {
    normalizedName: 'Metro',
    aliases: ['METRO', 'METRO PLUS'],
    ocrPatterns: ['METRO'],
    normalizationCriteria: {
      storeBrands: ['SELECTION', 'IRRESISTIBLES', 'METRO'],
      commonPatterns: ['SELECTION', 'IRRESIST'],
    },
  },

  SOBEYS: {
    normalizedName: 'Sobeys',
    aliases: ['SOBEYS', "SOBEY'S"],
    ocrPatterns: ['SOBEYS?'],
    normalizationCriteria: {
      storeBrands: ['COMPLIMENTS', 'SIGNAL', 'SENSATIONS'],
      commonPatterns: ['COMPLIMENTS', 'SIGNAL'],
    },
  },

  NO_FRILLS: {
    normalizedName: 'No Frills',
    aliases: ['NO FRILLS', 'NOFRILLS'],
    ocrPatterns: ['NO\\s*FRILLS'],
    normalizationCriteria: {
      storeBrands: ['NO NAME', 'PRESIDENTS CHOICE', 'PC'],
      commonPatterns: ['NO NAME', 'PC '],
    },
  },

  FOOD_BASICS: {
    normalizedName: 'Food Basics',
    aliases: ['FOOD BASICS', 'FOODBASICS'],
    ocrPatterns: ['FOOD\\s*BASICS'],
    normalizationCriteria: {
      storeBrands: ['NO NAME', 'PRESIDENTS CHOICE'],
      commonPatterns: ['NO NAME', 'PC '],
    },
  },

  FRESHCO: {
    normalizedName: 'FreshCo',
    aliases: ['FRESHCO', 'FRESH CO'],
    ocrPatterns: ['FRESH\\s*CO'],
    normalizationCriteria: {
      storeBrands: ['COMPLIMENTS', 'SIGNAL'],
      commonPatterns: ['COMPLIMENTS'],
    },
  },

  FARM_BOY: {
    normalizedName: 'Farm Boy',
    aliases: ['FARM BOY', 'FARMBOY'],
    ocrPatterns: ['FARM\\s*BOY'],
    normalizationCriteria: {
      storeBrands: ['FARM BOY'],
      commonPatterns: ['FARM BOY', 'FB '],
    },
  },

  LONGOS: {
    normalizedName: "Longo's",
    aliases: ["LONGO'S", 'LONGOS', 'LONGO'],
    ocrPatterns: ["LONGO'?S?"],
    normalizationCriteria: {
      storeBrands: ["LONGO'S", 'LONGOS'],
      commonPatterns: ['LONGOS'],
    },
  },

  IGA: {
    normalizedName: 'IGA',
    aliases: ['IGA', 'INDEPENDENT GROCER'],
    ocrPatterns: ['IGA', 'INDEPENDENT'],
    normalizationCriteria: {
      storeBrands: ['COMPLIMENTS', 'SIGNAL'],
      commonPatterns: ['COMPLIMENTS'],
    },
  },

  SAVE_ON_FOODS: {
    normalizedName: 'Save-On-Foods',
    aliases: ['SAVE-ON-FOODS', 'SAVE ON FOODS', 'SAVEONFOODS'],
    ocrPatterns: ['SAVE.ON.FOODS', 'SAVE\\s*ON\\s*FOODS'],
    normalizationCriteria: {
      storeBrands: ['WESTERN FAMILY', 'SIGNATURE'],
      commonPatterns: ['WF ', 'WESTERN FAM'],
    },
  },

  THRIFTY_FOODS: {
    normalizedName: 'Thrifty Foods',
    aliases: ['THRIFTY FOODS', 'THRIFTYFOODS'],
    ocrPatterns: ['THRIFTY\\s*FOODS'],
    normalizationCriteria: {
      storeBrands: ['WESTERN FAMILY'],
      commonPatterns: ['WF ', 'WESTERN FAM'],
    },
  },

  SAFEWAY: {
    normalizedName: 'Safeway',
    aliases: ['SAFEWAY', 'SAFEWAY CANADA'],
    ocrPatterns: ['SAFEWAY'],
    normalizationCriteria: {
      storeBrands: [
        'SAFEWAY SELECT',
        'SIGNATURE CAFE',
        'O ORGANICS',
        'OPEN NATURE',
      ],
      discountIndicators: ['SAFEWAY DISC', 'CLUB SAVINGS', 'JUST FOR U'],
      commonPatterns: ['SAFEWAY SELECT', 'SIG CAFE', 'O ORGANICS'],
    },
  },
};

/**
 * Get all grocery store chain names for matching
 */
export const getAllGroceryChainNames = (): string[] => {
  return Object.values(CANADIAN_GROCERY_CHAINS).map(
    (chain) => chain.normalizedName,
  );
};

/**
 * Get all grocery store aliases and patterns for OCR detection
 */
export const getAllGroceryAliases = (): string[] => {
  return Object.values(CANADIAN_GROCERY_CHAINS).reduce((all, chain) => {
    return [...all, ...chain.aliases, ...chain.ocrPatterns];
  }, [] as string[]);
};

/**
 * Find grocery chain info by merchant name (fuzzy matching)
 */
export const findGroceryChainByName = (
  merchantName: string,
): GroceryStoreChainInfo | null => {
  const upperMerchant = merchantName.toUpperCase();

  // First, try exact alias matching
  for (const chain of Object.values(CANADIAN_GROCERY_CHAINS)) {
    if (chain.aliases.some((alias) => upperMerchant.includes(alias))) {
      return chain;
    }
  }

  // Then try pattern matching
  for (const chain of Object.values(CANADIAN_GROCERY_CHAINS)) {
    if (
      chain.ocrPatterns.some((pattern) =>
        new RegExp(pattern, 'i').test(upperMerchant),
      )
    ) {
      return chain;
    }
  }

  return null;
};

/**
 * Check if a merchant name represents a grocery store chain
 */
export const isGroceryStoreChain = (merchantName: string): boolean => {
  return findGroceryChainByName(merchantName) !== null;
};

/**
 * Get store-specific normalization criteria for a merchant
 */
export const getStoreNormalizationCriteria = (merchantName: string) => {
  const chainInfo = findGroceryChainByName(merchantName);
  return chainInfo?.normalizationCriteria || {};
};
