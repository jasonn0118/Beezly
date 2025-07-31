import { Request } from 'express';
import { UserProfileDTO } from '../../../../packages/types/dto/user';

export interface AuthenticatedRequest extends Request {
  user: UserProfileDTO;
}

export interface RequestWithUser extends Request {
  user?: UserProfileDTO;
}
