import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  IsEnum,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BarcodeType } from '@beezly/types';

// Google Places store data for product creation
export class GooglePlacesStoreDataDto {
  @ApiProperty({
    description: 'Google Places unique identifier',
    example: 'ChIJ_xkgOm5xhlQRzCy7fF5HHqY',
  })
  @IsString()
  @IsNotEmpty()
  place_id: string;

  @ApiProperty({
    description: 'Store name',
    example: 'Save-On-Foods',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Complete formatted address from Google',
    example: '1234 Main St, Vancouver, BC V6B 2L2, Canada',
  })
  @IsString()
  @IsNotEmpty()
  formatted_address: string;

  @ApiPropertyOptional({
    description: 'Street number (e.g., "1766")',
    example: '1766',
  })
  @IsOptional()
  @IsString()
  streetNumber?: string;

  @ApiPropertyOptional({
    description: 'Road name (e.g., "Robson St")',
    example: 'Robson St',
  })
  @IsOptional()
  @IsString()
  road?: string;

  @ApiPropertyOptional({
    description: 'Combined street number + road',
    example: '1766 Robson St',
  })
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiPropertyOptional({
    description: 'Complete formatted address',
    example: '1234 Main St, Vancouver, BC V6B 2L2, Canada',
  })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({
    description: 'City name',
    example: 'Vancouver',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Province/state code',
    example: 'BC',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    description: 'Postal/ZIP code',
    example: 'V6B 2L2',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country name',
    example: 'Canada',
  })
  @IsOptional()
  @IsString()
  countryRegion?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 49.1398,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.6705,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Google Places types (e.g., supermarket, store)',
    type: [String],
    example: ['supermarket', 'store', 'establishment'],
  })
  @IsString({ each: true })
  types: string[];
}

export class ProductCreateDto {
  @ApiProperty({
    example: 'Organic Apple',
    description: 'Name of the product',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Product barcode',
  })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiPropertyOptional({
    example: BarcodeType.EAN13,
    description: 'Type of barcode',
    enum: BarcodeType,
  })
  @IsEnum(BarcodeType)
  @IsOptional()
  barcodeType?: BarcodeType;

  @ApiProperty({
    example: 101001,
    description: 'Category ID',
  })
  @IsNumber()
  @IsNotEmpty()
  category: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Product price at the selected store (optional)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    example: 'CAD',
    description: 'Currency code (default: CAD)',
    default: 'CAD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    example: 'Cheil Jedang',
    description: 'Brand name (optional)',
  })
  @IsString()
  @IsOptional()
  brandName?: string;

  // 🏪 STORE SELECTION (Choose ONE of these options)

  @ApiPropertyOptional({
    description:
      'Existing store UUID (use if user selected existing database store)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  storeSk?: string;

  @ApiPropertyOptional({
    description:
      'Google Places store data (use if user selected Google Places result)',
    type: GooglePlacesStoreDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GooglePlacesStoreDataDto)
  googlePlacesStore?: GooglePlacesStoreDataDto;
}

export class ProductResponseDto {
  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'Product UUID',
  })
  product_sk: string;

  @ApiProperty({
    example: 'Organic Apple',
    description: 'Product name',
  })
  name: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Product barcode',
  })
  barcode: string;

  @ApiPropertyOptional({
    example: 'Cheil Jedang',
    description: 'Brand name (optional, for future use)',
  })
  brandName?: string;

  @ApiProperty({
    example: 101001,
    description: 'Category ID',
  })
  category: number;

  @ApiProperty({
    example: 'https://example.com/product.jpg',
    description: 'Product image URL',
  })
  image_url: string;

  @ApiPropertyOptional({
    example: {
      store_sk: 'e290f1ee-6c54-4b01-90e6-d701748f0852',
      name: 'Homeplus',
      address: '123 Main St, Seoul',
      city: 'Seoul',
      province: 'Seoul',
    },
    description: 'Store information (optional)',
  })
  store?: {
    store_sk: string;
    name: string;
    address: string;
    city?: string;
    province?: string;
  };

  @ApiPropertyOptional({
    example: {
      price_sk: 'f290f1ee-6c54-4b01-90e6-d701748f0853',
      price: 5000,
      currency: 'CAD',
      recorded_at: '2025-07-22T10:00:00Z',
    },
    description: 'Price information (optional)',
  })
  price?: {
    price_sk: string;
    price: number;
    currency: string;
    recorded_at: string;
  };
}

export class ProductWithStoreCreateDto {
  @ApiProperty({
    example: 'Organic Apple',
    description: 'Name of the product',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Product barcode',
  })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiPropertyOptional({
    example: BarcodeType.EAN13,
    description: 'Type of barcode',
    enum: BarcodeType,
  })
  @IsEnum(BarcodeType)
  @IsOptional()
  barcodeType?: BarcodeType;

  @ApiProperty({
    example: 101001,
    description: 'Category ID',
  })
  @IsNumber()
  @IsNotEmpty()
  category: number;

  @ApiPropertyOptional({
    example: 'Cheil Jedang',
    description: 'Brand name (optional)',
  })
  @IsString()
  @IsOptional()
  brandName?: string;

  @ApiPropertyOptional({
    description:
      'Existing store UUID (use this if user selected existing database store)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  storeSk?: string;

  @ApiPropertyOptional({
    description:
      'Google Places store data (use this if user selected Google Places result)',
    type: GooglePlacesStoreDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GooglePlacesStoreDataDto)
  googlePlacesStore?: GooglePlacesStoreDataDto;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Product price at the store (optional)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    example: 'CAD',
    description: 'Currency code (default: CAD)',
    default: 'CAD',
  })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class ProductWithStoreResponseDto {
  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'Product UUID',
  })
  product_sk: string;

  @ApiProperty({
    example: 'Organic Apple',
    description: 'Product name',
  })
  name: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Product barcode',
  })
  barcode: string;

  @ApiPropertyOptional({
    example: 'Cheil Jedang',
    description: 'Brand name (optional)',
  })
  brandName?: string;

  @ApiProperty({
    example: 101001,
    description: 'Category ID',
  })
  category: number;

  @ApiProperty({
    example: 'https://example.com/product.jpg',
    description: 'Product image URL',
  })
  image_url: string;

  @ApiProperty({
    description: 'Store information',
    type: 'object',
    additionalProperties: false,
  })
  store: {
    store_sk: string;
    name: string;
    fullAddress?: string;
    city?: string;
    province?: string;
    countryRegion?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
    isNew: boolean; // Indicates if store was created from Google Places data
  };

  @ApiPropertyOptional({
    description: 'Price information (if price was provided)',
    type: 'object',
    additionalProperties: false,
  })
  price?: {
    price_sk: string;
    price: number;
    currency: string;
    recorded_at: string;
  };

  @ApiProperty({
    description: 'Creation summary',
    type: 'object',
    additionalProperties: false,
  })
  summary: {
    productCreated: boolean;
    storeCreated: boolean;
    storeLinked: boolean;
    priceAdded: boolean;
  };
}
