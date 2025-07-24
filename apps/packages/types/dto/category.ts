import { ApiProperty } from "@nestjs/swagger";

export class CategoryDTO {
  @ApiProperty({ example: 1, description: "Primary key of the category" })
  id: number;

  @ApiProperty({ example: "Electronics", description: "1st-level category" })
  category1: string;

  @ApiProperty({ example: "Computers", description: "2nd-level category" })
  category2: string;

  @ApiProperty({ example: "Laptops", description: "3rd-level category" })
  category3: string;
}
