import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { GameScoreService } from './game-score.service';
import { RankingService } from './ranking.service';
import { RankTier } from '../entities';
import {
  AwardScoreDto,
  UserGamificationProfileDto,
  LeaderboardResponseDto,
  BadgeProgressResponseDto,
  BadgeProgressDto,
  ActivityStatsDto,
  BadgeSummaryDto,
  ActivitySummaryDto,
} from './dto/gamification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityLog,
  UserRanking,
  UserBadges,
  Badges,
  UserDailyActivity,
} from '../entities';
import { UserProfileDTO } from '../../../packages/types/dto/user';

@Controller('gamification')
@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(
    private readonly gameScoreService: GameScoreService,
    private readonly rankingService: RankingService,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(UserRanking)
    private userRankingRepository: Repository<UserRanking>,
    @InjectRepository(UserBadges)
    private userBadgesRepository: Repository<UserBadges>,
    @InjectRepository(Badges)
    private badgesRepository: Repository<Badges>,
    @InjectRepository(UserDailyActivity)
    private userDailyActivityRepository: Repository<UserDailyActivity>,
  ) {}

  @Public()
  @Get('leaderboard/public')
  @ApiOperation({
    summary: 'Get public leaderboard data (no authentication required)',
  })
  @ApiQuery({ name: 'tier', enum: RankTier, required: false })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'all-time'],
    required: false,
    description: 'Leaderboard time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Public leaderboard data retrieved',
    type: LeaderboardResponseDto,
  })
  async getPublicLeaderboard(
    @Query('tier') tier?: RankTier,
    @Query('period')
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
  ): Promise<LeaderboardResponseDto> {
    // For public access, we don't pass a userSk, so no user position will be returned
    const leaderboard = await this.rankingService.getLeaderboard(
      undefined, // No user context for public endpoint
      tier,
      period,
    );

    return {
      global: leaderboard.global,
      tier: leaderboard.tier,
      weekly: leaderboard.weekly,
      contextual: [], // No contextual data without user context
      userPosition: undefined, // No user position for public access
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user gamification profile' })
  @ApiResponse({
    status: 200,
    description: 'User gamification profile retrieved',
    type: UserGamificationProfileDto,
  })
  async getUserProfile(
    @CurrentUser() user: UserProfileDTO,
  ): Promise<UserGamificationProfileDto> {
    const userSk = user.id;

    // Get user ranking
    const ranking = await this.userRankingRepository.findOne({
      where: { userSk },
    });

    if (!ranking) {
      // Create initial ranking for new user
      const newRanking = this.userRankingRepository.create({
        userSk,
        totalPoints: 0,
        rankTier: RankTier.BUZZLING_EGG,
        streakDays: 0,
        lastActivity: new Date(),
      });
      await this.userRankingRepository.save(newRanking);
    }

    // Get user badges
    const userBadges = await this.userBadgesRepository.find({
      where: { userSk },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });

    const badges: BadgeSummaryDto[] = userBadges.map((ub) => ({
      id: ub.badge.id,
      name: ub.badge.name,
      description: ub.badge.description || '',
      iconUrl: ub.badge.iconUrl,
      awardedAt: ub.awardedAt,
    }));

    // Get recent activities
    const recentActivities = await this.activityLogRepository.find({
      where: { userSk },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const activities: ActivitySummaryDto[] = recentActivities.map(
      (activity) => ({
        id: activity.id,
        activityType: activity.activityType,
        pointsAwarded: activity.pointsAwarded,
        createdAt: activity.createdAt,
        referenceId: activity.referenceId,
        referenceType: activity.referenceType,
      }),
    );

    // Get weekly points
    const weeklyPoints = await this.getWeeklyPoints(userSk);

    // Get tier progression
    const tierProgression =
      await this.rankingService.getTierProgression(userSk);

    const currentRanking = ranking || {
      totalPoints: 0,
      currentRank: null,
      rankTier: RankTier.BUZZLING_EGG,
      streakDays: 0,
      lastActivity: new Date(),
    };

    return {
      userSk,
      totalPoints: currentRanking.totalPoints,
      currentRank: currentRanking.currentRank || undefined,
      rankTier: currentRanking.rankTier,
      streakDays: currentRanking.streakDays,
      weeklyPoints,
      lastActivity: currentRanking.lastActivity,
      badges,
      recentActivities: activities,
      tierProgression,
    };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard data' })
  @ApiQuery({ name: 'tier', enum: RankTier, required: false })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'all-time'],
    required: false,
    description: 'Leaderboard time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard data retrieved',
    type: LeaderboardResponseDto,
  })
  async getLeaderboard(
    @CurrentUser() user: UserProfileDTO,
    @Query('tier') tier?: RankTier,
    @Query('period')
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
  ): Promise<LeaderboardResponseDto> {
    const userSk = user.id;
    const leaderboard = await this.rankingService.getLeaderboard(
      userSk,
      tier,
      period,
    );

    return {
      global: leaderboard.global,
      tier: leaderboard.tier,
      weekly: leaderboard.weekly,
      contextual: leaderboard.contextual,
      userPosition: leaderboard.userPosition,
    };
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get badge progress for user' })
  @ApiResponse({
    status: 200,
    description: 'Badge progress retrieved',
    type: BadgeProgressResponseDto,
  })
  async getBadgesProgress(
    @CurrentUser() user: UserProfileDTO,
  ): Promise<BadgeProgressResponseDto> {
    const userSk = user.id;

    // Get all available badges
    const allBadges = await this.badgesRepository.find({
      order: { name: 'ASC' },
    });

    // Get user's earned badges
    const userBadges = await this.userBadgesRepository.find({
      where: { userSk },
      relations: ['badge'],
    });

    const earnedBadgeIds = userBadges.map((ub) => ub.badge.id);

    const earned: BadgeProgressDto[] = [];
    const available: BadgeProgressDto[] = [];

    for (const badge of allBadges) {
      const isEarned = earnedBadgeIds.includes(badge.id);
      const userBadge = userBadges.find((ub) => ub.badge.id === badge.id);

      const badgeProgress: BadgeProgressDto = {
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description || '',
          iconUrl: badge.iconUrl,
          awardedAt: userBadge?.awardedAt || new Date(),
        },
        earned: isEarned,
        currentProgress: isEarned
          ? undefined
          : await this.getBadgeProgress(userSk, badge.name),
        requiredProgress: isEarned
          ? undefined
          : this.getBadgeRequirement(badge.name),
        progressPercentage: isEarned ? 100 : undefined,
      };

      if (isEarned) {
        earned.push(badgeProgress);
      } else {
        if (
          badgeProgress.currentProgress !== undefined &&
          badgeProgress.requiredProgress
        ) {
          badgeProgress.progressPercentage = Math.min(
            100,
            (badgeProgress.currentProgress / badgeProgress.requiredProgress) *
              100,
          );
        }
        available.push(badgeProgress);
      }
    }

    return { earned, available };
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get user activity history with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'activityType',
    required: false,
    description: 'Filter by activity type',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity history retrieved',
    schema: {
      type: 'object',
      properties: {
        activities: {
          type: 'array',
          items: { $ref: '#/components/schemas/ActivitySummaryDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getActivityHistory(
    @CurrentUser() user: UserProfileDTO,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('activityType') activityType?: string,
  ) {
    const userSk = user.id;
    const skip = (page - 1) * limit;

    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.userSk = :userSk', { userSk })
      .orderBy('activity.createdAt', 'DESC');

    if (activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', {
        activityType,
      });
    }

    const [activities, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const mappedActivities: ActivitySummaryDto[] = activities.map(
      (activity) => ({
        id: activity.id,
        activityType: activity.activityType,
        pointsAwarded: activity.pointsAwarded,
        createdAt: activity.createdAt,
        referenceId: activity.referenceId,
        referenceType: activity.referenceType,
      }),
    );

    return {
      activities: mappedActivities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user activity statistics' })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics retrieved',
    type: ActivityStatsDto,
  })
  async getActivityStats(
    @CurrentUser() user: UserProfileDTO,
  ): Promise<ActivityStatsDto> {
    const userSk = user.id;

    // Total activities
    const totalActivities = await this.activityLogRepository.count({
      where: { userSk },
    });

    // Today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivities = await this.activityLogRepository.count({
      where: {
        userSk,
        createdAt: new Date(today.toISOString()),
      },
    });

    // Weekly activities
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyActivities = await this.activityLogRepository.count({
      where: {
        userSk,
        createdAt: new Date(oneWeekAgo.toISOString()),
      },
    });

    // Most frequent activity
    const activityStats = await this.activityLogRepository
      .createQueryBuilder('activity')
      .select('activity.activityType', 'activityType')
      .addSelect('COUNT(*)', 'count')
      .where('activity.userSk = :userSk', { userSk })
      .groupBy('activity.activityType')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    // Average points per day
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPointsSum = await this.activityLogRepository
      .createQueryBuilder('activity')
      .select('SUM(activity.pointsAwarded)', 'totalPoints')
      .where('activity.userSk = :userSk', { userSk })
      .andWhere('activity.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne();

    const averagePointsPerDay = Math.round(
      (recentPointsSum?.totalPoints || 0) / 30,
    );

    return {
      totalActivities,
      todayActivities,
      weeklyActivities,
      favoriteActivity: activityStats?.activityType || 'N/A',
      averagePointsPerDay,
    };
  }

  @Post('award-score')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Award points manually (Admin only)' })
  @ApiResponse({ status: 200, description: 'Points awarded successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async awardScore(@Body() dto: AwardScoreDto) {
    const result = await this.gameScoreService.awardPoints(
      dto.userSk,
      dto.activityType,
      dto.referenceId,
      dto.referenceType,
      dto.multiplier || 1,
      dto.metadata,
    );

    return {
      success: true,
      pointsAwarded: result.activityLog.pointsAwarded,
      newBadges: result.newBadges.length,
      rankChange: result.rankChange,
    };
  }

  // Helper methods
  private async getWeeklyPoints(userSk: string): Promise<number> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await this.activityLogRepository
      .createQueryBuilder('log')
      .select('SUM(log.pointsAwarded)', 'weeklyPoints')
      .where('log.userSk = :userSk', { userSk })
      .andWhere('log.createdAt >= :oneWeekAgo', { oneWeekAgo })
      .getRawOne();

    return parseInt(result?.weeklyPoints) || 0;
  }

  private async getBadgeProgress(
    userSk: string,
    badgeName: string,
  ): Promise<number | undefined> {
    switch (badgeName) {
      case 'First Receipt':
      case 'Receipt Master':
        const receiptCount = await this.activityLogRepository.count({
          where: { userSk, activityType: 'RECEIPT_UPLOAD' },
        });
        return receiptCount;

      case 'Data Guardian':
        const verificationCount = await this.activityLogRepository.count({
          where: { userSk, activityType: 'OCR_VERIFICATION' },
        });
        return verificationCount;

      case 'Price Keeper':
        const priceUpdateCount = await this.activityLogRepository.count({
          where: { userSk, activityType: 'PRICE_UPDATE' },
        });
        return priceUpdateCount;

      case 'Searcher':
        const searchCount = await this.activityLogRepository.count({
          where: { userSk, activityType: 'PRODUCT_SEARCH' },
        });
        return searchCount;

      case 'Week Warrior':
      case 'Month Master':
        const ranking = await this.userRankingRepository.findOne({
          where: { userSk },
        });
        return ranking?.streakDays || 0;

      default:
        return undefined;
    }
  }

  private getBadgeRequirement(badgeName: string): number | undefined {
    const requirements = {
      'First Receipt': 1,
      'Receipt Master': 100,
      'Data Guardian': 50,
      'Price Keeper': 25,
      Searcher: 100,
      'Week Warrior': 7,
      'Month Master': 30,
    };

    return requirements[badgeName];
  }
}
