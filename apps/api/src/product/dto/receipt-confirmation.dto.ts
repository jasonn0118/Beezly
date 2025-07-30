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

  @ApiProperty({
    description: 'Receipt ID to associate these confirmations with',
    example: '789e0123-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  receiptId?: string;
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
    description:
      'Products from current receipt requiring user selection between multiple matches. This includes ALL items from the receipt (both confirmed and unconfirmed) that have multiple potential catalog product matches.',
    type: [PendingSelectionProductDto],
  })
  pendingSelectionProducts: PendingSelectionProductDto[];

  @ApiProperty({
    description: 'Summary of all receipt items after processing',
    type: 'object',
    additionalProperties: false,
    properties: {
      totalReceiptItems: { type: 'number', example: 25 },
      confirmedItems: { type: 'number', example: 20 },
      unconfirmedItems: { type: 'number', example: 5 },
      successfullyLinked: { type: 'number', example: 15 },
      requiresUserSelection: { type: 'number', example: 3 },
      movedToUnprocessed: { type: 'number', example: 2 },
    },
  })
  receiptSummary: {
    totalReceiptItems: number;
    confirmedItems: number;
    unconfirmedItems: number;
    successfullyLinked: number;
    requiresUserSelection: number;
    movedToUnprocessed: number;
  };
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

// Request DTO for receipt-scoped pending selections
export class GetReceiptPendingSelectionsDto {
  @ApiProperty({
    description: 'Receipt ID to get pending selections for',
    example: '789e0123-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  receiptId?: string;

  @ApiProperty({
    description: 'Array of normalized product SKs from the current receipt',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '456e7890-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  normalizedProductSks: string[];
}

// Response DTO for receipt-scoped pending selections
export class ReceiptPendingSelectionsResponseDto {
  @ApiProperty({
    description: 'Products from this receipt requiring user selection',
    type: [PendingSelectionProductDto],
  })
  pendingSelections: PendingSelectionProductDto[];

  @ApiProperty({
    description: 'Receipt ID if available',
    example: '789e0123-e89b-12d3-a456-426614174000',
    required: false,
  })
  receiptId?: string;

  @ApiProperty({
    description: 'Total count of pending selections for this receipt',
    example: 5,
  })
  totalCount: number;
}

// DTOs for processing user product selections

export class UserProductChoiceDto {
  @ApiProperty({
    description: 'UUID of the normalized product that needs selection',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  normalizedProductSk: string;

  @ApiProperty({
    description:
      'UUID of the chosen catalog product. Leave empty/null if no suitable match found.',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  selectedProductSk?: string;

  @ApiProperty({
    description: 'Reason for the choice or why no product was selected',
    example: 'Selected best match',
    required: false,
  })
  @IsOptional()
  @IsString()
  selectionReason?: string;
}

export class ProcessReceiptSelectionsDto {
  @ApiProperty({
    description: 'Array of user product choices for pending selections',
    type: [UserProductChoiceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserProductChoiceDto)
  selections: UserProductChoiceDto[];

  @ApiProperty({
    description: 'Optional user ID for tracking',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Optional receipt ID for tracking',
    example: '789e0123-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  receiptId?: string;
}

export class ProcessedSelectionDto {
  @ApiProperty({
    description: 'UUID of the normalized product',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  normalizedProductSk: string;

  @ApiProperty({
    description: 'UUID of the linked catalog product if selection was made',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  linkedProductSk?: string;

  @ApiProperty({
    description: 'Processing status',
    example: 'linked',
    enum: ['linked', 'moved_to_unprocessed', 'error'],
  })
  status: 'linked' | 'moved_to_unprocessed' | 'error';

  @ApiProperty({
    description: 'Additional information about the processing',
    example: 'Successfully linked to catalog product',
    required: false,
  })
  message?: string;
}

export class ReceiptSelectionsResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of selections processed',
    example: 5,
  })
  processedCount: number;

  @ApiProperty({
    description: 'Number of products successfully linked',
    example: 3,
  })
  linkedCount: number;

  @ApiProperty({
    description: 'Number of products moved to unprocessed queue',
    example: 2,
  })
  unprocessedCount: number;

  @ApiProperty({
    description: 'Number of errors encountered',
    example: 0,
  })
  errorCount: number;

  @ApiProperty({
    description: 'List of error messages if any',
    type: [String],
    example: [],
  })
  errorMessages: string[];

  @ApiProperty({
    description: 'Detailed results for each processed selection',
    type: [ProcessedSelectionDto],
  })
  processedSelections: ProcessedSelectionDto[];

  @ApiProperty({
    description: 'Receipt ID if provided',
    example: '789e0123-e89b-12d3-a456-426614174000',
    required: false,
  })
  receiptId?: string;
}
