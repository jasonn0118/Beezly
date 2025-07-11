import { Injectable } from '@nestjs/common';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { supabase } from '../supabase.client';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

@Injectable()
export class UserService {
  async getAllUsers(): Promise<UserProfileDTO[]> {
    const { data, error }: PostgrestSingleResponse<UserProfileDTO[]> =
      await supabase.from('User').select('*');
    console.log('Supabase data:', data);
    console.log('Supabase error:', error);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getUserById(id: string): Promise<UserProfileDTO | null> {
    const { data, error }: PostgrestSingleResponse<UserProfileDTO> =
      await supabase.from('User').select('*').eq('id', id).single();

    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async createUser(userData: UserProfileDTO): Promise<UserProfileDTO> {
    const { data, error }: PostgrestSingleResponse<UserProfileDTO> =
      await supabase.from('User').insert([userData]).select().single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('User creation failed.');
    return data;
  }

  async updateUser(
    id: string,
    userData: Partial<UserProfileDTO>,
  ): Promise<UserProfileDTO> {
    const { data, error }: PostgrestSingleResponse<UserProfileDTO> =
      await supabase
        .from('User')
        .update(userData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('User update failed.');
    return data;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from('User').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }
}
