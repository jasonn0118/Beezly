import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CategoryDTO } from '../../../packages/types/dto/category';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(Number(id));
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
  @ApiOperation({ summary: 'Create new category' })
  @ApiResponse({ status: 201, description: 'Category successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid category data' })
  create(@Body() category: Partial<CategoryDTO>) {
    return this.categoryService.create(category);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category successfully updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(@Param('id') id: string, @Body() category: Partial<CategoryDTO>) {
    return this.categoryService.update(Number(id), category);
  }
}
