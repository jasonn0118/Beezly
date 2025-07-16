import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsNumber, IsDateString, ValidateNested } from 'class-validator';

export class CreateReceiptItemDto {
  @ApiProperty({
    example: 'Organic Apples',
    description: 'Name of the product',
  })
  @IsString()
  productName: string;

  @ApiPropertyOptional({
    example: '1234567890123',
    description: 'Product barcode if available',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    example: 'Produce',
    description: 'Product category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 3.99,
    description: 'Price per unit',
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity purchased',
  })
  @IsNumber()
  quantity: number;
}

export class CreateReceiptRequestDto {
  @ApiPropertyOptional({
    example: 'user-uuid-123',
    description: 'User ID who made the purchase',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 'Whole Foods Market',
    description: 'Store name',
  })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({
    example: 'store-uuid-456',
    description: 'Store ID if known',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/receipt-image.jpg',
    description: 'URL to receipt image',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: '2025-01-15T10:30:00Z',
    description: 'Purchase date in ISO format',
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({
    type: [CreateReceiptItemDto],
    description: 'List of items in the receipt',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptItemDto)
  items: CreateReceiptItemDto[];

  @ApiPropertyOptional({
    example: 15.97,
    description: 'Total amount of the receipt',
  })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;
}