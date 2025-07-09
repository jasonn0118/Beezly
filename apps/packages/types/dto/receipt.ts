import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NormalizedProductDTO } from "./product";

export class ReceiptDTO {
  @ApiProperty({
    example: "f1a2b3c4-5678-90ab-cdef-1234567890ab",
    description: "Receipt primary key (UUID)",
  })
  id: string; // receipt_sk (UUID)

  @ApiPropertyOptional({
    example: "1a2b3c4d-5678-90ab-cdef-1234567890ab",
    description: "User primary key (UUID) associated with the receipt",
  })
  userId?: string; // user_sk (UUID)

  @ApiProperty({
    example: "Walmart",
    description: "Name of the store where the purchase was made",
  })
  storeName: string;

  @ApiProperty({
    example: "2025-07-07T15:30:00Z",
    description: "Date and time of purchase (ISO string)",
  })
  purchaseDate: string; // ISO string

  @ApiProperty({
    example: "done",
    description: "Current processing status of the receipt",
    enum: ["pending", "processing", "failed", "manual_review", "done"],
  })
  status: "pending" | "processing" | "failed" | "manual_review" | "done";

  @ApiProperty({
    example: 59.99,
    description: "Total amount of the receipt",
  })
  totalAmount: number;

  @ApiProperty({
    type: [NormalizedProductDTO],
    description: "List of purchased items extracted from the receipt",
  })
  items: NormalizedProductDTO[];

  @ApiProperty({
    example: "2025-07-07T16:00:00Z",
    description: "Timestamp when the receipt was created (ISO string)",
  })
  createdAt: string;

  @ApiProperty({
    example: "2025-07-07T16:30:00Z",
    description: "Timestamp when the receipt was last updated (ISO string)",
  })
  updatedAt: string;
}
