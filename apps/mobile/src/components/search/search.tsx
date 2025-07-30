import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ProductService, { ProductSearchResult } from '../../services/productService';
 import { useNavigation } from '@react-navigation/native';
 import {useRouter} from 'expo-router';
 import ProductDetailScreen from '../../screens/ProductDetailScreen';

const ResultCard = ({ item, onPress }: { item: ProductSearchResult, onPress: () => void }) => (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
        <Image 
            source={{ uri: item.image_url }} 
            style={styles.cardImage} 
            // Add a fallback for broken image URLs
            //defaultSource={require('./path/to/your/default/placeholder.png')} // Make sure to have a local placeholder image
        />
        <View style={styles.cardInfo}>
            <Text style={styles.cardBrand}>{item.brand_name || 'Unknown Brand'}</Text>
            <Text style={styles.cardName}>{item.name}</Text>
        </View>
        <FontAwesome name="chevron-right" size={16} color="#d1d5db" />
    </TouchableOpacity>
);

export default function SearchScreen() {
    const router = useRouter();

    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<ProductSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const navigation = useNavigation();

    const handleSearchSubmit = async () => {
        if (searchText.trim() === '') {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const response = await ProductService.searchProducts(searchText);
            setResults(response || []);
        } catch (err) {
            console.error('Search API Error:', err);
            setResults([]);
        } finally {
             setLoading(false);
        }
    };

    const handleProductInfo = (item : ProductSearchResult) => {
        console.log(item.product_sk);
        if(item.product_sk){
            //return <ProductDetailScreen productId={item.product_sk} />   
             router.push(`/product-detail?productId=${item.product_sk}`);
        }
    };

    // Helper to render content based on state
    const renderContent = () => {
        if (loading) {
            return <ActivityIndicator size="large" color="#fbbf24" style={styles.centered} />;
        }

        if (!hasSearched) {
            return (
                <View style={styles.placeholderContainer}>
                    <FontAwesome name="search" size={50} color="#d1d5db" />
                    <Text style={styles.placeholderText}>Search for items to see results</Text>
                    <Text style={styles.placeholderSubtext}>Find prices, stores, and more.</Text>
                </View>
            );
        }

        if (results.length > 0) {
            return (
                <FlatList
                    data={results}
                    keyExtractor={(item, index) => `${item.product_sk}-${index}`}
                    renderItem={({ item }) => <ResultCard item={item} onPress={() => handleProductInfo(item)} />}
                    showsVerticalScrollIndicator={false}
                />
            );
        }

        return (
            <View style={styles.placeholderContainer}>
                <FontAwesome name="frown-o" size={50} color="#d1d5db" />
                <Text style={styles.placeholderText}>No results found</Text>
                <Text style={styles.placeholderSubtext}>Try searching for something else.</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Search Products</Text>

            <View style={styles.searchContainer}>
                <FontAwesome name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="What are you looking for?"
                    placeholderTextColor="#9ca3af"
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                />
            </View>

            <View style={styles.contentArea}>
                {renderContent()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: 20,
        paddingTop: 60,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        height: 56,
        fontSize: 16,
        color: '#1f2937',
    },
    contentArea: {
        flex: 1,
        marginTop: 24,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    placeholderSubtext: {
        marginTop: 4,
        color: '#9ca3af',
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    cardImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#f0f0f0', // Placeholder color
    },
    cardInfo: {
        flex: 1,
        marginLeft: 16,
    },
    cardBrand: {
        fontSize: 14,
        color: '#6b7280',
    },
    cardName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginVertical: 2,
    },
});
