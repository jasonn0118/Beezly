import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ProcessReceiptDto {
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

export class ProcessReceiptEnhancedDto {
  @ApiProperty({
    description:
      'User ID for file organization (UUID format) - optional for non-authenticated users',
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
}
