export interface BadgeDTO {
  id: number;
  name: string;
  iconUrl?: string;
  description?: string;
}

export interface UserBadgeDTO {
  userId: string; // user_sk (UUID)
  badgeId: number;
  awardedAt: string;
}
