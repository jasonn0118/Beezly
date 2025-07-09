import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BadgeDTO {
  @ApiProperty({
    example: 1,
    description: "Badge primary key",
  })
  id: number;

  @ApiProperty({
    example: "Early Bird",
    description: "Name of the badge",
  })
  name: string;

  @ApiPropertyOptional({
    example: "https://example.com/icons/early-bird.png",
    description: "Optional URL of the badge icon",
  })
  iconUrl?: string;

  @ApiPropertyOptional({
    example: "Awarded for first purchase before 9 AM",
    description: "Optional description of the badge",
  })
  description?: string;
}

export class UserBadgeDTO {
  @ApiProperty({
    example: "1a2b3c4d-5678-90ab-cdef-1234567890ab",
    description: "User primary key (UUID)",
  })
  userId: string; // user_sk (UUID)

  @ApiProperty({
    example: 1,
    description: "ID of the badge awarded",
  })
  badgeId: number;

  @ApiProperty({
    example: "2025-07-07T10:30:00Z",
    description: "Timestamp when the badge was awarded (ISO string)",
  })
  awardedAt: string;
}
