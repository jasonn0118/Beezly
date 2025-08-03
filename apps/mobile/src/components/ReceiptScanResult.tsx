import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import ReceiptService, { ReceiptItem } from "../services/receiptService";
import { Swipeable } from 'react-native-gesture-handler';
import ReceiptScanFailed from './ReceiptScanFailed';

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
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const swipeableRefs = useRef<Swipeable[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [scanFailed, setScanFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [productInfo, setProductInfo] = useState<ReceiptItem[]>([]);
    const [receiptId, setReceiptId] = useState<string | null>(null);
    const [merchantName, setMerchantName] = useState<string | null>(null);
    const [storeAddress, setStoreAddress] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedPrice, setEditedPrice] = useState('');
    const [editedBrand, setEditedBrand] = useState('');
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isBrandFocused, setIsBrandFocused] = useState(false);
    
    const handleDeleteItem = (itemId: string) => {
        setProductInfo((prev) => prev.filter((item) => item.id !== itemId));
    };

    const handleOpenModal = (item: ReceiptItem) => {
        setEditingItem(item);
        setEditedName(item.normalized_name || item.name);
        setEditedPrice(item.final_price.toString());
        setEditedBrand(item.brand || '');
        setIsModalVisible(true);
    };

    const handleSave = () => {
        if (!editingItem) return;
        setProductInfo(productInfo.map(item =>
            item.id === editingItem.id
                ? { ...item, normalized_name: editedName, price: parseFloat(editedPrice) || 0, brand: editedBrand }
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
        try {
            const formData = new FormData();
            formData.append('file', { uri: pictureData, name: 'receipt.jpg', type: 'image/jpeg' } as any);
            const response: any = await ReceiptService.processReceipt(formData);
            if (response.success && response.data) {
                // console.log("OCR API Response Data:", JSON.stringify(response.data, null, 2));
                if (response.data.item_count > 0) {
                    setProductInfo(response.data.items.map((item: any, index: number) => ({ ...item, id: item.id || `temp-${index}`, price: parseFloat(item.final_price) || 0 })) || []);
                    setReceiptId(response.data.receipt_id || null);
                    setMerchantName(response.data.merchant || null);
                    setStoreAddress(response.data.store_address || null);
                } else {
                    // 영수증이지만 아이템이 없을때...
                    setError('aaaaaaaaaaaaaaaaaaaaa.');
                    setScanFailed(true);
                }
            } else {
                setError((response as any).message || 'Failed to analyze receipt.');
                setScanFailed(true);
            }
        } catch (err: any) {
            // console.error("Error processing receipt:", JSON.stringify(err, null, 2));
            setError(err.response?.data?.message || err.message || 'A network error occurred.');
            setScanFailed(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductData();
    }, [pictureData]);

    const handleSaveReceipt = async () => {
        if (!receiptId || !productInfo) {
            // console.error("Receipt ID or product info is missing.");
            return;
        }

        // TODO: 현재 로그인된 사용자의 ID를 가져와야 합니다.
        const userId = "123e4567-e89b-12d3-a456-426614174000";
        // console.log('Save button pressed');

        const itemsToConfirm = productInfo.map(item => ({
            normalizedProductSk: item.normalized_product_sk,
            normalizedName: item.normalized_name,
            brand: item.brand || '',
        }))

        // console.log('Saving receipt with data:', { userId, receiptId, items: itemsToConfirm });

        try {
            const response = await ReceiptService.processConfirmations(userId, receiptId, itemsToConfirm);
            // console.log('Confirmation reponse:', response);

            

            if (response.pendingSelectionProducts && response.pendingSelectionProducts.length > 0) {

                // console.log("response.pendingSelectionProducts : "+ response.pendingSelectionProducts[0].topMatches);

                router.push({
                    pathname: '/product-selection',
                    params: { pendingSelectionProductsString: JSON.stringify(response.pendingSelectionProducts) },
                });
            } else {
                alert('영수증이 성공적으로 저장되었습니다!');
            }
            
        } catch (error) {
            // console.error('Failed to save receipt confirmation:', error);
            alert('저장에 실패했습니다. 다시 시도해주세요.');
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
                {(merchantName || storeAddress) && (
                    <View style={styles.merchantCard}>
                        {merchantName && <Text style={styles.merchantName}>{merchantName}</Text>}
                        {storeAddress && <Text style={styles.storeAddress}>{storeAddress}</Text>}
                    </View>
                )}

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
                        <TouchableOpacity style={styles.productCard} activeOpacity={0.8} onPress={() => {if (item.confidence_score < 0.9) { handleOpenModal(item); } }}>
                            <View style={[styles.statusDot, { backgroundColor: getConfidenceColor(item.confidence_score) }]} />
                            <View style={styles.productDetails}>
                                <Text style={styles.productName}>{item.brand && <Text>{item.brand} - </Text>}{item.normalized_name || item.name}</Text>
                                <Text style={styles.productOriginalName}>{item.name}</Text>
                            </View>
                            <View style={styles.priceContainer}>
                                <Text style={styles.productPrice}>{typeof item.final_price === 'number' ? "$"+ `${item.final_price.toFixed(2)}` : '$--.--'}</Text>
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

                            <Text style={styles.inputLabel}>Brand</Text>
                            <View style={[styles.inputContainer, isBrandFocused && styles.inputContainerFocused]}>
                                <TextInput
                                    style={styles.input}
                                    value={editedBrand}
                                    onChangeText={setEditedBrand}
                                    onFocus={() => setIsBrandFocused(true)}
                                    onBlur={() => setIsBrandFocused(false)}
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
    productBrand: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
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
});
