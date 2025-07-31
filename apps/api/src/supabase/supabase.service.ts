import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Injectable, Logger } from '@nestjs/common';
import { AuthConfigService } from '../config/auth.config';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly _client: SupabaseClient;
  private readonly _adminClient: SupabaseClient;

  constructor(private readonly authConfig: AuthConfigService) {
    // Initialize main client with anon key
    this._client = createClient(
      this.authConfig.supabaseUrl,
      this.authConfig.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Initialize admin client with service role key (if available)
    if (this.authConfig.supabaseServiceRoleKey) {
      this._adminClient = createClient(
        this.authConfig.supabaseUrl,
        this.authConfig.supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
    }

    this.logger.log(
      `Supabase client initialized for ${this.authConfig.environment} environment`,
    );
    this.logger.log(`Using Supabase URL: ${this.authConfig.supabaseUrl}`);
  }

  get auth() {
    return this._client.auth;
  }

  get client() {
    return this._client;
  }

  /**
   * Get admin client for server-side operations
   */
  getAdminClient(): SupabaseClient {
    if (!this._adminClient) {
      throw new Error(
        'Admin client not available. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.',
      );
    }
    return this._adminClient;
  }

  /**
   * Check if admin client is available
   */
  hasAdminClient(): boolean {
    return !!this._adminClient;
  }

  /**
   * Validate JWT token and get user
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const { data, error } = await this._client.auth.getUser(token);

      if (error) {
        this.logger.warn(`Token validation failed: ${error.message}`);
        return null;
      }

      if (!data.user) {
        this.logger.warn(
          'Token validation succeeded but no user data returned',
        );
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error(
        `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Validate JWT token and get user with admin client
   */
  async validateTokenAsAdmin(token: string): Promise<User | null> {
    try {
      const adminClient = this.getAdminClient();
      const { data, error } = await adminClient.auth.getUser(token);

      if (error) {
        this.logger.warn(`Admin token validation failed: ${error.message}`);
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error(
        `Admin token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Get user by ID using admin client
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const adminClient = this.getAdminClient();
      const { data, error } = await adminClient.auth.admin.getUserById(userId);

      if (error) {
        this.logger.warn(`Get user by ID failed: ${error.message}`);
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error(
        `Get user by ID error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Health check for Supabase connection
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      // Try to make a simple request to Supabase
      const { error } = await this._client.auth.getSession();

      if (error && !error.message.includes('session_not_found')) {
        return {
          status: 'unhealthy',
          message: `Supabase connection failed: ${error.message}`,
        };
      }

      return {
        status: 'healthy',
        message: 'Supabase connection successful',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Supabase health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Legacy export for backward compatibility - deprecated
// Use SupabaseService instead for new code
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || 'http://localhost:5000',
  process.env.SUPABASE_ANON_KEY || 'dummy_key',
);
