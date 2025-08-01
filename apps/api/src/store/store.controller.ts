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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { StoreDTO } from '../../../packages/types/dto/store';
import {
  UnifiedStoreSearchDto,
  UnifiedStoreSearchResponse,
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

  // 🔍 UNIFIED SEARCH ENDPOINT (Primary Search Method) - MUST BE BEFORE :id route

  @Get('search')
  @ApiOperation({
    summary:
      'Unified store search - handles all search scenarios intelligently',
    description: `
    **The primary search endpoint that handles all search scenarios:**
    
    🎯 **Search Types:**
    - **Query only**: Search by store name, brand, or address (e.g., "costco")
    - **Location only**: Find nearby stores using GPS coordinates
    - **Query + Location**: Contextual search combining both (e.g., "walmart near me")
    
    🌍 **Google Places Integration:**
    - Shows local database results AND Google Places API results side-by-side
    - Google results are filtered to only include new stores (not in local DB)
    - Configurable number of Google results (0-20)
    
    📊 **Smart Sorting:**
    - **relevance**: Best match based on search algorithm (default)
    - **distance**: Nearest first (when location provided)
    - **name**: Alphabetical order
    
    💡 **Example Usage:**
    - \`?query=costco\` - Find all Costco stores globally
    - \`?latitude=49.1398&longitude=-122.6705\` - Find nearby stores
    - \`?query=walmart&latitude=49.1398&longitude=-122.6705&radiusKm=10\` - Find Walmart within 10km
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Unified search results with local and Google Places data',
    schema: {
      type: 'object',
      properties: {
        localStores: {
          type: 'array',
          description: 'Stores from local database',
          items: {
            allOf: [
              { $ref: '#/components/schemas/StoreDTO' },
              {
                type: 'object',
                properties: {
                  distance: {
                    type: 'number',
                    description:
                      'Distance in kilometers (when location provided)',
                  },
                },
              },
            ],
          },
        },
        googleStores: {
          type: 'array',
          description:
            'New stores from Google Places API (not in local database)',
          items: {
            type: 'object',
            properties: {
              place_id: {
                type: 'string',
                description: 'Google Places unique identifier',
              },
              name: { type: 'string', description: 'Store name' },
              formatted_address: {
                type: 'string',
                description: 'Complete formatted address',
              },
              streetNumber: {
                type: 'string',
                description: 'Street number (e.g., "1766")',
              },
              road: {
                type: 'string',
                description: 'Road name (e.g., "Robson St")',
              },
              streetAddress: {
                type: 'string',
                description:
                  'Combined street number + road (e.g., "1766 Robson St")',
              },
              fullAddress: {
                type: 'string',
                description:
                  'Complete formatted address (same as formatted_address)',
              },
              city: {
                type: 'string',
                description: 'City name (e.g., "Vancouver")',
              },
              province: {
                type: 'string',
                description: 'Province/state code (e.g., "BC")',
              },
              postalCode: {
                type: 'string',
                description: 'Postal/ZIP code (e.g., "V6G 1E2")',
              },
              countryRegion: {
                type: 'string',
                description: 'Country name (e.g., "Canada")',
              },
              latitude: {
                type: 'number',
                description: 'Latitude coordinate',
              },
              longitude: {
                type: 'number',
                description: 'Longitude coordinate',
              },
              types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Google Places types (e.g., supermarket, store)',
              },
              distance: {
                type: 'number',
                description: 'Distance in kilometers (when location provided)',
              },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalResults: { type: 'number' },
            localCount: { type: 'number' },
            googleCount: { type: 'number' },
            searchType: {
              type: 'string',
              enum: ['query_only', 'location_only', 'query_and_location'],
            },
            hasMoreGoogle: { type: 'boolean' },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            queryTime: {
              type: 'number',
              description: 'Response time in milliseconds',
            },
            cacheHit: { type: 'boolean' },
            searchStrategy: { type: 'string' },
            googleApiCalled: { type: 'boolean' },
          },
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async unifiedStoreSearch(
    @Query() params: UnifiedStoreSearchDto,
  ): Promise<UnifiedStoreSearchResponse> {
    return this.storeService.unifiedStoreSearch(params);
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

  // 🌍 GOOGLE PLACES INTEGRATION ENDPOINTS

  @Post('create-from-google-place/:placeId')
  @ApiOperation({
    summary: 'Create a new store from Google Places data',
  })
  @ApiResponse({
    status: 201,
    description: 'Store successfully created from Google Places',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid place ID or store already exists',
  })
  @ApiResponse({
    status: 404,
    description: 'Google Place not found',
  })
  async createStoreFromGooglePlace(
    @Param('placeId') placeId: string,
  ): Promise<StoreDTO> {
    // First, get place details from Google
    const googlePlace =
      await this.storeService['googlePlacesService'].getPlaceDetails(placeId);

    if (!googlePlace) {
      throw new NotFoundException(`Google Place with ID ${placeId} not found`);
    }

    // Check if store already exists
    const existingStore = await this.storeService.checkStoreExists({
      name: googlePlace.name,
      latitude: googlePlace.latitude,
      longitude: googlePlace.longitude,
      placeId: googlePlace.place_id,
    });

    if (existingStore) {
      throw new BadRequestException(
        `Store ${googlePlace.name} already exists in database`,
      );
    }

    // Create the store
    const createdStore =
      await this.storeService.createStoreFromGooglePlace(googlePlace);

    return this.storeService.mapStoreToDTO(createdStore);
  }

  @Post('bulk-create-from-google')
  @ApiOperation({
    summary: 'Bulk create stores from Google Places search results',
  })
  @ApiResponse({
    status: 201,
    description: 'Stores successfully created from Google Places',
    schema: {
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: { $ref: '#/components/schemas/StoreDTO' },
        },
        skipped: {
          type: 'array',
          items: { type: 'string' },
        },
        summary: {
          type: 'object',
          properties: {
            totalRequested: { type: 'number' },
            created: { type: 'number' },
            skipped: { type: 'number' },
          },
        },
      },
    },
  })
  async bulkCreateFromGooglePlaces(
    @Body() body: { placeIds: string[] },
  ): Promise<{
    created: StoreDTO[];
    skipped: string[];
    summary: {
      totalRequested: number;
      created: number;
      skipped: number;
    };
  }> {
    const { placeIds } = body;
    const created: StoreDTO[] = [];
    const skipped: string[] = [];

    for (const placeId of placeIds) {
      try {
        // Get place details from Google
        const googlePlace =
          await this.storeService['googlePlacesService'].getPlaceDetails(
            placeId,
          );

        if (!googlePlace) {
          skipped.push(`${placeId}: Not found in Google Places`);
          continue;
        }

        // Check if store already exists
        const existingStore = await this.storeService.checkStoreExists({
          name: googlePlace.name,
          latitude: googlePlace.latitude,
          longitude: googlePlace.longitude,
          placeId: googlePlace.place_id,
        });

        if (existingStore) {
          skipped.push(`${placeId}: ${googlePlace.name} already exists`);
          continue;
        }

        // Create the store
        const createdStore =
          await this.storeService.createStoreFromGooglePlace(googlePlace);
        created.push(this.storeService.mapStoreToDTO(createdStore));
      } catch (error) {
        skipped.push(
          `${placeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      created,
      skipped,
      summary: {
        totalRequested: placeIds.length,
        created: created.length,
        skipped: skipped.length,
      },
    };
  }
}
