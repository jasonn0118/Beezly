import React from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenName, ScreenProps } from '../types';
import HomeScreen from '../screens/HomeScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import ScanScreen from '../screens/ScanScreen';
import BuzzScreen from '../screens/BuzzScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConfirmationScreen from '../screens/ConfirmationScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import CompareInputScreen from '../screens/CompareInputScreen';
import NewProductScreen from '../screens/NewProductScreen';
import ReceiptResultScreen from '../screens/ReceiptResultScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProductEditScreen from '../screens/ProductEditScreen';

export const SCREENS: Record<ScreenName, React.FC<ScreenProps>> = {
  home: HomeScreen,
  watchlist: WatchlistScreen,
  scan: ScanScreen,
  rank: BuzzScreen,
  profile: ProfileScreen,
  confirmation: ConfirmationScreen,
  searchResults: SearchResultsScreen,
  compareInput: CompareInputScreen,
  newProduct: NewProductScreen,
  receiptResult: ReceiptResultScreen,
  productDetail: ProductDetailScreen,
  productEdit: ProductEditScreen,
};

interface NavButtonProps {
    screenName: ScreenName;
    label: string;
    currentScreen: ScreenName;
    setScreen: (screenName: ScreenName) => void;
    icon: string;
}

export const NavButton: React.FC<NavButtonProps> = ({ screenName, label, currentScreen, setScreen, icon }) => {
    const isActive = currentScreen === screenName;
    return (
        <button onClick={() => setScreen(screenName)} style={styles.navBtn}>
            <div style={{...styles.navIcon, ...(isActive && styles.navIconActive)}}>
                <span style={{fontSize: 28}}>{icon}</span>
            </div>
            <span style={{...styles.navLabel, ...(isActive && styles.navLabelActive)}}>{label}</span>
        </button>
    );
};