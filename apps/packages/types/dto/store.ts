import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StoreDTO {
  @ApiProperty({
    example: "f1a2b3c4-5678-90ab-cdef-1234567890ab",
    description: "Store primary key (UUID)",
  })
  id: string; // store_sk (UUID)

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
  postalCode?: string;

  @ApiPropertyOptional({
    example: 43.6532,
    description: "Latitude coordinate of the store",
  })
  latitude?: number;

  @ApiPropertyOptional({
    example: -79.3832,
    description: "Longitude coordinate of the store",
  })
  longitude?: number;

  @ApiPropertyOptional({
    example: "ChIJA_PtVhBfK4gRD-7RgJ2CqQ4",
    description: "Google Places ID for the store",
  })
  placeId?: string;

  @ApiProperty({
    example: "2025-07-07T16:00:00Z",
    description: "Timestamp when the store was created (ISO string)",
  })
  createdAt: string;

  @ApiProperty({
    example: "2025-07-07T16:30:00Z",
    description: "Timestamp when the store was last updated (ISO string)",
  })
  updatedAt: string;
}
