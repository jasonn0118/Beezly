import { Injectable } from '@nestjs/common';
import { ReceiptItemDTO } from '../../../packages/types/dto/receiptItem';
import { supabase } from '../supabase.client';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

@Injectable()
export class ReceiptItemService {
  async getAllReceiptItems(): Promise<ReceiptItemDTO[]> {
    const { data, error }: PostgrestSingleResponse<ReceiptItemDTO[]> =
      await supabase.from('ReceiptItem').select('*');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getReceiptItemById(id: string): Promise<ReceiptItemDTO | null> {
    const { data, error }: PostgrestSingleResponse<ReceiptItemDTO> =
      await supabase.from('ReceiptItem').select('*').eq('id', id).single();

    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async createReceiptItem(
    receiptItemData: ReceiptItemDTO,
  ): Promise<ReceiptItemDTO> {
    const { data, error }: PostgrestSingleResponse<ReceiptItemDTO> =
      await supabase
        .from('ReceiptItem')
        .insert([receiptItemData])
        .select()
        .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('ReceiptItem creation failed.');
    return data;
  }

  async updateReceiptItem(
    id: string,
    receiptItemData: Partial<ReceiptItemDTO>,
  ): Promise<ReceiptItemDTO> {
    const { data, error }: PostgrestSingleResponse<ReceiptItemDTO> =
      await supabase
        .from('ReceiptItem')
        .update(receiptItemData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('ReceiptItem update failed.');
    return data;
  }

  async deleteReceiptItem(id: string): Promise<void> {
    const { error } = await supabase.from('ReceiptItem').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }
}
