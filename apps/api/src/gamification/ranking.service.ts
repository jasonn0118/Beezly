import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  UserRanking,
  RankTier,
  ActivityLog,
  UserDailyActivity,
} from '../entities';

export interface LeaderboardEntry {
  userSk: string;
  displayName: string;
  totalPoints: number;
  currentRank: number;
  rankTier: RankTier;
  weeklyPoints: number;
  streakDays: number;
  lastActivity: Date;
}

export interface LeaderboardResponse {
  global: LeaderboardEntry[];
  tier: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  contextual: LeaderboardEntry[];
  userPosition?: LeaderboardEntry;
}

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    @InjectRepository(UserRanking)
    private userRankingRepository: Repository<UserRanking>,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(UserDailyActivity)
    private userDailyActivityRepository: Repository<UserDailyActivity>,
  ) {}

  /**
   * Get comprehensive leaderboard data
   */
  async getLeaderboard(
    userSk?: string,
    tier?: RankTier,
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
  ): Promise<LeaderboardResponse> {
    const [global, tierBoard, weekly, contextual, userPosition] =
      await Promise.all([
        this.getGlobalLeaderboard(10),
        tier
          ? this.getTierLeaderboard(tier, 10)
          : this.getTierLeaderboard(RankTier.BUZZLING_EGG, 10),
        this.getWeeklyLeaderboard(10),
        userSk ? this.getContextualLeaderboard(userSk, 10) : [],
        userSk ? this.getUserPosition(userSk) : undefined,
      ]);

    return {
      global,
      tier: tierBoard,
      weekly,
      contextual,
      userPosition,
    };
  }

  /**
   * Get global leaderboard (top users by total points)
   */
  async getGlobalLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    const rankings = await this.userRankingRepository
      .createQueryBuilder('ranking')
      .leftJoinAndSelect('ranking.user', 'user')
      .orderBy('ranking.totalPoints', 'DESC')
      .addOrderBy('ranking.lastActivity', 'ASC')
      .limit(limit)
      .getMany();

    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i];
      const weeklyPoints = await this.getWeeklyPoints(ranking.userSk);

      entries.push({
        userSk: ranking.userSk,
        displayName: this.generateDisplayName(ranking.user, i + 1),
        totalPoints: ranking.totalPoints,
        currentRank: i + 1,
        rankTier: ranking.rankTier,
        weeklyPoints,
        streakDays: ranking.streakDays,
        lastActivity: ranking.lastActivity,
      });
    }

    return entries;
  }

  /**
   * Get tier-specific leaderboard
   */
  async getTierLeaderboard(
    tier: RankTier,
    limit: number = 50,
  ): Promise<LeaderboardEntry[]> {
    const rankings = await this.userRankingRepository
      .createQueryBuilder('ranking')
      .leftJoinAndSelect('ranking.user', 'user')
      .where('ranking.rankTier = :tier', { tier })
      .orderBy('ranking.totalPoints', 'DESC')
      .addOrderBy('ranking.lastActivity', 'ASC')
      .limit(limit)
      .getMany();

    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i];
      const weeklyPoints = await this.getWeeklyPoints(ranking.userSk);

      entries.push({
        userSk: ranking.userSk,
        displayName: this.generateDisplayName(ranking.user, i + 1),
        totalPoints: ranking.totalPoints,
        currentRank: i + 1, // Rank within tier
        rankTier: ranking.rankTier,
        weeklyPoints,
        streakDays: ranking.streakDays,
        lastActivity: ranking.lastActivity,
      });
    }

    return entries;
  }

  /**
   * Get weekly leaderboard (top performers this week)
   */
  async getWeeklyLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get users with points earned in the last week
    const weeklyStats = await this.activityLogRepository
      .createQueryBuilder('log')
      .select('log.userSk', 'userSk')
      .addSelect('SUM(log.pointsAwarded)', 'weeklyPoints')
      .where('log.createdAt >= :oneWeekAgo', { oneWeekAgo })
      .groupBy('log.userSk')
      .orderBy('"weeklyPoints"', 'DESC')
      .limit(limit)
      .getRawMany();

    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < weeklyStats.length; i++) {
      const stat = weeklyStats[i];
      const ranking = await this.userRankingRepository.findOne({
        where: { userSk: stat.userSk },
        relations: ['user'],
      });

      if (ranking) {
        entries.push({
          userSk: ranking.userSk,
          displayName: this.generateDisplayName(ranking.user, i + 1),
          totalPoints: ranking.totalPoints,
          currentRank: i + 1,
          rankTier: ranking.rankTier,
          weeklyPoints: parseInt(stat.weeklyPoints),
          streakDays: ranking.streakDays,
          lastActivity: ranking.lastActivity,
        });
      }
    }

    return entries;
  }

  /**
   * Get contextual leaderboard (users around specific user's rank)
   */
  async getContextualLeaderboard(
    userSk: string,
    contextSize: number = 10,
  ): Promise<LeaderboardEntry[]> {
    const userRanking = await this.userRankingRepository.findOne({
      where: { userSk },
    });

    if (!userRanking) {
      return [];
    }

    // Get users with similar points (±contextSize positions)
    const rankings = await this.userRankingRepository
      .createQueryBuilder('ranking')
      .leftJoinAndSelect('ranking.user', 'user')
      .orderBy('ranking.totalPoints', 'DESC')
      .addOrderBy('ranking.lastActivity', 'ASC')
      .getMany();

    // Find user's position and get surrounding users
    const userIndex = rankings.findIndex((r) => r.userSk === userSk);
    if (userIndex === -1) return [];

    const start = Math.max(0, userIndex - Math.floor(contextSize / 2));
    const end = Math.min(rankings.length, start + contextSize);
    const contextRankings = rankings.slice(start, end);

    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < contextRankings.length; i++) {
      const ranking = contextRankings[i];
      const weeklyPoints = await this.getWeeklyPoints(ranking.userSk);

      entries.push({
        userSk: ranking.userSk,
        displayName: this.generateDisplayName(ranking.user, start + i + 1),
        totalPoints: ranking.totalPoints,
        currentRank: start + i + 1,
        rankTier: ranking.rankTier,
        weeklyPoints,
        streakDays: ranking.streakDays,
        lastActivity: ranking.lastActivity,
      });
    }

    return entries;
  }

  /**
   * Get user's current position
   */
  async getUserPosition(userSk: string): Promise<LeaderboardEntry | undefined> {
    const ranking = await this.userRankingRepository.findOne({
      where: { userSk },
      relations: ['user'],
    });

    if (!ranking) return undefined;

    const globalRank = await this.userRankingRepository.count({
      where: { totalPoints: ranking.totalPoints },
    });

    const weeklyPoints = await this.getWeeklyPoints(userSk);

    return {
      userSk: ranking.userSk,
      displayName: this.generateDisplayName(ranking.user, globalRank),
      totalPoints: ranking.totalPoints,
      currentRank: globalRank,
      rankTier: ranking.rankTier,
      weeklyPoints,
      streakDays: ranking.streakDays,
      lastActivity: ranking.lastActivity,
    };
  }

  /**
   * Generate display name for users
   */
  private generateDisplayName(user: any, rank: number): string {
    // If user has both first and last name, use them
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    // If user has only first name, use it
    if (user?.firstName) {
      return user.firstName;
    }

    // Otherwise, generate a bee-themed name with rank
    return `bee#${rank.toString().padStart(3, '0')}`;
  }

  /**
   * Get user's weekly points
   */
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

  /**
   * Update all user rankings (run via cron job for performance)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAllRankings(): Promise<void> {
    this.logger.log('Starting daily ranking update...');

    try {
      // Get all users ordered by total points
      const rankings = await this.userRankingRepository
        .createQueryBuilder('ranking')
        .orderBy('ranking.totalPoints', 'DESC')
        .addOrderBy('ranking.lastActivity', 'ASC')
        .getMany();

      // Update ranks
      for (let i = 0; i < rankings.length; i++) {
        const ranking = rankings[i];
        ranking.currentRank = i + 1;

        // Update tier based on current points
        const newTier = this.calculateTier(ranking.totalPoints);
        if (ranking.rankTier !== newTier) {
          ranking.rankTier = newTier;
          this.logger.log(`User ${ranking.userSk} promoted to ${newTier}`);
        }
      }

      // Batch save all updates
      await this.userRankingRepository.save(rankings);

      // Clean up old daily activity records (keep last 90 days)
      await this.cleanupOldActivityRecords();

      this.logger.log(`Ranking update completed for ${rankings.length} users`);
    } catch (error) {
      this.logger.error('Error updating rankings:', error);
    }
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
   * Clean up old activity records to maintain performance
   */
  private async cleanupOldActivityRecords(): Promise<void> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    await this.userDailyActivityRepository
      .createQueryBuilder()
      .delete()
      .where('activityDate < :date', {
        date: ninetyDaysAgo.toISOString().split('T')[0],
      })
      .execute();

    this.logger.log('Cleaned up old daily activity records');
  }

  /**
   * Get user's tier progression
   */
  async getTierProgression(userSk: string): Promise<{
    currentTier: RankTier;
    currentPoints: number;
    nextTier?: RankTier;
    pointsToNextTier?: number;
    progressPercentage: number;
  }> {
    const ranking = await this.userRankingRepository.findOne({
      where: { userSk },
    });

    if (!ranking) {
      return {
        currentTier: RankTier.BUZZLING_EGG,
        currentPoints: 0,
        nextTier: RankTier.TINY_LARVA,
        pointsToNextTier: 200,
        progressPercentage: 0,
      };
    }

    const tierThresholds = {
      [RankTier.BUZZLING_EGG]: {
        min: 0,
        max: 199,
        next: RankTier.TINY_LARVA,
        nextThreshold: 200,
      },
      [RankTier.TINY_LARVA]: {
        min: 200,
        max: 499,
        next: RankTier.COZY_PUPA,
        nextThreshold: 500,
      },
      [RankTier.COZY_PUPA]: {
        min: 500,
        max: 999,
        next: RankTier.NEW_BEE,
        nextThreshold: 1000,
      },
      [RankTier.NEW_BEE]: {
        min: 1000,
        max: 1999,
        next: RankTier.NECTAR_NIBBLER,
        nextThreshold: 2000,
      },
      [RankTier.NECTAR_NIBBLER]: {
        min: 2000,
        max: 3499,
        next: RankTier.STICKY_GATHERER,
        nextThreshold: 3500,
      },
      [RankTier.STICKY_GATHERER]: {
        min: 3500,
        max: 5499,
        next: RankTier.HIVE_HOARDER,
        nextThreshold: 5500,
      },
      [RankTier.HIVE_HOARDER]: {
        min: 5500,
        max: 7999,
        next: RankTier.QUEENS_ATTENDANT,
        nextThreshold: 8000,
      },
      [RankTier.QUEENS_ATTENDANT]: {
        min: 8000,
        max: 11999,
        next: RankTier.QUEEN_BEE,
        nextThreshold: 12000,
      },
      [RankTier.QUEEN_BEE]: {
        min: 12000,
        max: 15999,
        next: RankTier.LEGENDARY_QUEEN,
        nextThreshold: 16000,
      },
      [RankTier.LEGENDARY_QUEEN]: {
        min: 16000,
        max: 19999,
        next: RankTier.THE_BEEZLY,
        nextThreshold: 20000,
      },
      [RankTier.THE_BEEZLY]: {
        min: 20000,
        max: Infinity,
        next: undefined,
        nextThreshold: undefined,
      },
    };

    const currentTierInfo = tierThresholds[ranking.rankTier];
    const pointsInCurrentTier = ranking.totalPoints - currentTierInfo.min;
    const tierRange = currentTierInfo.max - currentTierInfo.min + 1;
    const progressPercentage = Math.min(
      100,
      (pointsInCurrentTier / tierRange) * 100,
    );

    return {
      currentTier: ranking.rankTier,
      currentPoints: ranking.totalPoints,
      nextTier: currentTierInfo.next,
      pointsToNextTier: currentTierInfo.nextThreshold
        ? currentTierInfo.nextThreshold - ranking.totalPoints
        : undefined,
      progressPercentage,
    };
  }
}
