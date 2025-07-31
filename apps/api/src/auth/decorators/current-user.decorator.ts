import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserProfileDTO } from '../../../../packages/types/dto/user';
import { AuthenticatedRequest } from '../types/auth-request.interface';

/**
 * Decorator to get the current authenticated user from the request
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: UserProfileDTO) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserProfileDTO => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
