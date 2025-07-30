import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class ProductMatchOptionDto {
  @ApiProperty({
    description: 'Product SK of the matching catalog product',
    example: 'uuid-1234',
  })
  @IsUUID()
  productSk: string;

  @ApiProperty({
    description: 'Product name from the catalog',
    example: 'Organic Fuji Apples',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Brand name from the catalog',
    example: 'Organic Valley',
    required: false,
  })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({
    description: 'Product barcode if available',
    example: '1234567890123',
    required: false,
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({
    description: 'Similarity/confidence score (0-1)',
    example: 0.92,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({
    description: 'Matching method used',
    example: 'name_similarity',
    enum: ['barcode_match', 'embedding_similarity', 'name_similarity'],
  })
  @IsString()
  method: string;

  @ApiProperty({
    description: 'Image URL of the product if available',
    example: 'https://example.com/product-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Additional product details',
    example: 'Premium organic apples from Washington state',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ProductSelectionRequestDto {
  @ApiProperty({
    description: 'The normalized product SK that needs linking',
    example: 'normalized-uuid-1234',
  })
  @IsUUID()
  normalizedProductSk: string;

  @ApiProperty({
    description: 'Search query (normalized name)',
    example: 'organic apples',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Brand name to help filter matches',
    example: 'Organic Valley',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'Minimum similarity threshold for matches',
    example: 0.5,
    default: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarityThreshold?: number;

  @ApiProperty({
    description: 'Maximum number of options to return',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxOptions?: number;
}

export class ProductSelectionResponseDto {
  @ApiProperty({
    description: 'The normalized product that needs linking',
    type: 'object',
    additionalProperties: false,
  })
  normalizedProduct: {
    normalizedProductSk: string;
    rawName: string;
    normalizedName: string;
    brand?: string;
    category?: string;
    merchant: string;
    confidenceScore: number;
  };

  @ApiProperty({
    description: 'List of matching product options for user to choose from',
    type: [ProductMatchOptionDto],
  })
  @IsArray()
  matchingOptions: ProductMatchOptionDto[];

  @ApiProperty({
    description: 'Total number of matches found',
    example: 5,
  })
  @IsNumber()
  totalMatches: number;

  @ApiProperty({
    description: 'Whether automatic linking was possible',
    example: false,
  })
  @IsBoolean()
  requiresUserSelection: boolean;

  @ApiProperty({
    description: 'Recommended option (highest scoring match)',
    type: ProductMatchOptionDto,
    required: false,
  })
  @IsOptional()
  recommendedOption?: ProductMatchOptionDto;
}

export class UserProductSelectionDto {
  @ApiProperty({
    description: 'The normalized product SK being linked',
    example: 'normalized-uuid-1234',
  })
  @IsUUID()
  normalizedProductSk: string;

  @ApiProperty({
    description: 'Selected product SK from the options',
    example: 'product-uuid-5678',
  })
  @IsUUID()
  selectedProductSk: string;

  @ApiProperty({
    description: 'User ID who made the selection',
    example: 'user-uuid-9999',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Confidence in the user selection (0-1)',
    example: 1.0,
    default: 1.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  userConfidence?: number;

  @ApiProperty({
    description: 'Optional notes from the user about the selection',
    example: 'This matches the product I purchased',
    required: false,
  })
  @IsOptional()
  @IsString()
  userNotes?: string;
}

export class UserProductSelectionResponseDto {
  @ApiProperty({
    description: 'Whether the linking was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'The updated normalized product with linking information',
    type: 'object',
    additionalProperties: false,
  })
  updatedNormalizedProduct: {
    normalizedProductSk: string;
    linkedProductSk: string;
    linkingConfidence: number;
    linkingMethod: string;
    linkedAt: Date;
  };

  @ApiProperty({
    description: 'Result message',
    example: 'Product successfully linked based on user selection',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Error message if linking failed',
    example: 'Selected product not found',
    required: false,
  })
  @IsOptional()
  @IsString()
  error?: string;
}

export class BulkProductSelectionDto {
  @ApiProperty({
    description: 'List of user selections to process',
    type: [UserProductSelectionDto],
  })
  @IsArray()
  selections: UserProductSelectionDto[];

  @ApiProperty({
    description: 'User ID who made the selections',
    example: 'user-uuid-9999',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class BulkProductSelectionResponseDto {
  @ApiProperty({
    description: 'Number of selections processed',
    example: 10,
  })
  @IsNumber()
  processed: number;

  @ApiProperty({
    description: 'Number of successful links created',
    example: 8,
  })
  @IsNumber()
  linked: number;

  @ApiProperty({
    description: 'Number of failed selections',
    example: 2,
  })
  @IsNumber()
  errors: number;

  @ApiProperty({
    description: 'List of error messages for failed selections',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  errorMessages?: string[];

  @ApiProperty({
    description: 'Overall success status',
    example: true,
  })
  @IsBoolean()
  success: boolean;
}
