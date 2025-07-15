import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import { CategoryDTO } from '../../../packages/types/dto/category';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable()
export class CategoryService {
  private table = 'Category';

  async findAll(): Promise<CategoryDTO[]> {
    const {
      data,
      error,
    }: { data: CategoryDTO[] | null; error: PostgrestError | null } =
      await supabase.from(this.table).select('*');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: number): Promise<CategoryDTO> {
    const {
      data,
      error,
    }: { data: CategoryDTO | null; error: PostgrestError | null } =
      await supabase.from(this.table).select('*').eq('id', id).single();

    if (error) throw new Error(error.message);
    return data!;
  }

  async create(category: Partial<CategoryDTO>): Promise<CategoryDTO> {
    const {
      data,
      error,
    }: { data: CategoryDTO | null; error: PostgrestError | null } =
      await supabase.from(this.table).insert([category]).select().single();

    if (error) throw new Error(error.message);
    return data!;
  }

  async update(
    id: number,
    category: Partial<CategoryDTO>,
  ): Promise<CategoryDTO> {
    const {
      data,
      error,
    }: { data: CategoryDTO | null; error: PostgrestError | null } =
      await supabase
        .from(this.table)
        .update(category)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data!;
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
