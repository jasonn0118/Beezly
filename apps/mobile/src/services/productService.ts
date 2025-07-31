import { BarcodeType } from '@beezly/types/dto/barcode';
import { apiClient } from './api';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  type?: BarcodeType;
  category: string;
  brandName: string;
  image_url?: string;
}

export interface Barcode {
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

export interface PriceData {
  price?: number;

}

export interface ProductSearchResult {
  product_sk: string;
  name: string;
  brand_name: string | null;
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
    return apiClient.get<StoreData[]>(`/stores/search/name`, { params: { q: query }} );
  }
}

export default ProductService;