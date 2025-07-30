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
    example: "2929",
    description: "Street number/house number from Azure OCR",
  })
  streetNumber?: string;

  @ApiPropertyOptional({
    example: "BARNET HWY",
    description: "Road/street name from Azure OCR",
  })
  road?: string;

  @ApiPropertyOptional({
    example: "2929 BARNET HWY",
    description: "Street address (street number + road) from Azure OCR",
  })
  streetAddress?: string;

  @ApiPropertyOptional({
    example: "2929 BARNET HWY, COQUITLAM, BC V3B 5R9",
    description: "Complete formatted address",
  })
  fullAddress?: string;

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
    example: "CAN",
    description: "Country/region from Azure OCR (ISO country code)",
  })
  countryRegion?: string;

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
