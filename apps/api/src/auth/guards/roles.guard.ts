import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from '../types/auth-request.interface';

export const ROLES_KEY = 'roles';
export type UserRole = 'admin' | 'user' | 'premium';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request - authentication required');
      throw new ForbiddenException('Authentication required');
    }

    // For now, determine role based on user level or metadata
    // This can be enhanced with a proper role system
    const userRole = this.getUserRole(user);

    const hasRole = requiredRoles.some((role) => userRole === role);

    if (!hasRole) {
      this.logger.warn(
        `User ${user.email} with role ${userRole} attempted to access resource requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.debug(`User ${user.email} authorized with role ${userRole}`);
    return true;
  }

  private getUserRole(user: NonNullable<RequestWithUser['user']>): UserRole {
    // Simple role determination logic
    // This should be enhanced based on your business logic

    if (user.level === 'admin') {
      return 'admin';
    }

    if (user.level === 'premium' || user.pointBalance > 1000) {
      return 'premium';
    }

    return 'user';
  }
}
