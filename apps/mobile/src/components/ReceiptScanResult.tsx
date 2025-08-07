import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ReceiptService, { ReceiptItem } from "../services/receiptService";
import StoreService, { Store, StoreSearchResult } from "../services/storeService";
import { Swipeable } from 'react-native-gesture-handler';
import ReceiptScanFailed from './ReceiptScanFailed';
import StoreSearch from './StoreSearch';

// 디자인 시스템 색상 정의
const COLORS = {
  primary: '#007AFF', // 활성/브랜드 색상 (Apple Blue)
  background: '#F2F2F7', // 화면 배경색
  card: '#FFFFFF', // 카드 배경색
  textPrimary: '#1C1C1E', // 주요 텍스트
  textSecondary: '#8A8A8E', // 보조 텍스트
  textTertiary: '#C7C7CC', // 가장 연한 텍스트
  separator: '#E5E5EA', // 구분선
  success: '#34C759', // 성공 (신뢰도 높음)
  warning: '#FF9500', // 경고 (신뢰도 보통)
  danger: '#FF3B30', // 위험 (신뢰도 낮음)
  white: '#FFFFFF',
  black: '#000000',
};

export default function ReceiptScanResult({ pictureData, onScanAgain }: { pictureData: string | null, onScanAgain: () => void }) {
    const [loading, setLoading] = useState(true);
    const swipeableRefs = useRef<Swipeable[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [scanFailed, setScanFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [productInfo, setProductInfo] = useState<ReceiptItem[]>([]);
    const [merchantName, setMerchantName] = useState<string | null>(null);
    const [storeAddress, setStoreAddress] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedPrice, setEditedPrice] = useState('');
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    
    // Store-related state
    const [storeSearchResult, setStoreSearchResult] = useState<StoreSearchResult | null>(null);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [showStoreSearch, setShowStoreSearch] = useState(false);
    const [receiptId, setReceiptId] = useState<string | null>(null);

    const handleDeleteItem = (itemId: string) => {
        setProductInfo((prev) => prev.filter((item) => item.id !== itemId));
    };

    const handleOpenModal = (item: ReceiptItem) => {
        setEditingItem(item);
        setEditedName(item.normalized_name || item.name);
        setEditedPrice(item.price.toString());
        setIsModalVisible(true);
    };

    const handleSave = () => {
        if (!editingItem) return;
        setProductInfo(productInfo.map(item =>
            item.id === editingItem.id
                ? { ...item, normalized_name: editedName, price: parseFloat(editedPrice) || 0 }
                : item
        ));
        setIsModalVisible(false);
        setEditingItem(null);
    };

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, itemId: string) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity onPress={() => handleDeleteItem(itemId)} style={styles.deleteButtonContainer}>
                <Animated.View style={[styles.deleteButton, { transform: [{ translateX: trans }] }]}>
                    <FontAwesome name="trash" size={24} color={COLORS.white} />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const fetchProductData = async () => {
        if (!pictureData) return;
        setLoading(true);
        setScanFailed(false);
        setStoreSearchResult(null);
        setSelectedStore(null);
        
        try {
            const formData = new FormData();
            formData.append('file', { uri: pictureData, name: 'receipt.jpg', type: 'image/jpeg' } as any);
            const response: any = await ReceiptService.processReceipt(formData);
            
            if (response.success && response.data) {
                // Handle product items
                setProductInfo(response.data.items.map((item: any, index: number) => ({ 
                    ...item, 
                    id: item.id || `temp-${index}`, 
                    price: parseFloat(item.price) || 0 
                })) || []);
                
                // Handle merchant and address
                setMerchantName(response.data.merchant || null);
                setStoreAddress(response.data.store_address || null);
                setReceiptId(response.data.receipt_id || null);
                
                // Handle store search result
                if (response.data.store_search) {
                    setStoreSearchResult(response.data.store_search);
                    if (response.data.store_search.storeFound && response.data.store_search.store) {
                        // Store was found automatically
                        setSelectedStore(response.data.store_search.store);
                    }
                }
            } else {
                setError((response as any).message || 'Failed to analyze receipt.');
                setScanFailed(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'A network error occurred.');
            setScanFailed(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductData();
    }, [pictureData]);

    const handleSaveReceipt = () => {
        // TODO: Implement receipt saving logic
    };
    
    const handleStoreSelect = async (store: Store) => {
        setSelectedStore(store);
        setShowStoreSearch(false);
        
        // TODO: If receiptId exists, confirm the store selection with the backend
        if (receiptId) {
            try {
                await StoreService.confirmStoreForReceipt({
                    receiptId,
                    storeId: store.id,
                    continueProcessing: true
                });
            } catch (error) {
                // Handle error silently or show user feedback
            }
        }
    };
    
    const handleEditStore = () => {
        setShowStoreSearch(true);
    };
    
    const handleCreateNewStore = async (storeName: string) => {
        try {
            // In a real implementation, you'd want to collect more info
            const newStore = await StoreService.createStore({
                name: storeName,
                fullAddress: storeAddress || `${storeName} - Address not specified`,
                city: 'Unknown',
            });
            setSelectedStore(newStore);
            setShowStoreSearch(false);
            
            if (receiptId) {
                await StoreService.confirmStoreForReceipt({
                    receiptId,
                    storeId: newStore.id,
                    continueProcessing: true
                });
            }
        } catch (error) {
            // Handle error silently or show user feedback
        }
    };

    const getConfidenceColor = (score: number) => {
        const percentage = score * 100;
        if (percentage >= 90) return COLORS.success;
        if (percentage >= 70) return COLORS.warning;
        return COLORS.danger;
    };

    if (scanFailed) {
        return <ReceiptScanFailed onRetake={onScanAgain} message={error} />
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Analyzing Receipt...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onScanAgain} style={styles.headerButton}>
                    <FontAwesome name="arrow-left" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Result</Text>
                <TouchableOpacity onPress={handleSaveReceipt} style={styles.headerButton}>
                    <FontAwesome name="check" size={22} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Store Section */}
                <View style={styles.storeSection}>
                    {selectedStore ? (
                        // Store Found UI
                        <View style={styles.storeCard}>
                            <View style={styles.storeCardHeader}>
                                <FontAwesome name="map-marker" size={20} color={COLORS.primary} />
                                <Text style={styles.storeCardTitle}>Store</Text>
                                <TouchableOpacity onPress={handleEditStore} style={styles.editButton}>
                                    <FontAwesome name="edit" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.storeName}>{selectedStore.name}</Text>
                            {selectedStore.fullAddress && (
                                <Text style={styles.storeAddress}>{selectedStore.fullAddress}</Text>
                            )}
                            {selectedStore.confidence && (
                                <Text style={styles.storeConfidence}>
                                    Match: {Math.round(selectedStore.confidence * 100)}%
                                </Text>
                            )}
                        </View>
                    ) : storeSearchResult ? (
                        // Store Not Found UI
                        <View style={styles.storeNotFoundCard}>
                            <View style={styles.storeCardHeader}>
                                <FontAwesome name="exclamation-triangle" size={20} color={COLORS.warning} />
                                <Text style={styles.storeCardTitle}>Store Not Found</Text>
                            </View>
                            <Text style={styles.storeNotFoundMessage}>
                                {storeSearchResult.message}
                            </Text>
                            <Text style={styles.extractedInfo}>
                                From receipt: {storeSearchResult.extractedMerchant}
                                {storeSearchResult.extractedAddress && ` - ${storeSearchResult.extractedAddress}`}
                            </Text>
                            <TouchableOpacity
                                style={styles.searchStoreButton}
                                onPress={() => setShowStoreSearch(true)}
                            >
                                <FontAwesome name="search" size={16} color={COLORS.primary} style={styles.searchButtonIcon} />
                                <Text style={styles.searchStoreButtonText}>Search & Select Store</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Fallback - Original merchant card
                        (merchantName || storeAddress) && (
                            <View style={styles.merchantCard}>
                                {merchantName && <Text style={styles.merchantName}>{merchantName}</Text>}
                                {storeAddress && <Text style={styles.storeAddress}>{storeAddress}</Text>}
                            </View>
                        )
                    )}
                </View>

                <Text style={styles.sectionTitle}>Products</Text>
                {productInfo.map((item, index) => (
                    <Swipeable
                        key={item.id}
                        ref={(ref) => { if (ref) swipeableRefs.current[index] = ref; }}
                        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
                        onSwipeableWillOpen={() => {
                            swipeableRefs.current.forEach((ref, i) => { if (i !== index && ref) ref.close(); });
                        }}
                    >
                        <TouchableOpacity style={styles.productCard} activeOpacity={0.8} onPress={() => handleOpenModal(item)}>
                            <View style={[styles.statusDot, { backgroundColor: getConfidenceColor(item.confidence_score) }]} />
                            <View style={styles.productDetails}>
                                <Text style={styles.productName}>{item.normalized_name || item.name}</Text>
                                <Text style={styles.productOriginalName}>{item.name}</Text>
                            </View>
                            <View style={styles.priceContainer}>
                                <Text style={styles.productPrice}>{typeof item.price === 'number' ? "$"+ `${item.price.toFixed(2)}` : '$--.--'}</Text>
                                <Text style={styles.confidenceScore}>{(item.confidence_score * 100).toFixed(0)}%</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={16} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                    </Swipeable>
                ))}
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flexOne}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Edit Product</Text>
                            
                            <Text style={styles.inputLabel}>Product Name</Text>
                            <View style={[styles.inputContainer, isNameFocused && styles.inputContainerFocused]}>
                                <TextInput
                                    style={styles.input}
                                    value={editedName}
                                    onChangeText={setEditedName}
                                    onFocus={() => setIsNameFocused(true)}
                                    onBlur={() => setIsNameFocused(false)}
                                />
                            </View>

                            <Text style={styles.inputLabel}>Price</Text>
                            <View style={[styles.inputContainer, isPriceFocused && styles.inputContainerFocused]}>
                                <TextInput
                                    style={styles.input}
                                    value={editedPrice}
                                    onChangeText={setEditedPrice}
                                    keyboardType="numeric"
                                    onFocus={() => setIsPriceFocused(true)}
                                    onBlur={() => setIsPriceFocused(false)}
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalVisible(false)}>
                                    <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                                    <Text style={styles.modalButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Store Search Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={showStoreSearch}
                onRequestClose={() => setShowStoreSearch(false)}
            >
                <View style={styles.storeSearchModal}>
                    <View style={styles.storeSearchHeader}>
                        <TouchableOpacity onPress={() => setShowStoreSearch(false)} style={styles.storeSearchCloseButton}>
                            <FontAwesome name="arrow-left" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.storeSearchTitle}>Find Store</Text>
                        <View style={styles.storeSearchPlaceholder} />
                    </View>
                    <StoreSearch
                        onStoreSelect={handleStoreSelect}
                        onCreateNew={handleCreateNewStore}
                        initialQuery={storeSearchResult?.extractedMerchant || merchantName || ''}
                        showCreateOption={true}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    flexOne: { flex: 1 },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        fontSize: 18,
        color: COLORS.textSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 10,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    headerButton: {
        padding: 10,
    },
    scrollContent: {
        padding: 16,
    },
    merchantCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    merchantName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    storeAddress: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 16,
    },
    productDetails: {
        flex: 1,
        marginRight: 10,
    },
    productName: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    productOriginalName: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    priceContainer: {
        alignItems: 'flex-end',
        marginRight: 12,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    confidenceScore: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    deleteButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    deleteButton: {
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: '90%',
        borderRadius: 12,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.separator,
        marginBottom: 16,
    },
    inputContainerFocused: {
        borderColor: COLORS.primary,
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        marginLeft: 8,
    },
    cancelButton: {
        backgroundColor: COLORS.separator,
        marginRight: 8,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    cancelButtonText: {
        color: COLORS.textPrimary,
    },
    
    // Store section styles
    storeSection: {
        marginBottom: 24,
    },
    storeCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success,
    },
    storeNotFoundCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
    },
    storeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    storeCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginLeft: 8,
        flex: 1,
    },
    editButton: {
        padding: 8,
        backgroundColor: COLORS.background,
        borderRadius: 8,
    },
    storeName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    storeConfidence: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    storeNotFoundMessage: {
        fontSize: 14,
        color: COLORS.textPrimary,
        marginBottom: 12,
        lineHeight: 20,
    },
    extractedInfo: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    searchStoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    searchButtonIcon: {
        marginRight: 8,
    },
    searchStoreButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Store search modal styles
    storeSearchModal: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    storeSearchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator,
    },
    storeSearchCloseButton: {
        padding: 8,
    },
    storeSearchTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    storeSearchPlaceholder: {
        width: 44, // Same width as close button for centering
    },
});
