import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address to send reset link to',
    example: 'user@example.com',
  })
  @IsString()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
