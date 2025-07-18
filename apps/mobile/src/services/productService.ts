import { apiClient } from './api';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  brand?: string;
  description?: string;
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

  static async getProduct(id: string): Promise<Product> {
    return apiClient.get<Product>(`/product/${id}`);
  }

  static async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    return apiClient.post<Product>('/product', product);
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return apiClient.put<Product>(`/product/${id}`, product);
  }

  static async deleteProduct(id: string): Promise<void> {
    return apiClient.delete<void>(`/product/${id}`);
  }

  static async searchProducts(query: string): Promise<Product[]> {
    return apiClient.get<Product[]>('/product/search', { params: { q: query } });
  }
}

export default ProductService;