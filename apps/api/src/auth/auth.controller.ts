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
} from '@nestjs/common';
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
