import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreDTO } from '../../../packages/types/dto/store';
import { Store } from '../entities/store.entity';
import { StoreCacheService } from './cache/store-cache.service';
import {
  GooglePlacesService,
  GooglePlaceResult,
} from './google-places.service';
import {
  LocationSearchDto,
  NameSearchDto,
  CitySearchDto,
  ProvinceSearchDto,
  AdvancedSearchDto,
  PopularStoresDto,
  PaginatedResponse,
  UnifiedStoreSearchDto,
  UnifiedStoreSearchResponse,
} from './dto/store-search.dto';

export interface LocationSearch {
  latitude: number;
  longitude: number;
  radiusKm?: number; // Default to 10km if not specified
  limit?: number; // Default to 50 if not specified
}

export interface StoreDistance extends StoreDTO {
  distance: number; // Distance in kilometers
}

// Interface for raw query results from TypeORM
interface RawStoreQueryResult {
  store_sk: string;
  name: string;
  street_number?: string;
  road?: string;
  street_address?: string;
  full_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_region?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  created_at: string;
  updated_at: string;
  distance?: string; // Distance comes as string from SQL
}

// Interface for store data with placeId
interface StoreDataWithPlaceId extends Partial<StoreDTO> {
  placeId?: string;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly cacheService: StoreCacheService,
    private readonly googlePlacesService: GooglePlacesService,
  ) {}

  async getAllStores(): Promise<StoreDTO[]> {
    const stores = await this.storeRepository.find({
      relations: ['receipts'],
    });

    return stores.map((store) => this.mapStoreToDTO(store));
  }

  async getStoreById(id: string): Promise<StoreDTO | null> {
    // Try to find by storeSk (UUID) first, then by id (integer)
    let store = await this.storeRepository.findOne({
      where: { storeSk: id },
      relations: ['receipts'],
    });

    // If not found by storeSk, try by integer id
    if (!store && !isNaN(Number(id))) {
      store = await this.storeRepository.findOne({
        where: { id: Number(id) },
        relations: ['receipts'],
      });
    }

    return store ? this.mapStoreToDTO(store) : null;
  }

  async getStoreByPlaceId(placeId: string): Promise<StoreDTO | null> {
    const store = await this.storeRepository.findOne({
      where: { placeId },
      relations: ['receipts'],
    });

    return store ? this.mapStoreToDTO(store) : null;
  }

  async createStore(storeData: Partial<StoreDTO>): Promise<StoreDTO> {
    const store = this.storeRepository.create({
      name: storeData.name,
      streetNumber: storeData.streetNumber,
      road: storeData.road,
      streetAddress: storeData.streetAddress,
      fullAddress: storeData.fullAddress,
      city: storeData.city,
      province: storeData.province,
      postalCode: storeData.postalCode,
      countryRegion: storeData.countryRegion,
      latitude: storeData.latitude,
      longitude: storeData.longitude,
      placeId: (storeData as StoreDataWithPlaceId).placeId,
    });

    const savedStore = await this.storeRepository.save(store);
    return this.mapStoreToDTO(savedStore);
  }

  async updateStore(
    id: string,
    storeData: Partial<StoreDTO>,
  ): Promise<StoreDTO> {
    const store = await this.getStoreEntityById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    // Update fields
    if (storeData.name !== undefined) store.name = storeData.name;
    if (storeData.streetNumber !== undefined)
      store.streetNumber = storeData.streetNumber;
    if (storeData.road !== undefined) store.road = storeData.road;
    if (storeData.streetAddress !== undefined)
      store.streetAddress = storeData.streetAddress;
    if (storeData.fullAddress !== undefined)
      store.fullAddress = storeData.fullAddress;
    if (storeData.city !== undefined) store.city = storeData.city;
    if (storeData.province !== undefined) store.province = storeData.province;
    if (storeData.postalCode !== undefined)
      store.postalCode = storeData.postalCode;
    if (storeData.countryRegion !== undefined)
      store.countryRegion = storeData.countryRegion;
    if (storeData.latitude !== undefined) store.latitude = storeData.latitude;
    if (storeData.longitude !== undefined)
      store.longitude = storeData.longitude;
    if ((storeData as StoreDataWithPlaceId).placeId !== undefined)
      store.placeId = (storeData as StoreDataWithPlaceId).placeId;

    const updatedStore = await this.storeRepository.save(store);
    return this.mapStoreToDTO(updatedStore);
  }

  async deleteStore(id: string): Promise<void> {
    const store = await this.getStoreEntityById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    await this.storeRepository.remove(store);
  }

  // 🌍 GEOSPATIAL QUERY METHODS

  /**
   * Find stores within a specified radius of a location
   * Uses the Haversine formula for distance calculation
   */
  async findStoresNearLocation(
    location: LocationSearch,
  ): Promise<StoreDistance[]> {
    const { latitude, longitude, radiusKm = 10, limit = 50 } = location;

    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .select([
        'store.*',
        `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(store.latitude)) * 
            cos(radians(store.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(store.latitude))
          )
        ) AS distance`,
      ])
      .where('store.latitude IS NOT NULL')
      .andWhere('store.longitude IS NOT NULL')
      .andWhere(
        `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(store.latitude)) * 
            cos(radians(store.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(store.latitude))
          )
        ) <= :radiusKm`,
      )
      .orderBy('distance', 'ASC')
      .limit(limit)
      .setParameters({ latitude, longitude, radiusKm })
      .getRawMany();

    return stores.map((store: RawStoreQueryResult) => ({
      ...this.mapRawStoreToDTO(store),
      distance: parseFloat(parseFloat(store.distance || '0').toFixed(2)),
    }));
  }

  /**
   * Find stores within a city
   */
  async findStoresByCity(
    city: string,
    limit: number = 50,
  ): Promise<StoreDTO[]> {
    const stores = await this.storeRepository.find({
      where: { city },
      take: limit,
      order: { name: 'ASC' },
    });

    return stores.map((store) => this.mapStoreToDTO(store));
  }

  /**
   * Find stores within a province/state
   */
  async findStoresByProvince(
    province: string,
    limit: number = 50,
  ): Promise<StoreDTO[]> {
    const stores = await this.storeRepository.find({
      where: { province },
      take: limit,
      order: { city: 'ASC', name: 'ASC' },
    });

    return stores.map((store) => this.mapStoreToDTO(store));
  }

  /**
   * Search stores by name (fuzzy search)
   */
  async searchStoresByName(
    name: string,
    limit: number = 50,
  ): Promise<StoreDTO[]> {
    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .where('store.name ILIKE :name', { name: `%${name}%` })
      .orderBy('store.name', 'ASC')
      .limit(limit)
      .getMany();

    return stores.map((store) => this.mapStoreToDTO(store));
  }

  /**
   * Get stores with the most receipts (popular stores)
   */
  async getPopularStores(limit: number = 20): Promise<StoreDTO[]> {
    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .leftJoin('store.receipts', 'receipt')
      .loadRelationCountAndMap('store.receiptCount', 'store.receipts')
      .orderBy('store.receiptCount', 'DESC')
      .limit(limit)
      .getMany();

    return stores.map((store) => this.mapStoreToDTO(store));
  }

  /**
   * Advanced search combining location and text search
   */
  async advancedStoreSearch(params: {
    name?: string;
    city?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<StoreDistance[]> {
    const {
      name,
      city,
      province,
      latitude,
      longitude,
      radiusKm = 10,
      limit = 50,
    } = params;

    let query = this.storeRepository.createQueryBuilder('store');

    // Add distance calculation if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      query = query
        .select([
          'store.*',
          `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(store.latitude)) * 
            cos(radians(store.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(store.latitude))
          )
        ) AS distance`,
        ])
        .setParameters({ latitude, longitude });
    } else {
      query = query.select('store.*');
    }

    // Add text filters
    if (name) {
      query = query.andWhere('store.name ILIKE :name', { name: `%${name}%` });
    }
    if (city) {
      query = query.andWhere('store.city ILIKE :city', { city: `%${city}%` });
    }
    if (province) {
      query = query.andWhere('store.province ILIKE :province', {
        province: `%${province}%`,
      });
    }

    // Add distance filter if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      query = query
        .andWhere('store.latitude IS NOT NULL')
        .andWhere('store.longitude IS NOT NULL')
        .andWhere(
          `(
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians(store.latitude)) * 
              cos(radians(store.longitude) - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians(store.latitude))
            )
          ) <= :radiusKm`,
        )
        .setParameter('radiusKm', radiusKm)
        .orderBy('distance', 'ASC');
    } else {
      query = query.orderBy('store.name', 'ASC');
    }

    const stores = await query.limit(limit).getRawMany();

    return stores.map((store: RawStoreQueryResult) => ({
      ...this.mapRawStoreToDTO(store),
      distance: store.distance
        ? parseFloat(parseFloat(store.distance).toFixed(2))
        : 0,
    }));
  }

  // PRIVATE HELPER METHODS

  private async getStoreEntityById(id: string): Promise<Store | null> {
    // Try to find by storeSk (UUID) first, then by id (integer)
    let store = await this.storeRepository.findOne({
      where: { storeSk: id },
    });

    // If not found by storeSk, try by integer id
    if (!store && !isNaN(Number(id))) {
      store = await this.storeRepository.findOne({
        where: { id: Number(id) },
      });
    }

    return store;
  }

  public mapStoreToDTO(store: Store): StoreDTO {
    return {
      id: store.storeSk, // Use UUID as the public ID
      name: store.name,
      streetNumber: store.streetNumber,
      road: store.road,
      streetAddress: store.streetAddress,
      fullAddress: store.fullAddress,
      city: store.city,
      province: store.province,
      postalCode: store.postalCode,
      countryRegion: store.countryRegion,
      latitude: store.latitude,
      longitude: store.longitude,
      placeId: store.placeId,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  private mapRawStoreToDTO(rawStore: RawStoreQueryResult): StoreDTO {
    return {
      id: rawStore.store_sk,
      name: rawStore.name,
      streetNumber: rawStore.street_number,
      road: rawStore.road,
      streetAddress: rawStore.street_address,
      fullAddress: rawStore.full_address,
      city: rawStore.city,
      province: rawStore.province,
      postalCode: rawStore.postal_code,
      countryRegion: rawStore.country_region,
      latitude: rawStore.latitude,
      longitude: rawStore.longitude,
      placeId: rawStore.place_id,
      createdAt: rawStore.created_at,
      updatedAt: rawStore.updated_at,
    };
  }

  /**
   * Find or create a store from OCR data (merchant name and address)
   * Uses fuzzy matching to find existing stores before creating new ones
   */
  async findOrCreateStoreFromOcr(ocrData: {
    merchant: string;
    store_address?: string;
  }): Promise<Store> {
    const { merchant, store_address } = ocrData;

    // Step 1: Normalize the merchant name
    const normalizedName = this.normalizeStoreName(merchant);

    // Step 2: If address provided, prioritize address-based matching for chain stores
    if (store_address) {
      // Parse address components first
      const addressComponents = this.parseStoreAddress(store_address);

      // Step 2a: Try exact address match first (most specific)
      if (addressComponents.fullAddress) {
        const exactAddressMatch = await this.storeRepository.findOne({
          where: { fullAddress: store_address },
        });
        if (exactAddressMatch) {
          return exactAddressMatch;
        }
      }

      // Step 2b: Try postal code + name match (very specific for chain stores)
      if (addressComponents.postalCode) {
        const postalCodeMatches = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
          .andWhere('store.postalCode = :postalCode', {
            postalCode: addressComponents.postalCode,
          })
          .getMany();

        if (postalCodeMatches.length > 0) {
          const bestMatch = this.findBestNameMatch(
            normalizedName,
            postalCodeMatches,
          );
          if (bestMatch.score > 0.7) {
            return bestMatch.store;
          }
        }
      }

      // Step 2c: Try street address match for chain stores in same city
      if (addressComponents.city) {
        // First, get candidates from same city with same store name
        const cityMatches = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
          .andWhere('store.city ILIKE :city', {
            city: `%${addressComponents.city}%`,
          })
          .andWhere(
            addressComponents.province
              ? 'store.province ILIKE :province'
              : '1=1',
            { province: `%${addressComponents.province}%` },
          )
          .getMany();

        if (cityMatches.length > 0) {
          // If we have street address info, try to match it precisely
          const parsedStreetAddress = this.parseStreetAddress(store_address);

          if (
            parsedStreetAddress.streetNumber ||
            parsedStreetAddress.streetName
          ) {
            // Find stores with matching street components
            const streetMatches = cityMatches.filter((store) => {
              const storeStreetAddress = this.parseStreetAddress(
                store.fullAddress || '',
              );

              // Match street number if available
              if (
                parsedStreetAddress.streetNumber &&
                storeStreetAddress.streetNumber
              ) {
                if (
                  parsedStreetAddress.streetNumber !==
                  storeStreetAddress.streetNumber
                ) {
                  return false;
                }
              }

              // Match street name if available
              if (
                parsedStreetAddress.streetName &&
                storeStreetAddress.streetName
              ) {
                const similarity = this.calculateStreetNameSimilarity(
                  parsedStreetAddress.streetName,
                  storeStreetAddress.streetName,
                );
                return similarity > 0.8; // High threshold for street name matching
              }

              return true; // If no street info to compare, include in candidates
            });

            if (streetMatches.length === 1) {
              // Exact street match found
              return streetMatches[0];
            } else if (streetMatches.length > 1) {
              // Multiple street matches, use name similarity as tiebreaker
              const bestMatch = this.findBestNameMatch(
                normalizedName,
                streetMatches,
              );
              if (bestMatch.score > 0.7) {
                return bestMatch.store;
              }
            }
          }

          // Fallback: use best name match from city matches if no street-level match
          const bestCityMatch = this.findBestNameMatch(
            normalizedName,
            cityMatches,
          );
          if (bestCityMatch.score > 0.8) {
            // Higher threshold when no street matching
            return bestCityMatch.store;
          }
        }
      }
    }

    // Step 3: Try exact name match only if no address provided or no address-based match found
    const exactNameStore = await this.storeRepository.findOne({
      where: { name: normalizedName },
    });

    if (exactNameStore && !store_address) {
      // Only return exact name match if no address to verify against
      return exactNameStore;
    }

    // Step 4: Try fuzzy name match only for independent stores (when no address provided)
    if (!store_address) {
      const fuzzyMatches = await this.storeRepository
        .createQueryBuilder('store')
        .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
        .orderBy('LENGTH(store.name)', 'ASC') // Prefer shorter matches (more exact)
        .limit(5)
        .getMany();

      // Find best fuzzy match using similarity scoring
      if (fuzzyMatches.length > 0) {
        const bestMatch = this.findBestNameMatch(normalizedName, fuzzyMatches);
        if (bestMatch.score > 0.8) {
          // High threshold for name-only matching
          return bestMatch.store;
        }
      }
    }

    // Step 5: Create new store with atomic upsert to prevent race conditions
    const addressComponents = store_address
      ? this.parseStoreAddress(store_address)
      : {};

    const storeData = {
      name: normalizedName,
      fullAddress: store_address || addressComponents.fullAddress,
      city: addressComponents.city,
      province: addressComponents.province,
      postalCode: addressComponents.postalCode,
    };

    try {
      // Use upsert with conflict resolution on store_sk
      const result = await this.storeRepository
        .createQueryBuilder()
        .insert()
        .into(Store)
        .values(storeData)
        .orIgnore() // Ignore if duplicate key constraint violation occurs
        .returning('*')
        .execute();

      if (result.identifiers.length > 0) {
        // Successfully created new store
        const createdStore = await this.storeRepository.findOneBy({
          id: result.identifiers[0].id as number,
        });
        if (!createdStore) {
          throw new Error('Failed to retrieve newly created store');
        }
        return createdStore;
      } else {
        // Store already exists due to concurrent creation, try to find it
        const existingStore = await this.findExistingStoreByNameAndAddress(
          normalizedName,
          store_address,
        );
        if (!existingStore) {
          throw new Error(
            'Failed to find or create store after conflict resolution',
          );
        }
        return existingStore;
      }
    } catch (error: unknown) {
      // Fallback: Handle race condition by trying to find existing store
      const dbError = error as { code?: string; message?: string };

      if (dbError?.code === '23505') {
        // Unique constraint violation
        const existingStore = await this.findExistingStoreByNameAndAddress(
          normalizedName,
          store_address,
        );
        if (existingStore) {
          return existingStore;
        }

        // If still no match, this might be a different unique constraint issue
        // Let's try one more comprehensive search
        const fallbackStore = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
          .andWhere(
            store_address ? 'store.fullAddress ILIKE :address' : '1=1',
            { address: `%${store_address}%` },
          )
          .orderBy('store.createdAt', 'DESC') // Get the most recent match
          .getOne();

        if (fallbackStore) {
          return fallbackStore;
        }
      }

      // Log the error for debugging
      console.error('Error creating store:', {
        error: dbError.message || 'Unknown error',
        code: dbError.code || 'N/A',
        normalizedName,
        store_address,
      });

      throw error;
    }
  }

  /**
   * Helper method to find existing store by name and address after race condition
   */
  private async findExistingStoreByNameAndAddress(
    normalizedName: string,
    storeAddress?: string,
  ): Promise<Store | null> {
    // First try exact name match
    let existingStore = await this.storeRepository.findOne({
      where: { name: normalizedName },
    });

    if (existingStore) {
      return existingStore;
    }

    // If address provided, try address-based matching
    if (storeAddress) {
      existingStore = await this.storeRepository.findOne({
        where: { fullAddress: storeAddress },
      });

      if (existingStore) {
        return existingStore;
      }
    }

    return null;
  }

  /**
   * Normalize store names for consistent matching
   * Examples: "WALMART #1234" -> "Walmart", "TARGET STORE T-2345" -> "Target"
   */
  private normalizeStoreName(rawName: string): string {
    if (!rawName) return 'Unknown Store';

    let normalized = rawName.trim().toUpperCase();

    // Remove common store number patterns
    normalized = normalized.replace(/\s*#\d+.*$/, ''); // Remove #1234, #1234 SUPERCENTER, etc.
    normalized = normalized.replace(/\s*STORE\s*[T-]?\d+.*$/, ''); // Remove STORE T-1234, STORE 456, etc.
    normalized = normalized.replace(/\s*\d{4,}.*$/, ''); // Remove standalone store numbers

    // Remove common suffixes
    normalized = normalized.replace(
      /\s*(SUPERCENTER|SUPERSTORE|STORE|MARKET|SHOP|INC|LLC|CORP)$/g,
      '',
    );

    // Apply specific store chain normalizations
    const storeNormalizations: Record<string, string> = {
      WALMART: 'Walmart',
      'WAL-MART': 'Walmart',
      TARGET: 'Target',
      'WHOLE FOODS': 'Whole Foods',
      SAFEWAY: 'Safeway',
      KROGER: 'Kroger',
      PUBLIX: 'Publix',
      'HARRIS TEETER': 'Harris Teeter',
      'FOOD LION': 'Food Lion',
      'GIANT FOOD': 'Giant Food',
      'STOP & SHOP': 'Stop & Shop',
      SHOPRITE: 'ShopRite',
      'WEIS MARKETS': 'Weis Markets',
      CVS: 'CVS Pharmacy',
      WALGREENS: 'Walgreens',
      'RITE AID': 'Rite Aid',
      'HOME DEPOT': 'The Home Depot',
      LOWES: "Lowe's",
      "LOWE'S": "Lowe's",
      'BEST BUY': 'Best Buy',
      COSTCO: 'Costco',
      'SAMS CLUB': "Sam's Club",
      "SAM'S CLUB": "Sam's Club",
      BJS: "BJ's Wholesale Club",
    };

    const normalizedKey = normalized.trim();
    if (storeNormalizations[normalizedKey]) {
      return storeNormalizations[normalizedKey];
    }

    // If no specific normalization, apply title case
    return this.toTitleCase(normalized);
  }

  /**
   * Convert string to title case
   */
  private toTitleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Find the best matching store name using simple similarity scoring
   */
  private findBestNameMatch(
    targetName: string,
    candidates: Store[],
  ): { store: Store; score: number } {
    let bestMatch = { store: candidates[0], score: 0 };

    for (const candidate of candidates) {
      const score = this.calculateNameSimilarity(targetName, candidate.name);
      if (score > bestMatch.score) {
        bestMatch = { store: candidate, score };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two store names (simple implementation)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (clean1 === clean2) return 1.0;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.9;

    // Simple character overlap scoring
    const commonChars = [...clean1].filter((char) =>
      clean2.includes(char),
    ).length;
    const totalChars = Math.max(clean1.length, clean2.length);

    return commonChars / totalChars;
  }

  /**
   * Parse street address to extract street number and name
   */
  private parseStreetAddress(address: string): {
    streetNumber?: string;
    streetName?: string;
  } {
    if (!address) return {};

    // Clean up address
    const cleanAddress = address.replace(/\s+/g, ' ').trim();

    // Extract the first line (street address)
    const firstLine = cleanAddress.split(/[,\n\r]/)[0].trim();

    // Pattern to match street number + street name
    // Examples: "3550 Brighton Ave", "4500 Still Creek Dr", "2929 BARNET HWY"
    const streetMatch = firstLine.match(
      /^(\d+)\s+(.+?)(?:\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Hwy|Highway|Pl|Place|Ln|Lane|Ct|Court)\.?)?$/i,
    );

    if (streetMatch) {
      return {
        streetNumber: streetMatch[1],
        streetName: streetMatch[2].trim(),
      };
    }

    // Fallback: try to extract just the number from the beginning
    const numberMatch = firstLine.match(/^(\d+)/);
    if (numberMatch) {
      return {
        streetNumber: numberMatch[1],
        streetName: firstLine.replace(/^\d+\s*/, '').trim(),
      };
    }

    return { streetName: firstLine };
  }

  /**
   * Calculate similarity between street names
   */
  private calculateStreetNameSimilarity(name1: string, name2: string): number {
    const normalize = (name: string) => {
      return name
        .toLowerCase()
        .replace(
          /\b(st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|way|hwy|highway|pl|place|ln|lane|ct|court)\.?\b/g,
          '',
        )
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const clean1 = normalize(name1);
    const clean2 = normalize(name2);

    if (clean1 === clean2) return 1.0;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.9;

    // Word-based similarity for street names
    const words1 = clean1.split(' ');
    const words2 = clean2.split(' ');

    const commonWords = words1.filter((word) => words2.includes(word)).length;
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords / totalWords;
  }

  /**
   * Parse store address into components (enhanced for North American addresses)
   * Handles both US and Canadian formats, plus multi-line OCR addresses
   */
  private parseStoreAddress(address: string): {
    fullAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  } {
    if (!address) return {};

    // Clean up address: normalize whitespace and line breaks
    const cleanAddress = address.replace(/\s+/g, ' ').trim();

    // Try both comma-separated and newline-separated formats
    let addressParts = cleanAddress.split(',').map((part) => part.trim());

    // If no commas, try splitting by newlines (common in OCR)
    if (addressParts.length === 1) {
      addressParts = cleanAddress
        .split(/[\n\r]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    }

    if (addressParts.length >= 2) {
      const lastPart = addressParts[addressParts.length - 1];
      const secondLastPart =
        addressParts.length > 2 ? addressParts[addressParts.length - 2] : '';

      // Canadian postal code pattern: A1A 1A1 or A1A1A1
      const canadianPostalMatch = lastPart.match(
        /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i,
      );

      // US zip code pattern: 12345 or 12345-6789
      const usPostalMatch = lastPart.match(/\b\d{5}(-\d{4})?\b/);

      const postalCode = canadianPostalMatch
        ? canadianPostalMatch[0].toUpperCase()
        : usPostalMatch
          ? usPostalMatch[0]
          : undefined;

      // Extract province/state (handle both 2-letter codes and full names)
      let province: string | undefined;

      // Look for Canadian provinces (abbreviations and full names)
      const canadianProvinces: Record<string, string> = {
        AB: 'Alberta',
        ALBERTA: 'AB',
        BC: 'British Columbia',
        'BRITISH COLUMBIA': 'BC',
        MB: 'Manitoba',
        MANITOBA: 'MB',
        NB: 'New Brunswick',
        'NEW BRUNSWICK': 'NB',
        NL: 'Newfoundland and Labrador',
        'NEWFOUNDLAND AND LABRADOR': 'NL',
        NS: 'Nova Scotia',
        'NOVA SCOTIA': 'NS',
        NT: 'Northwest Territories',
        'NORTHWEST TERRITORIES': 'NT',
        NU: 'Nunavut',
        NUNAVUT: 'NU',
        ON: 'Ontario',
        ONTARIO: 'ON',
        PE: 'Prince Edward Island',
        'PRINCE EDWARD ISLAND': 'PE',
        QC: 'Quebec',
        QUEBEC: 'QC',
        SK: 'Saskatchewan',
        SASKATCHEWAN: 'SK',
        YT: 'Yukon',
        YUKON: 'YT',
      };

      // US states (common abbreviations)
      const usStates: Record<string, string> = {
        AL: 'Alabama',
        AK: 'Alaska',
        AZ: 'Arizona',
        AR: 'Arkansas',
        CA: 'California',
        CO: 'Colorado',
        CT: 'Connecticut',
        DE: 'Delaware',
        FL: 'Florida',
        GA: 'Georgia',
        HI: 'Hawaii',
        ID: 'Idaho',
        IL: 'Illinois',
        IN: 'Indiana',
        IA: 'Iowa',
        KS: 'Kansas',
        KY: 'Kentucky',
        LA: 'Louisiana',
        ME: 'Maine',
        MD: 'Maryland',
        MA: 'Massachusetts',
        MI: 'Michigan',
        MN: 'Minnesota',
        MS: 'Mississippi',
        MO: 'Missouri',
        MT: 'Montana',
        NE: 'Nebraska',
        NV: 'Nevada',
        NH: 'New Hampshire',
        NJ: 'New Jersey',
        NM: 'New Mexico',
        NY: 'New York',
        NC: 'North Carolina',
        ND: 'North Dakota',
        OH: 'Ohio',
        OK: 'Oklahoma',
        OR: 'Oregon',
        PA: 'Pennsylvania',
        RI: 'Rhode Island',
        SC: 'South Carolina',
        SD: 'South Dakota',
        TN: 'Tennessee',
        TX: 'Texas',
        UT: 'Utah',
        VT: 'Vermont',
        VA: 'Virginia',
        WA: 'Washington',
        WV: 'West Virginia',
        WI: 'Wisconsin',
        WY: 'Wyoming',
      };

      // Check last part for province/state
      const upperLastPart = lastPart.toUpperCase();

      // First check for exact province matches in the last part
      if (canadianProvinces[upperLastPart] || usStates[upperLastPart]) {
        province = upperLastPart;
      } else {
        // Look for province/state within the last part (e.g., "Langley, BC V2Y 1N5")
        const provinceMatch = upperLastPart.match(/\b([A-Z]{2})\b/);
        if (
          provinceMatch &&
          (canadianProvinces[provinceMatch[1]] || usStates[provinceMatch[1]])
        ) {
          province = provinceMatch[1];
        }
      }

      // Extract city
      let city: string | undefined;

      if (province && postalCode) {
        // Check if this is a multi-line format where city is in a separate part
        // Pattern 1: ["20499 64th AVE Langley", "BC V2Y 1N5"] -> city is "Langley" (end of first part)
        // Pattern 2: ["123 Main Street", "Vancouver", "BC V6B 1A1"] -> city is "Vancouver" (second-to-last part)

        if (addressParts.length === 2) {
          // Multi-line format: first part ends with city, second part has province+postal
          const firstPart = addressParts[0];
          // Extract city from the end of the first part
          // Pattern: "20499 64th AVE Langley" -> extract "Langley"
          // Look for the last word(s) that could be a city name
          const words = firstPart.trim().split(/\s+/);
          if (words.length > 0) {
            // Take the last word as the city (most common case)
            city = words[words.length - 1];
          }
        } else if (addressParts.length > 2) {
          // Comma-separated format: city is typically the second-to-last part
          city = secondLastPart;
        } else {
          // Single part format: extract city from the last part by removing province and postal code
          let cityPart = lastPart;

          // Remove postal code
          cityPart = cityPart
            .replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, '')
            .trim();
          cityPart = cityPart.replace(/\b\d{5}(-\d{4})?\b/, '').trim();

          // Remove province code (2-letter abbreviation)
          cityPart = cityPart.replace(/\b[A-Z]{2}\b/i, '').trim();

          // Remove trailing comma if present
          cityPart = cityPart.replace(/,\s*$/, '').trim();

          if (cityPart) {
            city = cityPart;
          }
        }
      } else if (addressParts.length > 2) {
        // City is typically the second-to-last part
        city = secondLastPart;
      }

      // Fallback: if no city found yet, try to extract from second-to-last part
      if (!city && addressParts.length > 1) {
        city = secondLastPart || addressParts[addressParts.length - 2];
      }

      return {
        fullAddress: address,
        city: city?.trim() || undefined,
        province: province?.trim() || undefined,
        postalCode: postalCode?.trim() || undefined,
      };
    }

    return { fullAddress: address };
  }

  // 🚀 ENHANCED PAGINATED SEARCH METHODS WITH CACHING

  /**
   * Find stores near location with pagination and caching
   */
  async findStoresNearLocationPaginated(
    params: LocationSearchDto,
  ): Promise<PaginatedResponse<StoreDistance>> {
    return this.cacheService.getOrSetPaginated(
      'findStoresNearLocation',
      params,
      async () => {
        const {
          latitude,
          longitude,
          radiusKm = 10,
          page = 1,
          limit = 20,
        } = params;
        const offset = (page - 1) * limit;

        const query = this.storeRepository
          .createQueryBuilder('store')
          .select([
            'store.*',
            `(
              6371 * acos(
                cos(radians(:latitude)) * 
                cos(radians(store.latitude)) * 
                cos(radians(store.longitude) - radians(:longitude)) + 
                sin(radians(:latitude)) * 
                sin(radians(store.latitude))
              )
            ) AS distance`,
          ])
          .where('store.latitude IS NOT NULL')
          .andWhere('store.longitude IS NOT NULL')
          .andWhere(
            `(
              6371 * acos(
                cos(radians(:latitude)) * 
                cos(radians(store.latitude)) * 
                cos(radians(store.longitude) - radians(:longitude)) + 
                sin(radians(:latitude)) * 
                sin(radians(store.latitude))
              )
            ) <= :radiusKm`,
          )
          .orderBy('distance', 'ASC')
          .setParameters({ latitude, longitude, radiusKm });

        // Get total count for pagination
        const totalQuery = this.storeRepository
          .createQueryBuilder('store')
          .select('COUNT(*)')
          .where('store.latitude IS NOT NULL')
          .andWhere('store.longitude IS NOT NULL')
          .andWhere(
            `(6371 * acos(cos(radians(:latitude)) * cos(radians(store.latitude)) * cos(radians(store.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(store.latitude)))) <= :radiusKm`,
          )
          .setParameters({ latitude, longitude, radiusKm });

        const results = await Promise.all([
          query.offset(offset).limit(limit).getRawMany(),
          totalQuery.getRawOne(),
        ]);
        const stores = results[0] as RawStoreQueryResult[];
        const total = results[1] as { count: string };

        const data = stores.map((store: RawStoreQueryResult) => ({
          ...this.mapRawStoreToDTO(store),
          distance: parseFloat(parseFloat(store.distance || '0').toFixed(2)),
        }));

        return this.buildPaginatedResponse(
          data,
          page,
          limit,
          parseInt(total.count),
        );
      },
    );
  }

  /**
   * Search stores by name with pagination and caching
   */
  async searchStoresByNamePaginated(
    params: NameSearchDto,
  ): Promise<PaginatedResponse<StoreDTO>> {
    return this.cacheService.getOrSetPaginated(
      'searchStoresByName',
      params,
      async () => {
        const { name, page = 1, limit = 20 } = params;
        const offset = (page - 1) * limit;

        // Use trigram similarity for better fuzzy matching
        const query = this.storeRepository
          .createQueryBuilder('store')
          .where('store.name % :name OR store.name ILIKE :namePattern', {
            name,
            namePattern: `%${name}%`,
          })
          .orderBy('similarity(store.name, :name)', 'DESC')
          .addOrderBy('store.name', 'ASC')
          .setParameter('name', name);

        const [stores, total] = await Promise.all([
          query.offset(offset).limit(limit).getMany(),
          query.getCount(),
        ]);

        const data = stores.map((store) => this.mapStoreToDTO(store));
        return this.buildPaginatedResponse(data, page, limit, total);
      },
    );
  }

  /**
   * Find stores by city with pagination and caching
   */
  async findStoresByCityPaginated(
    params: CitySearchDto & { page?: number; limit?: number },
  ): Promise<PaginatedResponse<StoreDTO>> {
    return this.cacheService.getOrSetPaginated(
      'findStoresByCity',
      params,
      async () => {
        const { city, page = 1, limit = 20 } = params;
        const offset = (page - 1) * limit;

        const query = this.storeRepository
          .createQueryBuilder('store')
          .where('store.city ILIKE :city', { city: `%${city}%` })
          .orderBy('store.name', 'ASC');

        const [stores, total] = await Promise.all([
          query.offset(offset).limit(limit).getMany(),
          query.getCount(),
        ]);

        const data = stores.map((store) => this.mapStoreToDTO(store));
        return this.buildPaginatedResponse(data, page, limit, total);
      },
    );
  }

  /**
   * Find stores by province with pagination and caching
   */
  async findStoresByProvincePaginated(
    params: ProvinceSearchDto & { page?: number; limit?: number },
  ): Promise<PaginatedResponse<StoreDTO>> {
    return this.cacheService.getOrSetPaginated(
      'findStoresByProvince',
      params,
      async () => {
        const { province, page = 1, limit = 20 } = params;
        const offset = (page - 1) * limit;

        const query = this.storeRepository
          .createQueryBuilder('store')
          .where('store.province ILIKE :province', {
            province: `%${province}%`,
          })
          .orderBy('store.city', 'ASC')
          .addOrderBy('store.name', 'ASC');

        const [stores, total] = await Promise.all([
          query.offset(offset).limit(limit).getMany(),
          query.getCount(),
        ]);

        const data = stores.map((store) => this.mapStoreToDTO(store));
        return this.buildPaginatedResponse(data, page, limit, total);
      },
    );
  }

  /**
   * Get popular stores with pagination and caching
   */
  async getPopularStoresPaginated(
    params: PopularStoresDto,
  ): Promise<PaginatedResponse<StoreDTO>> {
    return this.cacheService.getOrSetPaginated(
      'getPopularStores',
      params,
      async () => {
        const { minReceipts = 1, page = 1, limit = 20 } = params;
        const offset = (page - 1) * limit;

        const query = this.storeRepository
          .createQueryBuilder('store')
          .leftJoin('store.receipts', 'receipt')
          .loadRelationCountAndMap('store.receiptCount', 'store.receipts')
          .having('COUNT(receipt.id) >= :minReceipts', { minReceipts })
          .groupBy('store.id')
          .orderBy('COUNT(receipt.id)', 'DESC')
          .addOrderBy('store.name', 'ASC');

        const [stores, total] = await Promise.all([
          query.offset(offset).limit(limit).getMany(),
          query.getCount(),
        ]);

        const data = stores.map((store) => this.mapStoreToDTO(store));
        return this.buildPaginatedResponse(data, page, limit, total);
      },
    );
  }

  /**
   * Advanced search with pagination and caching
   */
  async advancedStoreSearchPaginated(
    params: AdvancedSearchDto,
  ): Promise<PaginatedResponse<StoreDistance>> {
    return this.cacheService.getOrSetPaginated(
      'advancedStoreSearch',
      params,
      async () => {
        const {
          name,
          city,
          province,
          latitude,
          longitude,
          radiusKm = 10,
          page = 1,
          limit = 20,
        } = params;
        const offset = (page - 1) * limit;

        let query = this.storeRepository.createQueryBuilder('store');

        // Add distance calculation if coordinates provided
        if (latitude !== undefined && longitude !== undefined) {
          query = query
            .select([
              'store.*',
              `(
                6371 * acos(
                  cos(radians(:latitude)) * 
                  cos(radians(store.latitude)) * 
                  cos(radians(store.longitude) - radians(:longitude)) + 
                  sin(radians(:latitude)) * 
                  sin(radians(store.latitude))
                )
              ) AS distance`,
            ])
            .setParameters({ latitude, longitude });
        } else {
          query = query.select('store.*');
        }

        // Add text filters
        if (name) {
          query = query.andWhere(
            'store.name % :name OR store.name ILIKE :namePattern',
            {
              name,
              namePattern: `%${name}%`,
            },
          );
        }
        if (city) {
          query = query.andWhere('store.city ILIKE :city', {
            city: `%${city}%`,
          });
        }
        if (province) {
          query = query.andWhere('store.province ILIKE :province', {
            province: `%${province}%`,
          });
        }

        // Add distance filter if coordinates provided
        if (latitude !== undefined && longitude !== undefined) {
          // Use subquery approach to properly filter by calculated distance
          const distanceCalculation = `(
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians(store.latitude)) * 
              cos(radians(store.longitude) - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians(store.latitude))
            )
          )`;

          query = query
            .andWhere('store.latitude IS NOT NULL')
            .andWhere('store.longitude IS NOT NULL')
            .andWhere(`${distanceCalculation} <= :radiusKm`)
            .setParameter('radiusKm', radiusKm)
            .orderBy('distance', 'ASC');
        } else if (name) {
          query = query
            .orderBy('similarity(store.name, :name)', 'DESC')
            .addOrderBy('store.name', 'ASC');
        } else {
          query = query.orderBy('store.name', 'ASC');
        }

        // Get total count (simpler query for count)
        let countQuery = this.storeRepository.createQueryBuilder('store');
        if (name) {
          countQuery = countQuery.andWhere(
            'store.name % :name OR store.name ILIKE :namePattern',
            {
              name,
              namePattern: `%${name}%`,
            },
          );
        }
        if (city) {
          countQuery = countQuery.andWhere('store.city ILIKE :city', {
            city: `%${city}%`,
          });
        }
        if (province) {
          countQuery = countQuery.andWhere('store.province ILIKE :province', {
            province: `%${province}%`,
          });
        }
        if (latitude !== undefined && longitude !== undefined) {
          countQuery = countQuery
            .andWhere('store.latitude IS NOT NULL')
            .andWhere('store.longitude IS NOT NULL')
            .andWhere(
              `(6371 * acos(cos(radians(:latitude)) * cos(radians(store.latitude)) * cos(radians(store.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(store.latitude)))) <= :radiusKm`,
            )
            .setParameters({ latitude, longitude, radiusKm });
        }

        const [stores, total] = await Promise.all([
          query.offset(offset).limit(limit).getRawMany(),
          countQuery.getCount(),
        ]);

        const data = stores.map((store: RawStoreQueryResult) => ({
          ...this.mapRawStoreToDTO(store),
          distance: store.distance
            ? parseFloat(parseFloat(store.distance).toFixed(2))
            : 0,
        }));

        return this.buildPaginatedResponse(data, page, limit, total);
      },
    );
  }

  /**
   * Build paginated response with metadata
   */
  private buildPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: {
        queryTime: 0, // Will be set by cache service
        indexesUsed: ['idx_store_name_gin_trgm', 'idx_store_coordinates'], // Placeholder
      },
    };
  }

  /**
   * Clear search cache when stores are modified
   */
  invalidateSearchCache(): void {
    this.cacheService.invalidate('store:');
  }

  // 🌍 GOOGLE PLACES INTEGRATION METHODS

  /**
   * Search for stores using Google Places API as fallback
   */
  async searchWithGoogleFallback(params: {
    query?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<{
    localStores: StoreDistance[];
    googleStores: GooglePlaceResult[];
    totalResults: number;
  }> {
    const { query, latitude, longitude, radiusKm = 10, limit = 20 } = params;

    this.logger.log(
      `🔍 Searching with Google fallback - Query: "${query}", Location: ${latitude},${longitude}, Radius: ${radiusKm}km`,
    );

    // First, search local database
    let localStores: StoreDistance[] = [];

    if (latitude && longitude) {
      // Location-based search
      if (query) {
        // Advanced search with name and location
        const advancedParams: AdvancedSearchDto = {
          name: query,
          latitude,
          longitude,
          radiusKm,
          page: 1,
          limit,
        };
        const localResults =
          await this.advancedStoreSearchPaginated(advancedParams);
        localStores = localResults.data;
      } else {
        // Location-only search
        const locationParams: LocationSearchDto = {
          latitude,
          longitude,
          radiusKm,
          page: 1,
          limit,
        };
        const localResults =
          await this.findStoresNearLocationPaginated(locationParams);
        localStores = localResults.data;
      }
    } else if (query) {
      // Name-only search
      const nameParams: NameSearchDto = {
        name: query,
        page: 1,
        limit,
      };
      const localResults = await this.searchStoresByNamePaginated(nameParams);
      localStores = localResults.data.map((store) => ({
        ...store,
        distance: 0,
      }));
    }

    // If we have enough local results, return them
    if (localStores.length >= Math.min(limit, 5)) {
      this.logger.log(
        `✅ Found ${localStores.length} local stores, skipping Google search`,
      );
      return {
        localStores,
        googleStores: [],
        totalResults: localStores.length,
      };
    }

    // Search Google Places as fallback
    let googleStores: GooglePlaceResult[] = [];
    try {
      if (latitude && longitude) {
        // Location-based Google search
        googleStores = await this.googlePlacesService.searchStoresNearLocation({
          latitude,
          longitude,
          radiusKm,
          query,
        });
      } else if (query) {
        // Text-based Google search
        googleStores = await this.googlePlacesService.searchStoresByText({
          query,
          radiusKm,
        });
      }

      // Filter out stores we already have in local database
      const filteredGoogleStores =
        await this.filterExistingStores(googleStores);

      this.logger.log(
        `🌍 Google Places found ${googleStores.length} stores, ${filteredGoogleStores.length} are new`,
      );

      return {
        localStores,
        googleStores: filteredGoogleStores,
        totalResults: localStores.length + filteredGoogleStores.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Google Places search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        localStores,
        googleStores: [],
        totalResults: localStores.length,
      };
    }
  }

  /**
   * Filter out Google Places results that already exist in our database
   */
  private async filterExistingStores(
    googleStores: GooglePlaceResult[],
  ): Promise<GooglePlaceResult[]> {
    if (googleStores.length === 0) return [];

    try {
      // Get place IDs from Google results
      const placeIds = googleStores.map((store) => store.place_id);

      // Check which ones already exist in our database
      const existingStores = await this.storeRepository
        .createQueryBuilder('store')
        .where('store.placeId IN (:...placeIds)', { placeIds })
        .getMany();

      const existingPlaceIds = new Set(
        existingStores.map((store) => store.placeId).filter(Boolean),
      );

      // Filter out existing stores
      const newStores = googleStores.filter(
        (store) => !existingPlaceIds.has(store.place_id),
      );

      this.logger.debug(
        `🔍 Filtered ${googleStores.length - newStores.length} existing stores from Google results`,
      );

      return newStores;
    } catch (error) {
      this.logger.error(
        `❌ Error filtering existing stores: ${error instanceof Error ? error.message : String(error)}`,
      );
      return googleStores; // Return all if filtering fails
    }
  }

  /**
   * Create a new store from Google Places data
   */
  async createStoreFromGooglePlace(
    googlePlace: GooglePlaceResult,
  ): Promise<Store> {
    try {
      // Use parsed address data from GooglePlaceResult (no need to parse again)

      // Create store entity using parsed address data from GooglePlaceResult
      const storeData: Partial<Store> = {
        name: googlePlace.name,
        fullAddress: googlePlace.fullAddress,
        streetNumber: googlePlace.streetNumber,
        road: googlePlace.road,
        streetAddress: googlePlace.streetAddress,
        city: googlePlace.city,
        province: googlePlace.province,
        postalCode: googlePlace.postalCode,
        countryRegion: googlePlace.countryRegion,
        latitude: googlePlace.latitude,
        longitude: googlePlace.longitude,
        placeId: googlePlace.place_id,
      };

      const store = this.storeRepository.create(storeData);
      const savedStore = await this.storeRepository.save(store);

      this.logger.log(
        `✅ Created new store from Google Places: ${savedStore.name} (${savedStore.storeSk})`,
      );

      // Invalidate cache after creating new store
      this.invalidateSearchCache();

      return savedStore;
    } catch (error) {
      this.logger.error(
        `❌ Failed to create store from Google Place: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Bulk create stores from Google Places results
   */
  async createStoresFromGooglePlaces(
    googlePlaces: GooglePlaceResult[],
  ): Promise<Store[]> {
    const createdStores: Store[] = [];

    for (const googlePlace of googlePlaces) {
      try {
        const store = await this.createStoreFromGooglePlace(googlePlace);
        createdStores.push(store);
      } catch (error) {
        this.logger.error(
          `❌ Failed to create store ${googlePlace.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with other stores even if one fails
        continue;
      }
    }

    this.logger.log(
      `✅ Successfully created ${createdStores.length}/${googlePlaces.length} stores from Google Places`,
    );

    return createdStores;
  }

  /**
   * Check if a store already exists by name and location
   */
  async checkStoreExists(params: {
    name: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
  }): Promise<Store | null> {
    const { name, latitude, longitude, placeId } = params;

    try {
      const query = this.storeRepository.createQueryBuilder('store');

      // First check by place ID (most reliable)
      if (placeId) {
        const storeByPlaceId = await query
          .where('store.placeId = :placeId', { placeId })
          .getOne();

        if (storeByPlaceId) {
          return storeByPlaceId;
        }
      }

      // Then check by name and location (fuzzy matching)
      if (latitude && longitude) {
        const stores = await query
          .where('store.name ILIKE :name', { name: `%${name}%` })
          .andWhere('store.latitude IS NOT NULL')
          .andWhere('store.longitude IS NOT NULL')
          .andWhere(
            `(
              6371 * acos(
                cos(radians(:latitude)) * 
                cos(radians(store.latitude)) * 
                cos(radians(store.longitude) - radians(:longitude)) + 
                sin(radians(:latitude)) * 
                sin(radians(store.latitude))
              )
            ) <= 0.5`, // Within 500m
          )
          .setParameters({ name, latitude, longitude })
          .getMany();

        if (stores.length > 0) {
          return stores[0]; // Return closest match
        }
      }

      // Finally check by name only (exact match)
      const storeByName = await this.storeRepository
        .createQueryBuilder('store')
        .where('store.name ILIKE :name', { name: `%${name}%` })
        .getOne();

      return storeByName;
    } catch (error) {
      this.logger.error(
        `❌ Error checking store existence: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  // 🔍 UNIFIED SEARCH METHOD

  /**
   * Unified store search - handles all search scenarios intelligently
   * - Query only (name/address search)
   * - Location only (nearby search)
   * - Query + Location (contextual search)
   * - Always shows Google results alongside local results
   */
  async unifiedStoreSearch(
    params: UnifiedStoreSearchDto,
  ): Promise<UnifiedStoreSearchResponse> {
    const startTime = Date.now();
    const {
      query,
      latitude,
      longitude,
      radiusKm = 25,
      page = 1,
      limit = 20,
      includeGoogle = true,
      maxGoogleResults = 10,
      sortBy = 'relevance',
    } = params;

    this.logger.log(
      `🔍 Unified search - Query: "${query}", Location: ${latitude},${longitude}, Radius: ${radiusKm}km, Google: ${includeGoogle}`,
    );

    // Determine search type
    const hasQuery = query && query.trim().length > 0;
    const hasLocation = latitude !== undefined && longitude !== undefined;
    const searchType: 'query_only' | 'location_only' | 'query_and_location' =
      hasQuery && hasLocation
        ? 'query_and_location'
        : hasQuery
          ? 'query_only'
          : hasLocation
            ? 'location_only'
            : 'query_only'; // Default fallback

    // Search local database
    let localStores: (StoreDTO & { distance?: number })[] = [];
    let cacheHit = false;

    try {
      if (searchType === 'query_and_location') {
        // Combined search with both query and location
        const advancedParams: AdvancedSearchDto = {
          name: query,
          latitude,
          longitude,
          radiusKm,
          page,
          limit,
        };
        const localResults =
          await this.advancedStoreSearchPaginated(advancedParams);
        localStores = localResults.data;
        cacheHit = localResults.meta?.cacheHit || false;
      } else if (searchType === 'location_only') {
        // Location-only nearby search
        const locationParams: LocationSearchDto = {
          latitude: latitude!,
          longitude: longitude!,
          radiusKm,
          page,
          limit,
        };
        const localResults =
          await this.findStoresNearLocationPaginated(locationParams);
        localStores = localResults.data;
        cacheHit = localResults.meta?.cacheHit || false;
      } else if (searchType === 'query_only') {
        // Query-only search (name, address, keywords)
        const nameParams: NameSearchDto = {
          name: query!,
          page,
          limit,
        };
        const localResults = await this.searchStoresByNamePaginated(nameParams);
        localStores = localResults.data.map((store) => ({
          ...store,
          distance: 0, // No distance for query-only search
        }));
        cacheHit = localResults.meta?.cacheHit || false;
      }
    } catch (error) {
      this.logger.error(
        `❌ Local search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      localStores = [];
    }

    // Search Google Places if enabled
    let googleStores: GooglePlaceResult[] = [];
    let googleApiCalled = false;
    let hasMoreGoogle = false;

    if (includeGoogle && maxGoogleResults > 0) {
      try {
        googleApiCalled = true;

        if (hasLocation) {
          // Location-based Google search using includedTypes/excludedTypes pattern
          googleStores = await this.googlePlacesService.findStoresNearby({
            location: { lat: latitude, lng: longitude },
            radius: radiusKm * 1000, // convert km to meters
            keyword: hasQuery ? query : undefined,
            includedTypes: ['supermarket', 'grocery_or_supermarket', 'store'],
            excludedTypes: [
              'restaurant',
              'bar',
              'cafe',
              'gas_station',
              'hospital',
              'doctor',
            ],
          });
        } else if (hasQuery) {
          // Text-based Google search
          googleStores = await this.googlePlacesService.searchStoresByText({
            query: query,
            location: hasLocation
              ? { latitude: latitude, longitude: longitude }
              : undefined,
            radiusKm,
          });
        }

        // Filter out stores we already have in local database
        googleStores = await this.filterExistingStores(googleStores);

        // Limit Google results and check if there are more
        if (googleStores.length > maxGoogleResults) {
          hasMoreGoogle = true;
          googleStores = googleStores.slice(0, maxGoogleResults);
        }

        this.logger.log(
          `🌍 Google Places found ${googleStores.length} new stores (hasMore: ${hasMoreGoogle})`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Google Places search failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        googleStores = [];
      }
    }

    // Apply final radius filtering if location is provided (ensure strict radius enforcement)
    if (hasLocation) {
      // Filter local stores by radius (double-check database results)
      localStores = localStores.filter((store) => {
        const distance =
          store.distance ||
          this.calculateDistance(
            latitude,
            longitude,
            store.latitude || 0,
            store.longitude || 0,
          );
        const withinRadius = distance <= radiusKm;
        if (!withinRadius) {
          this.logger.debug(
            `🚫 Filtered out local store: ${store.name} (${distance.toFixed(2)}km > ${radiusKm}km)`,
          );
        }
        return withinRadius;
      });

      // Filter Google stores by radius (Google API sometimes returns results slightly outside radius)
      googleStores = googleStores.filter((store) => {
        const distance =
          store.distance ||
          this.calculateDistance(
            latitude,
            longitude,
            store.latitude,
            store.longitude,
          );
        const withinRadius = distance <= radiusKm;
        if (!withinRadius) {
          this.logger.debug(
            `🚫 Filtered out Google store: ${store.name} (${distance.toFixed(2)}km > ${radiusKm}km)`,
          );
        }
        return withinRadius;
      });

      this.logger.debug(
        `📍 After radius filtering (${radiusKm}km): Local=${localStores.length}, Google=${googleStores.length}`,
      );
    }

    // Apply sorting if specified
    if (sortBy === 'distance' && hasLocation) {
      // Sort local stores by distance (already sorted from query)
      // Sort Google stores by distance (calculate distance)
      googleStores = googleStores
        .map((store) => ({
          ...store,
          calculatedDistance: this.calculateDistance(
            latitude,
            longitude,
            store.latitude,
            store.longitude,
          ),
        }))
        .sort((a, b) => a.calculatedDistance - b.calculatedDistance)
        .map((item) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { calculatedDistance, ...store } = item;
          return store; // Remove temp distance field
        });
    } else if (sortBy === 'name') {
      localStores.sort((a, b) => a.name.localeCompare(b.name));
      googleStores.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'relevance' sorting is already handled by the search algorithms

    const totalResults = localStores.length + googleStores.length;
    const queryTime = Date.now() - startTime;

    // Build pagination info (based on total combined results)
    const totalPages = Math.ceil(totalResults / limit);

    const response: UnifiedStoreSearchResponse = {
      localStores,
      googleStores,
      summary: {
        totalResults,
        localCount: localStores.length,
        googleCount: googleStores.length,
        searchType,
        hasMoreGoogle,
      },
      pagination: {
        page,
        limit,
        total: totalResults,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: {
        queryTime,
        cacheHit,
        searchStrategy: this.getSearchStrategy(searchType, includeGoogle),
        googleApiCalled,
      },
    };

    this.logger.log(
      `✅ Unified search completed - Local: ${localStores.length}, Google: ${googleStores.length}, Time: ${queryTime}ms`,
    );

    return response;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get search strategy description
   */
  private getSearchStrategy(
    searchType: 'query_only' | 'location_only' | 'query_and_location',
    includeGoogle: boolean,
  ): string {
    const base = {
      query_only: 'text_search',
      location_only: 'nearby_search',
      query_and_location: 'contextual_search',
    }[searchType];

    return includeGoogle ? `${base}_with_google` : `${base}_local_only`;
  }
}
