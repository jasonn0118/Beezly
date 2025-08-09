import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserModule } from '../user/user.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [UserModule, forwardRef(() => GamificationModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    // Guards are no longer global - use @UseGuards() decorator on specific routes/controllers
    // To protect a route: @UseGuards(JwtAuthGuard)
    // To require a role: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
