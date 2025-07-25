import { ApiProperty } from '@nestjs/swagger';

export class ProductSearchResponseDto {
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
  brand_name?: string;

  @ApiProperty({
    example: 'https://example.com/images/apple.jpg',
    description: 'Product image URL',
    required: false,
  })
  image_url?: string;
}
