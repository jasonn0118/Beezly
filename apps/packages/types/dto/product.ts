import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NormalizedProductDTO {
  @ApiProperty({
    example: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    description: "Product primary key (UUID)",
  })
  product_sk: string;

  @ApiProperty({
    example: "Organic Apple",
    description: "Name of the product",
  })
  name: string;

  @ApiPropertyOptional({
    example: "1234567890123",
    description: "Optional product barcode",
  })
  barcode?: string;

  @ApiPropertyOptional({
    example: "https://example.com/images/product.jpg",
    description: "Optional product image URL",
  })
  image_url?: string;

  @ApiPropertyOptional({
    example: 80.5,
    description: "Initial credit score of the product (0~100)",
  })
  credit_score?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of verified validations",
  })
  verified_count?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of times this product was flagged",
  })
  flagged_count?: number;

  @ApiProperty({
    example: "2025-07-17T10:00:00Z",
    description: "Product creation timestamp (ISO 8601)",
  })
  created_at: string;

  @ApiProperty({
    example: "2025-07-17T12:00:00Z",
    description: "Product last update timestamp (ISO 8601)",
  })
  updated_at: string;

  @ApiPropertyOptional({
    example: 1,
    description: "Foreign key category ID (integer)",
  })
  category?: number;
}
