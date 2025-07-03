import { UserProfileDTO } from "./user";

export interface AuthDTO {
  accessToken: string;
  user: UserProfileDTO;
  expiresIn: number;
}
