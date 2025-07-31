import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, description: 'User first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'User point balance' })
  @IsOptional()
  @IsNumber()
  pointBalance?: number;

  @ApiProperty({ required: false, description: 'User level' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ required: false, description: 'User rank' })
  @IsOptional()
  @IsNumber()
  rank?: number;

  @ApiProperty({ required: false, description: 'User badges', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  badges?: string[];
}
