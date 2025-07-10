import { HotDeal, StoreName, ThemedDeal, RecentInfo, WatchlistItem, PriceData } from '../types';

export const MOCK_HOT_DEALS: Record<StoreName, HotDeal[]> = {
  Costco: [
    { name: 'Kirkland Organic Milk', spec: '2L x 2 pack', price: '$8.99', image: 'https://placehold.co/160x120/EFEFEF/333?text=Kirkland+Milk' },
    { name: 'Rotisserie Chicken', spec: '1 whole', price: '$7.99', image: 'https://placehold.co/160x120/EFEFEF/333?text=Rotisserie+Chicken' },
    { name: 'Butter Croissant', spec: '12 pack', price: '$6.99', image: 'https://placehold.co/160x120/EFEFEF/333?text=Croissant' },
  ],
  Walmart: [
    { name: 'Great Value Eggs', spec: '12 pack', price: '$3.27', image: 'https://placehold.co/160x120/EFEFEF/333?text=GV+Eggs' },
  ],
  'T&T': [
    { name: 'T&T Fried Rice', spec: '500g', price: '$5.99', image: 'https://placehold.co/160x120/EFEFEF/333?text=T&T+Fried+Rice' },
  ],
};

export const MOCK_BEST_DEALS: ThemedDeal[] = [
    { id: 'b1', name: 'Haagen-Dazs Ice Cream', price: '$4.49', store: 'Save-On-Foods', image: 'https://placehold.co/180x135/EFEFEF/333?text=Ice+Cream', badge: 'BEST' },
    { id: 'b2', name: 'Philadelphia Cream Cheese', price: '$3.99', store: 'Walmart', image: 'https://placehold.co/180x135/EFEFEF/333?text=Cream+Cheese', badge: 'BEST' },
    { id: 'b3', name: 'Salmon Fillet', price: '$9.99/lb', store: 'Costco', image: 'https://placehold.co/180x135/EFEFEF/333?text=Salmon', badge: 'BEST' },
];

export const MOCK_MOST_WANTED: ThemedDeal[] = [
    { id: 'm1', name: 'Avocado 6 pack', price: '$7.99', store: 'Costco', image: 'https://placehold.co/180x135/EFEFEF/333?text=Avocado', badge: 'POPULAR' },
    { id: 'm2', name: 'Nongshim Shin Ramyun 5 pack', price: '$5.49', store: 'Walmart', image: 'https://placehold.co/180x135/EFEFEF/333?text=Shin+Ramen', badge: 'POPULAR' },
    { id: 'm3', name: 'Starbucks Coffee Beans', price: '$19.99', store: 'Costco', image: 'https://placehold.co/180x135/EFEFEF/333?text=Coffee+Beans', badge: 'POPULAR' },
];

export const MOCK_RECENT_INFO: RecentInfo[] = [
    { id: '1', name: 'Seoul Milk 1L', user: 'Bee123', price: '$2.99', image: 'https://placehold.co/40x40/3B82F6/FFFFFF?text=Milk', barcode: '8801115115115' },
    { id: '2', name: 'Nongshim Shin Ramyun 5 pack', user: 'King of Savings', price: '$5.49', image: 'https://placehold.co/40x40/10B981/FFFFFF?text=Ramen', barcode: '8801043015538' },
];

export const MOCK_WATCHLIST_DATA: WatchlistItem[] = [
    { id: 'w1', name: 'Nongshim Shin Ramyun 5 pack', image: 'https://placehold.co/80x80/EF4444/FFFFFF?text=Ramen', lowestPrice: 5.49, store: 'Walmart', trend: 'up', priceChange: 0.50 },
    { id: 'w2', name: 'Kirkland Organic Milk 2L x 2 pack', image: 'https://placehold.co/80x80/3B82F6/FFFFFF?text=Milk', lowestPrice: 8.99, store: 'Costco', trend: 'down', priceChange: 0.20 },
    { id: 'w3', name: 'Avocado 6 pack', image: 'https://placehold.co/80x80/10B981/FFFFFF?text=Avocado', lowestPrice: 7.99, store: 'Save-On-Foods', trend: 'stable', priceChange: 0.00 },
];

export const MOCK_SEARCH_RESULTS = [
    { id: 's1', name: 'Nongshim Shin Ramyun 5 pack', image: 'https://placehold.co/80x80/EF4444/FFFFFF?text=Ramen', lowestPrice: 5.49, store: 'Walmart' },
    { id: 's2', name: 'Nongshim Jjapagetti 5 pack', image: 'https://placehold.co/80x80/333333/FFFFFF?text=Jjapagetti', lowestPrice: 5.49, store: 'H-Mart' },
];

export const MOCK_PRICE_DATA: PriceData[] = [
    { store: 'B-Mart', distance: 300, date: 1, price: 2.50 },
    { store: 'C-Convenience', distance: 800, date: 2, price: 2.80 },
    { store: 'A-Mart', distance: 550, date: 3, price: 2.70 },
    { store: 'D-Super', distance: 450, date: 5, price: 2.65 }
];