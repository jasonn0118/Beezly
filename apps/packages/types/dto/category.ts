import { ApiProperty } from "@nestjs/swagger";

export class CategoryDTO {
  @ApiProperty({ example: 1, description: "Primary key of the category" })
  id: number;

  @ApiProperty({ example: 0, description: "Parent category ID", nullable: true })
  parent_id: number | null;

  @ApiProperty({ example: "Electronics", description: "Name of the category" })
  name: string;

  @ApiProperty({ example: "electronics", description: "Slug for the category" })
  slug: string;

  @ApiProperty({ example: 1, description: "Hierarchy level" })
  level: number;

  @ApiProperty({ example: true, description: "Whether the category is active" })
  use_yn: boolean;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z", description: "Creation timestamp" })
  created_at: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z", description: "Last update timestamp" })
  updated_at: string;
}
