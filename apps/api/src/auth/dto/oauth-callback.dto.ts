import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'OAuth access token from the provider',
    example: 'ya29.a0ARrdaM...',
  })
  @IsString()
  access_token: string;

  @ApiProperty({
    description: 'OAuth refresh token from the provider (optional)',
    example: '1//04f...',
    required: false,
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiProperty({
    description: 'OAuth provider name',
    example: 'google',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'User information from OAuth provider',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  user_info?: {
    id: string;
    email: string;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
}

export class OAuthUrlDto {
  @ApiProperty({
    description: 'Redirect URL after OAuth flow completion',
    example: 'http://localhost:3000/auth/callback',
  })
  @IsString()
  redirectUrl: string;
}
