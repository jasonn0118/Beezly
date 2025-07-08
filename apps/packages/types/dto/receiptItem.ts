import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReceiptItemDTO {
  @ApiProperty({
    example: "f1a2b3c4-5678-90ab-cdef-1234567890ab",
    description: "Receipt item primary key (UUID)",
  })
  id: string; // receiptitem_sk (UUID)

  @ApiProperty({
    example: "d4e5f6g7-8901-23hi-4567-j890klmnop12",
    description: "Associated receipt primary key (UUID)",
  })
  receiptId: string; // receipt_sk

  @ApiPropertyOptional({
    example: "a1b2c3d4-5678-90ef-ghij-1234567890kl",
    description: "Associated product primary key (UUID) if available",
  })
  productId?: string; // product_sk

  @ApiProperty({
    example: 19.99,
    description: "Price of a single unit for this receipt item",
  })
  price: number;

  @ApiProperty({
    example: 3,
    description: "Quantity of the product purchased",
  })
  quantity: number;

  @ApiProperty({
    example: 59.97,
    description: "Total amount for this line item (price * quantity)",
  })
  lineTotal: number;

  @ApiProperty({
    example: "2025-07-07T16:00:00Z",
    description: "Timestamp when the receipt item was created (ISO string)",
  })
  createdAt: string;

  @ApiProperty({
    example: "2025-07-07T16:30:00Z",
    description:
      "Timestamp when the receipt item was last updated (ISO string)",
  })
  updatedAt: string;
}
