import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreDTO } from '../../../packages/types/dto/store';
import { Store } from '../entities/store.entity';

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
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
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
      .having('distance <= :radiusKm')
      .orderBy('distance', 'ASC')
      .limit(limit)
      .setParameters({ latitude, longitude, radiusKm })
      .getRawMany();

    return stores.map((store: RawStoreQueryResult) => ({
      ...this.mapRawStoreToDTO(store),
      distance: parseFloat(store.distance || '0'),
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
        .having('distance <= :radiusKm')
        .setParameter('radiusKm', radiusKm)
        .orderBy('distance', 'ASC');
    } else {
      query = query.orderBy('store.name', 'ASC');
    }

    const stores = await query.limit(limit).getRawMany();

    return stores.map((store: RawStoreQueryResult) => ({
      ...this.mapRawStoreToDTO(store),
      distance: store.distance ? parseFloat(store.distance) : 0,
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

  private mapStoreToDTO(store: Store): StoreDTO {
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

    // Step 5: Create new store if no match found
    const addressComponents = store_address
      ? this.parseStoreAddress(store_address)
      : {};

    const newStore = this.storeRepository.create({
      name: normalizedName,
      fullAddress: store_address || addressComponents.fullAddress,
      city: addressComponents.city,
      province: addressComponents.province,
      postalCode: addressComponents.postalCode,
    });

    return await this.storeRepository.save(newStore);
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
}
