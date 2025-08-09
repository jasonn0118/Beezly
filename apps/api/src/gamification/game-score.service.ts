import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityLog,
  UserRanking,
  UserDailyActivity,
  RankTier,
  ScoreType,
  Badges,
  UserBadges,
} from '../entities';

export interface AwardPointsResult {
  activityLog: ActivityLog;
  newBadges: Badges[];
  rankChange?: {
    oldTier: RankTier;
    newTier: RankTier;
    oldRank?: number;
    newRank?: number;
  };
}

@Injectable()
export class GameScoreService {
  private readonly logger = new Logger(GameScoreService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(UserRanking)
    private userRankingRepository: Repository<UserRanking>,
    @InjectRepository(UserDailyActivity)
    private userDailyActivityRepository: Repository<UserDailyActivity>,
    @InjectRepository(ScoreType)
    private scoreTypeRepository: Repository<ScoreType>,
    @InjectRepository(Badges)
    private badgesRepository: Repository<Badges>,
    @InjectRepository(UserBadges)
    private userBadgesRepository: Repository<UserBadges>,
  ) {}

  /**
   * Award points for a specific activity
   */
  async awardPoints(
    userSk: string,
    activityType: string,
    referenceId?: string,
    referenceType?: string,
    multiplier: number = 1,
    metadata?: Record<string, any>,
  ): Promise<AwardPointsResult> {
    this.logger.log(`Awarding points for ${activityType} to user ${userSk}`);

    // Get score type configuration
    const scoreTypeConfig = await this.scoreTypeRepository.findOne({
      where: { scoreType: activityType },
    });

    if (!scoreTypeConfig) {
      throw new Error(`Score type ${activityType} not found`);
    }

    // Check for daily limits on certain activities
    if (await this.isActivityLimitExceeded(userSk, activityType)) {
      this.logger.warn(
        `Activity limit exceeded for ${activityType} by user ${userSk}`,
      );
      throw new Error(`Daily limit exceeded for activity ${activityType}`);
    }

    // Calculate points with multiplier
    const pointsToAward = Math.round(
      (scoreTypeConfig.defaultPoints || 0) * multiplier,
    );

    // Create activity log entry
    const activityLog = this.activityLogRepository.create({
      userSk,
      activityType,
      pointsAwarded: pointsToAward,
      referenceId,
      referenceType,
      metadata,
    });

    await this.activityLogRepository.save(activityLog);

    // Update user ranking
    const oldRanking = await this.getUserRanking(userSk);
    const newRanking = await this.updateUserRanking(userSk, pointsToAward);

    // Track daily activity
    await this.updateDailyActivity(userSk, pointsToAward);

    // Check for new badges
    const newBadges = await this.checkBadgeEligibility(userSk);

    // Prepare rank change info
    const rankChange = this.getRankChange(oldRanking, newRanking);

    return {
      activityLog,
      newBadges,
      rankChange,
    };
  }

  /**
   * Check if activity limit is exceeded for rate-limited activities
   */
  private async isActivityLimitExceeded(
    userSk: string,
    activityType: string,
  ): Promise<boolean> {
    const dailyLimits: Record<string, number> = {
      PRODUCT_SEARCH: 50, // Max 50 searches per day
      DAILY_LOGIN: 1, // Only once per day
    };

    const limit = dailyLimits[activityType] as number | undefined;
    if (!limit) return false;

    const today = new Date().toISOString().split('T')[0];
    const todayActivity = await this.userDailyActivityRepository.findOne({
      where: { userSk, activityDate: today },
    });

    if (!todayActivity) return false;

    // Count activities of this type today
    const todayCount = await this.activityLogRepository.count({
      where: {
        userSk,
        activityType,
        createdAt: new Date(today),
      },
    });

    return todayCount >= limit;
  }

  /**
   * Get or create user ranking
   */
  private async getUserRanking(userSk: string): Promise<UserRanking> {
    let ranking = await this.userRankingRepository.findOne({
      where: { userSk },
    });

    if (!ranking) {
      ranking = this.userRankingRepository.create({
        userSk,
        totalPoints: 0,
        rankTier: RankTier.BUZZLING_EGG,
        streakDays: 0,
        lastActivity: new Date(),
      });
      await this.userRankingRepository.save(ranking);
    }

    return ranking;
  }

  /**
   * Update user ranking with new points
   */
  private async updateUserRanking(
    userSk: string,
    pointsToAdd: number,
  ): Promise<UserRanking> {
    const ranking = await this.getUserRanking(userSk);

    ranking.totalPoints += pointsToAdd;
    ranking.lastActivity = new Date();
    ranking.rankTier = this.calculateTier(ranking.totalPoints);

    // Update streak if this is a daily activity
    await this.updateStreak(ranking);

    await this.userRankingRepository.save(ranking);

    // Update global rank (run periodically via cron job for performance)
    // For now, just update the user's rank
    const betterRankedCount = await this.userRankingRepository.count({
      where: { totalPoints: ranking.totalPoints },
    });
    ranking.currentRank = betterRankedCount + 1;

    return ranking;
  }

  /**
   * Calculate tier based on total points
   */
  private calculateTier(totalPoints: number): RankTier {
    if (totalPoints >= 20000) return RankTier.THE_BEEZLY;
    if (totalPoints >= 16000) return RankTier.LEGENDARY_QUEEN;
    if (totalPoints >= 12000) return RankTier.QUEEN_BEE;
    if (totalPoints >= 8000) return RankTier.QUEENS_ATTENDANT;
    if (totalPoints >= 5500) return RankTier.HIVE_HOARDER;
    if (totalPoints >= 3500) return RankTier.STICKY_GATHERER;
    if (totalPoints >= 2000) return RankTier.NECTAR_NIBBLER;
    if (totalPoints >= 1000) return RankTier.NEW_BEE;
    if (totalPoints >= 500) return RankTier.COZY_PUPA;
    if (totalPoints >= 200) return RankTier.TINY_LARVA;
    return RankTier.BUZZLING_EGG;
  }

  /**
   * Update daily activity streak
   */
  private async updateStreak(ranking: UserRanking): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayActivity = await this.userDailyActivityRepository.findOne({
      where: { userSk: ranking.userSk, activityDate: yesterdayStr },
    });

    if (yesterdayActivity) {
      ranking.streakDays += 1;
    } else {
      // Check if the last activity was more than 1 day ago
      const lastActivityDate = ranking.lastActivity.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      if (lastActivityDate !== todayStr && lastActivityDate !== yesterdayStr) {
        ranking.streakDays = 1; // Reset streak
      }
    }
  }

  /**
   * Update daily activity tracking
   */
  private async updateDailyActivity(
    userSk: string,
    points: number,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    let dailyActivity = await this.userDailyActivityRepository.findOne({
      where: { userSk, activityDate: today },
    });

    if (!dailyActivity) {
      dailyActivity = this.userDailyActivityRepository.create({
        userSk,
        activityDate: today,
        pointsEarned: points,
        activitiesCount: 1,
      });
    } else {
      dailyActivity.pointsEarned += points;
      dailyActivity.activitiesCount += 1;
      dailyActivity.updatedAt = new Date();
    }

    await this.userDailyActivityRepository.save(dailyActivity);
  }

  /**
   * Check badge eligibility and award new badges
   */
  async checkBadgeEligibility(userSk: string): Promise<Badges[]> {
    const newBadges: Badges[] = [];

    // Get user's current badges
    const currentBadges = await this.userBadgesRepository.find({
      where: { userSk },
      relations: ['badge'],
    });
    const currentBadgeNames = currentBadges.map((ub) => ub.badge.name);

    // Check various badge criteria
    const badgeChecks = [
      {
        name: 'First Receipt',
        check: () => this.hasUploadedReceipts(userSk, 1),
      },
      {
        name: 'Receipt Master',
        check: () => this.hasUploadedReceipts(userSk, 100),
      },
      { name: 'Data Guardian', check: () => this.hasVerifiedOcr(userSk, 50) },
      { name: 'Price Keeper', check: () => this.hasUpdatedPrices(userSk, 25) },
      { name: 'Searcher', check: () => this.hasSearched(userSk, 100) },
      { name: 'Week Warrior', check: () => this.hasStreak(userSk, 7) },
      { name: 'Month Master', check: () => this.hasStreak(userSk, 30) },
    ];

    for (const { name, check } of badgeChecks) {
      if (!currentBadgeNames.includes(name) && (await check())) {
        const badge = await this.badgesRepository.findOne({ where: { name } });
        if (badge) {
          await this.awardBadge(userSk, badge.id);
          newBadges.push(badge);
        }
      }
    }

    return newBadges;
  }

  /**
   * Award a badge to user
   */
  private async awardBadge(userSk: string, badgeId: number): Promise<void> {
    const userBadge = this.userBadgesRepository.create({
      userSk,
      badgeId,
      awardedAt: new Date(),
    });
    await this.userBadgesRepository.save(userBadge);
  }

  // Badge eligibility check methods
  private async hasUploadedReceipts(
    userSk: string,
    count: number,
  ): Promise<boolean> {
    const receiptCount = await this.activityLogRepository.count({
      where: { userSk, activityType: 'RECEIPT_UPLOAD' },
    });
    return receiptCount >= count;
  }

  private async hasVerifiedOcr(
    userSk: string,
    count: number,
  ): Promise<boolean> {
    const verificationCount = await this.activityLogRepository.count({
      where: { userSk, activityType: 'OCR_VERIFICATION' },
    });
    return verificationCount >= count;
  }

  private async hasUpdatedPrices(
    userSk: string,
    count: number,
  ): Promise<boolean> {
    const priceCount = await this.activityLogRepository.count({
      where: { userSk, activityType: 'PRICE_UPDATE' },
    });
    return priceCount >= count;
  }

  private async hasSearched(userSk: string, count: number): Promise<boolean> {
    const searchCount = await this.activityLogRepository.count({
      where: { userSk, activityType: 'PRODUCT_SEARCH' },
    });
    return searchCount >= count;
  }

  private async hasStreak(userSk: string, days: number): Promise<boolean> {
    const ranking = await this.userRankingRepository.findOne({
      where: { userSk },
    });
    return ranking ? ranking.streakDays >= days : false;
  }

  /**
   * Get rank change information
   */
  private getRankChange(
    oldRanking: UserRanking,
    newRanking: UserRanking,
  ): AwardPointsResult['rankChange'] {
    if (
      oldRanking.rankTier !== newRanking.rankTier ||
      oldRanking.currentRank !== newRanking.currentRank
    ) {
      return {
        oldTier: oldRanking.rankTier,
        newTier: newRanking.rankTier,
        oldRank: oldRanking.currentRank,
        newRank: newRanking.currentRank,
      };
    }
    return undefined;
  }
}
