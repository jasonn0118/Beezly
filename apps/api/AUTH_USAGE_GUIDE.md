# Authentication Usage Guide

## 🔐 Current Security Model

- **🛡️ ALL ROUTES ARE PROTECTED BY DEFAULT** - JWT authentication required unless explicitly marked public
- **✅ Public routes** - Must use `@Public()` decorator to bypass authentication
- **🔑 JWT validation** - Automatic token validation on all protected routes
- **👤 User context** - Authenticated user automatically available in route handlers

## 🔓 How to Make Routes Public (When Needed)

### 1. Make a Single Endpoint Public
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard) // All routes in controller are protected by default
export class ProductController {
  // This endpoint is PUBLIC (no auth required)
  @Public()
  @Get()
  async getAllProducts() {
    return this.productService.findAll();
  }

  // This endpoint is PROTECTED (requires valid JWT) - default behavior
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }
}
```

### 2. Make Multiple Endpoints in a Controller Public
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('public-info')
@UseGuards(JwtAuthGuard) // Controller-level protection (can be omitted if global)
export class PublicInfoController {
  // These endpoints are PUBLIC (no auth required)
  @Public()
  @Get('status')
  async getStatus() {
    return { status: 'healthy' };
  }

  @Public()
  @Get('version')
  async getVersion() {
    return { version: '1.0.0' };
  }
}
```

### 3. Role-Based Access Control
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  // Requires authentication AND admin role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // Requires authentication AND either admin or moderator role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Put('users/:id/ban')
  async banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }
}
```

### 4. Access User Information in Protected Routes
```typescript
import { UseGuards, Controller, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserProfileDTO } from '../../../packages/types/dto/user';

@Controller('profile')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class ProfileController {
  @Get()
  async getMyProfile(@CurrentUser() user: UserProfileDTO) {
    // The @CurrentUser() decorator injects the authenticated user
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  @Get('points')
  async getMyPoints(@CurrentUser() user: UserProfileDTO) {
    return {
      userId: user.id,
      points: user.pointBalance,
    };
  }
}
```

## Available Guards and Decorators

### Guards
- `JwtAuthGuard` - Validates JWT tokens
- `RolesGuard` - Checks user roles (use with @Roles decorator)

### Decorators
- `@UseGuards(JwtAuthGuard)` - Apply JWT authentication to route/controller (usually at controller level)
- `@Roles('admin', 'user')` - Specify required roles for authorization
- `@CurrentUser()` - Inject authenticated user into route handler
- `@Public()` - **REQUIRED** to mark a route as public (bypasses authentication)

## Testing Protected Endpoints

### With Swagger UI
1. Call `/auth/signin` to get a JWT token
2. Click the "Authorize" button in Swagger UI
3. Enter: `Bearer YOUR_JWT_TOKEN`
4. Now you can test protected endpoints

### With cURL
```bash
# Get token
curl -X POST http://localhost:3006/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token for protected endpoint
curl -X GET http://localhost:3006/protected-endpoint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔓 Public Auth Endpoints (Always Available)
- `POST /auth/signin` - User login (email/password)
- `POST /auth/signup` - User registration  
- `POST /auth/reset-password` - Request password reset
- `POST /auth/signout` - Sign out (clears session)

## 🌟 OAuth Endpoints (Google Sign-In)
- `POST /auth/oauth/google/url` - Get Google OAuth authorization URL
- `POST /auth/oauth/callback` - Handle OAuth callback and create user session

## Notes
- The AuthMiddleware still runs on all routes for logging and security headers
- JWT validation only happens when JwtAuthGuard is explicitly used
- Role checking only happens when RolesGuard is used with @Roles decorator