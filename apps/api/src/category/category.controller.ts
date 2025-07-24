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

  @Get('distinct/category1')
  @ApiOperation({ summary: 'Get distinct category1 values' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved category1 list',
  })
  getDistinctCategory1() {
    return this.categoryService.getDistinctCategory1();
  }

  @Get('distinct/category2/:category1')
  @ApiOperation({
    summary: 'Get distinct category2 values for a given category1',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved category2 list',
  })
  getDistinctCategory2(@Param('category1') category1: string) {
    return this.categoryService.getDistinctCategory2(category1);
  }

  @Get('distinct/category3/:category1/:category2')
  @ApiOperation({
    summary:
      'Get distinct category3 values for a given category1 and category2',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved category3 list',
  })
  getDistinctCategory3(
    @Param('category1') category1: string,
    @Param('category2') category2: string,
  ) {
    return this.categoryService.getDistinctCategory3(category1, category2);
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
