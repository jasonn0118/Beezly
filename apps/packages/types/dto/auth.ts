import { UserProfileDTO } from "./user";

export interface AuthDTO {
  accessToken: string | null;
  user: UserProfileDTO;
  expiresIn: number;
  message?: string;
}
