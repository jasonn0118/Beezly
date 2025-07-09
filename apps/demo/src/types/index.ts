export type ScreenName = 
  | 'home' 
  | 'watchlist' 
  | 'scan' 
  | 'rank' 
  | 'profile'
  | 'searchResults'
  | 'productDetail'
  | 'compareInput' 
  | 'newProduct' 
  | 'receiptResult' 
  | 'productEdit'
  | 'confirmation';

export interface ScreenProps {
  navigation: (screenName: ScreenName, params?: any) => void;
  route?: { params?: any };
}

export interface HotDeal {
  name: string;
  spec: string;
  price: string;
  image: string;
}

export type StoreName = 'Costco' | 'Walmart' | 'T&T';

export interface ThemedDeal {
    id: string;
    name: string;
    price: string;
    store: string;
    image: string;
    badge?: 'BEST' | 'POPULAR';
}

export interface RecentInfo {
    id: string;
    name: string;
    user: string;
    price: string;
    image: string;
    barcode: string;
}

export interface PriceData {
    store: string;
    distance: number;
    date: number;
    price: number;
}

export interface WatchlistItem {
    id: string;
    name: string;
    image: string;
    lowestPrice: number;
    store: string;
    trend: 'up' | 'down' | 'stable';
    priceChange: number;
}