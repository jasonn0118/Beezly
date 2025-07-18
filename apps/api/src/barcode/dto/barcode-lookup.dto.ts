import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BarcodeType } from '@beezly/types';

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

  @ApiProperty({
    description: 'The type of barcode being scanned',
    enum: BarcodeType,
    example: BarcodeType.EAN13,
    required: false,
  })
  @IsEnum(BarcodeType)
  @IsOptional()
  barcodeType?: BarcodeType;
}
