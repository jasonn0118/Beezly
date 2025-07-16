import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StoreService, LocationSearch, StoreDistance } from './store.service';
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

  // 🌍 GEOSPATIAL ENDPOINTS

  @Get('search/nearby')
  @ApiOperation({ summary: 'Find stores near a location' })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    example: 43.6532,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    example: -79.3832,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in km',
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    example: 50,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of nearby stores with distances',
  })
  async findStoresNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ): Promise<StoreDistance[]> {
    const location: LocationSearch = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusKm: radius ? parseFloat(radius) : 10,
      limit: limit ? parseInt(limit) : 50,
    };

    return this.storeService.findStoresNearLocation(location);
  }

  @Get('search/city/:city')
  @ApiOperation({ summary: 'Find stores in a city' })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    example: 50,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of stores in the specified city',
    type: [StoreDTO],
  })
  async findStoresByCity(
    @Param('city') city: string,
    @Query('limit') limit?: string,
  ): Promise<StoreDTO[]> {
    return this.storeService.findStoresByCity(
      city,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('search/province/:province')
  @ApiOperation({ summary: 'Find stores in a province' })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    example: 50,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of stores in the specified province',
    type: [StoreDTO],
  })
  async findStoresByProvince(
    @Param('province') province: string,
    @Query('limit') limit?: string,
  ): Promise<StoreDTO[]> {
    return this.storeService.findStoresByProvince(
      province,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('search/name')
  @ApiOperation({ summary: 'Search stores by name' })
  @ApiQuery({
    name: 'name',
    description: 'Store name to search for',
    example: 'Walmart',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    example: 50,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of stores matching the name search',
    type: [StoreDTO],
  })
  async searchStoresByName(
    @Query('name') name: string,
    @Query('limit') limit?: string,
  ): Promise<StoreDTO[]> {
    return this.storeService.searchStoresByName(
      name,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular stores (most receipts)' })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    example: 20,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of popular stores',
    type: [StoreDTO],
  })
  async getPopularStores(@Query('limit') limit?: string): Promise<StoreDTO[]> {
    return this.storeService.getPopularStores(limit ? parseInt(limit) : 20);
  }

  @Get('search/advanced')
  @ApiOperation({ summary: 'Advanced store search with multiple criteria' })
  @ApiQuery({
    name: 'name',
    description: 'Store name to search for',
    required: false,
  })
  @ApiQuery({ name: 'city', description: 'City to search in', required: false })
  @ApiQuery({
    name: 'province',
    description: 'Province to search in',
    required: false,
  })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    required: false,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    required: false,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in km',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of stores matching the search criteria',
  })
  async advancedStoreSearch(
    @Query('name') name?: string,
    @Query('city') city?: string,
    @Query('province') province?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ): Promise<StoreDistance[]> {
    const params = {
      name,
      city,
      province,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radiusKm: radius ? parseFloat(radius) : 10,
      limit: limit ? parseInt(limit) : 50,
    };

    return this.storeService.advancedStoreSearch(params);
  }
}
