import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ActivityLog,
  UserRanking,
  UserDailyActivity,
  ScoreType,
  Badges,
  UserBadges,
} from '../entities';
import { GameScoreService } from './game-score.service';
import { RankingService } from './ranking.service';
import { GamificationController } from './gamification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityLog,
      UserRanking,
      UserDailyActivity,
      ScoreType,
      Badges,
      UserBadges,
    ]),
    ScheduleModule.forRoot(), // Enable cron jobs for ranking service
    forwardRef(() => AuthModule), // Import AuthModule to make JwtAuthGuard and AuthService available
  ],
  controllers: [GamificationController],
  providers: [GameScoreService, RankingService],
  exports: [GameScoreService, RankingService], // Export for use in other modules
})
export class GamificationModule {}
