import { ApiProperty } from '@nestjs/swagger';
import { BarcodeType } from '@beezly/types';

export class StoreInfoDto {
  @ApiProperty({
    description: 'Store unique identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  storeSk: string;

  @ApiProperty({
    description: 'Store name',
    example: 'Walmart Supercenter',
  })
  name: string;

  @ApiProperty({
    description: 'Complete formatted address',
    example: '2929 BARNET HWY, Coquitlam, BC V3B 5R5',
    required: false,
  })
  fullAddress?: string;

  @ApiProperty({
    description: 'City',
    example: 'Coquitlam',
    required: false,
  })
  city?: string;

  @ApiProperty({
    description: 'Province/State',
    example: 'BC',
    required: false,
  })
  province?: string;

  @ApiProperty({
    description: 'Store latitude coordinate',
    example: 49.2827,
    required: false,
  })
  latitude?: number;

  @ApiProperty({
    description: 'Store longitude coordinate',
    example: -123.1207,
    required: false,
  })
  longitude?: number;

  @ApiProperty({
    description:
      'Distance from the provided coordinates to the store in kilometers',
    example: 5.2,
    required: false,
  })
  distance?: number;
}

export class PriceInfoDto {
  @ApiProperty({
    description: 'Price unique identifier',
    example: 'p1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  priceSk: string;

  @ApiProperty({
    description: 'Product price',
    example: 3.99,
  })
  price: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'CAD',
    default: 'CAD',
  })
  currency: string;

  @ApiProperty({
    description: 'When the price was recorded',
    example: '2024-01-15T10:30:00Z',
  })
  recordedAt: Date;

  @ApiProperty({
    description: 'Price credibility score (0-10)',
    example: 7.5,
    required: false,
  })
  creditScore?: number;

  @ApiProperty({
    description: 'Number of verifications',
    example: 12,
    required: false,
  })
  verifiedCount?: number;

  @ApiProperty({
    description: 'Whether this is a discount price',
    example: false,
    default: false,
  })
  isDiscount: boolean;

  @ApiProperty({
    description: 'Original price before discount',
    example: 5.99,
    required: false,
  })
  originalPrice?: number;

  @ApiProperty({
    description: 'Store information where this price was recorded',
    type: StoreInfoDto,
  })
  store: StoreInfoDto;
}

export class EnhancedProductResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the product',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Organic Bananas',
  })
  name: string;

  @ApiProperty({
    description: 'Product barcode',
    example: '0123456789012',
  })
  barcode: string;

  @ApiProperty({
    description: 'Type of barcode',
    enum: BarcodeType,
    example: BarcodeType.EAN13,
    required: false,
  })
  barcodeType?: BarcodeType;

  @ApiProperty({
    description: 'Product brand',
    example: 'Chiquita',
    required: false,
  })
  brand?: string;

  @ApiProperty({
    description: 'Product category name',
    example: 'Produce',
    required: false,
  })
  categoryName?: string;

  @ApiProperty({
    description: 'Product category ID',
    example: 12,
    required: false,
  })
  category?: number;

  @ApiProperty({
    description: 'Image URL of the product',
    example: 'https://example.com/images/banana.jpg',
    required: false,
  })
  image_url?: string;

  @ApiProperty({
    description:
      'Whether this product was found in our database or is a placeholder',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'List of prices for this product across different stores',
    type: [PriceInfoDto],
    isArray: true,
  })
  prices: PriceInfoDto[];

  @ApiProperty({
    description: 'Lowest available price information',
    type: PriceInfoDto,
    required: false,
  })
  lowestPrice?: PriceInfoDto;

  @ApiProperty({
    description: 'Total number of stores carrying this product',
    example: 5,
  })
  availableStoresCount: number;
}
