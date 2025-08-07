// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Decorators
export { Public } from './decorators/public.decorator';
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles } from './decorators/roles.decorator';

// Types
export type { UserRole } from './guards/roles.guard';
export type {
  AuthenticatedRequest,
  RequestWithUser,
} from './types/auth-request.interface';

// Services
export { AuthService } from './auth.service';

// Middleware
export { AuthMiddleware } from './middleware/auth.middleware';

// DTOs
export { SignUpDto } from './dto/signup.dto';
export { SignInDto } from './dto/signin.dto';
export { UpdateProfileDto } from './dto/update-profile.dto';
export { ChangePasswordDto } from './dto/change-password.dto';
export { ResetPasswordDto } from './dto/reset-password.dto';
export { ListUsersDto } from './dto/list-users.dto';
