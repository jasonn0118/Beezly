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
  CreateStoreFromGoogleDataDto,
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

  @Post('create-from-google-data')
  @ApiOperation({
    summary: 'Create a new store from Google Places data sent by frontend',
    description: `
    **Create a store from Google Places data when user clicks on a search result**
    
    🔍 **Use Case:**
    - User searches for stores using the unified search endpoint
    - User sees Google Places results alongside local database results
    - User clicks on a Google Places result → Frontend captures the full data
    - Frontend sends the complete Google Places result data to this endpoint
    
    🛡️ **Duplicate Prevention:**
    - Primary check: Google Places placeId (most reliable)
    - Secondary check: Store name + location proximity (within 100m radius)
    - Returns existing store info if duplicate found instead of creating new one
    
    📊 **Response:**
    - **201 Created**: New store successfully added to database
    - **200 OK**: Store already exists, returns existing store data
    - **400 Bad Request**: Invalid or missing data
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'New store successfully created from Google Places data',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 200,
    description: 'Store already exists in database, returns existing store',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing Google Places data',
  })
  async createStoreFromGoogleData(
    @Body() googlePlaceData: CreateStoreFromGoogleDataDto,
  ): Promise<StoreDTO> {
    // Validate required fields
    if (
      !googlePlaceData.place_id ||
      !googlePlaceData.name ||
      googlePlaceData.latitude === undefined ||
      googlePlaceData.longitude === undefined
    ) {
      throw new BadRequestException(
        'Missing required Google Places data: place_id, name, latitude, longitude are required',
      );
    }

    // Check if store already exists by placeId (fastest check)
    const existingStoreByPlaceId = await this.storeService.checkStoreExists({
      name: '', // Not needed for placeId check - service will skip name check if empty
      placeId: googlePlaceData.place_id,
    });

    if (existingStoreByPlaceId) {
      // Store already exists, return existing store data
      return this.storeService.mapStoreToDTO(existingStoreByPlaceId);
    }

    // Double-check for duplicates using name and location (secondary check)
    const existingStoreByLocation = await this.storeService.checkStoreExists({
      name: googlePlaceData.name,
      latitude: googlePlaceData.latitude,
      longitude: googlePlaceData.longitude,
      placeId: googlePlaceData.place_id,
    });

    if (existingStoreByLocation) {
      // Store exists but doesn't have placeId - update it with placeId for future reference
      if (!existingStoreByLocation.placeId) {
        await this.storeService.updateStore(
          existingStoreByLocation.id.toString(),
          {
            placeId: googlePlaceData.place_id,
          },
        );
        existingStoreByLocation.placeId = googlePlaceData.place_id;
      }

      return this.storeService.mapStoreToDTO(existingStoreByLocation);
    }

    // Create new store from frontend-provided Google Places data
    const createdStore =
      await this.storeService.createStoreFromGoogleData(googlePlaceData);

    return this.storeService.mapStoreToDTO(createdStore);
  }

  @Post('create-from-google-place/:placeId')
  @ApiOperation({
    summary: 'Create a new store from Google Places search result',
    description: `
    **Create a store from Google Places data when user clicks on a search result**
    
    🔍 **Use Case:**
    - User searches for stores using the unified search endpoint
    - User sees Google Places results alongside local database results
    - User clicks on a Google Places result to add it to the local database
    
    🛡️ **Duplicate Prevention:**
    - Primary check: Google Places placeId (most reliable)
    - Secondary check: Store name + location proximity (within 100m radius)
    - Returns existing store info if duplicate found instead of creating new one
    
    📊 **Response:**
    - **201 Created**: New store successfully added to database
    - **200 OK**: Store already exists, returns existing store data
    - **404 Not Found**: Google Place ID not found or invalid
    - **400 Bad Request**: Invalid request data
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'New store successfully created from Google Places',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 200,
    description: 'Store already exists in database, returns existing store',
    type: StoreDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid place ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Google Place not found',
  })
  async createStoreFromGooglePlace(
    @Param('placeId') placeId: string,
  ): Promise<StoreDTO> {
    // Validate placeId format (basic validation)
    if (!placeId || placeId.trim().length === 0) {
      throw new BadRequestException('Place ID is required');
    }

    // First, check if store already exists by placeId (fastest check)
    const existingStoreByPlaceId = await this.storeService.checkStoreExists({
      name: '', // Not needed for placeId check
      placeId: placeId,
    });

    if (existingStoreByPlaceId) {
      // Store already exists, return existing store data instead of error
      return this.storeService.mapStoreToDTO(existingStoreByPlaceId);
    }

    // Get place details from Google Places API
    const googlePlace =
      await this.storeService['googlePlacesService'].getPlaceDetails(placeId);

    if (!googlePlace) {
      throw new NotFoundException(
        `Google Place with ID '${placeId}' not found. Please verify the place ID is correct.`,
      );
    }

    // Double-check for duplicates using name and location (secondary check)
    const existingStoreByLocation = await this.storeService.checkStoreExists({
      name: googlePlace.name,
      latitude: googlePlace.latitude,
      longitude: googlePlace.longitude,
      placeId: googlePlace.place_id,
    });

    if (existingStoreByLocation) {
      // Store exists but doesn't have placeId - update it with placeId for future reference
      if (!existingStoreByLocation.placeId) {
        await this.storeService.updateStore(
          existingStoreByLocation.id.toString(),
          {
            placeId: googlePlace.place_id,
          },
        );
        existingStoreByLocation.placeId = googlePlace.place_id;
      }

      return this.storeService.mapStoreToDTO(existingStoreByLocation);
    }

    // Create new store from Google Places data
    const createdStore =
      await this.storeService.createStoreFromGooglePlace(googlePlace);

    return this.storeService.mapStoreToDTO(createdStore);
  }

  @Post('bulk-create-from-google')
  @ApiOperation({
    summary: 'Bulk create stores from Google Places search results',
    description: `
    **Create multiple stores from Google Places data in a single request**
    
    🔍 **Use Case:**
    - User selects multiple Google Places results from search
    - Bulk operation to add multiple stores to local database efficiently
    
    🛡️ **Duplicate Prevention:**
    - Same logic as single creation: placeId + location checking
    - Existing stores are returned in 'existing' array instead of being skipped
    - Updates existing stores with placeId if missing
    
    📊 **Response Categories:**
    - **created**: Newly created stores
    - **existing**: Stores that already existed (with updated placeId if needed)
    - **failed**: Stores that couldn't be processed (with error details)
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk operation completed with detailed results',
    schema: {
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: { $ref: '#/components/schemas/StoreDTO' },
          description: 'Newly created stores',
        },
        existing: {
          type: 'array',
          items: { $ref: '#/components/schemas/StoreDTO' },
          description: 'Stores that already existed',
        },
        failed: {
          type: 'array',
          items: { type: 'string' },
          description: 'Failed operations with error details',
        },
        summary: {
          type: 'object',
          properties: {
            totalRequested: { type: 'number' },
            created: { type: 'number' },
            existing: { type: 'number' },
            failed: { type: 'number' },
          },
        },
      },
    },
  })
  async bulkCreateFromGooglePlaces(
    @Body() body: { placeIds: string[] },
  ): Promise<{
    created: StoreDTO[];
    existing: StoreDTO[];
    failed: string[];
    summary: {
      totalRequested: number;
      created: number;
      existing: number;
      failed: number;
    };
  }> {
    const { placeIds } = body;
    const created: StoreDTO[] = [];
    const existing: StoreDTO[] = [];
    const failed: string[] = [];

    for (const placeId of placeIds) {
      try {
        // Validate placeId
        if (!placeId || placeId.trim().length === 0) {
          failed.push(`Empty place ID provided`);
          continue;
        }

        // Check if store already exists by placeId (fastest check)
        const existingStoreByPlaceId = await this.storeService.checkStoreExists(
          {
            name: '', // Not needed for placeId check
            placeId: placeId,
          },
        );

        if (existingStoreByPlaceId) {
          existing.push(
            this.storeService.mapStoreToDTO(existingStoreByPlaceId),
          );
          continue;
        }

        // Get place details from Google
        const googlePlace =
          await this.storeService['googlePlacesService'].getPlaceDetails(
            placeId,
          );

        if (!googlePlace) {
          failed.push(`${placeId}: Not found in Google Places`);
          continue;
        }

        // Double-check for duplicates using name and location
        const existingStoreByLocation =
          await this.storeService.checkStoreExists({
            name: googlePlace.name,
            latitude: googlePlace.latitude,
            longitude: googlePlace.longitude,
            placeId: googlePlace.place_id,
          });

        if (existingStoreByLocation) {
          // Store exists but doesn't have placeId - update it
          if (!existingStoreByLocation.placeId) {
            await this.storeService.updateStore(
              existingStoreByLocation.id.toString(),
              {
                placeId: googlePlace.place_id,
              },
            );
            existingStoreByLocation.placeId = googlePlace.place_id;
          }

          existing.push(
            this.storeService.mapStoreToDTO(existingStoreByLocation),
          );
          continue;
        }

        // Create new store
        const createdStore =
          await this.storeService.createStoreFromGooglePlace(googlePlace);
        created.push(this.storeService.mapStoreToDTO(createdStore));
      } catch (error) {
        failed.push(
          `${placeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      created,
      existing,
      failed,
      summary: {
        totalRequested: placeIds.length,
        created: created.length,
        existing: existing.length,
        failed: failed.length,
      },
    };
  }

  // 🔧 MAINTENANCE ENDPOINTS

  @Post('merge-duplicates')
  @ApiOperation({
    summary: 'Find and merge duplicate stores',
    description: `
    **Maintenance operation to clean up duplicate store entries**
    
    ⚠️ **Warning**: This operation modifies the database by:
    - Finding stores with identical names
    - Merging them into a single store with the most complete information
    - Updating all related receipts and prices to reference the merged store
    - Deleting the duplicate entries
    
    This operation is useful for cleaning up OCR-created duplicates.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Duplicate merge operation completed',
    schema: {
      type: 'object',
      properties: {
        duplicatesFound: {
          type: 'number',
          description: 'Number of duplicate stores found',
        },
        merged: {
          type: 'number',
          description: 'Number of stores successfully merged',
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Any errors that occurred during merging',
        },
      },
    },
  })
  async mergeDuplicateStores(): Promise<{
    duplicatesFound: number;
    merged: number;
    errors: string[];
  }> {
    return this.storeService.findAndMergeDuplicateStores();
  }
}
