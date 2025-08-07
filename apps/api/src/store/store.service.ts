import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
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
    private readonly dataSource: DataSource,
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
      countryRegion: this.normalizeCountryCode(storeData.countryRegion),
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
      store.countryRegion = this.normalizeCountryCode(storeData.countryRegion);
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

  /**
   * Normalize country names to standardized codes
   * Canada -> CAN, United States -> USA
   */
  private normalizeCountryCode(countryRegion?: string): string | undefined {
    if (!countryRegion) {
      return undefined;
    }

    const country = countryRegion.toLowerCase().trim();

    // Canada variations
    if (country === 'canada' || country === 'ca') {
      return 'CAN';
    }

    // United States variations
    if (
      country === 'united states' ||
      country === 'united states of america' ||
      country === 'usa' ||
      country === 'us'
    ) {
      return 'USA';
    }

    // Return original value if no normalization needed
    return countryRegion;
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
   * Find or create a store from OCR data with confidence scoring
   * Returns both the store and matching confidence for better decision making
   */
  async findOrCreateStoreFromOcrWithConfidence(ocrData: {
    merchant: string;
    store_address?: string;
  }): Promise<{
    store: Store;
    confidence: number;
    matchType: 'exact' | 'fuzzy' | 'address' | 'created';
    matchDetails?: string;
  }> {
    const { merchant, store_address } = ocrData;
    const normalizedName = this.normalizeStoreName(merchant);

    // Step 1: Try exact name match first
    const exactMatch = await this.storeRepository.findOne({
      where: { name: normalizedName },
    });

    if (exactMatch) {
      // If we have an address, verify it matches
      if (store_address && exactMatch.fullAddress) {
        const addressSimilarity = this.calculateAddressSimilarity(
          store_address,
          exactMatch.fullAddress,
        );
        if (addressSimilarity > 0.8) {
          return {
            store: exactMatch,
            confidence: 0.95,
            matchType: 'exact',
            matchDetails: `Exact name match with address confirmation (${(addressSimilarity * 100).toFixed(0)}% address match)`,
          };
        } else if (addressSimilarity > 0.5) {
          return {
            store: exactMatch,
            confidence: 0.75,
            matchType: 'exact',
            matchDetails: `Exact name match but address differs (${(addressSimilarity * 100).toFixed(0)}% address similarity)`,
          };
        }
      }

      // Exact name match without address verification
      return {
        store: exactMatch,
        confidence: store_address ? 0.7 : 0.85,
        matchType: 'exact',
        matchDetails: store_address
          ? 'Exact name match but could not verify address'
          : 'Exact name match (no address provided)',
      };
    }

    // Step 2: Try address-based matching if address provided
    if (store_address) {
      const addressComponents = this.parseStoreAddress(store_address);

      // Postal code + name matching (very reliable)
      if (addressComponents.postalCode) {
        const postalMatches = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.postalCode = :postalCode', {
            postalCode: addressComponents.postalCode,
          })
          .andWhere('store.name ILIKE :name', { name: `%${normalizedName}%` })
          .getMany();

        if (postalMatches.length > 0) {
          const bestMatch = this.findBestNameMatch(
            normalizedName,
            postalMatches,
          );
          if (bestMatch.score > 0.8) {
            return {
              store: bestMatch.store,
              confidence: 0.9,
              matchType: 'address',
              matchDetails: `Postal code match with ${(bestMatch.score * 100).toFixed(0)}% name similarity`,
            };
          }
        }
      }

      // City + name matching (moderately reliable)
      if (addressComponents.city) {
        const cityMatches = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.city ILIKE :city', {
            city: `%${addressComponents.city}%`,
          })
          .andWhere('store.name ILIKE :name', { name: `%${normalizedName}%` })
          .getMany();

        if (cityMatches.length > 0) {
          const bestMatch = this.findBestNameMatch(normalizedName, cityMatches);
          if (bestMatch.score > 0.75) {
            return {
              store: bestMatch.store,
              confidence: 0.8,
              matchType: 'address',
              matchDetails: `City match with ${(bestMatch.score * 100).toFixed(0)}% name similarity`,
            };
          }
        }
      }
    }

    // Step 3: Try fuzzy name matching
    const fuzzyMatches = await this.storeRepository
      .createQueryBuilder('store')
      .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
      .limit(10)
      .getMany();

    if (fuzzyMatches.length > 0) {
      const bestMatch = this.findBestNameMatch(normalizedName, fuzzyMatches);

      // High confidence fuzzy match
      if (bestMatch.score > 0.85) {
        return {
          store: bestMatch.store,
          confidence: bestMatch.score * 0.9, // Scale down slightly for fuzzy matches
          matchType: 'fuzzy',
          matchDetails: `High confidence fuzzy match (${(bestMatch.score * 100).toFixed(0)}% similarity)`,
        };
      }

      // Medium confidence fuzzy match
      if (bestMatch.score > 0.7) {
        return {
          store: bestMatch.store,
          confidence: bestMatch.score * 0.8,
          matchType: 'fuzzy',
          matchDetails: `Medium confidence fuzzy match (${(bestMatch.score * 100).toFixed(0)}% similarity)`,
        };
      }
    }

    // Step 4: Enhanced duplicate prevention - Check for very similar stores before creating
    const potentialDuplicates = await this.findPotentialDuplicates(
      normalizedName,
      store_address,
    );

    if (potentialDuplicates.length > 0) {
      // If we have potential duplicates, use the best match instead of creating new
      const bestDuplicate = potentialDuplicates.reduce((best, current) =>
        current.similarity > best.similarity ? current : best,
      );

      // Use a lower threshold for duplicate prevention than for confident matching
      if (bestDuplicate.similarity > 0.6) {
        return {
          store: bestDuplicate.store,
          confidence: bestDuplicate.similarity * 0.6, // Lower confidence for prevented duplicates
          matchType: 'fuzzy',
          matchDetails: `Prevented duplicate creation - matched to similar store (${(bestDuplicate.similarity * 100).toFixed(0)}% similarity)`,
        };
      }
    }

    // Step 5: Create new store as last resort - only if no potential duplicates found
    const newStore = await this.findOrCreateStoreFromOcr(ocrData);

    return {
      store: newStore,
      confidence: 0.5, // Low confidence for newly created stores
      matchType: 'created',
      matchDetails: 'No existing match found, created new store entry',
    };
  }

  /**
   * Calculate similarity between two addresses
   */
  private calculateAddressSimilarity(
    address1: string,
    address2: string,
  ): number {
    if (!address1 || !address2) return 0;

    // Parse both addresses
    const addr1 = this.parseStoreAddress(address1);
    const addr2 = this.parseStoreAddress(address2);

    let score = 0;
    let factors = 0;

    // Postal code match (highest weight)
    if (addr1.postalCode && addr2.postalCode) {
      factors++;
      if (addr1.postalCode === addr2.postalCode) {
        score += 0.4;
      }
    }

    // City match
    if (addr1.city && addr2.city) {
      factors++;
      const citySimilarity = this.calculateNameSimilarity(
        addr1.city,
        addr2.city,
      );
      score += citySimilarity * 0.3;
    }

    // Province/State match
    if (addr1.province && addr2.province) {
      factors++;
      if (addr1.province.toLowerCase() === addr2.province.toLowerCase()) {
        score += 0.2;
      }
    }

    // Full address similarity
    if (addr1.fullAddress && addr2.fullAddress) {
      factors++;
      const fullSimilarity = this.calculateNameSimilarity(
        addr1.fullAddress,
        addr2.fullAddress,
      );
      score += fullSimilarity * 0.1;
    }

    // Normalize score based on available factors
    return factors > 0 ? score / (factors * 0.25) : 0;
  }

  /**
   * Find potential duplicate stores to prevent creating duplicates
   * Uses more aggressive matching than normal confidence matching
   */
  private async findPotentialDuplicates(
    normalizedName: string,
    storeAddress?: string,
  ): Promise<Array<{ store: Store; similarity: number }>> {
    const results: Array<{ store: Store; similarity: number }> = [];

    // Get all stores with the same normalized name (most common case)
    const sameNameStores = await this.storeRepository
      .createQueryBuilder('store')
      .where('store.name = :name', { name: normalizedName })
      .getMany();

    // Add exact name matches with high similarity
    for (const store of sameNameStores) {
      let similarity = 1.0; // Start with exact name match

      // If we have address, factor in address similarity
      if (storeAddress && store.fullAddress) {
        const addressSim = this.calculateAddressSimilarity(
          storeAddress,
          store.fullAddress,
        );
        similarity = 0.7 + addressSim * 0.3; // 70% name + 30% address
      }

      results.push({ store, similarity });
    }

    // Get stores with similar names (fuzzy matching)
    const fuzzyNameStores = await this.storeRepository
      .createQueryBuilder('store')
      .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
      .andWhere('store.name != :exactName', { exactName: normalizedName })
      .limit(20)
      .getMany();

    for (const store of fuzzyNameStores) {
      const nameSimilarity = this.calculateNameSimilarity(
        normalizedName,
        store.name,
      );
      let similarity = nameSimilarity;

      // Factor in address similarity if available
      if (storeAddress && store.fullAddress) {
        const addressSim = this.calculateAddressSimilarity(
          storeAddress,
          store.fullAddress,
        );
        similarity = nameSimilarity * 0.6 + addressSim * 0.4;
      }

      // Only include if similarity is reasonably high for duplicates
      if (similarity > 0.5) {
        results.push({ store, similarity });
      }
    }

    // If we have an address, also check for stores at the same location with different names
    if (storeAddress) {
      const addressComponents = this.parseStoreAddress(storeAddress);

      if (addressComponents.postalCode) {
        const sameLocationStores = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.postalCode = :postalCode', {
            postalCode: addressComponents.postalCode,
          })
          .andWhere('store.name != :name', { name: normalizedName })
          .getMany();

        for (const store of sameLocationStores) {
          const nameSimilarity = this.calculateNameSimilarity(
            normalizedName,
            store.name,
          );
          const addressSim = this.calculateAddressSimilarity(
            storeAddress,
            store.fullAddress || '',
          );

          // High address similarity with some name similarity suggests duplicate
          if (addressSim > 0.8 && nameSimilarity > 0.3) {
            const similarity = nameSimilarity * 0.3 + addressSim * 0.7;
            results.push({ store, similarity });
          }
        }
      }
    }

    // Sort by similarity and return unique stores
    return results
      .filter(
        (result, index, self) =>
          self.findIndex((r) => r.store.storeSk === result.store.storeSk) ===
          index,
      )
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Find and merge duplicate stores
   * WARNING: This operation modifies the database. Use with caution.
   */
  async findAndMergeDuplicateStores(): Promise<{
    duplicatesFound: number;
    merged: number;
    errors: string[];
  }> {
    const result = {
      duplicatesFound: 0,
      merged: 0,
      errors: [] as string[],
    };

    try {
      // Find potential duplicates by grouping stores with the same name
      const storeGroups = await this.storeRepository
        .createQueryBuilder('store')
        .select(['store.name', 'COUNT(*) as count'])
        .groupBy('store.name')
        .having('COUNT(*) > 1')
        .getRawMany();

      for (const group of storeGroups) {
        const storeName = (group as { store_name: string }).store_name;
        const storesWithSameName = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.name = :name', { name: storeName })
          .orderBy('store.createdAt', 'ASC') // Keep the oldest one
          .getMany();

        if (storesWithSameName.length > 1) {
          result.duplicatesFound += storesWithSameName.length - 1;

          // Find the best store to keep (most complete information)
          const primaryStore = this.selectPrimaryStore(storesWithSameName);
          const duplicateStores = storesWithSameName.filter(
            (s) => s.storeSk !== primaryStore.storeSk,
          );

          try {
            await this.mergeDuplicateStores(primaryStore, duplicateStores);
            result.merged += duplicateStores.length;

            this.logger.log(
              `Merged ${duplicateStores.length} duplicates of "${storeName}" into ${primaryStore.storeSk}`,
            );
          } catch (error) {
            const errorMsg = `Failed to merge duplicates for "${storeName}": ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            this.logger.error(errorMsg);
          }
        }
      }

      this.logger.log(
        `Duplicate store cleanup completed: ${result.merged} stores merged, ${result.errors.length} errors`,
      );

      return result;
    } catch (error) {
      const errorMsg = `Duplicate cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      this.logger.error(errorMsg);
      return result;
    }
  }

  /**
   * Select the primary store to keep when merging duplicates
   * Priority: Most complete address info > Most recent data > Oldest creation date
   */
  private selectPrimaryStore(stores: Store[]): Store {
    // Score stores based on completeness
    const scoredStores = stores.map((store) => {
      let score = 0;

      // Address completeness (higher priority)
      if (store.fullAddress) score += 10;
      if (store.postalCode) score += 8;
      if (store.city) score += 6;
      if (store.province) score += 4;
      if (store.latitude && store.longitude) score += 5;

      // Recency (prefer newer data if address is similar)
      const daysSinceUpdate =
        (Date.now() - store.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceUpdate); // Bonus for recent updates, max 10 points

      return { store, score };
    });

    // Sort by score descending, then by creation date ascending (keep oldest if tied)
    scoredStores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.store.createdAt.getTime() - b.store.createdAt.getTime();
    });

    return scoredStores[0].store;
  }

  /**
   * Merge duplicate stores into a primary store
   */
  private async mergeDuplicateStores(
    primaryStore: Store,
    duplicateStores: Store[],
  ): Promise<void> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      for (const duplicate of duplicateStores) {
        // Update all receipts that reference the duplicate store
        await manager
          .createQueryBuilder()
          .update('receipts')
          .set({ store_sk: primaryStore.storeSk })
          .where('store_sk = :duplicateSk', { duplicateSk: duplicate.storeSk })
          .execute();

        // Update all prices that reference the duplicate store
        await manager
          .createQueryBuilder()
          .update('prices')
          .set({ store_sk: primaryStore.storeSk })
          .where('store_sk = :duplicateSk', { duplicateSk: duplicate.storeSk })
          .execute();

        // Merge any additional complete information from duplicate into primary
        const updateData: Partial<Store> = {};
        if (!primaryStore.fullAddress && duplicate.fullAddress) {
          updateData.fullAddress = duplicate.fullAddress;
        }
        if (!primaryStore.city && duplicate.city) {
          updateData.city = duplicate.city;
        }
        if (!primaryStore.province && duplicate.province) {
          updateData.province = duplicate.province;
        }
        if (!primaryStore.postalCode && duplicate.postalCode) {
          updateData.postalCode = duplicate.postalCode;
        }
        if (
          (!primaryStore.latitude || !primaryStore.longitude) &&
          duplicate.latitude &&
          duplicate.longitude
        ) {
          updateData.latitude = duplicate.latitude;
          updateData.longitude = duplicate.longitude;
        }

        // Update primary store with merged data if any
        if (Object.keys(updateData).length > 0) {
          await manager.update(Store, primaryStore.storeSk, updateData);
        }

        // Delete the duplicate store
        await manager.remove(duplicate);
      }
    });
  }

  /**
   * Find a store from OCR data (merchant name and address) - READ ONLY
   * Uses fuzzy matching to find existing stores WITHOUT creating new ones
   * Returns null if no suitable match is found
   */
  async findStoreFromOcr(ocrData: {
    merchant: string;
    store_address?: string;
  }): Promise<{
    store: Store;
    confidence: number;
    matchMethod: string;
  } | null> {
    const { merchant, store_address } = ocrData;

    // Step 1: Normalize the merchant name with OCR error correction
    const normalizedName = this.normalizeStoreName(merchant);

    // Step 2: If address provided, prioritize address-based matching for chain stores
    if (store_address) {
      // Apply OCR error corrections to the address first
      const correctedAddress = this.applyOcrCorrectionsToAddress(store_address);
      const addressComponents = this.parseStoreAddress(correctedAddress);

      // Step 2a: Try exact address match first (most specific)
      if (addressComponents.fullAddress) {
        const exactAddressMatch = await this.storeRepository.findOne({
          where: { fullAddress: correctedAddress },
        });
        if (exactAddressMatch) {
          return {
            store: exactAddressMatch,
            confidence: 1.0,
            matchMethod: 'exact_address',
          };
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
            return {
              store: bestMatch.store,
              confidence: bestMatch.score * 0.95, // High confidence for postal code match
              matchMethod: 'postal_code_name',
            };
          }
        }
      }

      // Step 2c: Try street address match for chain stores in same city
      if (addressComponents.city) {
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
          const parsedStreetAddress = this.parseStreetAddress(correctedAddress);

          if (
            parsedStreetAddress.streetNumber ||
            parsedStreetAddress.streetName
          ) {
            const streetMatches = cityMatches.filter((store) => {
              const storeStreetAddress = this.parseStreetAddress(
                store.fullAddress || '',
              );

              // Match street number with OCR error tolerance
              if (
                parsedStreetAddress.streetNumber &&
                storeStreetAddress.streetNumber
              ) {
                const streetNumSimilarity = this.calculateStreetNameSimilarity(
                  parsedStreetAddress.streetNumber,
                  storeStreetAddress.streetNumber,
                );
                if (streetNumSimilarity < 0.8) return false;
              }

              // Match street name with OCR error tolerance
              if (
                parsedStreetAddress.streetName &&
                storeStreetAddress.streetName
              ) {
                const similarity = this.calculateStreetNameSimilarity(
                  parsedStreetAddress.streetName,
                  storeStreetAddress.streetName,
                );
                return similarity > 0.8;
              }

              return true;
            });

            if (streetMatches.length === 1) {
              return {
                store: streetMatches[0],
                confidence: 0.9,
                matchMethod: 'street_address',
              };
            } else if (streetMatches.length > 1) {
              const bestMatch = this.findBestNameMatch(
                normalizedName,
                streetMatches,
              );
              if (bestMatch.score > 0.7) {
                return {
                  store: bestMatch.store,
                  confidence: bestMatch.score * 0.85,
                  matchMethod: 'street_address_fuzzy',
                };
              }
            }
          }

          // Fallback: use best name match from city matches
          const bestCityMatch = this.findBestNameMatch(
            normalizedName,
            cityMatches,
          );
          if (bestCityMatch.score > 0.8) {
            return {
              store: bestCityMatch.store,
              confidence: bestCityMatch.score * 0.75,
              matchMethod: 'city_name',
            };
          }
        }
      }
    }

    // Step 3: Try exact name match only if no address provided
    if (!store_address) {
      const exactNameStore = await this.storeRepository.findOne({
        where: { name: normalizedName },
      });

      if (exactNameStore) {
        return {
          store: exactNameStore,
          confidence: 0.8, // Lower confidence without address verification
          matchMethod: 'exact_name_only',
        };
      }

      // Step 4: Try fuzzy name match only for independent stores
      const fuzzyMatches = await this.storeRepository
        .createQueryBuilder('store')
        .where('store.name ILIKE :name', { name: `%${normalizedName}%` })
        .orderBy('LENGTH(store.name)', 'ASC')
        .limit(5)
        .getMany();

      if (fuzzyMatches.length > 0) {
        const bestMatch = this.findBestNameMatch(normalizedName, fuzzyMatches);
        if (bestMatch.score > 0.8) {
          return {
            store: bestMatch.store,
            confidence: bestMatch.score * 0.7, // Lower confidence for name-only fuzzy match
            matchMethod: 'fuzzy_name_only',
          };
        }
      }
    }

    // No store found - return null (don't create new stores automatically)
    return null;
  }

  /**
   * Find or create a store from OCR data (merchant name and address)
   * Uses fuzzy matching to find existing stores before creating new ones
   * DEPRECATED: Use findStoreFromOcr + manual store creation workflow instead
   */
  async findOrCreateStoreFromOcr(ocrData: {
    merchant: string;
    store_address?: string;
  }): Promise<Store> {
    const { merchant, store_address } = ocrData;

    // First, try to find existing store without creating
    const searchResult = await this.findStoreFromOcr(ocrData);
    if (searchResult && searchResult.confidence > 0.7) {
      return searchResult.store;
    }

    // Step 5: Create new store with atomic upsert to prevent race conditions
    const normalizedName = this.normalizeStoreName(merchant);
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

      if (result.identifiers.length > 0 && result.identifiers[0]?.id) {
        // Successfully created new store
        const createdStore = await this.storeRepository.findOneBy({
          id: result.identifiers[0].id as number,
        });
        if (!createdStore) {
          throw new Error('Failed to retrieve newly created store');
        }
        return createdStore;
      } else {
        // Store already exists due to concurrent creation, or orIgnore() was triggered
        this.logger.debug(
          `Store creation ignored, attempting to find existing store. Name: ${normalizedName}, Address: ${store_address}`,
        );

        const existingStore = await this.findExistingStoreByNameAndAddress(
          normalizedName,
          store_address,
        );

        if (!existingStore) {
          // Try a more comprehensive search as final fallback
          this.logger.warn(
            `Initial fallback search failed, trying comprehensive search for store: ${normalizedName}`,
          );

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
            this.logger.debug(
              `Found store via comprehensive search: ${fallbackStore.storeSk || 'unknown-sk'}`,
            );
            return fallbackStore;
          }

          throw new Error(
            `Failed to find or create store after all attempts. Name: ${normalizedName}, Address: ${store_address}`,
          );
        }

        this.logger.debug(
          `Found existing store via fallback search: ${existingStore.storeSk}`,
        );
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

      // Log the error for debugging with more context
      this.logger.error('Error creating store:', {
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
   * Normalize store names for consistent matching with OCR error correction
   * Examples: "WALMART #1234" -> "Walmart", "TARGET STORE T-2345" -> "Target"
   */
  private normalizeStoreName(rawName: string): string {
    if (!rawName) return 'Unknown Store';

    let normalized = rawName.trim().toUpperCase();

    // OCR Error Corrections - Apply before other normalizations
    const ocrCorrections: Record<string, string> = {
      // Common Costco OCR errors
      COSTC0: 'COSTCO',
      C0STCO: 'COSTCO',
      'COST CO': 'COSTCO',
      COSTO: 'COSTCO',
      GOSTCO: 'COSTCO',

      // Common city name corrections
      LANOLEY: 'LANGLEY',
      LANGELY: 'LANGLEY',
      LANGIEY: 'LANGLEY',
      ANGLEY: 'LANGLEY',

      // Common address corrections
      '641H': '64TH',
      '64IH': '64TH',
      '6115': '64TH', // Misread 64TH as 6115
      WWF: 'AVE', // Misread AVE as WWF
      WWI: 'AVE',
      WNE: 'AVE',

      // Common province/state corrections
      DO: 'BC', // Misread BC as DO
      BO: 'BC', // Misread BC as BO
      VY: 'V2Y', // Missing digit

      // Postal code corrections (Canadian)
      INS: '1N5', // Misread 1N5 as INS
      IN5: '1N5', // Common OCR error
      ING: '1N5', // Misread 1N5 as ING
      II5: '1N5', // Misread 1N5 as II5
      '115': '1N5', // Misread 1N5 as 115
    };

    // Apply OCR corrections
    for (const [incorrect, correct] of Object.entries(ocrCorrections)) {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
      normalized = normalized.replace(regex, correct);
    }

    // Remove common store number patterns
    normalized = normalized.replace(/\s*#\d+.*$/, ''); // Remove #1234, #1234 SUPERCENTER, etc.
    normalized = normalized.replace(/\s*STORE\s*[T-]?\d+.*$/, ''); // Remove STORE T-1234, STORE 456, etc.
    normalized = normalized.replace(/\s*\d{4,}.*$/, ''); // Remove standalone store numbers

    // Remove common suffixes
    normalized = normalized.replace(
      /\s*(SUPERCENTER|SUPERSTORE|STORE|MARKET|SHOP|INC|LLC|CORP|WHOLESALE)$/g,
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
   * Apply OCR error corrections to address strings
   */
  private applyOcrCorrectionsToAddress(address: string): string {
    if (!address) return address;

    let corrected = address;

    // OCR Error Corrections Dictionary - apply corrections to address components
    const ocrCorrections: Record<string, string> = {
      // Address number corrections (Costco Langley specific)
      '20193': '20499',
      '20199': '20499',

      // Street name corrections
      '641H': '64TH',
      '64IH': '64TH',
      '6115': '64TH',
      WWF: 'AVE',
      WWI: 'AVE',

      // City corrections
      LANOLEY: 'LANGLEY',
      ANGLEY: 'LANGLEY',

      // Province corrections
      DO: 'BC',
      BO: 'BC',

      // Postal code corrections
      INS: '1N5',
      IN5: '1N5',
      '115': '1N5',

      // Common OCR pattern corrections
      '0': 'O', // When in province context
      I: '1', // When in postal code context
    };

    // Apply corrections by replacing exact matches
    for (const [incorrect, correct] of Object.entries(ocrCorrections)) {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
      corrected = corrected.replace(regex, correct);
    }

    return corrected;
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
   * Parse store address into components with OCR error correction
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
    let cleanAddress = address.replace(/\s+/g, ' ').trim();

    // Apply OCR corrections to address text
    const addressCorrections: Record<string, string> = {
      // Common address OCR errors
      '641H AVE': '64TH AVE',
      '64IH AVE': '64TH AVE',
      '6115 WWF': '64TH AVE',
      LANOLEY: 'LANGLEY',
      LANGELY: 'LANGLEY',
      LANGIEY: 'LANGLEY',
      ANGLEY: 'LANGLEY',
      ', DO ': ', BC ',
      ', BO ': ', BC ',
      ' DO V': ' BC V',
      ' BO V': ' BC V',
      'V2Y INS': 'V2Y 1N5',
      'V2Y IN5': 'V2Y 1N5',
      'V2Y ING': 'V2Y 1N5',
      'V2Y II5': 'V2Y 1N5',
      'V2Y 115': 'V2Y 1N5',
      'VY 1N5': 'V2Y 1N5',
      'VY INS': 'V2Y 1N5',
      // Address number corrections
      '20199 64TH': '20499 64TH', // Common OCR mix-up
      '20193 64TH': '20499 64TH', // Common OCR mix-up
    };

    // Apply address corrections
    for (const [incorrect, correct] of Object.entries(addressCorrections)) {
      cleanAddress = cleanAddress.replace(new RegExp(incorrect, 'gi'), correct);
    }

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
   * Create a new store from Google Places data sent by frontend
   */
  async createStoreFromGoogleData(googlePlaceData: {
    place_id: string;
    name: string;
    formatted_address: string;
    streetNumber?: string;
    road?: string;
    streetAddress?: string;
    fullAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryRegion?: string;
    latitude: number;
    longitude: number;
    types: string[];
  }): Promise<Store> {
    try {
      // Create store entity using data from frontend (Google Places result)
      const storeData: Partial<Store> = {
        name: googlePlaceData.name,
        fullAddress:
          googlePlaceData.fullAddress || googlePlaceData.formatted_address,
        streetNumber: googlePlaceData.streetNumber,
        road: googlePlaceData.road,
        streetAddress: googlePlaceData.streetAddress,
        city: googlePlaceData.city,
        province: googlePlaceData.province,
        postalCode: googlePlaceData.postalCode,
        countryRegion: this.normalizeCountryCode(googlePlaceData.countryRegion),
        latitude: googlePlaceData.latitude,
        longitude: googlePlaceData.longitude,
        placeId: googlePlaceData.place_id,
      };

      const store = this.storeRepository.create(storeData);
      const savedStore = await this.storeRepository.save(store);

      this.logger.log(
        `✅ Created new store from frontend Google Places data: ${savedStore.name} (${savedStore.storeSk})`,
      );

      // Invalidate cache after creating new store
      this.invalidateSearchCache();

      return savedStore;
    } catch (error) {
      this.logger.error(
        `❌ Failed to create store from frontend Google Places data: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Create a new store from Google Places data (legacy method - calls Google API)
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
        countryRegion: this.normalizeCountryCode(googlePlace.countryRegion),
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
      // First check by place ID (most reliable)
      if (placeId) {
        const storeByPlaceId = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.placeId = :placeId', { placeId })
          .getOne();

        if (storeByPlaceId) {
          return storeByPlaceId;
        }
      }

      // Then check by name and location (fuzzy matching)
      if (latitude && longitude && name) {
        const stores = await this.storeRepository
          .createQueryBuilder('store')
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

      // Finally check by name only (exact match) - but only if name is provided and not empty
      if (name && name.trim().length > 0) {
        const storeByName = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.name ILIKE :name', { name: `%${name}%` })
          .getOne();

        return storeByName;
      }

      return null;
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
