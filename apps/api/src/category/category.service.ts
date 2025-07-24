import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import { CategoryDTO } from '../../../packages/types/dto/category';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable()
export class CategoryService {
  private table = 'Category';

  // Get all categories
  async findAll(): Promise<CategoryDTO[]> {
    const {
      data,
      error,
    }: { data: CategoryDTO[] | null; error: PostgrestError | null } =
      await supabase.from(this.table).select('*');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // Get category by ID
  async findOne(id: number): Promise<CategoryDTO> {
    const {
      data,
      error,
    }: { data: CategoryDTO | null; error: PostgrestError | null } =
      await supabase.from(this.table).select('*').eq('id', id).single();

    if (error) throw new Error(error.message);
    return data!;
  }

  // Create a new category
  async create(category: Partial<CategoryDTO>): Promise<CategoryDTO> {
    const {
      data,
      error,
    }: { data: CategoryDTO | null; error: PostgrestError | null } =
      await supabase.from(this.table).insert([category]).select().single();

    if (error) throw new Error(error.message);
    return data!;
  }

  // Update a category
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

  // Delete a category
  async remove(id: number): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Returns a distinct list of all category1 values
  async getDistinctCategory1(): Promise<string[]> {
    const result = (await supabase.rpc('get_distinct_category1')) as {
      data: { category1: string }[] | null;
      error: PostgrestError | null;
    };

    if (result.error) throw new Error(result.error.message);
    return result.data?.map((row) => row.category1) ?? [];
  }

  // Returns a distinct list of category2 values filtered by category1
  async getDistinctCategory2(category1: string): Promise<string[]> {
    const result = (await supabase.rpc('get_distinct_category2', {
      category1_input: category1,
    })) as {
      data: { category2: string }[] | null;
      error: PostgrestError | null;
    };

    if (result.error) throw new Error(result.error.message);
    return result.data?.map((row) => row.category2) ?? [];
  }

  // Returns a distinct list of category3 values filtered by category1 and category2
  async getDistinctCategory3(
    category1: string,
    category2: string,
  ): Promise<string[]> {
    const result = (await supabase.rpc('get_distinct_category3', {
      category1_input: category1,
      category2_input: category2,
    })) as {
      data: { category3: string }[] | null;
      error: PostgrestError | null;
    };

    if (result.error) throw new Error(result.error.message);
    return result.data?.map((row) => row.category3) ?? [];
  }
}
