import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CategoryDTO } from '@beezly/types/category';
import {
  CategoryHierarchyDTO,
  CategoryTreeDTO,
  CategoryPathDTO,
} from './dto/category-hierarchy.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // Format category name to Title Case (first letter of each word capitalized)
  private formatCategoryName(name: string): string {
    if (!name) return name;

    return name
      .trim()
      .split(' ')
      .filter((word) => word.length > 0) // Remove empty strings from multiple spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Get all categories
  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      order: { id: 'ASC' },
    });
  }

  // Get category by ID
  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return category;
  }

  // Create a new category with validation
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Format category names to proper Title Case
    const formattedDto: CreateCategoryDto = {
      category1: this.formatCategoryName(createCategoryDto.category1),
      category2: createCategoryDto.category2
        ? this.formatCategoryName(createCategoryDto.category2)
        : undefined,
      category3: createCategoryDto.category3
        ? this.formatCategoryName(createCategoryDto.category3)
        : undefined,
    };

    // Validate category hierarchy rules
    await this.validateCategoryHierarchy(formattedDto);

    // Check for duplicates (case-insensitive)
    await this.checkForDuplicate(formattedDto);

    try {
      // Create and save the category
      const category = this.categoryRepository.create({
        category1: formattedDto.category1,
        category2: formattedDto.category2 || null,
        category3: formattedDto.category3 || null,
      });

      return await this.categoryRepository.save(category);
    } catch (error: unknown) {
      // Check if it's a primary key constraint violation
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505' &&
        'constraint' in error &&
        typeof error.constraint === 'string' &&
        error.constraint.includes('PK_')
      ) {
        await this.fixSequence();

        // Retry the save operation
        const category = this.categoryRepository.create({
          category1: formattedDto.category1,
          category2: formattedDto.category2 || null,
          category3: formattedDto.category3 || null,
        });

        return await this.categoryRepository.save(category);
      }

      // Re-throw other errors
      throw error;
    }
  }

  // Fix PostgreSQL sequence for auto-increment
  private async fixSequence(): Promise<void> {
    try {
      // Get the maximum ID from the table
      const result: Array<{ next_id: number }> =
        await this.categoryRepository.query(
          'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM "Category"',
        );
      const nextId = result[0]?.next_id || 1;

      // Reset the sequence to the correct value
      await this.categoryRepository.query(
        `SELECT setval(pg_get_serial_sequence('"Category"', 'id'), $1, false)`,
        [nextId],
      );
    } catch {
      throw new Error('Failed to fix database sequence');
    }
  }

  // Create complete category hierarchy (creates missing parent categories automatically)
  async createHierarchy(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category[]> {
    // Format category names to proper Title Case
    const formattedDto: CreateCategoryDto = {
      category1: this.formatCategoryName(createCategoryDto.category1),
      category2: createCategoryDto.category2
        ? this.formatCategoryName(createCategoryDto.category2)
        : undefined,
      category3: createCategoryDto.category3
        ? this.formatCategoryName(createCategoryDto.category3)
        : undefined,
    };

    const { category1, category2, category3 } = formattedDto;
    const createdCategories: Category[] = [];

    // Create category1 if it doesn't exist
    let level1Category = await this.categoryRepository.findOne({
      where: {
        category1: category1.trim(),
        category2: IsNull(),
        category3: IsNull(),
      },
    });

    if (!level1Category) {
      level1Category = await this.categoryRepository.save(
        this.categoryRepository.create({
          category1: category1.trim(),
          category2: null,
          category3: null,
        }),
      );
      createdCategories.push(level1Category);
    }

    // Create category2 if provided and doesn't exist
    if (category2) {
      let level2Category = await this.categoryRepository.findOne({
        where: {
          category1: category1.trim(),
          category2: category2.trim(),
          category3: IsNull(),
        },
      });

      if (!level2Category) {
        level2Category = await this.categoryRepository.save(
          this.categoryRepository.create({
            category1: category1.trim(),
            category2: category2.trim(),
            category3: null,
          }),
        );
        createdCategories.push(level2Category);
      }

      // Create category3 if provided and doesn't exist
      if (category3) {
        let level3Category = await this.categoryRepository.findOne({
          where: {
            category1: category1.trim(),
            category2: category2.trim(),
            category3: category3.trim(),
          },
        });

        if (!level3Category) {
          level3Category = await this.categoryRepository.save(
            this.categoryRepository.create({
              category1: category1.trim(),
              category2: category2.trim(),
              category3: category3.trim(),
            }),
          );
          createdCategories.push(level3Category);
        }
      }
    }

    return createdCategories;
  }

  // Validate category hierarchy rules
  private async validateCategoryHierarchy(
    createCategoryDto: CreateCategoryDto,
  ): Promise<void> {
    const { category1, category2, category3 } = createCategoryDto;

    // Rule 1: category1 is always required (handled by DTO validation)
    if (!category1?.trim()) {
      throw new BadRequestException(
        'category1 is required and cannot be empty',
      );
    }

    // Rule 2: category3 cannot exist without category2
    if (category3 && !category2) {
      throw new BadRequestException('category3 cannot exist without category2');
    }

    // Rule 3: Validate parent categories exist when creating child categories
    if (category2) {
      const parentExists = await this.categoryRepository.findOne({
        where: {
          category1: category1.trim(),
          category2: IsNull(),
          category3: IsNull(),
        },
      });

      if (!parentExists) {
        throw new BadRequestException(
          `Parent category "${category1}" must exist before creating subcategory "${category2}"`,
        );
      }
    }

    if (category3) {
      const parentExists = await this.categoryRepository.findOne({
        where: {
          category1: category1.trim(),
          category2: category2!.trim(),
          category3: IsNull(),
        },
      });

      if (!parentExists) {
        throw new BadRequestException(
          `Parent category "${category1} > ${category2}" must exist before creating subcategory "${category3}"`,
        );
      }
    }
  }

  // Check for duplicate categories (case-insensitive)
  private async checkForDuplicate(
    createCategoryDto: CreateCategoryDto,
  ): Promise<void> {
    const { category1, category2, category3 } = createCategoryDto;

    // Case-insensitive duplicate check using LOWER() functions
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    queryBuilder.where('LOWER(category.category1) = LOWER(:category1)', {
      category1: category1.trim(),
    });

    if (category2) {
      queryBuilder.andWhere('LOWER(category.category2) = LOWER(:category2)', {
        category2: category2.trim(),
      });
    } else {
      queryBuilder.andWhere('category.category2 IS NULL');
    }

    if (category3) {
      queryBuilder.andWhere('LOWER(category.category3) = LOWER(:category3)', {
        category3: category3.trim(),
      });
    } else {
      queryBuilder.andWhere('category.category3 IS NULL');
    }

    const existingCategory = await queryBuilder.getOne();

    if (existingCategory) {
      const path = [category1, category2, category3]
        .filter(Boolean)
        .join(' > ');
      throw new ConflictException(
        `Category "${path}" already exists as "${existingCategory.category1}${existingCategory.category2 ? ' > ' + existingCategory.category2 : ''}${existingCategory.category3 ? ' > ' + existingCategory.category3 : ''}" (ID: ${existingCategory.id})`,
      );
    }
  }

  // Update a category
  async update(
    id: number,
    categoryDto: Partial<CategoryDTO>,
  ): Promise<Category> {
    const category = await this.findOne(id);

    Object.assign(category, categoryDto);

    return await this.categoryRepository.save(category);
  }

  // Delete a category
  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }

  // Get complete category hierarchy tree
  async getCategoryTree(): Promise<CategoryTreeDTO> {
    const allCategories = await this.categoryRepository.find({
      order: {
        category1: 'ASC',
        category2: 'ASC',
        category3: 'ASC',
      },
    });

    const categoryMap = new Map<string, CategoryHierarchyDTO>();

    // Build the hierarchy
    allCategories.forEach((category) => {
      if (!category.category1) return;

      // Get or create level 1
      if (!categoryMap.has(category.category1)) {
        categoryMap.set(category.category1, {
          id: category.id,
          name: category.category1,
          value: category.category1,
          subcategories: [],
        });
      }

      const level1 = categoryMap.get(category.category1)!;

      if (category.category2) {
        // Find or create level 2
        let level2 = level1.subcategories.find(
          (sub) => sub.value === category.category2,
        );

        if (!level2) {
          level2 = {
            id: category.id,
            name: category.category2,
            value: category.category2,
            subcategories: [],
          };
          level1.subcategories.push(level2);
        }

        if (category.category3) {
          // Add level 3 if it doesn't exist
          const exists = level2.subcategories.some(
            (sub) => sub.value === category.category3,
          );

          if (!exists) {
            level2.subcategories.push({
              id: category.id,
              name: category.category3,
              value: category.category3,
            });
          }
        }
      }
    });

    return {
      categories: Array.from(categoryMap.values()),
    };
  }

  // Get categories with full path information
  async getCategoriesWithPath(): Promise<CategoryPathDTO[]> {
    const categories = await this.categoryRepository.find({
      order: {
        category1: 'ASC',
        category2: 'ASC',
        category3: 'ASC',
      },
    });

    return categories.map((category) => {
      const path: string[] = [];
      let fullPath = '';

      if (category.category1) {
        path.push(category.category1);
        fullPath = category.category1;
      }

      if (category.category2) {
        path.push(category.category2);
        fullPath += ` > ${category.category2}`;
      }

      if (category.category3) {
        path.push(category.category3);
        fullPath += ` > ${category.category3}`;
      }

      return {
        id: category.id,
        category1: category.category1 || '',
        category2: category.category2 || undefined,
        category3: category.category3 || undefined,
        fullPath,
        path,
      };
    });
  }

  // Get category options for cascading dropdowns
  async getCategoryOptions(
    level: 1 | 2 | 3,
    parentValues?: { category1?: string; category2?: string },
  ): Promise<string[]> {
    switch (level) {
      case 1: {
        const result = await this.categoryRepository
          .createQueryBuilder('category')
          .select('DISTINCT category.category1', 'category1')
          .where('category.category1 IS NOT NULL')
          .orderBy('category.category1', 'ASC')
          .getRawMany<{ category1: string }>();

        return result.map((row) => row.category1);
      }

      case 2: {
        if (!parentValues?.category1) {
          throw new Error('category1 is required to get category2 options');
        }

        const result = await this.categoryRepository
          .createQueryBuilder('category')
          .select('DISTINCT category.category2', 'category2')
          .where('category.category1 = :category1', {
            category1: parentValues.category1,
          })
          .andWhere('category.category2 IS NOT NULL')
          .orderBy('category.category2', 'ASC')
          .getRawMany<{ category2: string }>();

        return result.map((row) => row.category2);
      }

      case 3: {
        if (!parentValues?.category1 || !parentValues?.category2) {
          throw new Error(
            'category1 and category2 are required to get category3 options',
          );
        }

        const result = await this.categoryRepository
          .createQueryBuilder('category')
          .select('DISTINCT category.category3', 'category3')
          .where('category.category1 = :category1', {
            category1: parentValues.category1,
          })
          .andWhere('category.category2 = :category2', {
            category2: parentValues.category2,
          })
          .andWhere('category.category3 IS NOT NULL')
          .orderBy('category.category3', 'ASC')
          .getRawMany<{ category3: string }>();

        return result.map((row) => row.category3);
      }

      default:
        throw new Error('Invalid category level');
    }
  }

  // Search categories by partial name
  async searchCategories(searchTerm: string): Promise<CategoryPathDTO[]> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    const categories = await queryBuilder
      .where('LOWER(category.category1) LIKE LOWER(:search)', {
        search: `%${searchTerm}%`,
      })
      .orWhere('LOWER(category.category2) LIKE LOWER(:search)', {
        search: `%${searchTerm}%`,
      })
      .orWhere('LOWER(category.category3) LIKE LOWER(:search)', {
        search: `%${searchTerm}%`,
      })
      .orderBy('category.category1', 'ASC')
      .addOrderBy('category.category2', 'ASC')
      .addOrderBy('category.category3', 'ASC')
      .getMany();

    return categories.map((category) => {
      const path: string[] = [];
      let fullPath = '';

      if (category.category1) {
        path.push(category.category1);
        fullPath = category.category1;
      }

      if (category.category2) {
        path.push(category.category2);
        fullPath += ` > ${category.category2}`;
      }

      if (category.category3) {
        path.push(category.category3);
        fullPath += ` > ${category.category3}`;
      }

      return {
        id: category.id,
        category1: category.category1 || '',
        category2: category.category2 || undefined,
        category3: category.category3 || undefined,
        fullPath,
        path,
      };
    });
  }
}
