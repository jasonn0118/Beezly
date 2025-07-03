export interface NormalizedProductDTO {
  id: string; // product_sk (UUID)
  name: string;
  barcode?: string;
  category?: string;
  price?: number;
  imageUrl?: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}
