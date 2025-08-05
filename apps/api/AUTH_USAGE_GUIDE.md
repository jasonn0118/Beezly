# Authentication Usage Guide

## Current Configuration
- **APIs are OPEN by default** - No authentication required unless explicitly protected
- **Auth guards are available** - Can be applied to specific routes/controllers when needed

## How to Protect Routes (When Needed)

### 1. Protect a Single Endpoint
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
export class ProductController {
  // This endpoint is OPEN (no auth required)
  @Get()
  async getAllProducts() {
    return this.productService.findAll();
  }

  // This endpoint is PROTECTED (requires valid JWT)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }
}
```

### 2. Protect an Entire Controller
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard) // All routes in this controller require authentication
export class AdminController {
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
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
import { User } from '../auth/decorators/user.decorator';
import { UserProfile } from '../auth/interfaces/user-profile.interface';

@Controller('profile')
export class ProfileController {
  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyProfile(@User() user: UserProfile) {
    // The @User() decorator injects the authenticated user
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('points')
  async getMyPoints(@User() user: UserProfile) {
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
- `@UseGuards(JwtAuthGuard)` - Protect a route/controller
- `@Roles('admin', 'user')` - Specify required roles
- `@User()` - Inject authenticated user into route handler
- `@Public()` - Mark a route as public (not needed anymore since all routes are public by default)

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

## Current Auth Endpoints (Always Available)
- `POST /auth/signin` - User login
- `POST /auth/signup` - User registration  
- `POST /auth/reset-password` - Request password reset
- `POST /auth/signout` - Sign out (clears session)

## Notes
- The AuthMiddleware still runs on all routes for logging and security headers
- JWT validation only happens when JwtAuthGuard is explicitly used
- Role checking only happens when RolesGuard is used with @Roles decorator