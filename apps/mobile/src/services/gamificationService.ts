import { apiClient } from './api';

// Types based on our backend DTOs
export interface RankTier {
  BUZZLING_EGG: 'buzzling_egg';
  TINY_LARVA: 'tiny_larva';
  COZY_PUPA: 'cozy_pupa';
  NEW_BEE: 'new_bee';
  NECTAR_NIBBLER: 'nectar_nibbler';
  STICKY_GATHERER: 'sticky_gatherer';
  HIVE_HOARDER: 'hive_hoarder';
  QUEENS_ATTENDANT: 'queens_attendant';
  QUEEN_BEE: 'queen_bee';
  LEGENDARY_QUEEN: 'legendary_queen';
  THE_BEEZLY: 'the_beezly';
}

export const RANK_TIER_NAMES: Record<string, string> = {
  'buzzling_egg': '🥚 Buzzling Egg',
  'tiny_larva': '🪲 Tiny Larva',
  'cozy_pupa': '🐛 Cozy Pupa',
  'new_bee': '🐝 New Bee',
  'nectar_nibbler': '🌼 Nectar Nibbler',
  'sticky_gatherer': '🍯 Sticky Gatherer',
  'hive_hoarder': '🏺 Hive Hoarder',
  'queens_attendant': '👑 Queen\'s Attendant',
  'queen_bee': '👑 Queen Bee',
  'legendary_queen': '👑 Legendary Queen',
  'the_beezly': '🐝✨ The Beezly'
};

export interface BadgeSummary {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  awardedAt: Date;
}

export interface ActivitySummary {
  id: number;
  activityType: string;
  pointsAwarded: number;
  createdAt: Date;
  referenceId?: string;
  referenceType?: string;
}

export interface TierProgression {
  currentTier: string;
  currentPoints: number;
  nextTier?: string;
  pointsToNextTier?: number;
  progressPercentage: number;
}

export interface UserGamificationProfile {
  userSk: string;
  totalPoints: number;
  currentRank?: number;
  rankTier: string;
  streakDays: number;
  weeklyPoints: number;
  lastActivity: Date;
  badges: BadgeSummary[];
  recentActivities: ActivitySummary[];
  tierProgression: TierProgression;
}

export interface LeaderboardEntry {
  userSk: string;
  displayName: string;
  totalPoints: number;
  currentRank: number;
  rankTier: string;
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

export interface BadgeProgress {
  badge: BadgeSummary;
  earned: boolean;
  currentProgress?: number;
  requiredProgress?: number;
  progressPercentage?: number;
}

export interface BadgeProgressResponse {
  earned: BadgeProgress[];
  available: BadgeProgress[];
}

export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  weeklyActivities: number;
  favoriteActivity: string;
  averagePointsPerDay: number;
}

export interface ActivityHistoryResponse {
  activities: ActivitySummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class GamificationService {
  
  /**
   * Get user's gamification profile
   */
  async getUserProfile(): Promise<UserGamificationProfile> {
    try {
      return await apiClient.get<UserGamificationProfile>('/gamification/profile');
    } catch (error) {
      console.error('Error fetching user gamification profile:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(tier?: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<LeaderboardResponse> {
    try {
      const params = new URLSearchParams();
      if (tier) params.append('tier', tier);
      if (period) params.append('period', period);
      
      const url = `/gamification/leaderboard${params.toString() ? '?' + params.toString() : ''}`;
      return await apiClient.get<LeaderboardResponse>(url);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get badge progress for user
   */
  async getBadgesProgress(): Promise<BadgeProgressResponse> {
    try {
      return await apiClient.get<BadgeProgressResponse>('/gamification/badges');
    } catch (error) {
      console.error('Error fetching badges progress:', error);
      throw error;
    }
  }

  /**
   * Get user activity statistics
   */
  async getActivityStats(): Promise<ActivityStats> {
    try {
      return await apiClient.get<ActivityStats>('/gamification/stats');
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }

  /**
   * Get user activity history with pagination
   */
  async getActivityHistory(
    page: number = 1,
    limit: number = 20,
    activityType?: string
  ): Promise<ActivityHistoryResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (activityType) params.append('activityType', activityType);
      
      const url = `/gamification/activities?${params.toString()}`;
      return await apiClient.get<ActivityHistoryResponse>(url);
    } catch (error) {
      console.error('Error fetching activity history:', error);
      throw error;
    }
  }

  /**
   * Get public leaderboard (for non-authenticated users)
   */
  async getPublicLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      // Use the public endpoint that doesn't require authentication
      const response = await apiClient.get<LeaderboardResponse>('/gamification/leaderboard/public');
      return response.global;
    } catch (error) {
      console.error('Error fetching public leaderboard:', error);
      // Return empty array if there's an error accessing the leaderboard
      return [];
    }
  }

  /**
   * Get tier display name from tier code
   */
  getTierDisplayName(tierCode: string): string {
    return RANK_TIER_NAMES[tierCode] || tierCode;
  }

  /**
   * Get tier emoji from tier code
   */
  getTierEmoji(tierCode: string): string {
    const displayName = this.getTierDisplayName(tierCode);
    const emoji = displayName.split(' ')[0]; // Get the first part which should be the emoji
    return emoji || '🥚'; // Default to egg emoji
  }

  /**
   * Format points with proper number formatting
   */
  formatPoints(points: number): string {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toLocaleString();
  }
  
  /**
   * Get activity type display name
   */
  getActivityDisplayName(activityType: string): string {
    const activityNames: Record<string, string> = {
      'RECEIPT_UPLOAD': 'Receipt Upload',
      'OCR_VERIFICATION': 'OCR Verification',
      'PRICE_UPDATE': 'Price Update',
      'BARCODE_SCAN': 'Barcode Scan',
      'PRODUCT_SEARCH': 'Product Search',
      'PRICE_COMPARISON': 'Price Comparison',
      'REVIEW_WRITE': 'Product Review',
      'REFERRAL_SUCCESS': 'Friend Referral',
      'DAILY_LOGIN': 'Daily Login',
      'BUG_REPORT': 'Bug Report',
      'STREAK_BONUS': 'Streak Bonus',
      'FIRST_TIME_BONUS': 'First Time Bonus'
    };
    return activityNames[activityType] || activityType;
  }
}

// Export singleton instance
export const gamificationService = new GamificationService();
export default gamificationService;