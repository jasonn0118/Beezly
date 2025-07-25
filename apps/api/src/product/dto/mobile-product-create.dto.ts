import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  IsEnum,
} from 'class-validator';
import { BarcodeType } from '@beezly/types';

export class MobileProductCreateDto {
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

  @ApiProperty({
    example: 'Homeplus',
    description: 'Name of the store',
  })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiProperty({
    example: '123 Main St, Seoul',
    description: 'Store address',
  })
  @IsString()
  @IsNotEmpty()
  storeAddress: string;

  @ApiProperty({
    example: 5000,
    description: 'Product price in the store',
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 'Cheil Jedang',
    description: 'Brand name (optional, for future use)',
  })
  @IsString()
  @IsOptional()
  brandName?: string;

  @ApiPropertyOptional({
    example: 'Seoul',
    description: 'Store city (optional)',
  })
  @IsString()
  @IsOptional()
  storeCity?: string;

  @ApiPropertyOptional({
    example: 'Seoul',
    description: 'Store province (optional)',
  })
  @IsString()
  @IsOptional()
  storeProvince?: string;

  @ApiPropertyOptional({
    example: '12345',
    description: 'Store postal code (optional)',
  })
  @IsString()
  @IsOptional()
  storePostalCode?: string;
}

export class MobileProductResponseDto {
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
    example: {
      store_sk: 'e290f1ee-6c54-4b01-90e6-d701748f0852',
      name: 'Homeplus',
      address: '123 Main St, Seoul',
      city: 'Seoul',
      province: 'Seoul',
    },
    description: 'Store information',
  })
  store: {
    store_sk: string;
    name: string;
    address: string;
    city?: string;
    province?: string;
  };

  @ApiProperty({
    example: {
      price_sk: 'f290f1ee-6c54-4b01-90e6-d701748f0853',
      price: 5000,
      currency: 'KRW',
      recorded_at: '2025-07-22T10:00:00Z',
    },
    description: 'Price information',
  })
  price: {
    price_sk: string;
    price: number;
    currency: string;
    recorded_at: string;
  };
}
