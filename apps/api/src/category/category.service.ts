import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CategoryDTO } from '../../../packages/types/dto/category';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<CategoryDTO[]> {
    try {
      const categories = await this.categoryRepository.find({
        relations: ['parent', 'children'],
        order: { level: 'ASC', name: 'ASC' },
      });

      return categories.map((category) => this.mapCategoryToDTO(category));
    } catch (err) {
      console.error('CategoryService.findAll error:', err);
      throw err;
    }
  }

  async findOne(id: number): Promise<CategoryDTO> {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
        relations: ['parent', 'children'],
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return this.mapCategoryToDTO(category);
    } catch (err) {
      console.error('CategoryService.findOne error:', err);
      throw err;
    }
  }

  async create(categoryData: Partial<CategoryDTO>): Promise<CategoryDTO> {
    try {
      // Validate parent if provided
      if (categoryData.parent_id) {
        const parentExists = await this.categoryRepository.findOne({
          where: { id: categoryData.parent_id },
        });

        if (!parentExists) {
          throw new NotFoundException(
            `Parent category with ID ${categoryData.parent_id} not found`,
          );
        }
      }

      const category = this.categoryRepository.create({
        parentId: categoryData.parent_id || undefined,
        name: categoryData.name,
        slug: categoryData.slug,
        level: categoryData.level,
        useYn: categoryData.use_yn,
      });

      const savedCategory = await this.categoryRepository.save(category);
      return this.mapCategoryToDTO(savedCategory);
    } catch (err) {
      console.error('CategoryService.create error:', err);
      throw err;
    }
  }

  async update(
    id: number,
    categoryData: Partial<CategoryDTO>,
  ): Promise<CategoryDTO> {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Validate parent if provided and different from current
      if (
        categoryData.parent_id !== undefined &&
        categoryData.parent_id !== category.parentId
      ) {
        if (categoryData.parent_id) {
          const parentExists = await this.categoryRepository.findOne({
            where: { id: categoryData.parent_id },
          });

          if (!parentExists) {
            throw new NotFoundException(
              `Parent category with ID ${categoryData.parent_id} not found`,
            );
          }

          // Prevent circular reference
          if (categoryData.parent_id === id) {
            throw new Error('Category cannot be its own parent');
          }
        }
      }

      // Update fields
      if (categoryData.parent_id !== undefined)
        category.parentId = categoryData.parent_id || undefined;
      if (categoryData.name !== undefined) category.name = categoryData.name;
      if (categoryData.slug !== undefined) category.slug = categoryData.slug;
      if (categoryData.level !== undefined) category.level = categoryData.level;
      if (categoryData.use_yn !== undefined)
        category.useYn = categoryData.use_yn;

      await this.categoryRepository.save(category);

      // Reload with relations
      const result = await this.categoryRepository.findOne({
        where: { id },
        relations: ['parent', 'children'],
      });

      return this.mapCategoryToDTO(result!);
    } catch (err) {
      console.error('CategoryService.update error:', err);
      throw err;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
        relations: ['children'],
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Check if category has children
      if (category.children && category.children.length > 0) {
        throw new Error(
          'Cannot delete category with child categories. Delete children first.',
        );
      }

      await this.categoryRepository.remove(category);
    } catch (err) {
      console.error('CategoryService.remove error:', err);
      throw err;
    }
  }

  // Helper method to map Category entity to DTO
  private mapCategoryToDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      parent_id: category.parentId || null,
      name: category.name ?? '',
      slug: category.slug ?? '',
      level: category.level ?? 0,
      use_yn: category.useYn ?? true,
      created_at: category.createdAt.toISOString(),
      updated_at: category.updatedAt.toISOString(),
    };
  }

  async getDistinctCategory1(): Promise<string[]> {
    const result = (await supabase.rpc('get_distinct_category1')) as {
      data: { category1: string }[] | null;
      error: PostgrestError | null;
    };

    if (result.error) throw new Error(result.error.message);
    return result.data?.map((row) => row.category1) ?? [];
  }
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
