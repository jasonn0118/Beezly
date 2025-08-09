/**
 * Gamification System Constants
 *
 * This file contains all configuration constants for the gamification system
 * including activity types, scoring rules, tier thresholds, and badge requirements.
 */

export enum ActivityType {
  RECEIPT_UPLOAD = 'RECEIPT_UPLOAD',
  OCR_VERIFICATION = 'OCR_VERIFICATION',
  PRICE_UPDATE = 'PRICE_UPDATE',
  BARCODE_SCAN = 'BARCODE_SCAN',
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  PRICE_COMPARISON = 'PRICE_COMPARISON',
  REVIEW_WRITE = 'REVIEW_WRITE',
  REFERRAL_SUCCESS = 'REFERRAL_SUCCESS',
  DAILY_LOGIN = 'DAILY_LOGIN',
  BUG_REPORT = 'BUG_REPORT',
  STREAK_BONUS = 'STREAK_BONUS',
  FIRST_TIME_BONUS = 'FIRST_TIME_BONUS',
}

export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  [ActivityType.RECEIPT_UPLOAD]: 30,
  [ActivityType.OCR_VERIFICATION]: 25,
  [ActivityType.PRICE_UPDATE]: 30,
  [ActivityType.BARCODE_SCAN]: 15,
  [ActivityType.PRODUCT_SEARCH]: 2,
  [ActivityType.PRICE_COMPARISON]: 8,
  [ActivityType.REVIEW_WRITE]: 12,
  [ActivityType.REFERRAL_SUCCESS]: 75,
  [ActivityType.DAILY_LOGIN]: 10,
  [ActivityType.BUG_REPORT]: 40,
  [ActivityType.STREAK_BONUS]: 5,
  [ActivityType.FIRST_TIME_BONUS]: 50,
};

export const DAILY_LIMITS: Partial<Record<ActivityType, number>> = {
  [ActivityType.PRODUCT_SEARCH]: 50, // Max 50 searches per day
  [ActivityType.DAILY_LOGIN]: 1, // Only once per day
};

export const TIER_THRESHOLDS = {
  BRONZE: { min: 0, max: 999 },
  SILVER: { min: 1000, max: 4999 },
  GOLD: { min: 5000, max: 14999 },
  PLATINUM: { min: 15000, max: 39999 },
  DIAMOND: { min: 40000, max: Infinity },
};

export const BADGE_REQUIREMENTS = {
  'First Receipt': { type: ActivityType.RECEIPT_UPLOAD, count: 1 },
  'Receipt Master': { type: ActivityType.RECEIPT_UPLOAD, count: 100 },
  'Data Guardian': { type: ActivityType.OCR_VERIFICATION, count: 50 },
  'Price Keeper': { type: ActivityType.PRICE_UPDATE, count: 25 },
  Searcher: { type: ActivityType.PRODUCT_SEARCH, count: 100 },
  'Comparison King': { type: ActivityType.PRICE_COMPARISON, count: 50 },
  Reviewer: { type: ActivityType.REVIEW_WRITE, count: 10 },
  Recruiter: { type: ActivityType.REFERRAL_SUCCESS, count: 5 },
  'Week Warrior': { type: 'STREAK', count: 7 },
  'Month Master': { type: 'STREAK', count: 30 },
};

export const GAMIFICATION_CONFIG = {
  // Performance settings
  LEADERBOARD_DEFAULT_LIMIT: 50,
  CONTEXTUAL_LEADERBOARD_SIZE: 10,
  ACTIVITY_HISTORY_RETENTION_DAYS: 90,

  // Scoring multipliers
  MAX_VERIFICATION_MULTIPLIER: 3,
  VERIFICATION_ITEMS_PER_MULTIPLIER: 5,

  // Rate limiting
  SEARCH_DAILY_LIMIT: 50,
  MAX_STREAK_BONUS_PER_DAY: 3,

  // Badge progression
  TIER_BADGES: [
    'Bronze Star',
    'Silver Star',
    'Gold Star',
    'Platinum Star',
    'Diamond Star',
  ],
  MILESTONE_BADGES: [1000, 5000, 15000, 40000, 100000], // Point milestones

  // System limits
  MAX_ACTIVITIES_PER_BATCH: 100,
  RANKING_UPDATE_BATCH_SIZE: 1000,
};

export const ERROR_MESSAGES = {
  SCORE_TYPE_NOT_FOUND: 'Score type not configured',
  DAILY_LIMIT_EXCEEDED: 'Daily activity limit exceeded',
  USER_NOT_FOUND: 'User not found',
  INVALID_ACTIVITY_TYPE: 'Invalid activity type',
  SCORING_SERVICE_ERROR: 'Error in scoring service',
  RANKING_SERVICE_ERROR: 'Error in ranking service',
};

export const SUCCESS_MESSAGES = {
  POINTS_AWARDED: 'Points awarded successfully',
  BADGE_EARNED: 'New badge earned',
  TIER_PROMOTION: 'Tier promotion achieved',
  STREAK_BONUS: 'Streak bonus applied',
};
