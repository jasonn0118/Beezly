// apps/api/src/auth/auth.controller.ts

import { Body, Controller, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDTO } from '../../../packages/types/dto/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  async signIn(
    @Body() body: { email: string; password: string },
  ): Promise<AuthDTO> {
    return this.authService.signIn(body.email, body.password);
  }

  @Post('signout')
  async signOut(): Promise<{ message: string }> {
    await this.authService.signOut();
    return { message: 'Signed out successfully.' };
  }

  @Get('me')
  async getMe(): Promise<any> {
    return this.authService.getUser();
  }
}
