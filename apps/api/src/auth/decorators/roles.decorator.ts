import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, UserRole } from '../guards/roles.guard';

/**
 * Decorator to specify required roles for accessing a route
 *
 * @example
 * @Roles('admin', 'premium')
 * @Get('admin-only')
 * getAdminData() {
 *   return { message: 'Admin data' };
 * }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
