import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class EmbeddingSearchRequestDto {
  @ApiProperty({
    description: 'Text to search for similar products',
    example: 'ORGN FUJI APPLE',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Merchant/store name to search within',
    example: 'COSTCO',
  })
  @IsString()
  @IsNotEmpty()
  merchant: string;

  @ApiProperty({
    description: 'Minimum similarity threshold (0-1)',
    example: 0.85,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiProperty({
    description: 'Include discount items in results',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeDiscounts?: boolean;

  @ApiProperty({
    description: 'Include adjustment items in results',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeAdjustments?: boolean;
}

export class EmbeddingSearchResultDto {
  @ApiProperty({
    description: 'Normalized product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Similarity score (0-1)',
    example: 0.92,
  })
  similarity: number;

  @ApiProperty({
    description: 'Raw name as it appears on receipts',
    example: 'ORGN FUJI APPLE',
  })
  rawName: string;

  @ApiProperty({
    description: 'Normalized product name',
    example: 'Organic Fuji Apple',
  })
  normalizedName: string;

  @ApiProperty({
    description: 'Product brand if identified',
    example: 'Organic Farms',
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
    description: 'Confidence score of normalization',
    example: 0.95,
  })
  confidenceScore: number;

  @ApiProperty({
    description: 'Number of times this product has been matched',
    example: 42,
  })
  matchCount: number;

  @ApiProperty({
    description: 'Last time this product was matched',
    example: '2023-12-25T10:30:00Z',
  })
  lastMatchedAt: Date;
}

export class EmbeddingSearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [EmbeddingSearchResultDto],
  })
  results: EmbeddingSearchResultDto[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 5,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Search query used',
    example: 'ORGN FUJI APPLE',
  })
  query: string;

  @ApiProperty({
    description: 'Merchant searched',
    example: 'COSTCO',
  })
  merchant: string;

  @ApiProperty({
    description: 'Search execution time in milliseconds',
    example: 125,
  })
  searchTimeMs: number;
}

export class BatchEmbeddingSearchRequestDto {
  @ApiProperty({
    description: 'Array of queries to search',
    example: ['ORGN FUJI APPLE', 'GREAT VALUE MILK', 'TIDE LAUNDRY'],
    isArray: true,
  })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  queries: string[];

  @ApiProperty({
    description: 'Merchant/store name to search within',
    example: 'WALMART',
  })
  @IsString()
  @IsNotEmpty()
  merchant: string;

  @ApiProperty({
    description: 'Minimum similarity threshold (0-1)',
    example: 0.85,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number;

  @ApiProperty({
    description: 'Maximum number of results per query',
    example: 3,
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  limitPerQuery?: number;
}

export interface BatchEmbeddingSearchResultDto {
  query: string;
  matches: EmbeddingSearchResultDto[];
  hasMatches: boolean;
}

export class BatchEmbeddingSearchResultDtoClass
  implements BatchEmbeddingSearchResultDto
{
  @ApiProperty({
    description: 'Search query',
    example: 'ORGN FUJI APPLE',
  })
  query: string;

  @ApiProperty({
    description: 'Top matches for this query',
    type: [EmbeddingSearchResultDto],
  })
  matches: EmbeddingSearchResultDto[];

  @ApiProperty({
    description: 'Whether any matches were found',
    example: true,
  })
  hasMatches: boolean;
}

export class BatchEmbeddingSearchResponseDto {
  @ApiProperty({
    description: 'Results for each query',
    type: [BatchEmbeddingSearchResultDtoClass],
  })
  results: BatchEmbeddingSearchResultDto[];

  @ApiProperty({
    description: 'Total number of queries processed',
    example: 3,
  })
  totalQueries: number;

  @ApiProperty({
    description: 'Number of queries with matches',
    example: 2,
  })
  queriesWithMatches: number;

  @ApiProperty({
    description: 'Merchant searched',
    example: 'WALMART',
  })
  merchant: string;

  @ApiProperty({
    description: 'Total search execution time in milliseconds',
    example: 450,
  })
  totalSearchTimeMs: number;
}
