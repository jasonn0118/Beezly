import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// Request DTOs

export class ReceiptItemConfirmationDto {
  @ApiProperty({
    description: 'UUID of the normalized product from OCR processing',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  normalizedProductSk: string;

  @ApiProperty({
    description: 'User-edited normalized name (optional)',
    example: 'Organic Fuji Apples',
    required: false,
  })
  @IsOptional()
  @IsString()
  normalizedName?: string;

  @ApiProperty({
    description: 'User-edited brand name (optional)',
    example: 'Green Valley Farms',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'Whether the user confirmed this item',
    example: true,
  })
  @IsBoolean()
  isConfirmed: boolean;
}

export class ProcessReceiptConfirmationDto {
  @ApiProperty({
    description: 'List of receipt items with user confirmations/edits',
    type: [ReceiptItemConfirmationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemConfirmationDto)
  items: ReceiptItemConfirmationDto[];

  @ApiProperty({
    description: 'Optional user ID for tracking',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

// Response DTOs

export class LinkedProductDto {
  @ApiProperty({
    description: 'UUID of the normalized product',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  normalizedProductSk: string;

  @ApiProperty({
    description: 'UUID of the linked catalog product',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  linkedProductSk: string;

  @ApiProperty({
    description: 'Method used for linking',
    example: 'embedding_similarity',
    enum: [
      'barcode_match',
      'embedding_similarity',
      'name_match',
      'user_selection',
    ],
  })
  linkingMethod: string;

  @ApiProperty({
    description: 'Confidence score of the linking',
    example: 0.92,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  linkingConfidence: number;
}

export enum UnprocessedReason {
  NO_BARCODE_MATCH = 'NO_BARCODE_MATCH',
  NO_EMBEDDING_MATCH = 'NO_EMBEDDING_MATCH',
  LOW_SIMILARITY_SCORE = 'LOW_SIMILARITY_SCORE',
  MULTIPLE_MATCHES_FOUND = 'MULTIPLE_MATCHES_FOUND',
  USER_REJECTED = 'USER_REJECTED',
}

export class UnprocessedProductDto {
  @ApiProperty({
    description: 'UUID of the normalized product',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  normalizedProductSk: string;

  @ApiProperty({
    description: 'UUID of the unprocessed product entry',
    example: '789e0123-e89b-12d3-a456-426614174000',
  })
  unprocessedProductSk: string;

  @ApiProperty({
    description: 'Reason why the product could not be linked',
    example: 'NO_EMBEDDING_MATCH',
    enum: UnprocessedReason,
  })
  @IsEnum(UnprocessedReason)
  reason: string;
}

export class PendingSelectionMatchDto {
  @ApiProperty({
    description: 'UUID of the potential catalog product match',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  productSk: string;

  @ApiProperty({
    description: 'Name of the catalog product',
    example: 'Organic Fuji Apples',
  })
  name: string;

  @ApiProperty({
    description: 'Brand name of the catalog product',
    example: 'Green Valley Farms',
    required: false,
  })
  brandName?: string;

  @ApiProperty({
    description: 'Barcode of the catalog product',
    example: '1234567890123',
    required: false,
  })
  barcode?: string;

  @ApiProperty({
    description: 'Similarity score',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({
    description: 'Matching method used',
    example: 'name_similarity',
  })
  method: string;

  @ApiProperty({
    description: 'Product image URL',
    example: 'https://example.com/product.jpg',
    required: false,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Additional product description',
    example: 'Category: Produce, Weight: 1kg',
    required: false,
  })
  description?: string;
}

export class NormalizedProductDto {
  @ApiProperty({
    description: 'UUID of the normalized product',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  normalizedProductSk: string;

  @ApiProperty({
    description: 'Raw name from receipt',
    example: 'ORGN FUJI APPLE',
  })
  rawName: string;

  @ApiProperty({
    description: 'Normalized product name',
    example: 'Organic Fuji Apples',
  })
  normalizedName: string;

  @ApiProperty({
    description: 'Brand name',
    example: 'Green Valley Farms',
    required: false,
  })
  brand?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'Produce',
    required: false,
  })
  category?: string;

  @ApiProperty({
    description: 'Store name',
    example: 'Whole Foods',
  })
  merchant: string;

  @ApiProperty({
    description: 'Confidence score of normalization',
    example: 0.92,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class PendingSelectionProductDto {
  @ApiProperty({
    description: 'Normalized product information',
    type: NormalizedProductDto,
  })
  normalizedProduct: NormalizedProductDto;

  @ApiProperty({
    description: 'Number of potential matches found',
    example: 3,
  })
  matchCount: number;

  @ApiProperty({
    description: 'Top matching catalog products',
    type: [PendingSelectionMatchDto],
  })
  topMatches: PendingSelectionMatchDto[];
}

export class ReceiptConfirmationResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of items processed',
    example: 20,
  })
  processed: number;

  @ApiProperty({
    description: 'Number of items successfully linked to catalog products',
    example: 15,
  })
  linked: number;

  @ApiProperty({
    description: 'Number of items moved to unprocessed queue',
    example: 5,
  })
  unprocessed: number;

  @ApiProperty({
    description: 'Number of errors encountered',
    example: 0,
  })
  errors: number;

  @ApiProperty({
    description: 'List of error messages if any',
    type: [String],
    example: [],
  })
  errorMessages: string[];

  @ApiProperty({
    description: 'Successfully linked products',
    type: [LinkedProductDto],
  })
  linkedProducts: LinkedProductDto[];

  @ApiProperty({
    description: 'Products moved to unprocessed queue',
    type: [UnprocessedProductDto],
  })
  unprocessedProducts: UnprocessedProductDto[];

  @ApiProperty({
    description: 'Products from current receipt requiring user selection',
    type: [PendingSelectionProductDto],
  })
  pendingSelectionProducts: PendingSelectionProductDto[];
}

// Additional DTOs for fetching confirmation candidates

export class GetConfirmationCandidatesResponseDto {
  @ApiProperty({
    description: 'List of normalized products ready for confirmation',
    type: [NormalizedProductDto],
  })
  items: NormalizedProductDto[];

  @ApiProperty({
    description: 'Total count of candidates',
    example: 150,
  })
  totalCount: number;
}

export class ConfirmationStatsResponseDto {
  @ApiProperty({
    description: 'Number of products pending confirmation',
    example: 150,
  })
  pendingConfirmation: number;

  @ApiProperty({
    description: 'Total number of linked products',
    example: 850,
  })
  totalLinked: number;

  @ApiProperty({
    description: 'Total number of unprocessed products',
    example: 75,
  })
  totalUnprocessed: number;

  @ApiProperty({
    description: 'Average confidence score of pending items',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  averageConfidenceScore: number;
}
