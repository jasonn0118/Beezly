import { NormalizedProductDTO } from "./product";

export interface ReceiptDTO {
  id: string; // receipt_sk (UUID)
  userId?: string; // user_sk (UUID)
  storeName: string;
  purchaseDate: string; // ISO string
  status: "pending" | "processing" | "failed" | "manual_review" | "done";
  totalAmount: number;
  items: NormalizedProductDTO[];
  createdAt: string;
  updatedAt: string;
}
