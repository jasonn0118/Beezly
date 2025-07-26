import { IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ProcessReceiptDto {
  @ApiProperty({
    description: 'User ID for file organization (UUID format)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (
      value === '' ||
      value === 'string' ||
      value === 'undefined' ||
      value === 'null'
    ) {
      return undefined;
    }
    return value as string;
  })
  @IsUUID(4, { message: 'user_id must be a valid UUID' })
  user_id?: string;

  @ApiProperty({
    description: 'Store ID for file organization (UUID format)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (
      value === '' ||
      value === 'string' ||
      value === 'undefined' ||
      value === 'null'
    ) {
      return undefined;
    }
    return value as string;
  })
  @IsUUID(4, { message: 'store_id must be a valid UUID' })
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
