import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { StoreDTO } from '../../../packages/types/dto/store';

@ApiTags('Stores')
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stores' })
  @ApiResponse({
    status: 200,
    description: 'List of all stores',
    type: [StoreDTO],
  })
  async getAllStores(): Promise<StoreDTO[]> {
    return this.storeService.getAllStores();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a store by ID' })
  @ApiResponse({
    status: 200,
    description: 'Store found by ID',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Store not found',
  })
  async getStoreById(@Param('id') id: string): Promise<StoreDTO | null> {
    return this.storeService.getStoreById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new store' })
  @ApiResponse({
    status: 201,
    description: 'Store successfully created',
    type: StoreDTO,
  })
  async createStore(@Body() storeData: StoreDTO): Promise<StoreDTO> {
    return this.storeService.createStore(storeData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a store by ID' })
  @ApiResponse({
    status: 200,
    description: 'Store successfully updated',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Store not found',
  })
  async updateStore(
    @Param('id') id: string,
    @Body() storeData: Partial<StoreDTO>,
  ): Promise<StoreDTO> {
    return this.storeService.updateStore(id, storeData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a store by ID' })
  @ApiResponse({
    status: 200,
    description: 'Store successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Store not found',
  })
  async deleteStore(@Param('id') id: string): Promise<{ message: string }> {
    await this.storeService.deleteStore(id);
    return { message: 'Store deleted successfully' };
  }
}
