import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CategoryDTO } from '@beezly/types/category';
import { CategoryTreeDTO, CategoryPathDTO } from './dto/category-hierarchy.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('tree')
  @ApiOperation({ summary: 'Get complete category hierarchy tree' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved category tree',
    type: CategoryTreeDTO,
  })
  getCategoryTree() {
    return this.categoryService.getCategoryTree();
  }

  @Get('with-path')
  @ApiOperation({ summary: 'Get all categories with full path information' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved categories with paths',
    type: [CategoryPathDTO],
  })
  getCategoriesWithPath() {
    return this.categoryService.getCategoriesWithPath();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories by partial name' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search term to find in category names',
    example: 'fruit',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved matching categories',
    type: [CategoryPathDTO],
  })
  searchCategories(@Query('q') searchTerm: string) {
    return this.categoryService.searchCategories(searchTerm);
  }

  @Get('options/:level')
  @ApiOperation({ summary: 'Get category options for cascading dropdowns' })
  @ApiQuery({
    name: 'category1',
    required: false,
    description: 'Parent category1 value (required for level 2 and 3)',
    example: 'Produce',
  })
  @ApiQuery({
    name: 'category2',
    required: false,
    description: 'Parent category2 value (required for level 3)',
    example: 'Fruits',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved category options',
    type: [String],
  })
  getCategoryOptions(
    @Param('level') level: string,
    @Query('category1') category1?: string,
    @Query('category2') category2?: string,
  ) {
    const levelNum = parseInt(level, 10) as 1 | 2 | 3;

    if (![1, 2, 3].includes(levelNum)) {
      throw new Error('Invalid category level. Must be 1, 2, or 3');
    }

    return this.categoryService.getCategoryOptions(levelNum, {
      category1,
      category2,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved categories',
  })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({
    summary: 'Create new category',
    description:
      'Create a new category with proper hierarchy validation. Parent categories must exist before creating child categories.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category successfully created',
    type: CategoryDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid category data or hierarchy violation',
  })
  @ApiResponse({
    status: 409,
    description: 'Category already exists',
  })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Post('hierarchy')
  @ApiOperation({
    summary: 'Create complete category hierarchy',
    description:
      'Create a complete category hierarchy, automatically creating missing parent categories. Returns all categories that were created.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category hierarchy successfully created',
    type: [CategoryDTO],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid category data',
  })
  createHierarchy(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createHierarchy(createCategoryDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category successfully updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(@Param('id') id: string, @Body() category: Partial<CategoryDTO>) {
    return this.categoryService.update(Number(id), category);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(Number(id));
  }
}
