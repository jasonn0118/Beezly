import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { RankTier } from '../../entities';

export class AwardScoreDto {
  @ApiProperty({ description: 'User SK to award points to' })
  @IsString()
  userSk: string;

  @ApiProperty({ description: 'Type of activity' })
  @IsString()
  activityType: string;

  @ApiProperty({ description: 'Reference ID (optional)', required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ description: 'Reference type (optional)', required: false })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({
    description: 'Point multiplier (optional)',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  multiplier?: number;

  @ApiProperty({
    description: 'Additional metadata (optional)',
    required: false,
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BadgeSummaryDto {
  @ApiProperty({ description: 'Badge ID' })
  id: number;

  @ApiProperty({ description: 'Badge name' })
  name: string;

  @ApiProperty({ description: 'Badge description' })
  description: string;

  @ApiProperty({ description: 'Badge icon URL', required: false })
  iconUrl?: string;

  @ApiProperty({ description: 'Date when badge was awarded' })
  awardedAt: Date;
}

export class ActivitySummaryDto {
  @ApiProperty({ description: 'Activity ID' })
  id: number;

  @ApiProperty({ description: 'Activity type' })
  activityType: string;

  @ApiProperty({ description: 'Points awarded' })
  pointsAwarded: number;

  @ApiProperty({ description: 'Activity timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Reference ID', required: false })
  referenceId?: string;

  @ApiProperty({ description: 'Reference type', required: false })
  referenceType?: string;
}

export class TierProgressionDto {
  @ApiProperty({ description: 'Current tier', enum: RankTier })
  currentTier: RankTier;

  @ApiProperty({ description: 'Current total points' })
  currentPoints: number;

  @ApiProperty({ description: 'Next tier', enum: RankTier, required: false })
  nextTier?: RankTier;

  @ApiProperty({ description: 'Points needed for next tier', required: false })
  pointsToNextTier?: number;

  @ApiProperty({ description: 'Progress percentage within current tier' })
  progressPercentage: number;
}

export class UserGamificationProfileDto {
  @ApiProperty({ description: 'User SK' })
  userSk: string;

  @ApiProperty({ description: 'Total points earned' })
  totalPoints: number;

  @ApiProperty({ description: 'Current global rank', required: false })
  currentRank?: number;

  @ApiProperty({ description: 'Current tier', enum: RankTier })
  rankTier: RankTier;

  @ApiProperty({ description: 'Consecutive login streak in days' })
  streakDays: number;

  @ApiProperty({ description: 'Points earned this week' })
  weeklyPoints: number;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivity: Date;

  @ApiProperty({ description: 'Badges earned', type: [BadgeSummaryDto] })
  badges: BadgeSummaryDto[];

  @ApiProperty({ description: 'Recent activities', type: [ActivitySummaryDto] })
  recentActivities: ActivitySummaryDto[];

  @ApiProperty({ description: 'Tier progression info' })
  tierProgression: TierProgressionDto;
}

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'User SK' })
  userSk: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiProperty({ description: 'Total points' })
  totalPoints: number;

  @ApiProperty({ description: 'Current rank' })
  currentRank: number;

  @ApiProperty({ description: 'Rank tier', enum: RankTier })
  rankTier: RankTier;

  @ApiProperty({ description: 'Points earned this week' })
  weeklyPoints: number;

  @ApiProperty({ description: 'Login streak in days' })
  streakDays: number;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivity: Date;
}

export class LeaderboardResponseDto {
  @ApiProperty({
    description: 'Global top performers',
    type: [LeaderboardEntryDto],
  })
  global: LeaderboardEntryDto[];

  @ApiProperty({
    description: 'Tier-specific leaderboard',
    type: [LeaderboardEntryDto],
  })
  tier: LeaderboardEntryDto[];

  @ApiProperty({
    description: 'Weekly top performers',
    type: [LeaderboardEntryDto],
  })
  weekly: LeaderboardEntryDto[];

  @ApiProperty({
    description: 'Users around current user rank',
    type: [LeaderboardEntryDto],
  })
  contextual: LeaderboardEntryDto[];

  @ApiProperty({ description: 'Current user position', required: false })
  userPosition?: LeaderboardEntryDto;
}

export class BadgeProgressDto {
  @ApiProperty({ description: 'Badge information' })
  badge: BadgeSummaryDto;

  @ApiProperty({ description: 'Whether user has earned this badge' })
  earned: boolean;

  @ApiProperty({
    description: 'Current progress towards badge',
    required: false,
  })
  currentProgress?: number;

  @ApiProperty({ description: 'Required progress for badge', required: false })
  requiredProgress?: number;

  @ApiProperty({ description: 'Progress percentage', required: false })
  progressPercentage?: number;
}

export class BadgeProgressResponseDto {
  @ApiProperty({ description: 'Earned badges', type: [BadgeProgressDto] })
  earned: BadgeProgressDto[];

  @ApiProperty({
    description: 'Available badges to earn',
    type: [BadgeProgressDto],
  })
  available: BadgeProgressDto[];
}

export class ActivityStatsDto {
  @ApiProperty({ description: 'Total activities completed' })
  totalActivities: number;

  @ApiProperty({ description: 'Activities completed today' })
  todayActivities: number;

  @ApiProperty({ description: 'Activities completed this week' })
  weeklyActivities: number;

  @ApiProperty({ description: 'Most frequent activity type' })
  favoriteActivity: string;

  @ApiProperty({ description: 'Average points per day' })
  averagePointsPerDay: number;
}
