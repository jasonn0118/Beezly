import { apiClient } from './api';

export interface Store {
  id: string;
  name: string;
  fullAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  matchMethod?: string;
}

export interface StoreSearchResult {
  storeFound: boolean;
  store?: Store;
  extractedMerchant: string;
  extractedAddress?: string;
  message: string;
  requiresUserConfirmation: boolean;
}

export interface StoreSearchResponse {
  localStores: Store[];
  googleStores: Store[];
  totalCount: number;
  metadata: {
    hasLocation: boolean;
    searchRadius: number;
    googleResultsCount: number;
  };
}

export interface ProcessReceiptWithStoreResult {
  success: boolean;
  data: {
    store_search?: StoreSearchResult;
    items: any[];
    merchant: string;
    store_address?: string;
    receipt_id?: string;
    [key: string]: any;
  };
}

export class StoreService {
  /**
   * Search for stores in the database and Google Places
   */
  static async searchStores(params: {
    query: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<StoreSearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('query', params.query);
    if (params.latitude) searchParams.append('latitude', params.latitude.toString());
    if (params.longitude) searchParams.append('longitude', params.longitude.toString());
    if (params.radiusKm) searchParams.append('radiusKm', params.radiusKm.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    return apiClient.get<StoreSearchResponse>(`/stores/search?${searchParams.toString()}`);
  }

  /**
   * Get store details by ID
   */
  static async getStore(storeId: string): Promise<Store> {
    return apiClient.get<Store>(`/stores/${storeId}`);
  }

  /**
   * Create a new store (from Google Places or manual entry)
   */
  static async createStore(storeData: {
    name: string;
    fullAddress: string;
    city?: string;
    province?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  }): Promise<Store> {
    return apiClient.post<Store>('/stores', storeData);
  }

  /**
   * Confirm a store for a receipt (future implementation)
   */
  static async confirmStoreForReceipt(data: {
    receiptId: string;
    storeId: string;
    continueProcessing?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/ocr/confirm-store-for-receipt', data);
  }
}

export default StoreService;