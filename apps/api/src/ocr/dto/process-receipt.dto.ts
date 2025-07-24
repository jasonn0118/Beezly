import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ProcessReceiptDto {
  @ApiProperty({
    description: 'User ID for file organization',
    example: 'user_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    description: 'Store ID for file organization',
    example: 'store_456',
    required: false,
  })
  @IsOptional()
  @IsString()
  store_id?: string;
}

export class ProcessReceiptEnhancedDto extends ProcessReceiptDto {
  @ApiProperty({
    description: 'Whether to include product normalization',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  include_normalization?: boolean = true;

  @ApiProperty({
    description: 'Whether to create receipt record in database',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  create_receipt?: boolean = false;
}
