import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import StoreService, { Store } from '../services/storeService';

// Design system colors
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  card: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8A8A8E',
  textTertiary: '#C7C7CC',
  separator: '#E5E5EA',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
};

interface StoreSearchProps {
  onStoreSelect: (store: Store) => void;
  onCreateNew?: (storeName: string) => void;
  initialQuery?: string;
  showCreateOption?: boolean;
}

export default function StoreSearch({
  onStoreSelect,
  onCreateNew,
  initialQuery = '',
  showCreateOption = true,
}: StoreSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  console.log('StoreSearch mounted with initialQuery:', initialQuery);

  const searchStores = async (query: string) => {
    if (!query || !query.trim()) {
      setStores([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      // In a real app, you might want to get user location for better results
      console.log('Searching for:', query.trim());
      const response = await StoreService.searchStores({
        query: query.trim(),
        limit: 10,
      });
      
      console.log('Search response:', response);
      
      // Ensure response exists and has expected structure
      if (!response) {
        console.warn('Search response is null/undefined');
        setStores([]);
        setHasSearched(true);
        return;
      }
      
      // Combine local and Google stores safely
      const localStores = Array.isArray(response.localStores) ? response.localStores : [];
      const googleStores = Array.isArray(response.googleStores) ? response.googleStores : [];
      const allStores = [...localStores, ...googleStores];
      
      console.log('Combined stores:', allStores.length, 'stores found');
      setStores(allStores);
      setHasSearched(true);
    } catch (error) {
      console.error('Store search failed:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Search Error', 'Failed to search for stores. Please try again.');
      setStores([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (!searchQuery || !searchQuery.trim()) return;
    
    Alert.alert(
      'Create New Store',
      `Do you want to create a new store entry for "${searchQuery.trim()}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => onCreateNew?.(searchQuery.trim()),
        },
      ]
    );
  };

  const renderStoreItem = ({ item: store }: { item: Store }) => (
    <TouchableOpacity
      style={styles.storeItem}
      onPress={() => onStoreSelect(store)}
      activeOpacity={0.7}
    >
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{store.name}</Text>
        {store.fullAddress && (
          <Text style={styles.storeAddress}>{store.fullAddress}</Text>
        )}
        {store.confidence && (
          <Text style={styles.confidence}>
            Match: {Math.round(store.confidence * 100)}%
          </Text>
        )}
      </View>
      <FontAwesome name="chevron-right" size={16} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );

  useEffect(() => {
    if (initialQuery) {
      searchStores(initialQuery);
    }
  }, [initialQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome name="search" size={16} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for store..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchStores(searchQuery)}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {searchQuery && searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => searchStores(searchQuery)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {hasSearched && (
        <View style={styles.resultsContainer}>
          {stores.length > 0 ? (
            <FlatList
              data={stores}
              renderItem={renderStoreItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.noResults}>
              <FontAwesome name="map-marker" size={48} color={COLORS.textTertiary} />
              <Text style={styles.noResultsTitle}>No stores found</Text>
              <Text style={styles.noResultsSubtitle}>
                We couldn't find any stores matching your search
              </Text>
              {showCreateOption && searchQuery && searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateNew}
                >
                  <FontAwesome name="plus" size={16} color={COLORS.primary} style={styles.createButtonIcon} />
                  <Text style={styles.createButtonText}>
                    Create "{searchQuery.trim()}"
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {!hasSearched && (!searchQuery || searchQuery.length === 0) && (
        <View style={styles.initialState}>
          <FontAwesome name="search" size={48} color={COLORS.textTertiary} />
          <Text style={styles.initialStateText}>
            Search for your store to get started
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  storeItem: {
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  confidence: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.separator,
    marginHorizontal: 16,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  createButtonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  initialStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
});