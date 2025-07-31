import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, TextInput, Alert, ActivityIndicator} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ProductService, { Product, ProductDetails } from "../services/productService";
import { BarcodeType } from '@beezly/types/dto/barcode';
import CategoryPicker from '../components/scan/CategoryPicker';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';


export default function RegisterProduct({ scannedData}: { scannedData: { barcode: string; type: BarcodeType;} | null }) {
    // State for form inputs
    const [productDetails, setProductDetails] = useState<ProductDetails>({
        //product info
        id: '',
        name: '',
        barcode: '',
        type : scannedData?.type,
        brandName: '',
        category: '',
        image_url: '',
        //store info
        storeName: '',
        storeAddress: '',
        storePostalCode: '',
        storeCity : '',
        storeProvince : '',
        storeLatitude : '',
        storeLongitude :'',
        storeStreetNumber : '',
        storeStreetAddress : '',
        //price info
        price : 0,
    });

    useEffect(() => {
        if (scannedData?.barcode) {
            setProductDetails(prev => ({
                ...prev,
                barcode : scannedData.barcode,
                type : scannedData.type
            }));
        }
    }, [scannedData]);

    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    
    // Function to handle image picking
    const pickImage = async () => {
        // Request permission to access the media library
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
            //form.produ(rata({})
            const uri = result.assets[0].uri;
            setProductDetails(prev => ({
                ...prev,
                image_url: uri,
            }));
            
        }
    };

    // const getEnglishAddress = async (latitude: number, longitude: number) => {
    // const response = await fetch(
    //     `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=en&key=YOUR_GOOGLE_MAPS_API_KEY`
    // );
    // const data = await response.json();
    // if (data.status === 'OK') {
    //     const address = data.results[0].formatted_address;
    //     return address;
    // } else {
    //     throw new Error('Failed to fetch address');
    // }
    // };

    // --- Function to get current location ---
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
            // Reverse geocode to get address from coordinates
            const placemarks = await Location.reverseGeocodeAsync({ latitude, longitude });
            // const englishAddress = await getEnglishAddress(
            //     location.coords.latitude,
            //     location.coords.longitude
            // )

            // console.log(englishAddress);
            
            if (placemarks && placemarks.length > 0) {
                const place = placemarks[0];
                console.log(place);
                // You can format the store name as you like
                const formattedStoreName = place.name || `${place.street}, ${place.city}`;
                const formattedAddress = `${place.street || ''}`;
                const formattedStreetNumber = `${place.streetNumber || ''}`;
                const formattedCity = `${place.city || ''}`;
                const formattedRegion = `${place.region || ''}`;
                const formattedPostalCode = `${place.postalCode || ''}`;
                const formattedLatitude = `${location.coords.latitude || ''}`;
                const formattedLongitude = `${location.coords.longitude || ''}`;

                console.log(formattedLatitude);
                setProductDetails(prev => ({
                    ...prev,
                    storePostalCode : formattedPostalCode,
                    storeName : formattedStoreName,
                    storeCity : formattedCity,
                    storeProvince : formattedRegion,
                    storeLatitude : formattedLatitude,
                    storeLongitude :formattedLongitude,
                    storeStreetNumber : formattedStreetNumber,
                    storeStreetAddress : formattedAddress

                }));
            }
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location. Please enter it manually.');
            console.error(error);
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleChange = (key: keyof ProductDetails, value: string | number) => {
        let finalValue = value;
        if (key === 'price') {
            finalValue = Number(value) || 0; 
        }

        setProductDetails(prev => ({
            ...prev,
            [key]: finalValue,
        }));
    };

    // Function to handle form submission
    const handleSubmit = async () => {
        if (!productDetails?.name || !productDetails.price || !productDetails.storeName) {
            Alert.alert('Missing Information', 'Please fill in at least the product name, store, and price.');
            return;
        }
        try {
            const newId = uuidv4();
            const formData = new FormData();

            if (!productDetails) {
                console.error("productData is not available");
                Alert.alert('Error', 'Product data is missing.');
                return;
            }
   
            const newProductData: Product = {
                ...productDetails,
                id: newId,
            };

            Object.keys(newProductData).forEach(key => {
            const typedKey = key as keyof Product;
                if (typedKey !== 'image_url') {
                formData.append(typedKey, String(newProductData[typedKey]));
                }
            });
            
            if (newProductData.image_url) {
            const uri = newProductData.image_url;
            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            formData.append('image', {
                uri,
                name: `photo.${fileType}`,
                type: `image/${fileType}`,
            } as any);
            }
            // Append data to formData...
   
            const result = await ProductService.createProduct(formData);
            console.log("success:", result);
            Alert.alert('Product Submitted', 'Thank you for contributing!');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                console.log('server response data:', err.response.data);

                const serverMessage = err.response.data.message || 'An unknown error occurred on the server.';
                
                Alert.alert('Submission Failed', serverMessage);

            } else {
                Alert.alert('Submission Failed', 'Could not connect to the server. Please check your network connection.');
            }
            Alert.alert('Submission Failed', 'Could not submit the product. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.iconContainer}>
                        <FontAwesome name="leaf" size={32} color="#fbbf24" />
                    </View>
                    <Text style={styles.title}>Found New Honey!</Text>
                    <Text style={styles.subtitle}>Get bonus points for the first entry!</Text>
                </View>

                {/* Image Upload Card */}
                <View style={styles.formCard}>
                    <Text style={styles.inputLabel}>Proof of Discovery (Photo)</Text>
                    <TouchableOpacity style={styles.imageUploader} onPress={pickImage}>
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

                {/* Details Form Card */}
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Barcode</Text>
                        <TextInput style={styles.inputField} value={productDetails.barcode} editable={false} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Product Name</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Seoul Milk 1L" value={productDetails.name} onChangeText={(text) => handleChange('name', text)} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Brand Name</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Seoul Milk" value={productDetails.brandName} onChangeText={(text) => handleChange('brandName', text)} />
                    </View>
                    {<View>
                        <Text style={styles.inputLabel}>Category</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Seoul Milk 1L" value={productDetails.category} onChangeText={(text) => handleChange('category', text)} />

                        {/* <TouchableOpacity style={styles.inputField} onPress={() => setCategoryModalVisible(true)}>
                            <Text style={productDetails.category ? styles.inputText : styles.placeholderText}>
                                {productDetails.category || 'Select a category'}
                            </Text>
                        </TouchableOpacity> */}
                    </View>}
                </View>
                
                {/* Price Form Card */}
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <View style={styles.labelWithButton}>
                            <Text style={styles.inputLabel}>Store Name</Text>
                            <TouchableOpacity style={styles.locationButton} onPress={handleGetLocation}>
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
                        <TextInput style={styles.inputField} placeholder="e.g., Super Saver" value={productDetails?.storeName} onChangeText={(text) => handleChange('storeName', text)} />
                    </View>
                    {/* <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Street address</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Street address" value={`${productDetails?.storeStreetNumber || ''} ${productDetails?.storeStreetAddress || ''}`.trim()} onChangeText={(text) => handleChange('storePostalCode', text)} />
                        <Text style={styles.inputLabel}>City,Province</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., City,Province" value={`${productDetails?.storeCity || ''} ${productDetails?.storeProvince || ''}`.trim()} onChangeText={(text) => handleChange('storePostalCode', text)} />
                        <Text style={styles.inputLabel}>Postal code</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., Postal Code" value={productDetails?.storePostalCode} onChangeText={(text) => handleChange('storePostalCode', text)} />
                    </View> */}
                    <View>
                        <Text style={styles.inputLabel}>Price</Text>
                        <TextInput style={styles.inputField} placeholder="e.g., 3.85" value={String(productDetails.price)} onChangeText={(text) => handleChange('price', Number(text))} keyboardType="numeric" />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>Submit & Earn Points</Text>
                </TouchableOpacity>
            </ScrollView>
            <CategoryPicker 
                visible={isCategoryModalVisible}
                onClose={() => setCategoryModalVisible(false)}
                onSelectCategory={(category) => handleChange('category', category)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6', // Lighter gray background
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
        backgroundColor: '#fef3c7', // Amber-100
        padding: 16,
        borderRadius: 999, // A large number for a circle
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
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563', // Gray-600
        marginBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputField: {
        width: '100%',
        backgroundColor: '#f9fafb', // Gray-50
        borderWidth: 1,
        borderColor: '#e5e7eb', // Gray-200
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1f2937',
    },
    imageUploader: {
        width: '100%',
        height: 128,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#d1d5db', // Gray-300
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
        backgroundColor: '#fbbf24', // Amber-400
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
});
