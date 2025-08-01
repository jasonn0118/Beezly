import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoreService, StoreDistance } from './store.service';
import { StoreDTO } from '../../../packages/types/dto/store';
import {
  LocationSearchDto,
  NameSearchDto,
  AdvancedSearchDto,
  PopularStoresDto,
  PaginatedResponse,
} from './dto/store-search.dto';

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
  @ApiOperation({ summary: 'Find stores near a location with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of nearby stores with distances',
    type: PaginatedResponse<StoreDistance>,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findStoresNearby(
    @Query() params: LocationSearchDto,
  ): Promise<PaginatedResponse<StoreDistance>> {
    return this.storeService.findStoresNearLocationPaginated(params);
  }

  @Get('search/city/:city')
  @ApiOperation({ summary: 'Find stores in a city with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of stores in the specified city',
    type: PaginatedResponse<StoreDTO>,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findStoresByCity(
    @Param('city') city: string,
    @Query() queryParams: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<StoreDTO>> {
    const params = { city, ...queryParams };
    return this.storeService.findStoresByCityPaginated(params);
  }

  @Get('search/province/:province')
  @ApiOperation({ summary: 'Find stores in a province with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of stores in the specified province',
    type: PaginatedResponse<StoreDTO>,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findStoresByProvince(
    @Param('province') province: string,
    @Query() queryParams: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<StoreDTO>> {
    const params = { province, ...queryParams };
    return this.storeService.findStoresByProvincePaginated(params);
  }

  @Get('search/name')
  @ApiOperation({ summary: 'Search stores by name with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of stores matching the name search',
    type: PaginatedResponse<StoreDTO>,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async searchStoresByName(
    @Query() params: NameSearchDto,
  ): Promise<PaginatedResponse<StoreDTO>> {
    return this.storeService.searchStoresByNamePaginated(params);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular stores with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of popular stores',
    type: PaginatedResponse<StoreDTO>,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getPopularStores(
    @Query() params: PopularStoresDto,
  ): Promise<PaginatedResponse<StoreDTO>> {
    return this.storeService.getPopularStoresPaginated(params);
  }

  @Get('search/advanced')
  @ApiOperation({
    summary: 'Advanced store search with multiple criteria and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of stores matching the search criteria',
    type: PaginatedResponse<StoreDistance>,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async advancedStoreSearch(
    @Query() params: AdvancedSearchDto,
  ): Promise<PaginatedResponse<StoreDistance>> {
    return this.storeService.advancedStoreSearchPaginated(params);
  }
}
