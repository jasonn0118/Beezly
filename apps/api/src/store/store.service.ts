import { Injectable } from '@nestjs/common';
import { StoreDTO } from '../../../packages/types/dto/store';
import { supabase } from '../supabase.client';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

@Injectable()
export class StoreService {
  async getAllStores(): Promise<StoreDTO[]> {
    const { data, error }: PostgrestSingleResponse<StoreDTO[]> = await supabase
      .from('Store')
      .select('*');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getStoreById(id: string): Promise<StoreDTO | null> {
    const { data, error }: PostgrestSingleResponse<StoreDTO> = await supabase
      .from('Store')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async createStore(storeData: StoreDTO): Promise<StoreDTO> {
    const { data, error }: PostgrestSingleResponse<StoreDTO> = await supabase
      .from('Store')
      .insert([storeData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Store creation failed.');
    return data;
  }

  async updateStore(
    id: string,
    storeData: Partial<StoreDTO>,
  ): Promise<StoreDTO> {
    const { data, error }: PostgrestSingleResponse<StoreDTO> = await supabase
      .from('Store')
      .update(storeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Store update failed.');
    return data;
  }

  async deleteStore(id: string): Promise<void> {
    const { error } = await supabase.from('Store').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }
}
