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
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
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
      address: storeData.address,
      city: storeData.city,
      province: storeData.province,
      postalCode: storeData.postalCode,
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
    if (storeData.address !== undefined) store.address = storeData.address;
    if (storeData.city !== undefined) store.city = storeData.city;
    if (storeData.province !== undefined) store.province = storeData.province;
    if (storeData.postalCode !== undefined)
      store.postalCode = storeData.postalCode;
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
      address: store.address,
      city: store.city,
      province: store.province,
      postalCode: store.postalCode,
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
      address: rawStore.address,
      city: rawStore.city,
      province: rawStore.province,
      postalCode: rawStore.postal_code,
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

    // Step 2: Try exact match first
    const store = await this.storeRepository.findOne({
      where: { name: normalizedName },
    });

    if (store) {
      return store;
    }

    // Step 3: Try fuzzy match (case-insensitive, partial match)
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
        // 80% similarity threshold
        return bestMatch.store;
      }
    }

    // Step 4: If address provided, try to find nearby stores with similar names
    if (store_address) {
      // Parse address components (basic implementation)
      const addressComponents = this.parseStoreAddress(store_address);

      if (addressComponents.city || addressComponents.province) {
        const nearbyStores = await this.storeRepository
          .createQueryBuilder('store')
          .where('store.name ILIKE :name', {
            name: `%${normalizedName.split(' ')[0]}%`,
          })
          .andWhere(addressComponents.city ? 'store.city ILIKE :city' : '1=1', {
            city: `%${addressComponents.city}%`,
          })
          .andWhere(
            addressComponents.province
              ? 'store.province ILIKE :province'
              : '1=1',
            { province: `%${addressComponents.province}%` },
          )
          .limit(3)
          .getMany();

        if (nearbyStores.length > 0) {
          const bestMatch = this.findBestNameMatch(
            normalizedName,
            nearbyStores,
          );
          if (bestMatch.score > 0.7) {
            // Lower threshold for location matches
            return bestMatch.store;
          }
        }
      }
    }

    // Step 5: Create new store if no match found
    const addressComponents = store_address
      ? this.parseStoreAddress(store_address)
      : {};

    const newStore = this.storeRepository.create({
      name: normalizedName,
      address: store_address || addressComponents.fullAddress,
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
