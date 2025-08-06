import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal, // Import Modal for the notification and loading
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ProductService, { Product, ProductDetails, UnifiedStoreSearchResult } from "../src/services/productService";
import { BarcodeType } from '@beezly/types/dto/barcode';
import CategoryPicker from '../src/components/scan/CategoryPicker';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Import useRouter


// Define a new type that extends the original interface to include the new fields
interface StoreSearchResultWithDisplay extends UnifiedStoreSearchResult {
    key: string;
    displayAddress: string;
}

// Success Notification Component
const SuccessNotification = () => (
    <View style={notificationStyles.overlay}>
        <View style={notificationStyles.card}>
            <FontAwesome name="check-circle" size={60} color="#28a745" />
            <Text style={notificationStyles.title}>Success!</Text>
            <Text style={notificationStyles.message}>Product saved successfully.</Text>
        </View>
    </View>
);

// Loading Overlay Component
const LoadingOverlay = () => (
    <View style={notificationStyles.overlay}>
        <View style={notificationStyles.card}>
            <ActivityIndicator size="large" color="#fbbf24" />
            <Text style={notificationStyles.title}>Saving...</Text>
            <Text style={notificationStyles.message}>Please wait while we save your product.</Text>
        </View>
    </View>
);


export default function RegisterProductScreen() {
    const { productSk, scannedData: scannedDataString } = useLocalSearchParams<{ productSk?: string, scannedData?: string }>();
    const scannedData = scannedDataString ? JSON.parse(scannedDataString) : null;
    const router = useRouter(); // Initialize useRouter

    // State for form inputs
    const [productDetails, setProductDetails] = useState<Partial<ProductDetails>>({
        type: scannedData?.type,
    });
    const [categoryDisplayName, setCategoryDisplayName] = useState('');

    // New state for success notification and loading
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // New state for loading


    useEffect(() => {
        const fetchProductData = async () => {
            if (productSk) {
                try {
                    const productData = await ProductService.getProduct(productSk);
                    setProductDetails(productData);
                    if (productData.categoryPath) {
                        setCategoryDisplayName(productData.categoryPath);
                    }
                } catch (error) {
                    console.error('Failed to fetch product data:', error);
                    Alert.alert('Error', 'Failed to load product data.');
                }
            }
        };

        fetchProductData();
    }, [productSk]);


    useEffect(() => {
        if (scannedDataString) {
            const scannedData = JSON.parse(scannedDataString);
            if (scannedData?.barcode) {
                setProductDetails(prev => ({
                    ...prev,
                    barcode : scannedData.barcode,
                    type : scannedData.type
                }));
            }
        }
    }, [scannedDataString]);

    // Store search related states
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [storeSearchResults, setStoreSearchResults] = useState<StoreSearchResultWithDisplay[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    const [canSearch, setCanSearch] = useState(true);

    // Function to handle image picking
    const pickImage = async () => {
        if (isSubmitting) return; // Prevent interaction during submission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setProductDetails(prev => ({
                ...prev,
                image_url: uri,
            }));
        }
    };

    const handleGetLocation = async () => {
        if (isSubmitting) return; // Prevent interaction during submission
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
                const formattedAddress = `${place.street || ''}`;
                const formattedStreetNumber = `${place.streetNumber || ''}`;
                const formattedCity = `${place.city || ''}`;
                const formattedRegion = `${place.region || ''}`;
                const formattedPostalCode = `${place.postalCode || ''}`;

                setProductDetails(prev => ({
                    ...prev,
                    storePostalCode : formattedPostalCode,
                    storeName : formattedStoreName,
                    storeCity : formattedCity,
                    storeProvince : formattedRegion,
                    storeLatitude : String(latitude),
                    storeLongitude : String(longitude),
                    storeStreetNumber : formattedStreetNumber,
                    storeStreetAddress : formattedAddress
                }));
                setStoreSearchQuery(formattedStoreName);
                setStoreSearchResults([]);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location. Please enter it manually.');
            console.error(error);
        } finally {
            setIsFetchingLocation(false);
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
            if (storeSearchQuery && canSearch && !isSubmitting) { // Add isSubmitting check
                handleSearch(storeSearchQuery);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [storeSearchQuery, canSearch, productDetails.storeLatitude, productDetails.storeLongitude, isSubmitting]); // Add isSubmitting to dependencies

    const handleSelectStore = (store: StoreSearchResultWithDisplay) => {
        if (isSubmitting) return; // Prevent interaction during submission
        setCanSearch(false);
        // Store the entire selected store object to decide how to submit it later
        setProductDetails(prev => ({
            ...prev,
            // Keep individual fields for immediate UI updates if needed
            storeName: store.storeName,
            storeAddress: store.storeAddress,
            storePostalCode: store.storePostalCode,
            storeCity: store.storeCity,
            storeProvince: store.storeProvince,
            storeLatitude: store.storeLatitude,
            storeLongitude: store.storeLongitude,
            storeStreetNumber: store.storeStreetNumber,
            storeStreetAddress: store.storeStreetAddress,
            // Also store the raw object to send to the backend
            selectedStore: store 
        }));
        const fullAddress = [store.storeName, store.storeStreetAddress, store.storeCity].filter(Boolean).join(', ');
        setStoreSearchQuery(fullAddress);
        setStoreSearchResults([]);
    };

    const handleChange = (key: keyof ProductDetails, value: string | number) => {
        if (isSubmitting) return; // Prevent interaction during submission
        setProductDetails(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleCategorySelect = (categoryId: string, categoryName: string) => {
        if (isSubmitting) return; // Prevent interaction during submission
        setProductDetails(prev => ({ ...prev, category: Number(categoryId) }));
        setCategoryDisplayName(categoryName);
        setCategoryModalVisible(false);
    };

    const handleSubmit = async () => {
        if (!productDetails.name || !productDetails.brandName || !productDetails.category) {
            Alert.alert('Missing Information', 'Please fill in the product name, brand name, and category.');
            return;
        }

        Alert.alert(
            'Confirm Save',
            'Are you sure you want to save this product?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Save',
                    onPress: async () => {
                        setIsSubmitting(true); // Set loading to true
                        try {
                            if (productSk) {
                                const updatePayload = { ...productDetails, storeName: storeSearchQuery };
                                await ProductService.updateProduct(productSk, updatePayload);
                                Alert.alert('Product Updated', 'Product information has been successfully updated.');
                            } else {
                                const formData = new FormData();

                                // Append core product details
                                formData.append('name', productDetails.name!);
                                formData.append('barcode', productDetails.barcode!);
                                formData.append('category', String(productDetails.category));
                                if (productDetails.brandName) formData.append('brandName', productDetails.brandName);
                                if (productDetails.type) formData.append('barcodeType', productDetails.type);
                                if (productDetails.price) formData.append('price', String(productDetails.price)); // Ensure price is string

                                // Append store information
                                if (productDetails.selectedStore) {
                                    const store = productDetails.selectedStore;
                                    if (store.source === 'DB' && store.storeId) {
                                        formData.append('storeSk', store.storeId);
                                    } else if (store.source === 'Google' && store.key) {
                                        const googleStorePayload = {
                                            place_id: store.key,
                                            name: store.storeName,
                                            formatted_address: store.storeAddress,
                                            latitude: Number(store.storeLatitude),
                                            longitude: Number(store.storeLongitude),
                                            streetNumber: store.storeStreetNumber,
                                            streetAddress: store.storeStreetAddress,
                                            fullAddress: store.storeAddress,
                                            city: store.storeCity,
                                            province: store.storeProvince,
                                            postalCode: store.storePostalCode,
                                            countryRegion: store.countryRegion,
                                            road: store.road,
                                            types: store.types,
                                        };
                                        formData.append('googlePlacesStore', JSON.stringify(googleStorePayload));
                                    }
                                } else {
                                    // Handle manually entered or location-based store info
                                    if (storeSearchQuery) {
                                        formData.append('storeName', storeSearchQuery);
                                    }
                                    if (productDetails.storeAddress) formData.append('storeAddress', productDetails.storeAddress);
                                    if (productDetails.storeLatitude) formData.append('storeLatitude', String(productDetails.storeLatitude));
                                    if (productDetails.storeLongitude) formData.append('storeLongitude', String(productDetails.storeLongitude));
                                    if (productDetails.storeStreetNumber) formData.append('storeStreetNumber', productDetails.storeStreetNumber);
                                    if (productDetails.storeStreetAddress) formData.append('storeStreetAddress', productDetails.storeStreetAddress);
                                    if (productDetails.storeCity) formData.append('storeCity', productDetails.storeCity);
                                    if (productDetails.storeProvince) formData.append('storeProvince', productDetails.storeProvince);
                                    if (productDetails.storePostalCode) formData.append('storePostalCode', productDetails.storePostalCode);
                                }

                                // Append image file
                                if (productDetails.image_url) {
                                    const uri = productDetails.image_url;
                                    const uriParts = uri.split('.');
                                    const fileType = uriParts[uriParts.length - 1];
                                    formData.append('image', {
                                        uri,
                                        name: `photo.${fileType}`,
                                        type: `image/${fileType}`,
                                    } as any);
                                }

                                await ProductService.createProduct(formData);
                            }
                            setShowSuccessNotification(true); // Show success notification
                            setTimeout(() => {
                                setShowSuccessNotification(false); // Hide notification
                                router.replace('/scan'); // Navigate to scan screen
                            }, 2000);
                        } catch (err) {
                            handleApiError(err, 'Submission Failed');
                        } finally {
                            setIsSubmitting(false); // Always set loading to false
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const handleApiError = (err: any, title: string) => {
        if (axios.isAxiosError(err) && err.response) {
            console.log('Server response data:', err.response.data);
            const serverMessage = err.response.data.message || 'An unknown error occurred on the server.';
            Alert.alert(title, serverMessage);
        } else {
            Alert.alert(title, 'Could not connect to the server. Please check your network connection.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerSection}>
                    <View style={styles.iconContainer}>
                        <FontAwesome name="leaf" size={32} color="#fbbf24" />
                    </View>
                    <Text style={styles.title}>{productSk ? 'Update Honey' : 'Found New Honey!'}</Text>
                    <Text style={styles.subtitle}>{productSk ? 'Update the details below.' : 'Get bonus points for the first entry!'}</Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.inputLabel}>Proof of Discovery (Photo)</Text>
                    <TouchableOpacity style={styles.imageUploader} onPress={pickImage} disabled={isSubmitting}>
                        {productDetails?.image_url ? (
                            <Image source={{ uri: productDetails.image_url }} style={styles.imagePreview} />
                        ) : (
                            <View style={styles.uploadPrompt}>
                                <FontAwesome name="cloud-upload" size={32} color="#9ca3af" />
                                <Text style={styles.uploadText}>Upload Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Barcode</Text>
                        <TextInput style={styles.inputField} value={productDetails.barcode} editable={false} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Product Name</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Seoul Milk 1L" value={productDetails.name} onChangeText={(text) => handleChange('name', text)} editable={!isSubmitting} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Brand Name</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Seoul Milk" value={productDetails.brandName} onChangeText={(text) => handleChange('brandName', text)} editable={!isSubmitting} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Category</Text>
                        <TouchableOpacity style={styles.inputField} onPress={() => setCategoryModalVisible(true)} disabled={isSubmitting}>
                            <Text style={styles.inputText} numberOfLines={1}>
                                {categoryDisplayName || 'Select a category'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!productSk && (
                    <View style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <View style={styles.labelWithButton}>
                                <Text style={styles.inputLabel}>Store Name</Text>
                                <TouchableOpacity style={styles.locationButton} onPress={handleGetLocation} disabled={isFetchingLocation || isSubmitting}>
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
                            <TextInput
                                style={styles.inputField}
                                placeholder="e.g., Super Saver"
                                value={storeSearchQuery}
                                onChangeText={(text) => {
                                    setCanSearch(true);
                                    setStoreSearchQuery(text);
                                }}
                                editable={!isSubmitting}
                            />
                            {isSearching ? (
                                <ActivityIndicator size="small" color="#4b5563" style={styles.searchLoader} />
                            ) : storeSearchResults.length > 0 && (
                                <View style={styles.searchResultsWrapper}>
                                    <ScrollView
                                        style={[styles.searchResultsContainer, { maxHeight: 150 }]}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {storeSearchResults.map((item) => (
                                            <TouchableOpacity
                                                key={item.key}
                                                style={styles.resultItem}
                                                onPress={() => handleSelectStore(item)}
                                                disabled={isSubmitting}
                                            >
                                                <View style={styles.resultContent}>
                                                    <Text style={styles.resultText}>{item.storeName + ', ' + (item.storeStreetAddress || '') + ', ' + (item.storeCity || '')}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                        <View>
                            <Text style={styles.inputLabel}>Price</Text>
                            <TextInput style={styles.inputField} placeholder="e.g., 3.85" value={String(productDetails.price || '')} onChangeText={(text) => handleChange('price', text)} keyboardType="numeric" editable={!isSubmitting} />
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
                    <Text style={styles.submitButtonText}>{productSk ? 'Update Product' : 'Submit & Earn Points'}</Text>
                </TouchableOpacity>
            </ScrollView>
            <CategoryPicker
                visible={isCategoryModalVisible}
                onClose={() => setCategoryModalVisible(false)}
                onSelectCategory={handleCategorySelect}
            />

            {/* Success Notification Modal */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={showSuccessNotification}
                onRequestClose={() => setShowSuccessNotification(false)}
            >
                <SuccessNotification />
            </Modal>

            {/* Loading Overlay Modal */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={isSubmitting && !showSuccessNotification} // Show loading only if not showing success
                onRequestClose={() => {}} // Prevent closing during submission
            >
                <LoadingOverlay />
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 120,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        backgroundColor: '#fef3c7',
        padding: 16,
        borderRadius: 999,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 4,
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
        zIndex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputField: {
        width: '100%',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1f2937',
        justifyContent: 'center',
    },
    imageUploader: {
        width: '100%',
        height: 300,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#d1d5db',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    uploadPrompt: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        color: '#6b7280',
        fontWeight: '600',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    submitButton: {
        backgroundColor: '#fbbf24',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
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
    inputText: { fontSize: 16, color: '#1f2937' },
    placeholderText: { fontSize: 16, color: '#9ca3af' },
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
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultText: {
        fontSize: 16,
        color: '#1f2937',
    },
    resultSourceText: {
        fontSize: 12,
        color: '#6b7280',
    },
});

const notificationStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 20,
    },
    message: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 10,
        textAlign: 'center',
    },
});