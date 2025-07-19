import { apiClient } from './api';

export interface Receipt {
  id: string;
  storeName: string;
  receiptNumber: string;
  transactionDate: string;
  totalAmount: number;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  barcode?: string;
}

export interface ProcessReceiptRequest {
  imageData: string; // Base64 encoded image
  storeName?: string;
}

export interface UploadReceiptResponse {
  success: boolean;
  receipt?: Receipt;
  message?: string;
}

export class ReceiptService {
  static async processReceipt(request: ProcessReceiptRequest): Promise<UploadReceiptResponse> {
    return apiClient.post<UploadReceiptResponse>('/ocr/process-receipt', request);
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