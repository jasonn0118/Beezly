import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NormalizedProductDTO {
  @ApiProperty({
    example: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    description: "Product primary key (UUID)",
  })
  id: string; // product_sk (UUID)

  @ApiProperty({
    example: "Apple iPhone 15",
    description: "Name of the product",
  })
  name: string;

  @ApiPropertyOptional({
    example: "190199204200",
    description: "Optional product barcode",
  })
  barcode?: string;

  @ApiPropertyOptional({
    example: "Electronics",
    description: "Optional product category",
  })
  category?: string;

  @ApiPropertyOptional({
    example: 1299.99,
    description: "Optional product price",
  })
  price?: number;

  @ApiPropertyOptional({
    example: "https://example.com/images/product.jpg",
    description: "Optional product image URL",
  })
  imageUrl?: string;

  @ApiProperty({
    example: 100,
    description: "Available quantity in stock",
  })
  quantity: number;

  @ApiProperty({
    example: "2025-07-07T10:00:00Z",
    description: "Creation timestamp (ISO string)",
  })
  createdAt: string;

  @ApiProperty({
    example: "2025-07-07T12:00:00Z",
    description: "Last update timestamp (ISO string)",
  })
  updatedAt: string;
}
