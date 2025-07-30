import { apiClient } from './api';

export interface ProcessReceiptRequest {
  file: {
    uri: string;
    name:string;
    type: string;
  };
  storeName?: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  date: string;
  total: number;
  items: [];
  item_count: number;
  raw_text: string;
  azure_confidence: number;
  subtotal: number;
  tax: number;
  store_address: string;
  time: string;
  receipt_id: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit_price: number;
  item_number: number;
  normalized_name: string;
  brand: string;
  category: string;
  confidence_score: number;
  is_discount: boolean;
  is_adjustment: boolean;
  normalization_method: string;
  original_price_numeric: number;
  final_price: number;
}

export interface UploadReceiptResponse {
  success: boolean;
  receipt?: Receipt;
  message?: string;
}

export class ReceiptService {
  static async processReceipt(formData: FormData): Promise<UploadReceiptResponse> {
    return apiClient.post<UploadReceiptResponse>('/ocr/process-receipt-enhanced', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
  }

  static async getReceipt(id: string): Promise<Receipt> {
    return apiClient.get<Receipt>(`/receipt/${id}`);
  }

  static async getUserReceipts(): Promise<Receipt[]> {
    return apiClient.get<Receipt[]>('/receipt');
  }

  static async updateReceipt(id: string, receipt: Partial<Receipt>): Promise<Receipt> {
    return apiClient.put<Receipt>(`/receipt/${id}`, receipt);
  }

  static async deleteReceipt(id: string): Promise<void> {
    return apiClient.delete<void>(`/receipt/${id}`);
  }
}

export default ReceiptService;