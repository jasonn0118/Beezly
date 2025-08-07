import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BarcodeType } from "./barcode";

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  COUPON = 'coupon',
  ADJUSTMENT = 'adjustment',
}

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

export interface NormalizedProductData {
  normalizedProductSk: string;
  rawName: string;
  merchant: string;
  itemCode?: string;
  normalizedName: string;
  brand?: string;
  category?: string;
  confidenceScore: number;
  embedding?: number[];
  isDiscount: boolean;
  isAdjustment: boolean;
  matchCount: number;
  lastMatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NormalizationStats {
  totalNormalizedProducts: number;
  discountLines: number;
  adjustmentLines: number;
  averageConfidence: number;
  lowConfidenceProducts: number;
  merchant?: string;
}

export interface EmbeddingResult {
  productId: string;
  similarity: number;
  normalizedProduct: NormalizedProductData;
}

export class NormalizedProductDTO {
  @ApiProperty({
    example: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    description: "Product primary key (UUID)",
  })
  product_sk: string;

  @ApiProperty({
    example: "Organic Apple",
    description: "Name of the product",
  })
  name: string;

  @ApiPropertyOptional({
    example: "1234567890123",
    description: "Optional product barcode",
  })
  barcode?: string;

  @ApiPropertyOptional({
    example: BarcodeType.EAN13,
    description: "Type of barcode",
    enum: BarcodeType,
  })
  barcode_type?: BarcodeType;

  @ApiPropertyOptional({
    example: "https://example.com/images/product.jpg",
    description: "Optional product image URL",
  })
  image_url?: string;

  @ApiPropertyOptional({
    example: "Cheil Jedang",
    description: "Optional product brand name",
  })
  brandName?: string;

  @ApiPropertyOptional({
    example: 80.5,
    description: "Initial credit score of the product (0~100)",
  })
  credit_score?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of verified validations",
  })
  verified_count?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of times this product was flagged",
  })
  flagged_count?: number;

  @ApiProperty({
    example: "2025-07-17T10:00:00Z",
    description: "Product creation timestamp (ISO 8601)",
  })
  created_at: string;

  @ApiProperty({
    example: "2025-07-17T12:00:00Z",
    description: "Product last update timestamp (ISO 8601)",
  })
  updated_at: string;

  @ApiPropertyOptional({
    example: 1,
    description: "Foreign key category ID (integer)",
  })
  category?: number;

  @ApiPropertyOptional({
    example: "food > vege > onion",
    description: "Foreign key category Path",
  })
  categoryPath?: string;
}
