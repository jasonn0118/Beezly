import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'First level category (required)',
    example: 'Produce',
  })
  @IsString()
  @IsNotEmpty()
  category1: string;

  @ApiProperty({
    description: 'Second level category (optional)',
    example: 'Fruits',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category2?: string;

  @ApiProperty({
    description: 'Third level category (optional, requires category2)',
    example: 'Apples',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: CreateCategoryDto) => Boolean(o.category3 && !o.category2))
  category3?: string;
}
