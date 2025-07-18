import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons

export default function ScanResultScreen({ scannedData, onScanAgain }: { scannedData: { type: string; data: string } | null, onScanAgain: () => void }) {
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
                    <Image source={{ uri: 'https://placehold.co/100x100/FFC107/212529?text=Item' }} style={styles.productImage} />
                    <View style={styles.productDetails}>
                        <Text style={styles.productBrand}>Brand Name</Text>
                        <Text style={styles.productName}>Instant Ramen (5-pack)</Text>
                        <Text style={styles.scannedDataText}>Data: {scannedData?.data || 'N/A'}</Text>
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
                        <Text style={styles.storeDistance}>0.2 miles away</Text>
                    </View>
                    <Text style={styles.priceTextBest}>$3.85</Text>
                </View>

                {/* Other Prices */}
                <View style={styles.priceItem}>
                    <View>
                        <Text style={styles.storeName}>GroceryLand</Text>
                        <Text style={styles.storeDistance}>0.5 miles away</Text>
                    </View>
                    <Text style={styles.priceText}>$3.98</Text>
                </View>
                <View style={styles.priceItem}>
                    <View>
                        <Text style={styles.storeName}>ABC Mart</Text>
                        <Text style={styles.storeDistance}>0.8 miles away</Text>
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
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
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    productImage: {
        width: 80,
        height: 80,
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
        color: '#212529',
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 2,
    },
    scannedDataText: {
        color: '#6c757d',
        fontSize: 12,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 12,
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
        borderColor: '#20c997',
        borderWidth: 2,
    },
    storeNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212529',
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
    storeDistance: {
        color: '#6c757d',
        fontSize: 14,
    },
    priceText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#212529',
    },
    priceTextBest: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#20c997',
    },
});
