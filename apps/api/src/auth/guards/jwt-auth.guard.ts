import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { RequestWithUser } from '../types/auth-request.interface';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public routes, try to authenticate if token is present but don't require it
    if (isPublic) {
      if (token) {
        try {
          // Try to validate token and attach user if successful
          const userProfile = await this.authService.validateToken(token);
          if (userProfile) {
            request.user = userProfile;
            this.logger.debug(
              `User authenticated on public route: ${userProfile.email} (${userProfile.id})`,
            );
          }
        } catch (error) {
          // For public routes, we don't throw - just log and continue without user
          this.logger.debug(
            `Optional authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
      return true; // Always allow access to public routes
    }

    // For protected routes, token is required
    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Validate token and get user profile
      const userProfile = await this.authService.validateToken(token);

      if (!userProfile) {
        this.logger.warn('Token validation failed - invalid or expired token');
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Attach user to request object
      request.user = userProfile;

      this.logger.debug(
        `User authenticated: ${userProfile.email} (${userProfile.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: RequestWithUser): string | null {
    const authHeader = request.headers.authorization;
    return this.supabaseService.extractTokenFromHeader(authHeader);
  }
}
