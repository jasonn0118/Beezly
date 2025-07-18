import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
