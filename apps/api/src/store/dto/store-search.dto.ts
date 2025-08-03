import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  Length,
  IsArray,
} from 'class-validator';
import { StoreDTO } from '../../../../packages/types/dto/store';

// Forward declaration for GooglePlaceResult (will be imported in service)
interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;

  // Address fields matching Store entity structure
  streetNumber?: string;
  road?: string;
  streetAddress?: string; // Combined street number + road
  fullAddress?: string; // Complete formatted address (same as formatted_address)
  city?: string;
  province?: string;
  postalCode?: string;
  countryRegion?: string;
  latitude: number;
  longitude: number;

  types: string[];
  distance?: number;
}

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    maximum: 1000,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class LocationSearchDto extends PaginationDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 43.6532,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -79.3832,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    minimum: 0.1,
    maximum: 500,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  radiusKm?: number = 10;
}

export class NameSearchDto extends PaginationDto {
  @ApiProperty({
    description: 'Store name to search for',
    example: 'Walmart',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;
}

export class CitySearchDto extends PaginationDto {
  @ApiProperty({
    description: 'City name to search in',
    example: 'Toronto',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  city: string;
}

export class ProvinceSearchDto extends PaginationDto {
  @ApiProperty({
    description: 'Province/state to search in',
    example: 'ON',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  province: string;
}

export class AdvancedSearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Store name to search for',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'City to search in',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Province to search in',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  province?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    minimum: 0.1,
    maximum: 500,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  radiusKm?: number = 10;
}

export class PopularStoresDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Minimum number of receipts for popularity threshold',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minReceipts?: number = 1;
}

// DTO for creating store from Google Places data sent by frontend
export class CreateStoreFromGoogleDataDto {
  @ApiProperty({ description: 'Google Places unique identifier' })
  @IsString()
  place_id: string;

  @ApiProperty({ description: 'Store name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Complete formatted address from Google' })
  @IsString()
  formatted_address: string;

  @ApiPropertyOptional({ description: 'Street number (e.g., "1766")' })
  @IsOptional()
  @IsString()
  streetNumber?: string;

  @ApiPropertyOptional({ description: 'Road name (e.g., "Robson St")' })
  @IsOptional()
  @IsString()
  road?: string;

  @ApiPropertyOptional({ description: 'Combined street number + road' })
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiPropertyOptional({ description: 'Complete formatted address' })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Province/state code' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Postal/ZIP code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country name' })
  @IsOptional()
  @IsString()
  countryRegion?: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    type: [String],
    description: 'Google Places types (e.g., supermarket, store)',
  })
  @IsArray()
  @IsString({ each: true })
  types: string[];
}

// Response DTOs
export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Array of results',
    type: 'array',
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    additionalProperties: false,
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiPropertyOptional({
    description: 'Search performance metrics',
    type: 'object',
    additionalProperties: false,
  })
  meta?: {
    queryTime: number; // milliseconds
    cacheHit?: boolean;
    indexesUsed?: string[];
  };
}

export interface SearchPerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  indexesUsed: string[];
  resultCount: number;
  searchTerm?: string;
  filters?: Record<string, unknown>;
}

// Unified search DTO for all store search scenarios
export class UnifiedStoreSearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search query (store name, address, or keyword)',
    example: 'costco',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => value?.trim())
  query?: string;

  @ApiPropertyOptional({
    description: 'User latitude for nearby search',
    example: 49.1398,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'User longitude for nearby search',
    example: -122.6705,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (when lat/lng provided)',
    minimum: 0.1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number = 25;

  @ApiPropertyOptional({
    description: 'Include Google Places results alongside local results',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  includeGoogle?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum number of Google results to include',
    minimum: 0,
    maximum: 20,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(20)
  maxGoogleResults?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort order for results',
    enum: ['relevance', 'distance', 'name'],
    default: 'relevance',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'relevance' | 'distance' | 'name' = 'relevance';
}

// Unified search response interface
export interface UnifiedStoreSearchResponse {
  localStores: (StoreDTO & { distance?: number })[];
  googleStores: GooglePlaceResult[];
  summary: {
    totalResults: number;
    localCount: number;
    googleCount: number;
    searchType: 'query_only' | 'location_only' | 'query_and_location';
    hasMoreGoogle: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    queryTime: number;
    cacheHit?: boolean;
    searchStrategy: string;
    googleApiCalled: boolean;
  };
}
