import { BarcodeType } from '@beezly/types/dto/barcode';
import { apiClient } from './api';

export interface Product {
  product_sk: string;
  id: string;
  name: string;
  barcode: string;
  type?: BarcodeType;
  category: number;
  categoryPath?: string;
  brandName: string;
  image_url?: string;
}

export interface Barcode {
  product_sk: string;
  id: string;
  name: string;
  barcode: string;
  barcodeType?: BarcodeType;
  brandName?: string;
  categoryName?: string;
  category: number;
  categoryPath: string;
  image_url : string;
  isVerified: boolean;
}

export interface ProductDetails {
  product_sk: string;
  id: string;
  name: string;
  barcode: string;
  type?: BarcodeType;
  category: number;
  categoryPath?: string;
  brandName: string;
  image_url?: string;
  price?: number;
  storeName?: string;
  storeAddress?: string;
  storePostalCode?: string;
  storeCity?: string;
  storeProvince?: string;
  storeLatitude?: string;
  storeLongitude?: string;
  storeStreetNumber?: string;
  storeStreetAddress?: string;
  selectedStore?: UnifiedStoreSearchResult; // Add this line to fix the type error
}

export interface StoreData {
    storeId?: string;
    storeName?: string;
    storeAddress: string;
    storePostalCode: string;
    storeCity : string;
    storeProvince : string;
    storeLatitude : string;
    storeLongitude :string;
    storeStreetNumber : string;
    storeStreetAddress : string;
    road?: string;
    countryRegion?: string;
    types?: string[];
}

export interface UnifiedStoreSearchResult extends StoreData {
    source: 'DB' | 'Google';
    key?: string; // Add placeId for Google results
}

export interface PriceData {
  price?: number;

}

export interface ProductSearchResult {
  product_sk: string;
  name: string;
  brandName: string | null;
  image_url: string;
  category?: number;
  categoryPath?: string;
}

export interface ScannedDataParam {
  barcode: string;
  type: BarcodeType;
}

export interface PriceDetail {
  priceSk: string;
  price: number;
  currency: string;
  recordedAt: string;
  creditScore: number;
  verifiedCount?: number;
  isDiscount: boolean;
  originalPrice?: number;
  store: {
    storeSk: string;
    name: string;
    fullAddress?: string;
    city: string;
    province: string;
    latitude?: number;
    longitude?: number;
    distance?: number;
  };
}

export interface NearbyPrice {
  storeName: string;
  price: number;
  distance: number;
  isBestDeal?: boolean;
}

export interface EnhancedProductDetails {
  product: Product;
  lowestPrice?: PriceDetail;
  prices: PriceDetail[]; // This is the array from the backend
  availableStoresCount?: number;
  latitude?: number;
  longitude?: number;
}

export interface UseProductInfoProps {
  productId?: string;
  scannedData?: { barcode?: string; type?: BarcodeType };
}

export interface BarcodeRequest {
  barcode: string;
}

export interface ProductResponse {
  success: boolean;
  product?: Product;
  message?: string;
}

export class ProductService {
  static async lookupByBarcode(barcode: string): Promise<ProductResponse> {
    return apiClient.post<ProductResponse>('/barcode/lookup', { barcode });
  }

  static async getBarcode(barcode: string): Promise<Barcode> {
    return apiClient.get<Barcode>(`/barcode/${barcode}`);
  }

  static async getProduct(id: string): Promise<Product> {
    return apiClient.get<Product>(`/products/${id}`);
  }

  static async createProduct(formData: FormData): Promise<Product> {
    return apiClient.post<Product>('/products', formData);
  }

  static async addPrice(productId: string, priceData: { price: number; store: StoreData }): Promise<any> {
    return apiClient.post(`/products/${productId}/prices`, priceData);
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return apiClient.put<Product>(`/product/${id}`, product);
  }

  static async deleteProduct(id: string): Promise<void> {
    return apiClient.delete<void>(`/product/${id}`);
  }

  static async searchProducts(query: string): Promise<ProductSearchResult[]> {
    return apiClient.get<ProductSearchResult[]>('/products/search', { params: { q: query } });
  }

  static async searchStores(query: string, latitude?: number, longitude?: number): Promise<UnifiedStoreSearchResult[]> {
    const params: { query: string; latitude?: number; longitude?: number } = { query };
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;

    // Expect a response with 'localStores' and 'googleStores' keys
    const response = await apiClient.get<{ localStores?: any[], googleStores?: any[] }>('/stores/search', { params });
    
    const localResults = (response.localStores || []).map(item => ({ ...item, source: 'DB' }));
    const googleResults = (response.googleStores || []).map(item => ({ ...item, source: 'Google' }));

    const combinedResults = [...localResults, ...googleResults];

    // Map the combined API response to the client-side UnifiedStoreSearchResult interface
    return combinedResults.map(item => ({
        storeId: item.id, // The sample uses 'id' for local stores
        placeId: item.placeId, // Ensure placeId is mapped for Google stores
        storeName: item.name,
        storeAddress: item.fullAddress,
        storePostalCode: item.postalCode,
        storeCity: item.city,
        storeProvince: item.province,
        storeLatitude: String(item.latitude),
        storeLongitude: String(item.longitude),
        storeStreetNumber: item.streetNumber,
        storeStreetAddress: item.streetAddress,
        road: item.road,
        countryRegion: item.countryRegion,
        types: item.types,
        source: item.source, // Add back the source field to match the type
    }));
  }

  static async getEnhancedProductDetails(productSk: string, latitude?: number, longitude?: number): Promise<EnhancedProductDetails> {
    const params: { latitude?: number; longitude?: number } = {};
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;
    return apiClient.get<EnhancedProductDetails>(`/products/${productSk}/enhanced`, { params });
  }
}

export default ProductService;