import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Product, Barcode, ScannedDataParam, ProductService, UnifiedStoreSearchResult } from '../../services/productService';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';

interface NearbyPrice {
  storeName: string;
  price: number;
  distance: number;
  fullAddress?: string;
  isBestDeal?: boolean;
}

interface ProductDetailViewProps {
  productInfo: Product | Barcode | null;
  loading: boolean;
  scannedData: ScannedDataParam | undefined;
}

interface StoreSearchResultWithDisplay extends UnifiedStoreSearchResult {
    key: string;
    displayAddress: string;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ productInfo, loading, scannedData }) => {
  const router = useRouter();
  const [price, setPrice] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreSearchResultWithDisplay | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [nearbyPrices, setNearbyPrices] = useState<NearbyPrice[]>([]);
  const [fetchingPrices, setFetchingPrices] = useState(false);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState<StoreSearchResultWithDisplay[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [canSearch, setCanSearch] = useState(true);

  useEffect(() => {
    const checkLocationPermission = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        Alert.alert('Location Permission Required', 'Please enable location services to see nearby prices.');
        return;
      }
      setLocationPermissionDenied(false);
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    };
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (productInfo?.product_sk && userLocation) {
      fetchNearbyPrices(productInfo.product_sk, userLocation.latitude, userLocation.longitude);
    } else if (productInfo?.product_sk && locationPermissionDenied) {
      setNearbyPrices([]); // Clear any previous prices
    }
  }, [productInfo?.product_sk, userLocation, locationPermissionDenied]);

  const fetchNearbyPrices = async (productSk: string, latitude?: number, longitude?: number) => {
    setFetchingPrices(true);
    try {
      const response = await ProductService.getEnhancedProductDetails(productSk, latitude, longitude);
      let pricesToDisplay: NearbyPrice[] = [];
      if (response.lowestPrice) {
        pricesToDisplay.push({
          storeName: response.lowestPrice.store.name,
          price: response.lowestPrice.price,
          distance: response.lowestPrice.store.distance || 0,
          fullAddress: response.lowestPrice.store.fullAddress,
          isBestDeal: true,
        });
      }

      if (response.prices) {
        const lowestPriceSk = response.lowestPrice?.priceSk;
        const otherPrices = response.prices
          .filter(item => item.priceSk !== lowestPriceSk) 
          .map(item => ({
            storeName: item.store.name,
            price: item.price,
            distance: item.store.distance || 0,
            fullAddress: item.store.fullAddress,
            isBestDeal: false,
          }));
        pricesToDisplay = [...pricesToDisplay, ...otherPrices];
      }
      setNearbyPrices(pricesToDisplay);

    } catch (error) {
      console.error("Failed to fetch nearby prices:", error);
      Alert.alert("Error", "Could not fetch nearby prices.");
    } finally {
      setFetchingPrices(false);
    }
  };

  useEffect(() => {
    const handleSearch = async (query: string) => {
        if (query.length < 2) {
            setStoreSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const location = await Location.getCurrentPositionAsync({});
            const latitude = location.coords.latitude;
            const longitude = location.coords.longitude;

            const results = await ProductService.searchStores(query, latitude, longitude);

            const combinedResults: StoreSearchResultWithDisplay[] = results.map(item => ({
                ...item,
                key: item.storeId || uuidv4(),
                displayAddress: `${item.storeStreetAddress || ''}, ${item.source || ''}`,
            }));

            setStoreSearchResults(combinedResults);
        } catch (error) {
            console.error('Failed to search stores:', error);
            Alert.alert('Error', 'Failed to search for stores.');
        } finally {
            setIsSearching(false);
        }
    };

    const timer = setTimeout(() => {
        if (storeSearchQuery && canSearch) {
            handleSearch(storeSearchQuery);
        }
    }, 500);

    return () => clearTimeout(timer);
}, [storeSearchQuery, canSearch]);

const handleSelectStore = (store: StoreSearchResultWithDisplay) => {
    setCanSearch(false);
    setSelectedStore(store);
    const fullAddress = [store.storeName, store.storeStreetAddress, store.storeCity].filter(Boolean).join(', ');
    setStoreSearchQuery(fullAddress);
    setStoreSearchResults([]);
};

const handleAddPrice = async () => {
    if (!productInfo?.product_sk) {
        Alert.alert("Error", "Product information is missing.");
        return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        Alert.alert("Error", "Please enter a valid price.");
        return;
    }
    if (!selectedStore) {
        Alert.alert("Error", "Please select a store or use current location.");
        return;
    }

    try {
        const priceValue = parseFloat(price);
        await ProductService.addPrice(productInfo.product_sk, priceValue, "CAD", selectedStore);
        Alert.alert("Success", "Price added successfully!");
        setPrice('');
        setSelectedStore(null);
        setStoreSearchQuery('');
        // Optionally, refresh nearby prices after adding a new one
        if (userLocation) {
            fetchNearbyPrices(productInfo.product_sk, userLocation.latitude, userLocation.longitude);
        }
    } catch (error) {
        console.error("Failed to add price:", error);
        Alert.alert("Error", "Failed to add price. Please try again.");
    }
};

  const handleGetLocation = async () => {
    setIsFetchingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied.');
        setIsFetchingLocation(false);
        return;
    };

    try {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const placemarks = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (placemarks && placemarks.length > 0) {
            const place = placemarks[0];
            const formattedStoreName = `${place.name}, ${place.street}, ${place.city}` || `${place.street}, ${place.city}`;
            setStoreSearchQuery(formattedStoreName);
            setStoreSearchResults([]);
            setSelectedStore({
                key: uuidv4(),
                storeId: null, // No storeId from reverse geocoding
                storeName: place.name || '',
                storeStreetAddress: place.street || '',
                storeCity: place.city || '',
                storeProvince: place.region || '',
                storePostalCode: place.postalCode || '',
                storeLatitude: latitude,
                storeLongitude: longitude,
                storeStreetNumber: place.streetNumber || '',
                storeAddress: `${place.street || ''}, ${place.city || ''}, ${place.region || ''}, ${place.postalCode || ''}`,
                source: 'User Location',
                displayAddress: formattedStoreName,
            });
        }
    } catch (error) {
        Alert.alert('Error', 'Could not fetch location. Please enter it manually.');
        console.error(error);
    } finally {
        setIsFetchingLocation(false);
    }
  };

  if (loading || !productInfo) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#FFC107" />
        <Text style={styles.loadingText}>Searching product...</Text>
      </View>
    );
  }

  const handleProductDetail = (product_sk: string) => {
    router.push(`/register-product?productSk=${product_sk}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hive Deals</Text>
        <TouchableOpacity>
          {/* <FontAwesome name="share-alt" size={20} color="#212529" /> */}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled" onScrollBeginDrag={() => Keyboard.dismiss()}>
        <TouchableOpacity onPress={() => handleProductDetail(productInfo.product_sk || productInfo.id)}>
          <View style={styles.productCard}>
            <Image source={{ uri: productInfo.image_url }} style={styles.productImage} />
            <View style={styles.productDetails}>
              <Text style={styles.productBrand}>{productInfo.brandName}</Text>
              <Text style={styles.productName}>{productInfo.name}</Text>
              <Text style={styles.productCategory}>{productInfo.categoryPath}</Text>
              <Text style={styles.productBarcode}>{productInfo.barcode}</Text>
              {/* <Text style={styles.pointsText}>Points Earned: <Text style={styles.pointsValue}>+ 10 P</Text></Text> */}
            </View>
            <View style={styles.chevronContainer}>
              <FontAwesome name="chevron-right" size={20} color="#6c757d" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Add New Price Section */}
        <View style={styles.addPriceContainer}>
          <View style={styles.titleWithButton}>
            <Text style={styles.addPriceTitle}>Add a Price</Text>
            <TouchableOpacity style={styles.locationButton} onPress={handleGetLocation} disabled={isFetchingLocation}>
                {isFetchingLocation ? (
                    <ActivityIndicator size="small" color="#4b5563" />
                ) : (
                    <>
                        <FontAwesome name="map-marker" size={16} color="#4b5563" />
                        <Text style={styles.locationButtonText}>Use Current Location</Text>
                    </>
                )}
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Store Name</Text>
          <View style={styles.inputGroup}>
            <View style={styles.addPriceInputRow}>
              <TextInput style={styles.input} placeholder="Store Name" value={storeSearchQuery} onChangeText={(text) => {
                  setCanSearch(true);
                  setStoreSearchQuery(text);
              }} />
              <TextInput style={[styles.input, styles.priceInput]} placeholder="$ Price" keyboardType="numeric" value={price} onChangeText={setPrice} />
              <TouchableOpacity style={styles.addPriceButton} onPress={handleAddPrice}>
                <FontAwesome name="plus" size={16} color="#212529" />
              </TouchableOpacity>
            </View>
            {isSearching ? (
                <ActivityIndicator size="small" color="#4b5563" style={styles.searchLoader} />
            ) : storeSearchResults.length > 0 && (
                <View style={styles.searchResultsWrapper}>
                    <ScrollView
                        style={[styles.searchResultsContainer, { maxHeight: 250 }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >
                        {storeSearchResults.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={styles.resultItem}
                                onPress={() => handleSelectStore(item)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                                    <Text style={styles.resultText}>
                                        {item.storeName + ', ' + (item.storeStreetAddress || '') + ', ' + (item.storeCity || '')}
                                        {item.distance !== undefined && (
                                            <Text style={styles.distanceText}> ({item.distance.toFixed(1)} km)</Text>
                                        )}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nearby Prices</Text>

        {fetchingPrices ? (
          <ActivityIndicator size="large" color="#FFC107" />
        ) : locationPermissionDenied ? (
          <View style={styles.permissionDeniedContainer}>
            <Text style={styles.permissionDeniedText}>Location permission is required to show nearby prices.</Text>
            <TouchableOpacity style={styles.enableLocationButton} onPress={handleGetLocation}>
              <Text style={styles.enableLocationButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        ) : nearbyPrices.length > 0 ? (
          nearbyPrices.map((item, index) => (
            <View key={index} style={[styles.priceItem, item.isBestDeal && styles.bestDealItem]}>
              {item.isBestDeal && (
                <View style={styles.bestDealBadgeAbsolute}>
                  <Text style={styles.bestDealBadgeText}>BEST DEAL</Text>
                </View>
              )}
              {/* Left side: Store Name and Distance */}
              <View style={styles.priceItemLeft}>
                <View style={styles.storeNameContainer}>
                  <Text style={item.isBestDeal ? styles.storeNameBest : styles.storeName}>{item.storeName}</Text>
                  {item.fullAddress && <Text style={styles.storeAddress}>{item.fullAddress}</Text>}
                </View>
                <View style={styles.distanceContainer}>
                  <FontAwesome name="map-marker" size={14} color="#6c757d" />
                  <Text style={styles.storeDistance}>{item.distance.toFixed(1)} km away</Text>
                </View>
              </View>
              {/* Right side: Price */}
              <View style={styles.priceItemRight}>
                <Text style={item.isBestDeal ? styles.priceTextBest : styles.priceText}>${item.price.toFixed(2)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noPricesText}>No nearby prices found.</Text>
        )}
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
    },
    scrollContent: {
        padding: 20,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    productImage: {
        width: 96,
        height: 96,
        borderRadius: 16,
    },
    productDetails: {
        marginLeft: 16,
        flex: 1,
    },
    chevronContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 10,
    },
    productBrand: {
        color: '#6c757d',
        fontSize: 14,
    },
    productName: {
        color: '#212529',
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 2,
    },
    productCategory: {
        color: '#6c757d',
        fontSize: 14,
        marginTop: 4,
    },
    productBarcode: {
        color: '#adb5bd',
        fontSize: 12,
        marginTop: 8,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginTop: 4,
    },
    pointsValue: {
        color: '#FFC107',
        fontWeight: 'bold',
    },
    addPriceContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    addPriceTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 12,
    },
    addPriceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginRight: 8,
    },
    priceInput: {
        flex: 0.5,
    },
    addPriceButton: {
        backgroundColor: '#FFC107',
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    priceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        position: 'relative',
    },
    bestDealBadgeAbsolute: {
        backgroundColor: '#20c997',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1, 
    },
    bestDealBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    priceItemLeft: {
        flex: 1,
        marginRight: 10,
    },
    priceItemRight: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        position: 'relative',
    },
    bestDealItem: {
        borderColor: '#20c997',
        borderWidth: 2,
        shadowColor: '#20c997',
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    storeNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        flexShrink: 1,
    },
    storeNameBest: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#20c997',
        flexShrink: 1,
    },
    storeAddress: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 2,
    },
    distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeDistance: {
        color: '#6c757d',
        fontSize: 14,
        marginLeft: 6,
    },
    priceText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#212529',
        flexShrink: 1,
    },
    priceTextBest: {
        fontSize: 28,
        fontWeight: '800',
        color: '#20c997',
        flexShrink: 1,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6c757d',
    },
    titleWithButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    labelWithButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    locationButtonText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563', // Gray-600
        marginBottom: 8,
    },
    inputGroup: {
        position: 'relative',
    },
    noPricesText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#6c757d',
        fontSize: 16,
    },
    permissionDeniedContainer: {
        alignItems: 'center',
        marginTop: 20,
        padding: 20,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffeeba',
    },
    permissionDeniedText: {
        color: '#856404',
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 16,
    },
    enableLocationButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    enableLocationButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
        searchResultsWrapper: {
        marginBottom: 16,
    },
    searchResultsContainer: {
        backgroundColor: 'white',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 10,
    },
    searchLoader: {
        position: 'absolute',
        right: 15,
        top: 50,
    },
    resultItem: {
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    resultContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultText: {
        fontSize: 16,
        color: '#1f2937',
    },
    distanceText: {
        fontSize: 14,
        color: '#6c757d',
        marginLeft: 5,
    },
    chartContainer: {
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
});