import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StoreLocationDto {
  @ApiProperty({
    description: 'Store name',
    example: 'Walmart Supercenter',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Complete formatted address',
    example: '2929 BARNET HWY, Coquitlam, BC V3B 5R5',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiProperty({
    description: 'Street number',
    example: '2929',
    required: false,
  })
  @IsOptional()
  @IsString()
  streetNumber?: string;

  @ApiProperty({
    description: 'Road name',
    example: 'BARNET HWY',
    required: false,
  })
  @IsOptional()
  @IsString()
  road?: string;

  @ApiProperty({
    description: 'Street address (combination of street number + road)',
    example: '2929 BARNET HWY',
    required: false,
  })
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiProperty({
    description: 'City',
    example: 'Coquitlam',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Province/State',
    example: 'BC',
    required: false,
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    description: 'Postal code',
    example: 'V3B 5R5',
    required: false,
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({
    description: 'Country/Region',
    example: 'Canada',
    required: false,
  })
  @IsOptional()
  @IsString()
  countryRegion?: string;

  @ApiProperty({
    description: 'Store latitude coordinate',
    example: 49.2827,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Store longitude coordinate',
    example: -123.1207,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Google Places ID for the store location',
    example: 'ChIJ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  placeId?: string;
}

export class PriceInfoSubmissionDto {
  @ApiProperty({
    description: 'Product price (current price including any discounts)',
    example: 3.99,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'CAD',
    default: 'CAD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class AddProductPriceDto {
  @ApiProperty({
    description:
      'Store information where the price was observed (required if storeSk is not provided)',
    type: StoreLocationDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoreLocationDto)
  store?: StoreLocationDto;

  @ApiProperty({
    description: 'Existing store UUID (required if store is not provided)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  storeSk?: string;

  @ApiProperty({
    description: 'Price information for the product at this store',
    type: PriceInfoSubmissionDto,
  })
  @ValidateNested()
  @Type(() => PriceInfoSubmissionDto)
  price: PriceInfoSubmissionDto;
}

export class AddProductPriceResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Successfully added price information for product',
  })
  message: string;

  @ApiProperty({
    description: 'Created or updated store information',
    type: 'object',
    additionalProperties: false,
  })
  store: {
    storeSk: string;
    name: string;
    isNew: boolean;
  };

  @ApiProperty({
    description: 'Created price information',
    type: 'object',
    additionalProperties: false,
  })
  price: {
    priceSk: string;
    price: number;
    currency: string;
    recordedAt: Date;
  };

  @ApiProperty({
    description: 'Product information',
    type: 'object',
    additionalProperties: false,
  })
  product: {
    productSk: string;
    name: string;
    barcode: string;
  };
}
