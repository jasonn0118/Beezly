import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { reverseGeocode } from './geocode-util';
import { StoreDTO } from '../../../packages/types/dto/store';
import * as dotenv from 'dotenv';

dotenv.config();

interface GooglePlaceResult {
  name: string;
  formatted_address?: string;
  place_id: string;
  types?: string[];
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
}

@Injectable()
export class GooglePlacesStoreService {
  private googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  private baseUrl =
    'https://maps.googleapis.com/maps/api/place/textsearch/json';

  private allowedTypes = new Set([
    'department_store',
    'supermarket',
    'convenience_store',
    'warehouse_store',
    'korean_grocery_store',
  ]);

  async fetchAndSaveStoresInBC(keywords: string[]) {
    console.log('KEY', this.googleApiKey);
    for (const keyword of keywords) {
      console.log(`Fetching stores for keyword: ${keyword} in BC`);
      const url = `${this.baseUrl}?query=${encodeURIComponent(
        `${keyword} in British Columbia, Canada`,
      )}&key=${this.googleApiKey}`;

      const response = await axios.get<GooglePlacesResponse>(url);
      const places = response.data.results;

      if (places && places.length > 0) {
        for (const place of places) {
          if (
            place.types &&
            place.types.some((t) => this.allowedTypes.has(t))
          ) {
            const store = await this.mapGoogleResultToStoreDTO(place);
            await this.upsertStore(store);
          } else {
            console.log(
              `Skipped store ${place.name} due to unmatched type: ${String(place.types)}`,
            );
          }
        }
      } else {
        console.log(`No results found for keyword: ${keyword}`);
      }
    }
  }

  private async mapGoogleResultToStoreDTO(
    result: GooglePlaceResult,
  ): Promise<StoreDTO> {
    let city = '';
    let province = '';
    let postal_code = '';

    if (result.geometry?.location) {
      const geoResult = await reverseGeocode(
        result.geometry.location.lat,
        result.geometry.location.lng,
        this.googleApiKey!,
      );
      city = geoResult.city;
      province = geoResult.province;
      postal_code = geoResult.postalCode;
    }

    return {
      store_sk: uuidv4(),
      name: result.name,
      address: result.formatted_address ?? '',
      city,
      province,
      postal_code,
      latitude: result.geometry?.location?.lat ?? undefined,
      longitude: result.geometry?.location?.lng ?? undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      place_id: result.place_id,
    };
  }

  private async upsertStore(store: StoreDTO) {
    const { error } = await supabase
      .from('Store')
      .upsert([store], { onConflict: 'place_id' });

    if (error) {
      console.error(`Error inserting store ${store.name}:`, error);
    } else {
      console.log(`Inserted/Updated store: ${store.name}`);
    }
  }
}
