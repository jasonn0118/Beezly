import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserProfileDTO {
  @ApiProperty({
    example: "1a2b3c4d-5678-90ab-cdef-1234567890ab",
    description: "User primary key (UUID)",
  })
  id: string; // user_sk (UUID)

  @ApiProperty({
    example: "john.doe@example.com",
    description: "User email address",
  })
  email: string;

  @ApiPropertyOptional({
    example: "John Doe",
    description: "Optional display name of the user",
  })
  displayName?: string;

  @ApiProperty({
    example: 1500,
    description: "Current point balance of the user",
  })
  pointBalance: number;

  @ApiPropertyOptional({
    example: "Gold",
    description: "User membership level if available",
  })
  level?: string;

  @ApiPropertyOptional({
    example: 5,
    description: "User rank in the system if applicable",
  })
  rank?: number;

  @ApiProperty({
    example: ["early-bird", "top-purchaser"],
    description: "List of badges assigned to the user",
    type: [String],
  })
  badges: string[];

  @ApiProperty({
    example: "2025-07-07T10:00:00Z",
    description: "Timestamp when the user was created (ISO string)",
  })
  createdAt: string;

  @ApiProperty({
    example: "2025-07-07T12:00:00Z",
    description: "Timestamp when the user was last updated (ISO string)",
  })
  updatedAt: string;
}
