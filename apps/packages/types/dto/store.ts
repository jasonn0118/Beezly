import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StoreDTO {
  @ApiProperty({
    example: "f1a2b3c4-5678-90ab-cdef-1234567890ab",
    description: "Store primary key (UUID)",
  })
  store_sk: string; // store_sk (UUID)

  @ApiProperty({
    example: "Walmart Supercentre",
    description: "Name of the store",
  })
  name: string;

  @ApiPropertyOptional({
    example: "123 Main St",
    description: "Street address of the store",
  })
  address?: string;

  @ApiPropertyOptional({
    example: "Toronto",
    description: "City where the store is located",
  })
  city?: string;

  @ApiPropertyOptional({
    example: "ON",
    description: "Province where the store is located",
  })
  province?: string;

  @ApiPropertyOptional({
    example: "M1A 1A1",
    description: "Postal code of the store location",
  })
  postal_code?: string;

  @ApiPropertyOptional({
    example: 43.6532,
    description: "Latitude coordinate of the store",
  })
  latitude?: number | null;

  @ApiPropertyOptional({
    example: -79.3832,
    description: "Longitude coordinate of the store",
  })
  longitude?: number | null;

  @ApiProperty({
    example: "2025-07-07T16:00:00Z",
    description: "Timestamp when the store was created (ISO string)",
  })
  created_at: string;

  @ApiProperty({
    example: "2025-07-07T16:30:00Z",
    description: "Timestamp when the store was last updated (ISO string)",
  })
  updated_at: string;

  @ApiProperty({
    example: "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
    description:
      "Google Place ID for the store (unique identifier from Google Places API)",
  })
  place_id: string;
}
