import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthDTO } from '../../../packages/types/dto/auth';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../user/user.service';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';

type UserMetadata = {
  firstName?: string;
  lastName?: string;
  full_name?: string;
  pointBalance?: number;
  level?: string;
  rank?: number;
  badges?: string[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService,
  ) {}
  async signIn(email: string, password: string): Promise<AuthDTO> {
    try {
      const {
        data,
        error,
      }: {
        data: { session: Session | null; user: User | null };
        error: AuthError | null;
      } = await this.supabaseService.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.warn(`Sign in failed for ${email}: ${error.message}`);
        throw this.mapSupabaseError(error, 'signin');
      }

      const { session, user } = data;
      if (!session || !user) {
        this.logger.warn(
          `Sign in failed for ${email}: No session or user data`,
        );
        throw new UnauthorizedException('Invalid email or password.');
      }

      // Get user data from local database instead of Supabase metadata
      let localUser = await this.userService.getUserById(user.id);

      if (!localUser) {
        // Create local user record if it doesn't exist
        const metadata = (user.user_metadata ?? {}) as UserMetadata;
        localUser = await this.userService.createUserWithSupabaseId(user.id, {
          email: user.email ?? '',
          firstName: metadata.firstName ?? '',
          lastName: metadata.lastName ?? '',
          pointBalance: 0,
          level: 'beginner',
        });

        this.logger.log(`Created local user record for: ${user.email}`);
      }

      const mappedUser: UserProfileDTO = localUser;

      this.logger.log(`User signed in successfully: ${user.email}`);

      return {
        accessToken: session.access_token,
        user: mappedUser,
        expiresIn: session.expires_in,
      };
    } catch (error) {
      // Re-throw HTTP exceptions as-is
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        `Sign in error for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable',
      );
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error }: { error: AuthError | null } =
        await this.supabaseService.auth.signOut();
      if (error) {
        this.logger.warn(`Sign out failed: ${error.message}`);
        throw new Error(error.message);
      }
      this.logger.log('User signed out successfully');
    } catch (error) {
      this.logger.error(
        `Sign out error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getUser(): Promise<UserProfileDTO | null> {
    try {
      const {
        data,
        error,
      }: {
        data: { user: User | null };
        error: AuthError | null;
      } = await this.supabaseService.auth.getUser();

      if (error) {
        this.logger.warn(`Get user failed: ${error.message}`);
        throw new Error(error.message);
      }

      const user = data.user;
      if (!user) {
        return null;
      }

      // Get user data from local database instead of Supabase metadata
      const localUser = await this.userService.getUserById(user.id);

      if (!localUser) {
        return null;
      }

      return localUser;
    } catch (error) {
      this.logger.error(
        `Get user error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Validate JWT token and return user data
   */
  async validateToken(token: string): Promise<UserProfileDTO | null> {
    try {
      const user = await this.supabaseService.validateToken(token);

      if (!user) {
        return null;
      }

      // Get user data from local database instead of Supabase metadata
      const localUser = await this.userService.getUserById(user.id);

      if (!localUser) {
        return null;
      }

      return localUser;
    } catch (error) {
      this.logger.error(
        `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(
    email: string,
    password: string,
    metadata?: UserMetadata,
  ): Promise<AuthDTO> {
    try {
      const { data, error } = await this.supabaseService.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      });

      if (error) {
        this.logger.warn(`Sign up failed for ${email}: ${error.message}`);
        throw this.mapSupabaseError(error, 'signup');
      }

      const { session, user } = data;

      // Handle email confirmation required case
      if (!session && user) {
        this.logger.log(
          `User created, email confirmation required for ${email}`,
        );

        const userMetadata = (user.user_metadata ?? {}) as UserMetadata;
        const mappedUser: UserProfileDTO = {
          id: user.id,
          email: user.email ?? '',
          firstName: userMetadata.firstName ?? '',
          lastName: userMetadata.lastName ?? '',
          pointBalance: 0,
          level: undefined,
          rank: undefined,
          badges: [],
          createdAt: user.created_at,
          updatedAt: user.updated_at ?? user.created_at,
        };

        return {
          accessToken: null, // No token until confirmed
          user: mappedUser,
          expiresIn: 0,
          message:
            'Please check your email to confirm your account before signing in.',
        };
      }

      if (!session || !user) {
        this.logger.warn(
          `Sign up failed for ${email}: No session or user data`,
        );
        throw new BadRequestException(
          'Account creation failed. Please try again.',
        );
      }

      const userMetadata = (user.user_metadata ?? {}) as UserMetadata;

      const mappedUser: UserProfileDTO = {
        id: user.id,
        email: user.email ?? '',
        firstName: userMetadata.firstName ?? '',
        lastName: userMetadata.lastName ?? '',
        pointBalance: userMetadata.pointBalance ?? 0,
        level: userMetadata.level ?? '',
        rank: userMetadata.rank ?? 0,
        badges: userMetadata.badges ?? [],
        createdAt: user.created_at,
        updatedAt: user.updated_at ?? user.created_at,
      };

      // Create corresponding user record in local database
      try {
        await this.createLocalUserRecord(mappedUser);
        this.logger.log(`Local user record created for: ${user.email}`);
      } catch (localError) {
        this.logger.warn(
          `Failed to create local user record for ${user.email}: ${localError instanceof Error ? localError.message : 'Unknown error'}`,
        );
        // Don't fail the signup if local record creation fails
      }

      this.logger.log(`User signed up successfully: ${user.email}`);

      return {
        accessToken: session.access_token,
        user: mappedUser,
        expiresIn: session.expires_in,
      };
    } catch (error) {
      // Re-throw HTTP exceptions as-is
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        `Sign up error for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable',
      );
    }
  }

  /**
   * Update user profile in local database
   */
  async updateProfile(
    userId: string,
    updates: Partial<UserMetadata>,
  ): Promise<UserProfileDTO> {
    try {
      // Update the local database user record
      const updatedUser = await this.userService.updateUser(userId, {
        firstName: updates.firstName,
        lastName: updates.lastName,
      });

      this.logger.log(
        `Profile updated successfully for user: ${updatedUser.email}`,
      );

      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Profile update error for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        this.logger.warn(`Password change failed: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log('Password changed successfully');
    } catch (error) {
      this.logger.error(
        `Password change error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Request password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        },
      );

      if (error) {
        this.logger.warn(
          `Password reset request failed for ${email}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Password reset error for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete user account (admin only)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      if (!this.supabaseService.hasAdminClient()) {
        throw new Error('Admin privileges required for user deletion');
      }

      const adminClient = this.supabaseService.getAdminClient();
      const { error } = await adminClient.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.warn(
          `User deletion failed for ${userId}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.log(`User deleted successfully: ${userId}`);
    } catch (error) {
      this.logger.error(
        `User deletion error for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string): Promise<UserProfileDTO | null> {
    try {
      const user = await this.supabaseService.getUserById(userId);

      if (!user) {
        return null;
      }

      const metadata = (user.user_metadata ?? {}) as UserMetadata;

      const mappedUser: UserProfileDTO = {
        id: user.id,
        email: user.email ?? '',
        firstName: metadata.firstName ?? '',
        lastName: metadata.lastName ?? '',
        pointBalance: metadata.pointBalance ?? 0,
        level: metadata.level ?? '',
        rank: metadata.rank ?? 0,
        badges: metadata.badges ?? [],
        createdAt: user.created_at,
        updatedAt: user.updated_at ?? user.created_at,
      };

      return mappedUser;
    } catch (error) {
      this.logger.error(
        `Get user by ID error for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * List all users (admin only)
   */
  async listUsers(
    page = 1,
    perPage = 50,
  ): Promise<{
    users: UserProfileDTO[];
    total: number;
    page: number;
    perPage: number;
  }> {
    try {
      if (!this.supabaseService.hasAdminClient()) {
        throw new Error('Admin privileges required for user listing');
      }

      const adminClient = this.supabaseService.getAdminClient();
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        this.logger.warn(`User listing failed: ${error.message}`);
        throw new Error(error.message);
      }

      const users: UserProfileDTO[] = data.users.map((user) => {
        const metadata = (user.user_metadata ?? {}) as UserMetadata;
        return {
          id: user.id,
          email: user.email ?? '',
          firstName: metadata.firstName ?? '',
          lastName: metadata.lastName ?? '',
          pointBalance: metadata.pointBalance ?? 0,
          level: metadata.level ?? '',
          rank: metadata.rank ?? 0,
          badges: metadata.badges ?? [],
          createdAt: user.created_at,
          updatedAt: user.updated_at ?? user.created_at,
        };
      });

      return {
        users,
        total: data.total ?? users.length,
        page,
        perPage,
      };
    } catch (error) {
      this.logger.error(
        `List users error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Update user metadata (admin only)
   */
  async updateUserMetadata(
    userId: string,
    metadata: Partial<UserMetadata>,
  ): Promise<UserProfileDTO> {
    try {
      if (!this.supabaseService.hasAdminClient()) {
        throw new Error('Admin privileges required for user metadata updates');
      }

      const adminClient = this.supabaseService.getAdminClient();
      const { data, error } = await adminClient.auth.admin.updateUserById(
        userId,
        {
          user_metadata: metadata,
        },
      );

      if (error) {
        this.logger.warn(
          `User metadata update failed for ${userId}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('User metadata update failed - no user data returned');
      }

      const updatedMetadata = (data.user.user_metadata ?? {}) as UserMetadata;

      const mappedUser: UserProfileDTO = {
        id: data.user.id,
        email: data.user.email ?? '',
        firstName: updatedMetadata.firstName ?? '',
        lastName: updatedMetadata.lastName ?? '',
        pointBalance: updatedMetadata.pointBalance ?? 0,
        level: updatedMetadata.level ?? '',
        rank: updatedMetadata.rank ?? 0,
        badges: updatedMetadata.badges ?? [],
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at ?? data.user.created_at,
      };

      this.logger.log(
        `User metadata updated successfully for: ${data.user.email}`,
      );
      return mappedUser;
    } catch (error) {
      this.logger.error(
        `User metadata update error for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get Google OAuth authorization URL
   */
  async getGoogleOAuthUrl(redirectUrl: string): Promise<string> {
    try {
      const supabase = this.supabaseService.client;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        this.logger.error(
          `Google OAuth URL generation failed: ${error.message}`,
        );
        throw new BadRequestException('Failed to generate Google OAuth URL');
      }

      if (!data.url) {
        throw new BadRequestException('OAuth URL not returned by provider');
      }

      return data.url;
    } catch (error) {
      this.logger.error(
        `Google OAuth URL error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Handle OAuth callback and authenticate user
   */
  async handleOAuthCallback(oauthData: OAuthCallbackDto): Promise<AuthDTO> {
    try {
      // Validate the access token by using it to get user data from Supabase
      const supabaseUser = await this.supabaseService.validateToken(
        oauthData.access_token,
      );

      if (!supabaseUser) {
        this.logger.error(
          'OAuth token validation failed - invalid or expired token',
        );
        throw new UnauthorizedException('Invalid OAuth tokens');
      }

      this.logger.log(`OAuth user authenticated: ${supabaseUser.email}`);

      // Check if user exists in local database using getUserById (which checks userSk)
      let localUser = await this.userService.getUserById(supabaseUser.id);

      if (!localUser) {
        // Create new local user from OAuth data
        const userMetadata = (supabaseUser.user_metadata || {}) as {
          first_name?: string;
          last_name?: string;
          given_name?: string;
          family_name?: string;
          full_name?: string;
        };

        const firstName =
          oauthData.user_info?.given_name ||
          userMetadata.first_name ||
          userMetadata.given_name ||
          (userMetadata.full_name
            ? userMetadata.full_name.split(' ')[0]
            : undefined);
        const lastName =
          oauthData.user_info?.family_name ||
          userMetadata.last_name ||
          userMetadata.family_name ||
          (userMetadata.full_name
            ? userMetadata.full_name.split(' ').slice(1).join(' ')
            : undefined);

        try {
          localUser = await this.userService.createUserWithSupabaseId(
            supabaseUser.id,
            {
              email: supabaseUser.email!,
              firstName: firstName || '',
              lastName: lastName || '',
              pointBalance: 0,
              level: 'beginner',
            },
          );

          this.logger.log(
            `✅ New OAuth user created in local database: ${localUser.email}`,
          );
        } catch (createError) {
          this.logger.error(
            `❌ Failed to create local user: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
          );
          throw new InternalServerErrorException(
            'Failed to create user record',
          );
        }
      } else {
        this.logger.log(`✅ Existing OAuth user signed in: ${localUser.email}`);
      }

      // Return authentication response using the original OAuth access token
      return {
        accessToken: oauthData.access_token,
        user: {
          id: localUser.id,
          email: localUser.email,
          firstName: localUser.firstName || '',
          lastName: localUser.lastName || '',
          pointBalance: localUser.pointBalance,
          level: localUser.level || '',
          rank: localUser.rank || 0,
          badges: localUser.badges || [],
          createdAt: localUser.createdAt,
          updatedAt: localUser.updatedAt,
        },
        expiresIn: 3600, // 1 hour
      };
    } catch (error) {
      this.logger.error(
        `OAuth callback error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('OAuth authentication failed');
    }
  }

  /**
   * Create a local user record in PostgreSQL database
   * Uses Supabase user ID as the primary key to maintain consistency
   */
  private async createLocalUserRecord(userDto: UserProfileDTO): Promise<void> {
    try {
      // Double-check if user already exists in local database
      const existingUser = await this.userService.getUserById(userDto.id);
      if (existingUser) {
        this.logger.debug(
          `Local user record already exists for: ${userDto.email}`,
        );
        return;
      }

      // Validate required fields before creating
      if (!userDto.email) {
        throw new Error('Email is required for user creation');
      }

      if (!userDto.id) {
        throw new Error('Supabase user ID is required for user creation');
      }

      // Create user record in local database with Supabase ID
      const createdUser = await this.userService.createUserWithSupabaseId(
        userDto.id,
        {
          email: userDto.email,
          firstName: userDto.firstName || '',
          lastName: userDto.lastName || '',
          pointBalance: userDto.pointBalance || 0,
          level: userDto.level || '',
        },
      );

      this.logger.log(
        `🎉 Created local user record for: ${userDto.email} with ID: ${userDto.id}`,
      );
      this.logger.debug('Local user record details:', {
        localId: createdUser.id,
        supabaseId: userDto.id,
        email: userDto.email,
        firstName: userDto.firstName,
        lastName: userDto.lastName,
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to create local user record for ${userDto.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Log additional context for debugging
      this.logger.error('Local user creation failed with details:', {
        supabaseId: userDto.id,
        email: userDto.email,
        firstName: userDto.firstName,
        lastName: userDto.lastName,
        error: error instanceof Error ? error.stack : String(error),
      });

      throw error;
    }
  }

  /**
   * Map Supabase errors to user-friendly HTTP exceptions
   */
  private mapSupabaseError(
    error: AuthError,
    context: 'signin' | 'signup',
  ): Error {
    const message = error.message.toLowerCase();

    // Password validation errors
    if (message.includes('password') && message.includes('characters')) {
      return new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (message.includes('password') && message.includes('weak')) {
      return new BadRequestException(
        'Password is too weak. Please use a stronger password with letters, numbers, and special characters',
      );
    }

    // Email validation errors
    if (message.includes('email') && message.includes('invalid')) {
      return new BadRequestException('Please enter a valid email address');
    }

    // User already exists errors
    if (
      message.includes('user already registered') ||
      message.includes('email already exists')
    ) {
      return new ConflictException(
        'An account with this email address already exists',
      );
    }

    // Invalid credentials for signin
    if (
      context === 'signin' &&
      (message.includes('invalid') || message.includes('credentials'))
    ) {
      return new UnauthorizedException('Invalid email or password');
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many')) {
      return new BadRequestException(
        'Too many requests. Please try again later',
      );
    }

    // Email confirmation errors
    if (
      message.includes('email not confirmed') ||
      message.includes('confirmation')
    ) {
      return new UnauthorizedException(
        'Please check your email and confirm your account before signing in',
      );
    }

    // Generic authentication errors
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return new UnauthorizedException('Authentication failed');
    }

    // Default to bad request for known auth errors, internal error for unknown
    if (error.status && error.status >= 400 && error.status < 500) {
      return new BadRequestException(error.message);
    }

    // Log unknown errors for debugging
    this.logger.error(
      `Unknown Supabase error in ${context}: ${error.message}`,
      error.stack,
    );
    return new InternalServerErrorException(
      'Authentication service temporarily unavailable',
    );
  }
}
