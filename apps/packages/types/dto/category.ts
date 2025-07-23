import { ApiProperty } from "@nestjs/swagger";

export class CategoryDTO {
  @ApiProperty({ example: 1, description: "Primary key of the category group" })
  id: number;

  @ApiProperty({ example: "Electronics", description: "Level 1 category name" })
  category1: string;

  @ApiProperty({ example: "Computers", description: "Level 2 category name" })
  category2: string;

  @ApiProperty({ example: "Laptops", description: "Level 3 category name" })
  category3: string;

  @ApiProperty({
    example: "2025-07-22T10:00:00.000Z",
    description: "Creation timestamp",
  })
  created_at: string;

  @ApiProperty({
    example: "2025-07-22T11:00:00.000Z",
    description: "Last update timestamp",
  })
  updated_at: string;

  @ApiProperty({ example: null, description: "Soft delete timestamp" })
  deleted_at: string | null;
}
