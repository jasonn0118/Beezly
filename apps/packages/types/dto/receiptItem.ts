export interface ReceiptItemDTO {
  id: string; // receiptitem_sk (UUID)
  receiptId: string; // receipt_sk
  productId?: string; // product_sk
  price: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
}
