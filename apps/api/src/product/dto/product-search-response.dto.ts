import { ApiProperty } from '@nestjs/swagger';

export class ProductSearchResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Product ID',
  })
  product_sk: string;

  @ApiProperty({
    example: 'Organic Apple',
    description: 'Product name',
  })
  name: string;

  @ApiProperty({
    example: 'Cheil Jedang',
    description: 'Product brand name',
    required: false,
  })
  brandName?: string;

  @ApiProperty({
    example: 'https://example.com/images/apple.jpg',
    description: 'Product image URL',
    required: false,
  })
  image_url?: string;

  @ApiProperty({ 
    example: 12, 
    required: false 
  })
  category?: number;

  @ApiProperty({ 
    example: 'Produce > Fruits > Bananas', 
    required: false 
  })
  categoryPath?: string;
}
