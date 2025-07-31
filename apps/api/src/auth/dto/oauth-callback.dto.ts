import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({
    example: 'ya29.a0AfH6SMC...',
    description: 'Access token from OAuth provider',
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({
    example: 'ya29.a0AfH6SMC...',
    description: 'Refresh token from OAuth provider',
    required: false,
  })
  @IsString()
  @IsOptional()
  refresh_token?: string;

  @ApiProperty({
    example: '3600',
    description: 'Token expiration time in seconds',
    required: false,
  })
  @IsString()
  @IsOptional()
  expires_in?: string;

  @ApiProperty({
    example: 'bearer',
    description: 'Token type',
    required: false,
  })
  @IsString()
  @IsOptional()
  token_type?: string;

  @ApiProperty({
    example: 'openid profile email',
    description: 'OAuth scopes granted',
    required: false,
  })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiProperty({
    example: 'http://localhost:3000/auth/callback',
    description: 'Redirect URL after OAuth flow',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  redirect_url?: string;
}

export class GoogleOAuthUrlDto {
  @ApiProperty({
    example: 'http://localhost:3000/auth/callback',
    description: 'URL to redirect to after OAuth flow completes',
  })
  @IsUrl()
  @IsNotEmpty()
  redirectUrl: string;

  @ApiProperty({
    example: 'openid profile email',
    description: 'OAuth scopes to request (space-separated)',
    required: false,
  })
  @IsString()
  @IsOptional()
  scopes?: string;
}
