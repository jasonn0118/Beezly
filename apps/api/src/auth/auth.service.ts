import { Injectable } from '@nestjs/common';
import { AuthDTO } from '../../../packages/types/dto/auth';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { supabase } from '../supabase.client';
import { Session, User, AuthError } from '@supabase/supabase-js';

type UserMetadata = {
  displayName?: string;
  pointBalance?: number;
  level?: string;
  rank?: number;
  badges?: string[];
};

@Injectable()
export class AuthService {
  async signIn(email: string, password: string): Promise<AuthDTO> {
    const {
      data,
      error,
    }: {
      data: { session: Session | null; user: User | null };
      error: AuthError | null;
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { session, user } = data;
    if (!session || !user) {
      throw new Error('Authentication failed.');
    }

    const metadata = (user.user_metadata ?? {}) as UserMetadata;

    const mappedUser: UserProfileDTO = {
      id: user.id,
      email: user.email ?? '',
      displayName: metadata.displayName ?? '',
      pointBalance: metadata.pointBalance ?? 0,
      level: metadata.level ?? '',
      rank: metadata.rank ?? 0,
      badges: metadata.badges ?? [],
      createdAt: user.created_at,
      updatedAt: user.updated_at ?? user.created_at,
    };

    return {
      accessToken: session.access_token,
      user: mappedUser,
      expiresIn: session.expires_in,
    };
  }

  async signOut(): Promise<void> {
    const { error }: { error: AuthError | null } =
      await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getUser(): Promise<UserProfileDTO | null> {
    const {
      data,
      error,
    }: {
      data: { user: User | null };
      error: AuthError | null;
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }

    const user = data.user;
    if (!user) {
      return null;
    }

    const metadata = (user.user_metadata ?? {}) as UserMetadata;

    const mappedUser: UserProfileDTO = {
      id: user.id,
      email: user.email ?? '',
      displayName: metadata.displayName ?? '',
      pointBalance: metadata.pointBalance ?? 0,
      level: metadata.level ?? '',
      rank: metadata.rank ?? 0,
      badges: metadata.badges ?? [],
      createdAt: user.created_at,
      updatedAt: user.updated_at ?? user.created_at,
    };

    return mappedUser;
  }
}
