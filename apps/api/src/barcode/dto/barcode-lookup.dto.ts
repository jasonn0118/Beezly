import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BarcodeLookupDto {
  @ApiProperty({
    description: 'The barcode string to lookup (UPC, EAN, etc.)',
    example: '0123456789012',
  })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({
    description: 'Optional user ID for tracking who scanned the barcode',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;
}
