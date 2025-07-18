import { Body, Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDTO } from '../../../packages/types/dto/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved current user',
  })
  async getMe(): Promise<any> {
    return this.authService.getUser();
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign in user' })
  @ApiResponse({ status: 200, description: 'Successfully signed in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(
    @Body() body: { email: string; password: string },
  ): Promise<AuthDTO> {
    return this.authService.signIn(body.email, body.password);
  }

  @Post('signout')
  @ApiOperation({ summary: 'Sign out user' })
  @ApiResponse({ status: 200, description: 'Successfully signed out' })
  async signOut(): Promise<{ message: string }> {
    await this.authService.signOut();
    return { message: 'Signed out successfully.' };
  }
}
