import { BarcodeType } from '@beezly/types/dto/barcode';
import { apiClient } from './api';

export interface Product {
  product_sk: string;
  id: string;
  name: string;
  barcode: string;
  type?: BarcodeType;
  category: string;
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
  category: string;
  image_url : string;
  isVerified: boolean;
}

export interface ProductDetails {
  product_sk: string;
  id: string;
  name: string;
  barcode: string;
  type?: BarcodeType;
  category: string;
  brandName: string;
  image_url?: string;
  price?: number;
  storeName?: string;
  storeAddress?: string;
  storePostalCode?: string;
  storeCity?: string;
  storeProvince?: string;
  storeLatitude?: string;
  storeLongitude?:string;
  storeStreetNumber?: string;
  storeStreetAddress?: string;
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
}

export interface UnifiedStoreSearchResult extends StoreData {
    source: 'DB' | 'Google';
}

export interface PriceData {
  price?: number;

}

export interface ProductSearchResult {
  product_sk: string;
  name: string;
  brandName: string | null;
  image_url: string;
}

export interface ScannedDataParam {
  barcode: string;
  type: BarcodeType;
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

  static async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return apiClient.put<Product>(`/product/${id}`, product);
  }

  static async deleteProduct(id: string): Promise<void> {
    return apiClient.delete<void>(`/product/${id}`);
  }

  static async searchProducts(query: string): Promise<ProductSearchResult[]> {
    return apiClient.get<ProductSearchResult[]>('/products/search', { params: { q: query } });
  }

  static async getSearchStores(query: string): Promise<StoreData[]> {
    const results = await apiClient.get<any[]>(`/stores/search/name`, { params: { name: query }});
    return results.map(item => ({
      storeId: item.storeSk,
      storeName: item.name,
      storeAddress: item.fullAddress || '',
      storePostalCode: item.postalCode || '',
      storeCity: item.city || '',
      storeProvince: item.province || '',
      storeLatitude: String(item.latitude || ''),
      storeLongitude: String(item.longitude || ''),
      storeStreetNumber: item.streetNumber || '',
      storeStreetAddress: item.streetAddress || '',
    }));
  }

  static async searchGooglePlaces(query: string, lat?: number, lon?: number): Promise<StoreData[]> {
    // This is a mock implementation. In a real app, you would call the Google Places API.
    console.log(`Searching Google Places for "${query}" near (${lat}, ${lon})`);
    const googleData: StoreData[] = [
        { storeId: '9999', storeName: 'Starbucks', storeAddress: '123 Main St', storePostalCode: 'A1A 1A1', storeCity: 'Toronto', storeProvince: 'ON', storeLatitude: '43.6532', storeLongitude: '-79.3832', storeStreetNumber: '123', storeStreetAddress: 'Main St' },
        { storeId: '9998', storeName: 'Tim Hortons', storeAddress: '456 King St', storePostalCode: 'B2B 2B2', storeCity: 'Vancouver', storeProvince: 'BC', storeLatitude: '49.2827', storeLongitude: '-123.1207', storeStreetNumber: '456', storeStreetAddress: 'King St' },
        { storeId: '9997', storeName: 'Homeplus seoul', storeAddress: '456 King St', storePostalCode: 'B2B 2B2', storeCity: 'Vancouver', storeProvince: 'BC', storeLatitude: '49.2827', storeLongitude: '-123.1207', storeStreetNumber: '456', storeStreetAddress: 'King St' },
    ];
    return Promise.resolve(googleData.filter(store => store.storeName && store.storeName.toLowerCase().includes(query.toLowerCase())));
  }
}

export default ProductService;