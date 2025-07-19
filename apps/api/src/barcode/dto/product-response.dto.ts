import { ApiProperty } from '@nestjs/swagger';
import { BarcodeType } from '@beezly/types';

export class ProductResponseDto {
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
    description: 'Product category',
    example: 'Produce',
    required: false,
  })
  category?: string;

  @ApiProperty({
    description:
      'Whether this product was found in our database or is a placeholder',
    example: true,
  })
  isVerified: boolean;
}
