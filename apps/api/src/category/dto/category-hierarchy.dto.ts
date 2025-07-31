import { ApiProperty } from '@nestjs/swagger';

export class CategoryLevel3DTO {
  @ApiProperty({ example: 'Citrus', description: 'Third-level category name' })
  name: string;

  @ApiProperty({
    example: 'Citrus',
    description: 'Value to use when filtering or saving',
  })
  value: string;
}

export class CategoryLevel2DTO {
  @ApiProperty({ example: 'Fruits', description: 'Second-level category name' })
  name: string;

  @ApiProperty({
    example: 'Fruits',
    description: 'Value to use when filtering or saving',
  })
  value: string;

  @ApiProperty({
    type: [CategoryLevel3DTO],
    description: 'Third-level categories under this category',
  })
  subcategories: CategoryLevel3DTO[];
}

export class CategoryHierarchyDTO {
  @ApiProperty({ example: 'Produce', description: 'Top-level category name' })
  name: string;

  @ApiProperty({
    example: 'Produce',
    description: 'Value to use when filtering or saving',
  })
  value: string;

  @ApiProperty({
    type: [CategoryLevel2DTO],
    description: 'Second-level categories under this category',
  })
  subcategories: CategoryLevel2DTO[];
}

export class CategoryTreeDTO {
  @ApiProperty({
    type: [CategoryHierarchyDTO],
    description: 'Complete category hierarchy tree',
  })
  categories: CategoryHierarchyDTO[];
}

export class CategoryPathDTO {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Produce', description: 'Top-level category' })
  category1: string;

  @ApiProperty({
    example: 'Fruits',
    description: 'Second-level category',
    required: false,
  })
  category2?: string;

  @ApiProperty({
    example: 'Citrus',
    description: 'Third-level category',
    required: false,
  })
  category3?: string;

  @ApiProperty({
    example: 'Produce > Fruits > Citrus',
    description: 'Full category path',
  })
  fullPath: string;

  @ApiProperty({
    example: ['Produce', 'Fruits', 'Citrus'],
    description: 'Category path as array',
  })
  path: string[];
}
