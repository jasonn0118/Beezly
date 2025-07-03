export interface PriceComparisonDTO {
  productName: string;
  storeList: {
    storeName: string;
    price: number;
    currency: string;
    distance: number; // meters or km
  }[];
}
