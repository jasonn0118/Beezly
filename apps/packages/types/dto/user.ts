export interface UserProfileDTO {
  id: string; // user_sk (UUID)
  email: string;
  displayName?: string;
  pointBalance: number;
  level?: string;
  rank?: number;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}
