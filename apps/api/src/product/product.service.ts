import { Injectable } from '@nestjs/common';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import { supabase } from '../supabase.client';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

@Injectable()
export class ProductService {
  async getAllProducts(): Promise<NormalizedProductDTO[]> {
    const { data, error }: PostgrestSingleResponse<NormalizedProductDTO[]> =
      await supabase.from('Product').select('*');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getProductById(id: string): Promise<NormalizedProductDTO | null> {
    const { data, error }: PostgrestSingleResponse<NormalizedProductDTO> =
      await supabase.from('Product').select('*').eq('id', id).single();

    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async createProduct(
    productData: NormalizedProductDTO,
  ): Promise<NormalizedProductDTO> {
    const { data, error }: PostgrestSingleResponse<NormalizedProductDTO> =
      await supabase.from('Product').insert([productData]).select().single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Product creation failed.');
    return data;
  }

  async updateProduct(
    id: string,
    productData: Partial<NormalizedProductDTO>,
  ): Promise<NormalizedProductDTO> {
    const { data, error }: PostgrestSingleResponse<NormalizedProductDTO> =
      await supabase
        .from('Product')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Product update failed.');
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('Product').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }
}
