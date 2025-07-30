import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BarcodeType } from '@beezly/types/dto/barcode';
import ProductService, {Barcode } from "../../services/productService";
import RegisterProductPrompt from '../../screens/RegisterProductPrompt';
import RegisterProduct from '../../screens/RegisterProduct';

export default function BarcodeResultScreen({ scannedData, onScanAgain }: { scannedData: { data: string; type: BarcodeType } | null, onScanAgain: () => void }) {
    const [productInfo, setProductInfo] = useState<Barcode | undefined>();
    const [loading, setLoading] = useState(true);
    const [showProductRegistrationForm, setShowProductRegistrationForm] = useState(false);

    useEffect(() => {
        if (scannedData && scannedData.data) {
            const fetchProductData = async () => {
                try {
                    setLoading(true);
                    const response = await ProductService.getBarcode(scannedData.data);
                    if (response && response.isVerified) {
                        setProductInfo(response);
                        setShowProductRegistrationForm(false);
                    } else {
                        console.log('Product not found:');
                        //setProductInfo(undefined);
                        setShowProductRegistrationForm(true);
                    }
                } catch (err) {
                    console.error('GET CALL ERROR:', err);
                    setProductInfo(undefined);
                    setShowProductRegistrationForm(true);
                } finally {
                    setLoading(false);
                }
            };

            fetchProductData();
        }
    }, [scannedData]);

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#FFC107" />
                <Text style={styles.loadingText}>searching product...</Text>
            </View>
        );
    }

    if (showProductRegistrationForm) {
        return <RegisterProduct scannedData={scannedData} />;
    }

    if (!productInfo) {
        return <RegisterProductPrompt barcode={scannedData?.data || ''} onRegisterPress={() => setShowProductRegistrationForm(true)} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onScanAgain}>
                    <FontAwesome name="arrow-left" size={20} color="#212529" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Price Comparison</Text>
                <TouchableOpacity>
                    <FontAwesome name="share-alt" size={20} color="#212529" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.productCard}>
                    <Image source={{ uri: productInfo.image_url}} style={styles.productImage} />
                    <View style={styles.productDetails}>
                        <Text style={styles.productBrand}>{productInfo.brand}</Text>
                        <Text style={styles.productName}>{productInfo.name}</Text>
                        <Text style={styles.pointsText}>Points Earned: <Text style={styles.pointsValue}>+ 10 P</Text></Text>
                    </View>
                </View>

                {/* Add New Price Section */}
                <View style={styles.addPriceContainer}>
                    <Text style={styles.addPriceTitle}>Add a Price</Text>
                    <View style={styles.addPriceInputRow}>
                        <TextInput style={styles.input} placeholder="Store Name" />
                        <TextInput style={[styles.input, styles.priceInput]} placeholder="$ Price" keyboardType="numeric" />
                        <TouchableOpacity style={styles.addPriceButton}>
                            <FontAwesome name="plus" size={16} color="#212529" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Nearby Prices</Text>

                {/* Best Deal */}
                <View style={[styles.priceItem, styles.bestDealItem]}>
                    <View>
                        <View style={styles.storeNameContainer}>
                            <Text style={styles.storeNameBest}>Super Saver</Text>
                            <View style={styles.bestDealBadge}>
                                <Text style={styles.bestDealBadgeText}>BEST DEAL</Text>
                            </View>
                        </View>
                        <View style={styles.distanceContainer}>
                            <FontAwesome name="map-marker" size={14} color="#6c757d" />
                            <Text style={styles.storeDistance}>0.2 miles away</Text>
                        </View>
                    </View>
                    <Text style={styles.priceTextBest}>$3.85</Text>
                </View>

                {/* Other Prices */}
                <View style={styles.priceItem}>
                    <View>
                        <Text style={styles.storeName}>GroceryLand</Text>
                        <View style={styles.distanceContainer}>
                            <FontAwesome name="map-marker" size={14} color="#6c757d" />
                            <Text style={styles.storeDistance}>0.5 miles away</Text>
                        </View>
                    </View>
                    <Text style={styles.priceText}>$3.98</Text>
                </View>
                
                <View style={styles.priceItem}>
                    <View>
                        <Text style={styles.storeName}>ABC Mart</Text>
                        <View style={styles.distanceContainer}>
                            <FontAwesome name="map-marker" size={14} color="#6c757d" />
                            <Text style={styles.storeDistance}>0.8 miles away</Text>
                        </View>
                    </View>
                    <Text style={styles.priceText}>$4.10</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa', // --light-gray
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
        color: '#212529', // --dark-charcoal
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
    productBrand: {
        color: '#6c757d',
        fontSize: 14,
    },
    productName: {
        color: '#212529', // --dark-charcoal
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 2,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginTop: 4,
    },
    pointsValue: {
        color: '#FFC107', // --brand-yellow
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
        backgroundColor: '#FFC107', // --brand-yellow
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
    },
    bestDealItem: {
        borderColor: '#20c997', // --vibrant-teal
        borderWidth: 2,
        shadowColor: '#20c997',
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    storeNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
    },
    storeNameBest: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#20c997',
    },
    bestDealBadge: {
        backgroundColor: '#20c997',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    bestDealBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
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
    },
    priceTextBest: {
        fontSize: 28,
        fontWeight: '800',
        color: '#20c997',
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
});