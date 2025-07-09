import { Injectable } from '@nestjs/common';
import { ReceiptDTO } from '../../../packages/types/dto/receipt';
import { supabase } from '../supabase.client';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

@Injectable()
export class ReceiptService {
  async getAllReceipts(): Promise<ReceiptDTO[]> {
    const { data, error }: PostgrestSingleResponse<ReceiptDTO[]> =
      await supabase.from('Receipt').select('*');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getReceiptById(id: string): Promise<ReceiptDTO | null> {
    const { data, error }: PostgrestSingleResponse<ReceiptDTO> = await supabase
      .from('Receipt')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async createReceipt(receiptData: ReceiptDTO): Promise<ReceiptDTO> {
    const { data, error }: PostgrestSingleResponse<ReceiptDTO> = await supabase
      .from('Receipt')
      .insert([receiptData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Receipt creation failed.');
    return data;
  }

  async updateReceipt(
    id: string,
    receiptData: Partial<ReceiptDTO>,
  ): Promise<ReceiptDTO> {
    const { data, error }: PostgrestSingleResponse<ReceiptDTO> = await supabase
      .from('Receipt')
      .update(receiptData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Receipt update failed.');
    return data;
  }

  async deleteReceipt(id: string): Promise<void> {
    const { error } = await supabase.from('Receipt').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }
}
