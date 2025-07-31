import { Injectable, Logger } from '@nestjs/common';
import { AuthDTO } from '../../../packages/types/dto/auth';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { SupabaseService } from '../supabase/supabase.service';
import { Session, User, AuthError } from '@supabase/supabase-js';

type UserMetadata = {
  firstName?: string;
  lastName?: string;
  pointBalance?: number;
  level?: string;
  rank?: number;
  badges?: string[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}
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
        throw new Error(error.message);
      }

      const { session, user } = data;
      if (!session || !user) {
        this.logger.warn(
          `Sign in failed for ${email}: No session or user data`,
        );
        throw new Error('Authentication failed.');
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

      this.logger.log(`User signed in successfully: ${user.email}`);

      return {
        accessToken: session.access_token,
        user: mappedUser,
        expiresIn: session.expires_in,
      };
    } catch (error) {
      this.logger.error(
        `Sign in error for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
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
        throw new Error(error.message);
      }

      const { session, user } = data;
      if (!session || !user) {
        this.logger.warn(
          `Sign up failed for ${email}: No session or user data`,
        );
        throw new Error('Sign up failed.');
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

      this.logger.log(`User signed up successfully: ${user.email}`);

      return {
        accessToken: session.access_token,
        user: mappedUser,
        expiresIn: session.expires_in,
      };
    } catch (error) {
      this.logger.error(
        `Sign up error for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Update user profile metadata
   */
  async updateProfile(
    userId: string,
    updates: Partial<UserMetadata>,
  ): Promise<UserProfileDTO> {
    try {
      const { data, error } = await this.supabaseService.auth.updateUser({
        data: updates,
      });

      if (error) {
        this.logger.warn(
          `Profile update failed for ${userId}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Profile update failed - no user data returned');
      }

      const metadata = (data.user.user_metadata ?? {}) as UserMetadata;

      const mappedUser: UserProfileDTO = {
        id: data.user.id,
        email: data.user.email ?? '',
        firstName: metadata.firstName ?? '',
        lastName: metadata.lastName ?? '',
        pointBalance: metadata.pointBalance ?? 0,
        level: metadata.level ?? '',
        rank: metadata.rank ?? 0,
        badges: metadata.badges ?? [],
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at ?? data.user.created_at,
      };

      this.logger.log(
        `Profile updated successfully for user: ${data.user.email}`,
      );
      return mappedUser;
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
}
