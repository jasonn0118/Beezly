import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NormalizationTestResultDto {
  @ApiProperty({
    example: 'ORGANIC APPLES FUJI',
    description: 'Original raw product name from receipt',
  })
  originalName: string;

  @ApiProperty({
    example: 'Organic Fuji Apples',
    description: 'Normalized product name',
  })
  normalizedName: string;

  @ApiPropertyOptional({
    example: 'Organic Valley',
    description: 'Extracted brand name',
  })
  brand?: string;

  @ApiPropertyOptional({
    example: 'Produce',
    description: 'Inferred product category',
  })
  category?: string;

  @ApiProperty({
    example: 0.95,
    description: 'Confidence score of normalization (0-1)',
  })
  confidenceScore: number;

  @ApiProperty({
    example: false,
    description: 'Whether this line is a discount',
  })
  isDiscount: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this line is an adjustment',
  })
  isAdjustment: boolean;

  @ApiPropertyOptional({
    example: '4131',
    description: 'Product code or barcode',
  })
  itemCode?: string;

  @ApiPropertyOptional({
    description: 'Similar products found in database',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        productId: { type: 'string', example: 'uuid-123' },
        similarity: { type: 'number', example: 0.87 },
        normalizedName: { type: 'string', example: 'Organic Red Apples' },
        merchant: { type: 'string', example: 'Whole Foods' },
      },
    },
  })
  similarProducts?: Array<{
    productId: string;
    similarity: number;
    normalizedName: string;
    merchant: string;
  }>;

  @ApiProperty({
    example: 'exact_match',
    description: 'How the normalization was performed',
    enum: [
      'exact_match',
      'similarity_match',
      'ai_generated',
      'discount_detected',
      'adjustment_detected',
      'price_format_discount',
      'fallback',
    ],
  })
  normalizationMethod: string;

  @ApiProperty({
    example: 3.99,
    description: 'Price from receipt',
  })
  price: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity from receipt',
  })
  quantity: number;

  @ApiProperty({
    example: 7.98,
    description: 'Total line amount',
  })
  lineTotal: number;
}

export class TestReceiptItemDto {
  @ApiProperty({
    example: 'ORGANIC APPLES FUJI',
    description: 'Product name as it appears on receipt',
  })
  productName: string;

  @ApiPropertyOptional({
    example: '4131',
    description: 'Product barcode if available',
  })
  barcode?: string;

  @ApiPropertyOptional({
    example: 'Produce',
    description: 'Product category if available',
  })
  category?: string;

  @ApiProperty({
    example: 3.99,
    description: 'Price per unit',
  })
  price: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity purchased',
  })
  quantity: number;
}

export class TestNormalizationRequestDto {
  @ApiProperty({
    example: 'Whole Foods Market',
    description: 'Store/merchant name',
  })
  storeName: string;

  @ApiProperty({
    type: [TestReceiptItemDto],
    description: 'Items from the receipt',
  })
  items: TestReceiptItemDto[];
}

export class TestNormalizationResponseDto {
  @ApiProperty({
    example: 'Whole Foods Market',
    description: 'Store/merchant name used for normalization',
  })
  storeName: string;

  @ApiProperty({
    example: 12,
    description: 'Total number of items processed',
  })
  totalItems: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items that were actual products',
  })
  productItems: number;

  @ApiProperty({
    example: 1,
    description: 'Number of discount lines detected',
  })
  discountItems: number;

  @ApiProperty({
    example: 1,
    description: 'Number of adjustment lines detected',
  })
  adjustmentItems: number;

  @ApiProperty({
    example: 0.82,
    description: 'Average confidence score',
  })
  averageConfidence: number;

  @ApiProperty({
    example: 45.67,
    description: 'Total receipt amount',
  })
  totalAmount: number;

  @ApiProperty({
    type: [NormalizationTestResultDto],
    description: 'Detailed normalization results for each item',
  })
  items: NormalizationTestResultDto[];

  @ApiProperty({
    example: '2025-01-23T10:30:00Z',
    description: 'When the normalization was processed',
  })
  processedAt: string;
}
