import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

// Full Google Places API response (used internally)
interface GooglePlaceApiResult {
  place_id: string;
  name: string;
  formatted_address?: string; // Sometimes missing in Nearby Search
  vicinity?: string; // Alternative address field used in Nearby Search
  address_components?: GoogleAddressComponent[]; // Optional since some responses don't include it
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  business_status?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
  };
}

// Simplified Google Places result (only essential fields for our use case)
export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  // Address fields matching Store entity structure
  streetNumber?: string;
  road?: string;
  streetAddress?: string; // Combined street number + road
  fullAddress?: string; // Complete formatted address (same as formatted_address)
  city?: string;
  province?: string;
  postalCode?: string;
  countryRegion?: string;
  latitude: number;
  longitude: number;

  types: string[];
  distance?: number; // Distance in kilometers (added when location provided)
}

export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GooglePlacesSearchResponse {
  results: GooglePlaceApiResult[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface GooglePlaceDetailsResponse {
  result: GooglePlaceApiResult;
  status: string;
  error_message?: string;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  // Store types we want to include (supermarkets, grocery stores)
  private readonly includedTypes = [
    'supermarket',
    'grocery_or_supermarket',
    'store',
    'food',
    'establishment',
  ];

  // Store types we want to exclude (non-grocery businesses)
  // Note: 'pharmacy' and 'health' removed because many grocery stores have pharmacies
  private readonly excludedTypes = [
    'hospital',
    'doctor',
    'bank',
    'atm',
    'gas_station',
    'car_dealer',
    'car_rental',
    'car_repair',
    'restaurant',
    'meal_takeaway',
    'meal_delivery',
    'cafe',
    'bar',
    'night_club',
    'lodging',
    'tourist_attraction',
    'amusement_park',
    'zoo',
    'gym',
    'beauty_salon',
    'hair_care',
    'spa',
  ];

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!this.apiKey) {
      this.logger.warn(
        '🚨 GOOGLE_PLACES_API_KEY not found in environment variables',
      );
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert full Google Places API result to simplified result (only essential fields)
   */
  private simplifyGooglePlace(place: GooglePlaceApiResult): GooglePlaceResult {
    // Use formatted_address if available, otherwise use vicinity as fallback
    const address =
      place.formatted_address || place.vicinity || 'Address not available';

    // Parse address components if available
    const parsedAddress = this.parseAddressComponents(place.address_components);

    return {
      place_id: place.place_id,
      name: place.name,
      formatted_address: address,

      // Address fields matching Store entity structure
      streetNumber: parsedAddress.streetNumber,
      road: parsedAddress.route,
      streetAddress: parsedAddress.streetAddress,
      fullAddress: address, // Same as formatted_address
      city: parsedAddress.city,
      province: parsedAddress.province,
      postalCode: parsedAddress.postalCode,
      countryRegion: parsedAddress.country,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,

      types: place.types,
      // distance will be added later if location is provided
    };
  }

  /**
   * Find stores nearby using includedTypes/excludedTypes pattern (similar to Google client)
   * Mimics: client.placesNearby({ location, radius, includedTypes, excludedTypes })
   */
  async findStoresNearby(params: {
    location: { lat: number; lng: number };
    radius?: number; // in meters
    includedTypes?: string[]; // override default included types
    excludedTypes?: string[]; // override default excluded types
    keyword?: string; // additional search keyword
  }): Promise<GooglePlaceResult[]> {
    if (!this.apiKey) {
      this.logger.warn('Google Places API key not configured');
      return [];
    }

    const {
      location,
      radius = 5000, // default 5km
      includedTypes = this.includedTypes,
      excludedTypes = this.excludedTypes,
      keyword,
    } = params;

    try {
      const searchUrl = `${this.baseUrl}/nearbysearch/json`;
      let response: AxiosResponse<GooglePlacesSearchResponse> | null = null;

      // Try specific brand search first if keyword provided
      if (keyword) {
        // Use the most relevant included type for the API call
        const primaryType = includedTypes.includes('supermarket')
          ? 'supermarket'
          : includedTypes[0] || 'establishment';

        // Try multiple search strategies for better brand matching
        const searchStrategies = [
          { keyword: keyword, type: 'establishment' }, // Original query with broader type (most likely to succeed)
          { keyword: keyword, type: primaryType }, // Original query with primary type
          { keyword: keyword.replace(/\s+/g, '-'), type: 'establishment' }, // Replace spaces with hyphens: "save on foods" → "save-on-foods"
          { keyword: keyword.replace(/\s+/g, ''), type: 'establishment' }, // Remove spaces: "save on foods" → "saveonfoods"
        ];

        // Multiple search strategies for better brand matching

        // Try each strategy until we get results
        for (const strategy of searchStrategies) {
          const searchParams = {
            key: this.apiKey,
            location: `${location.lat},${location.lng}`,
            radius: Math.min(radius, 50000), // Max 50km per Google API limits
            type: strategy.type,
            keyword: strategy.keyword,
          };

          // Try current search strategy

          const tempResponse: AxiosResponse<GooglePlacesSearchResponse> =
            await axios.get(searchUrl, {
              params: searchParams,
              timeout: 10000,
            });

          // Check strategy results

          // If this strategy succeeds and returns results, use it
          if (
            tempResponse.data.status === 'OK' &&
            tempResponse.data.results?.length > 0
          ) {
            response = tempResponse;
            // Found results with this strategy
            break;
          }
        }

        // If no brand search strategy worked, try general grocery search
        if (
          !response ||
          response.data.status !== 'OK' ||
          response.data.results.length === 0
        ) {
          // All brand strategies failed, try general search

          const generalSearchParams = {
            key: this.apiKey,
            location: `${location.lat},${location.lng}`,
            radius: Math.min(radius, 50000),
            type: 'supermarket',
            keyword: 'grocery supermarket',
          };

          response = await axios.get(searchUrl, {
            params: generalSearchParams,
            timeout: 10000,
          });
        }
      } else {
        // No keyword provided, do general search with primary type
        const primaryType = includedTypes.includes('supermarket')
          ? 'supermarket'
          : includedTypes[0] || 'establishment';

        const searchParams = {
          key: this.apiKey,
          location: `${location.lat},${location.lng}`,
          radius: Math.min(radius, 50000), // Max 50km per Google API limits
          type: primaryType,
        };

        // General search without specific keyword

        response = await axios.get(searchUrl, {
          params: searchParams,
          timeout: 10000,
        });
      }

      // Check if we have a valid response
      if (!response || response.data.status !== 'OK') {
        this.logger.warn(
          `Google Places API returned status: ${response?.data.status || 'NO_RESPONSE'}`,
          response?.data.error_message,
        );
        return [];
      }

      // Process Google Places API response

      // Apply includedTypes/excludedTypes filtering AND keyword relevance filtering
      const filteredResults = response.data.results.filter((place) => {
        // Check included types
        const hasIncludedType = place.types.some((type) =>
          includedTypes.includes(type),
        );

        // Check excluded types
        const hasExcludedType = place.types.some((type) =>
          excludedTypes.includes(type),
        );

        // If we have a keyword, use flexible matching for brand names
        let matchesKeyword = true;
        if (keyword) {
          matchesKeyword = this.isRelevantStore(place.name, keyword);
        }

        const isRelevant =
          hasIncludedType && !hasExcludedType && matchesKeyword;

        // Filter out irrelevant places

        return isRelevant;
      });

      // Simplify results to only essential fields and calculate distance
      // For better address info, we'll need to make Place Details calls for each result
      const simplifiedResults = await Promise.all(
        filteredResults.map(async (place) => {
          // Get detailed place information including full address
          const detailedPlace = await this.getPlaceDetailsInternal(
            place.place_id,
          );
          const placeToUse = detailedPlace || place; // Fallback to basic info if details fail

          const simplified = this.simplifyGooglePlace(placeToUse);
          const distance = this.calculateDistance(
            location.lat,
            location.lng,
            place.geometry.location.lat,
            place.geometry.location.lng,
          );
          return {
            ...simplified,
            distance: parseFloat(distance.toFixed(2)), // Round to 2 decimal places
          };
        }),
      );

      // Results processed and simplified

      // Sort by distance (nearest first)
      simplifiedResults.sort((a, b) => a.distance - b.distance);

      this.logger.log(
        `📍 Found ${simplifiedResults.length} stores near ${location.lat},${location.lng} within ${radius / 1000}km (sorted by distance)`,
      );

      return simplifiedResults;
    } catch (error) {
      this.logger.error(
        `❌ Google Places findStoresNearby failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * Search for stores near a location using Google Places API
   */
  async searchStoresNearLocation(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    query?: string;
  }): Promise<GooglePlaceResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const { latitude, longitude, radiusKm = 5, query } = params;
    const radiusMeters = radiusKm * 1000; // Convert km to meters

    try {
      let response: AxiosResponse<GooglePlacesSearchResponse> | null = null;

      // Try specific brand search first if query provided
      if (query) {
        const searchUrl = `${this.baseUrl}/nearbysearch/json`;

        // Try multiple search strategies for better brand matching
        const searchStrategies = [
          { keyword: query, type: 'establishment' }, // Original query with broader type (most likely to succeed)
          { keyword: query, type: 'supermarket' }, // Original query with supermarket type
          { keyword: query.replace(/\s+/g, '-'), type: 'establishment' }, // Replace spaces with hyphens: "save on foods" → "save-on-foods"
          { keyword: query.replace(/\s+/g, ''), type: 'establishment' }, // Remove spaces: "save on foods" → "saveonfoods"
        ];

        // Try each strategy until we get results
        for (const strategy of searchStrategies) {
          const brandSearchParams = {
            key: this.apiKey,
            location: `${latitude},${longitude}`,
            radius: Math.min(radiusMeters, 50000), // Max 50km
            keyword: strategy.keyword,
            type: strategy.type,
          };

          // Try current search strategy

          const tempResponse: AxiosResponse<GooglePlacesSearchResponse> =
            await axios.get(searchUrl, {
              params: brandSearchParams,
              timeout: 10000,
            });

          // Check strategy results

          // If this strategy succeeds and returns results, use it
          if (
            tempResponse.data.status === 'OK' &&
            tempResponse.data.results?.length > 0
          ) {
            response = tempResponse;
            // Found results with this strategy
            break;
          }
        }

        // If no brand search strategy worked, try general grocery search
        if (
          !response ||
          response.data.status !== 'OK' ||
          response.data.results.length === 0
        ) {
          const generalSearchParams = {
            key: this.apiKey,
            location: `${latitude},${longitude}`,
            radius: Math.min(radiusMeters, 50000),
            type: 'supermarket',
            keyword: 'grocery supermarket',
          };

          response = await axios.get(searchUrl, {
            params: generalSearchParams,
            timeout: 10000,
          });
        }
      } else {
        // No specific query, do general grocery search
        const searchUrl = `${this.baseUrl}/nearbysearch/json`;
        const generalSearchParams = {
          key: this.apiKey,
          location: `${latitude},${longitude}`,
          radius: Math.min(radiusMeters, 50000),
          type: 'supermarket',
          keyword: 'grocery supermarket',
        };

        response = await axios.get(searchUrl, {
          params: generalSearchParams,
          timeout: 10000,
        });
      }

      // Check if we have a valid response
      if (!response || response.data.status !== 'OK') {
        this.logger.warn(
          `Google Places API returned status: ${response?.data.status || 'NO_RESPONSE'}`,
          response?.data.error_message,
        );
        return [];
      }

      // Filter results to only include grocery/supermarket types
      const filteredResults = response.data.results.filter((place) =>
        this.isGroceryStore(place),
      );

      // Simplify results to only essential fields and calculate distance
      const simplifiedResults = filteredResults.map((place) => {
        const simplified = this.simplifyGooglePlace(place);
        const distance = this.calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng,
        );
        return {
          ...simplified,
          distance: parseFloat(distance.toFixed(2)), // Round to 2 decimal places
        };
      });

      // Sort by distance (nearest first)
      simplifiedResults.sort((a, b) => a.distance - b.distance);

      this.logger.log(
        `📍 Found ${simplifiedResults.length} grocery stores near ${latitude},${longitude} within ${radiusKm}km (sorted by distance)`,
      );

      return simplifiedResults;
    } catch (error) {
      this.logger.error(
        `❌ Google Places search failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * Search for stores by text query using Google Places API
   */
  async searchStoresByText(params: {
    query: string;
    location?: { latitude: number; longitude: number };
    radiusKm?: number;
  }): Promise<GooglePlaceResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const { query, location, radiusKm = 10 } = params;

    try {
      const searchUrl = `${this.baseUrl}/textsearch/json`;
      const searchParams: Record<string, unknown> = {
        key: this.apiKey,
        query: `${query} grocery store supermarket`,
        type: 'supermarket',
      };

      // Add location bias if provided
      if (location) {
        const radiusMeters = radiusKm * 1000;
        searchParams.location = `${location.latitude},${location.longitude}`;
        searchParams.radius = Math.min(radiusMeters, 50000);
      }

      const response: AxiosResponse<GooglePlacesSearchResponse> =
        await axios.get(searchUrl, {
          params: searchParams,
          timeout: 10000,
        });

      if (response.data.status !== 'OK') {
        this.logger.warn(
          `Google Places API returned status: ${response.data.status}`,
          response.data.error_message,
        );
        return [];
      }

      // Filter results to only include grocery/supermarket types
      const filteredResults = response.data.results.filter((place) =>
        this.isGroceryStore(place),
      );

      // Simplify results to only essential fields
      const simplifiedResults = filteredResults.map((place) =>
        this.simplifyGooglePlace(place),
      );

      this.logger.log(
        `🔍 Found ${simplifiedResults.length} grocery stores for query: "${query}"`,
      );

      return simplifiedResults;
    } catch (error) {
      this.logger.error(
        `❌ Google Places text search failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * Get detailed information about a specific place (internal format)
   */
  private async getPlaceDetailsInternal(
    placeId: string,
  ): Promise<GooglePlaceApiResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const detailsUrl = `${this.baseUrl}/details/json`;
      const detailsParams = {
        key: this.apiKey,
        place_id: placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'address_components',
          'geometry',
          'business_status',
          'types',
          'rating',
          'user_ratings_total',
          'opening_hours',
          'vicinity', // Sometimes used instead of formatted_address
        ].join(','),
      };

      const response: AxiosResponse<GooglePlaceDetailsResponse> =
        await axios.get(detailsUrl, {
          params: detailsParams,
          timeout: 10000,
        });

      if (response.data.status !== 'OK') {
        this.logger.warn(
          `Google Places details API returned status: ${response.data.status}`,
          response.data.error_message,
        );
        return null;
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(
        `❌ Google Places details failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  /**
   * Get detailed information about a specific place (public method)
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
    const result = await this.getPlaceDetailsInternal(placeId);
    return result ? this.simplifyGooglePlace(result) : null;
  }

  /**
   * Check if a store name is relevant to the search keyword (flexible brand matching)
   */
  private isRelevantStore(storeName: string, keyword: string): boolean {
    // Normalize function: remove spaces, hyphens, apostrophes, make lowercase
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[-\s'&.]/g, '') // Remove hyphens, spaces, apostrophes, ampersands, dots
        .replace(/foods?$/i, '') // Remove trailing "food" or "foods"
        .replace(/stores?$/i, '') // Remove trailing "store" or "stores"
        .replace(/markets?$/i, ''); // Remove trailing "market" or "markets"

    const normalizedStoreName = normalize(storeName);
    const normalizedKeyword = normalize(keyword);

    // Direct contains check
    if (normalizedStoreName.includes(normalizedKeyword)) {
      return true;
    }

    // Split keyword into words and check if any significant word matches
    const keywordWords = normalizedKeyword
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const storeWords = normalizedStoreName
      .split(/\s+/)
      .filter((word) => word.length > 2);

    // Check if any keyword word appears in store name
    const hasWordMatch = keywordWords.some((keywordWord) =>
      storeWords.some(
        (storeWord) =>
          storeWord.includes(keywordWord) || keywordWord.includes(storeWord),
      ),
    );

    return hasWordMatch;
  }

  /**
   * Check if a place is a grocery store/supermarket
   */
  private isGroceryStore(place: GooglePlaceApiResult): boolean {
    // Check if place types include grocery/supermarket types (includedTypes pattern)
    const hasIncludedType = place.types.some((type) =>
      this.includedTypes.includes(type),
    );

    // Check if place types include excluded types (excludedTypes pattern)
    const hasExcludedType = place.types.some((type) =>
      this.excludedTypes.includes(type),
    );

    // Additional keyword filtering for name/address for edge cases
    const nameOrAddress =
      `${place.name} ${place.formatted_address}`.toLowerCase();
    const hasGroceryKeywords = [
      'supermarket',
      'grocery',
      'market',
      'food mart',
      'food store',
      'costco',
      'walmart',
      'safeway',
      'kroger',
      'whole foods',
      'trader joe',
      'save on foods', // Canadian chain
      'save-on-foods',
      'loblaws',
      'metro',
      'iga',
      'sobeys',
      'freshco',
      'no frills',
      'real canadian superstore',
      'superstore',
      'provigo',
    ].some((keyword) => nameOrAddress.includes(keyword));

    // Final decision: must have included type OR grocery keywords, AND not have excluded type
    const isGrocery =
      (hasIncludedType || hasGroceryKeywords) && !hasExcludedType;

    return isGrocery;
  }

  /**
   * Parse Google address components into structured data
   */
  parseAddressComponents(addressComponents?: GoogleAddressComponent[]): {
    streetNumber?: string;
    route?: string;
    streetAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  } {
    const components: Record<string, string> = {};

    // Handle case where address_components might be undefined or null
    if (!addressComponents || !Array.isArray(addressComponents)) {
      return {
        streetNumber: undefined,
        route: undefined,
        streetAddress: undefined,
        city: undefined,
        province: undefined,
        postalCode: undefined,
        country: undefined,
      };
    }

    addressComponents.forEach((component) => {
      if (component.types.includes('street_number')) {
        components.streetNumber = component.long_name;
      } else if (component.types.includes('route')) {
        components.route = component.long_name;
      } else if (component.types.includes('locality')) {
        components.city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        components.province = component.short_name;
      } else if (component.types.includes('postal_code')) {
        components.postalCode = component.long_name;
      } else if (component.types.includes('country')) {
        components.country = component.long_name;
      }
    });

    // Combine street number and route for street address
    const streetAddress = [components.streetNumber, components.route]
      .filter(Boolean)
      .join(' ');

    return {
      streetNumber: components.streetNumber,
      route: components.route,
      streetAddress: streetAddress || undefined,
      city: components.city,
      province: components.province,
      postalCode: components.postalCode,
      country: components.country,
    };
  }
}
