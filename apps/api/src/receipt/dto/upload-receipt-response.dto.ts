import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NormalizationStatsDto {
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
    description: 'Number of discount lines identified',
  })
  discountItems: number;

  @ApiProperty({
    example: 1,
    description: 'Number of adjustment lines identified',
  })
  adjustmentItems: number;

  @ApiProperty({
    example: 0.85,
    description: 'Average confidence score of normalizations',
  })
  averageConfidence: number;

  @ApiProperty({
    example: 2,
    description: 'Number of items that required AI normalization',
  })
  aiNormalizedItems: number;

  @ApiProperty({
    example: 8,
    description: 'Number of items that matched existing normalizations',
  })
  exactMatchItems: number;

  @ApiProperty({
    example: 0,
    description: 'Number of items with low confidence scores (<0.6)',
  })
  lowConfidenceItems: number;
}

export class NormalizationMetadataDto {
  @ApiProperty({
    example: 'Organic Apples',
    description: 'The normalized product name',
  })
  normalizedName: string;

  @ApiPropertyOptional({
    example: 'Organic Valley',
    description: 'The extracted or inferred brand name',
  })
  brand?: string;

  @ApiPropertyOptional({
    example: 'Produce',
    description: 'The extracted or inferred category',
  })
  category?: string;

  @ApiProperty({
    example: 0.95,
    description: 'Confidence score of the normalization (0-1)',
  })
  confidenceScore: number;

  @ApiProperty({
    example: false,
    description: 'Whether this line represents a discount',
  })
  isDiscount: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this line represents an adjustment',
  })
  isAdjustment: boolean;

  @ApiPropertyOptional({
    example: '12345',
    description: 'Item code or barcode used in normalization',
  })
  itemCode?: string;
}

export class ProcessedReceiptItemDto {
  @ApiProperty({
    example: 'ORGANIC APPLES',
    description: 'Original raw product name from receipt',
  })
  originalName: string;

  @ApiProperty({
    example: 'Organic Apples',
    description: 'Final product name used in the system',
  })
  finalName: string;

  @ApiPropertyOptional({
    example: '1234567890123',
    description: 'Product barcode if available',
  })
  barcode?: string;

  @ApiPropertyOptional({
    example: 'Produce',
    description: 'Product category',
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

  @ApiProperty({
    example: 7.98,
    description: 'Total line amount (price * quantity)',
  })
  lineTotal: number;

  @ApiProperty({
    type: NormalizationMetadataDto,
    description: 'Metadata about the normalization process',
  })
  normalization: NormalizationMetadataDto;

  @ApiProperty({
    example: 'uuid-product-123',
    description: 'Product ID in the system',
  })
  productId: string;
}

export class UploadReceiptResponseDto {
  @ApiProperty({
    example: 'uuid-receipt-123',
    description: 'Receipt ID in the system',
  })
  receiptId: string;

  @ApiProperty({
    example: 'done',
    description: 'Processing status of the receipt',
    enum: ['pending', 'processing', 'done', 'failed', 'manual_review'],
  })
  status: string;

  @ApiPropertyOptional({
    example: 'Whole Foods Market',
    description: 'Store name',
  })
  storeName?: string;

  @ApiPropertyOptional({
    example: 'uuid-store-456',
    description: 'Store ID in the system',
  })
  storeId?: string;

  @ApiProperty({
    example: '2025-01-15T10:30:00Z',
    description: 'Purchase date',
  })
  purchaseDate: string;

  @ApiProperty({
    type: [ProcessedReceiptItemDto],
    description: 'Processed items with normalization data',
  })
  items: ProcessedReceiptItemDto[];

  @ApiProperty({
    example: 15.97,
    description: 'Total amount of the receipt',
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Normalization statistics for this receipt',
  })
  normalizationStats: NormalizationStatsDto;

  @ApiPropertyOptional({
    example: 'Some items had low confidence scores and may need review',
    description: 'Processing notes or warnings',
  })
  processingNotes?: string;

  @ApiProperty({
    example: '2025-01-15T10:35:00Z',
    description: 'When the receipt was processed',
  })
  processedAt: string;
}
