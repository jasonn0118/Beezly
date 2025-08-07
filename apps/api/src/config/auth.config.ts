import { Injectable, Logger } from '@nestjs/common';

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
  environment: string;
}

@Injectable()
export class AuthConfigService {
  private readonly logger = new Logger(AuthConfigService.name);
  private readonly config: AuthConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
    this.logConfiguration();
  }

  private loadConfig(): AuthConfig {
    return {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private validateConfig(): void {
    const requiredFields: (keyof AuthConfig)[] = [
      'supabaseUrl',
      'supabaseAnonKey',
    ];

    const missing = requiredFields.filter(
      (field) => !this.config[field] || this.config[field].trim() === '',
    );

    if (missing.length > 0) {
      throw new Error(
        `Missing required auth configuration: ${missing.join(', ')}. ` +
          'Please check your environment variables.',
      );
    }

    // Validate URL format
    try {
      new URL(this.config.supabaseUrl);
    } catch {
      throw new Error(
        `Invalid SUPABASE_URL format: ${this.config.supabaseUrl}`,
      );
    }
  }

  private logConfiguration(): void {
    this.logger.log(`Auth configuration loaded for ${this.config.environment}`);
    this.logger.log(`Supabase URL: ${this.config.supabaseUrl}`);
    this.logger.log(
      `Has Service Role Key: ${!!this.config.supabaseServiceRoleKey}`,
    );

    if (this.config.environment === 'development') {
      this.logger.warn(
        'Using shared Supabase instance for local development. ' +
          'Ensure you have proper row-level security configured.',
      );
    }
  }

  get supabaseUrl(): string {
    return this.config.supabaseUrl;
  }

  get supabaseAnonKey(): string {
    return this.config.supabaseAnonKey;
  }

  get supabaseServiceRoleKey(): string {
    return this.config.supabaseServiceRoleKey;
  }

  get jwtSecret(): string {
    return this.config.jwtSecret;
  }

  get environment(): string {
    return this.config.environment;
  }

  get isProduction(): boolean {
    return this.config.environment === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  get isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  /**
   * Get configuration for logging (without sensitive data)
   */
  getSafeConfig() {
    return {
      supabaseUrl: this.config.supabaseUrl,
      environment: this.config.environment,
      hasServiceRoleKey: !!this.config.supabaseServiceRoleKey,
      hasJwtSecret: !!this.config.jwtSecret,
    };
  }
}
