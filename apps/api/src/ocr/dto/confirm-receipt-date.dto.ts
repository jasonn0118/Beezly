import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional } from 'class-validator';

export class ConfirmReceiptDateDto {
  @ApiProperty({
    description: 'Receipt ID to update the date for',
    example: 'a123b456-c789-d012-e345-f678g901h234',
  })
  @IsString()
  receiptId: string;

  @ApiProperty({
    description:
      'Confirmed purchase date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)',
    example: '2023-11-15',
  })
  @IsDateString()
  confirmedDate: string;

  @ApiProperty({
    description: 'Optional purchase time (HH:mm format)',
    example: '14:30',
    required: false,
  })
  @IsString()
  @IsOptional()
  confirmedTime?: string;
}
