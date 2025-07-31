import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Put,
  Delete,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDTO } from '../../../packages/types/dto/auth';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { GoogleOAuthUrlDto, OAuthCallbackDto } from './dto/oauth-callback.dto';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved current user',
    type: 'UserProfileDTO',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: UserProfileDTO): UserProfileDTO {
    return user;
  }

  @Public()
  @Post('signin')
  @ApiOperation({ summary: 'Sign in user' })
  @ApiResponse({ status: 200, description: 'Successfully signed in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() signInDto: SignInDto): Promise<AuthDTO> {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Sign up new user' })
  @ApiResponse({ status: 201, description: 'Successfully signed up' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or user already exists',
  })
  async signUp(@Body() signUpDto: SignUpDto): Promise<AuthDTO> {
    const metadata =
      signUpDto.firstName || signUpDto.lastName
        ? {
            firstName: signUpDto.firstName,
            lastName: signUpDto.lastName,
          }
        : undefined;
    return this.authService.signUp(
      signUpDto.email,
      signUpDto.password,
      metadata,
    );
  }

  @Post('signout')
  @ApiOperation({ summary: 'Sign out current user' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Successfully signed out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async signOut(
    @CurrentUser() user: UserProfileDTO,
  ): Promise<{ message: string }> {
    await this.authService.signOut();
    return { message: `User ${user.email} signed out successfully.` };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: 'UserProfileDTO',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async updateProfile(
    @CurrentUser() user: UserProfileDTO,
    @Body() updateData: UpdateProfileDto,
  ): Promise<UserProfileDTO> {
    return this.authService.updateProfile(user.id, updateData);
  }

  @Put('password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  async changePassword(
    @CurrentUser() user: UserProfileDTO,
    @Body() changePasswordData: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(changePasswordData.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  async resetPassword(
    @Body() resetData: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(resetData.email);
    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('oauth/google/url')
  @ApiOperation({
    summary: 'Get Google OAuth authorization URL',
    description: `
      Generate a Google OAuth URL to redirect users for authentication.
      
      **OAuth Flow:**
      1. Call this endpoint to get the Google OAuth URL
      2. Redirect user to the returned URL for Google authentication  
      3. Google redirects back to your app with OAuth tokens
      4. Call /auth/oauth/callback with the tokens to complete authentication
      
      **Usage:**
      - For web apps: Set redirectUrl to your callback page (e.g., http://localhost:3000/auth/callback)
      - For mobile apps: Use custom URL scheme (e.g., yourapp://auth/callback)
      
      **Note:** This handles both sign-up and sign-in - new users are automatically registered.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Google OAuth URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example:
            'https://accounts.google.com/oauth/authorize?client_id=...&redirect_uri=...&scope=openid+profile+email',
          description: 'Google OAuth authorization URL to redirect the user to',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid redirect URL or OAuth configuration error',
  })
  @ApiResponse({
    status: 500,
    description: 'OAuth service temporarily unavailable',
  })
  async getGoogleOAuthUrl(
    @Body() oauthData: GoogleOAuthUrlDto,
  ): Promise<{ url: string }> {
    return this.authService.getGoogleOAuthUrl(
      oauthData.redirectUrl,
      oauthData.scopes,
    );
  }

  @Public()
  @Post('oauth/callback')
  @ApiOperation({
    summary: 'Handle OAuth callback and authenticate user',
    description: `
      Complete OAuth authentication by exchanging OAuth tokens for application JWT.
      
      **How to get tokens:**
      After Google redirects back to your app, extract tokens from URL:
      - **URL fragment** (most common): Tokens are in URL hash after '#'
        Example: http://localhost:3000/auth/callback#access_token=ya29...&refresh_token=1//...
      - **URL parameters** (less common): Tokens are in query parameters after '?'
        Example: http://localhost:3000/auth/callback?access_token=ya29...&refresh_token=1//...
      
      **Frontend example:**
      \`\`\`javascript
      // Extract tokens from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      // Send to callback endpoint
      const response = await fetch('/auth/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken
        })
      });
      \`\`\`
      
      **Returns:** Same AuthDTO format as regular sign-in (access token + user info)
      **Auto-Registration:** New users are automatically created in both Supabase and local database
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully via OAuth',
    type: 'AuthDTO',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token for API authentication',
        },
        user: {
          $ref: '#/components/schemas/UserProfileDTO',
          description: 'User profile information',
        },
        expiresIn: {
          type: 'number',
          description: 'Token expiration time in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OAuth tokens or authentication failed',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required OAuth tokens or malformed request',
  })
  @ApiResponse({
    status: 500,
    description: 'OAuth service temporarily unavailable',
  })
  async handleOAuthCallback(
    @Body() callbackData: OAuthCallbackDto,
  ): Promise<AuthDTO> {
    return this.authService.handleOAuthCallback(
      callbackData.access_token,
      callbackData.refresh_token,
    );
  }

  @Public()
  @Get('callback')
  @ApiOperation({
    summary: 'Handle OAuth callback redirect (GET)',
    description: `
      This endpoint handles the OAuth callback redirect from Supabase.
      
      **When Supabase redirects here:**
      - Tokens are in URL fragment (after #): access_token, refresh_token, etc.
      - This endpoint serves a simple HTML page that extracts tokens and calls POST /auth/oauth/callback
      - Or redirects to your frontend callback page to handle token extraction
      
      **For API-only usage:**
      You can redirect to your frontend app that will handle token extraction and call POST /auth/oauth/callback
    `,
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns HTML page for token extraction or redirects to frontend',
    schema: {
      type: 'string',
      example: 'HTML page with JavaScript to extract tokens',
    },
  })
  handleOAuthCallbackRedirect(@Req() req: Request, @Res() res: Response): any {
    // For testing/demo purposes, always serve the HTML page on the API
    // In production, you might want to redirect to your frontend app

    // Option 2: Serve HTML page for token extraction (for direct API usage)
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Callback</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center; }
            .loading { color: #666; }
            .success { color: #28a745; }
            .error { color: #dc3545; }
        </style>
    </head>
    <body>
        <div id="status" class="loading">Processing OAuth callback...</div>
        <script>
            async function handleCallback() {
                try {
                    // Extract tokens from URL fragment
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const error = hashParams.get('error');
                    
                    if (error) {
                        throw new Error('OAuth error: ' + error);
                    }
                    
                    if (!accessToken) {
                        throw new Error('No access token received');
                    }
                    
                    document.getElementById('status').textContent = 'Authenticating...';
                    
                    // Call your API
                    const response = await fetch('/auth/oauth/callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Authentication failed');
                    }
                    
                    const authData = await response.json();
                    
                    document.getElementById('status').innerHTML = \`
                        <div class="success">
                            <h2>✅ Authentication Successful!</h2>
                            <p>Welcome, \${authData.user.email}!</p>
                            <p>You can close this window or redirect to your app.</p>
                            <pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: left; margin-top: 20px;">
Access Token: \${authData.accessToken.substring(0, 50)}...
User: \${JSON.stringify(authData.user, null, 2)}
                            </pre>
                        </div>
                    \`;
                    
                    // Optional: Auto-redirect to your app
                    // setTimeout(() => {
                    //     window.location.href = '${frontendUrl}/dashboard';
                    // }, 3000);
                    
                } catch (error) {
                    console.error('OAuth callback error:', error);
                    document.getElementById('status').innerHTML = \`
                        <div class="error">
                            <h2>❌ Authentication Failed</h2>
                            <p>\${error.message}</p>
                            <p><a href="/auth/signin">Try again</a></p>
                        </div>
                    \`;
                }
            }
            
            // Run when page loads
            handleCallback();
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  // Admin-only endpoints
  @Roles('admin')
  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Users per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserProfileDTO' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        perPage: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listUsers(@Query() query: ListUsersDto): Promise<{
    users: UserProfileDTO[];
    total: number;
    page: number;
    perPage: number;
  }> {
    return this.authService.listUsers(query.page, query.perPage);
  }

  @Roles('admin')
  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: 'UserProfileDTO',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('userId') userId: string): Promise<UserProfileDTO> {
    const user = await this.authService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Roles('admin')
  @Put('users/:userId')
  @ApiOperation({ summary: 'Update user metadata (admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: 'UserProfileDTO',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserMetadata(
    @Param('userId') userId: string,
    @Body() updateData: UpdateProfileDto,
  ): Promise<UserProfileDTO> {
    return this.authService.updateUserMetadata(userId, updateData);
  }

  @Roles('admin')
  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete user account (admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.authService.deleteUser(userId);
    return { message: 'User deleted successfully' };
  }
}
