export interface StoreDTO {
  id: string; // store_sk (UUID)
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}
