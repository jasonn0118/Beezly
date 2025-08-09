import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import StoreService, { Store, StoreSearchResult } from "../services/storeService";
import ReceiptService, { ReceiptItem, ProcessReceiptResponse, DateValidationResult } from "../services/receiptService";
import { Swipeable } from 'react-native-gesture-handler';
import ReceiptScanFailed from './ReceiptScanFailed';
import StoreSearch from './StoreSearch';
import CalendarDatePicker from './CalendarDatePicker';
import TimePicker from './TimePicker';
import ModernDateTimePicker from './ModernDateTimePicker';
import { isAxiosError } from 'axios';
import { useAchievementTracking } from '../hooks/useAchievementTracking';
import { useAuth } from '../contexts/AuthContext';

// Enhanced Design System Colors
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
  white: '#FFFFFF',
  black: '#000000',
};

// Helper function to check if a value is a Date object
const isDateObject = (value: unknown): value is Date => {
    return value instanceof Date;
};

// Helper function to format date string without timezone conversion issues
const formatDateString = (dateValue: string | Date): string => {
    try {
        if (isDateObject(dateValue)) {
            // If it's already a Date object, format it directly
            return dateValue.toLocaleDateString('en-CA');
        }
        
        if (typeof dateValue === 'string') {
            // Handle date strings like "2025-07-16" without timezone conversion
            if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // For YYYY-MM-DD format, return as-is to avoid timezone issues
                return dateValue;
            } else {
                // For other formats, try parsing but be careful with timezone
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-CA');
                }
            }
        }
        
        return dateValue.toString();
    } catch {
        return dateValue.toString();
    }
};

export default function ReceiptScanResult({ pictureData, onScanAgain }: { pictureData: string | null, onScanAgain: () => void }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { trackReceiptUpload, trackOCRVerification, checkForNewBadgesAndTiers } = useAchievementTracking();
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
    const [editedBrand, setEditedBrand] = useState('');
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isBrandFocused, setIsBrandFocused] = useState(false);
    const pulseAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (!loading) return; // Only run animation when loading
        const sharedAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.5,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );
        sharedAnimation.start();
        return () => sharedAnimation.stop();
    }, [loading, pulseAnim]);
    
    // Store-related state
    const [storeSearchResult, setStoreSearchResult] = useState<StoreSearchResult | null>(null);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [showStoreSearch, setShowStoreSearch] = useState(false);
    const [receiptId, setReceiptId] = useState<string | null>(null);
    
    // Date-related state
    const [receiptDate, setReceiptDate] = useState<string | null>(null);
    const [receiptTime, setReceiptTime] = useState<string | null>(null);
    const [dateValidation, setDateValidation] = useState<DateValidationResult | null>(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [editedDate, setEditedDate] = useState('');
    const [editedTime, setEditedTime] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
    const [isDateFocused, setIsDateFocused] = useState(false);
    const [isTimeFocused, setIsTimeFocused] = useState(false);
    const [dateSaving, setDateSaving] = useState(false);
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
                ? { ...item, normalized_name: editedName, final_price: parseFloat(editedPrice) || 0, brand: editedBrand }
                : item
        ));
        setIsModalVisible(false);
        setEditingItem(null);
    };

    const handleDateEdit = () => {
        // Format date consistently to avoid timezone issues
        let formattedDate = '';
        if (receiptDate) {
            try {
                // Handle string dates without timezone conversion issues
                if (typeof receiptDate === 'string' && receiptDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // If it's already in YYYY-MM-DD format, use as-is
                    formattedDate = receiptDate;
                } else if (isDateObject(receiptDate)) {
                    // If it's a Date object, format it properly
                    formattedDate = receiptDate.toISOString().split('T')[0];
                } else {
                    // Try parsing other formats
                    const date = new Date(receiptDate);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    } else {
                        // Try different date format parsing for OCR dates like "2028/07/28"
                        if (typeof receiptDate === 'string') {
                            // Handle formats like "2028/07/28" or "2028-07-28"
                            const dateStr = receiptDate.toString();
                            const parts = dateStr.split(/[\/\-]/);
                            if (parts.length === 3) {
                                // Assume YYYY/MM/DD or YYYY-MM-DD format
                                const year = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10);
                                const day = parseInt(parts[2], 10);
                                
                                // Fix likely OCR errors - if year is >2 years in future, likely misread (e.g., 2028 -> current year)
                                const currentYear = new Date().getFullYear();
                                const correctedYear = year > currentYear + 2 ? currentYear : year;
                                
                                const parsedDate = new Date(correctedYear, month - 1, day);
                                if (!isNaN(parsedDate.getTime())) {
                                    // Use local date formatting to avoid timezone conversion
                                    const year = parsedDate.getFullYear();
                                    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                                    const day = String(parsedDate.getDate()).padStart(2, '0');
                                    formattedDate = `${year}-${month}-${day}`;
                                } else {
                                    // Default to today's date if parsing fails
                                    formattedDate = new Date().toISOString().split('T')[0];
                                }
                            } else {
                                // Default to today's date if format is unrecognized
                                formattedDate = new Date().toISOString().split('T')[0];
                            }
                        }
                    }
                }
            } catch {
                // Default to today's date if all parsing fails
                formattedDate = new Date().toISOString().split('T')[0];
            }
        } else {
            // Default to today's date if no receipt date
            formattedDate = new Date().toISOString().split('T')[0];
        }
        
        setEditedDate(formattedDate);
        setEditedTime(receiptTime || '');
        
        // Initialize the modern date/time picker with current values
        try {
            let initDate = new Date();
            if (formattedDate) {
                const [year, month, day] = formattedDate.split('-').map(Number);
                initDate = new Date(year, month - 1, day);
            }
            if (receiptTime) {
                const [hours, minutes] = receiptTime.split(':').map(Number);
                initDate.setHours(hours, minutes);
            }
            setSelectedDateTime(initDate);
        } catch (error) {
            console.warn('Error parsing initial date/time:', error);
            setSelectedDateTime(new Date());
        }
        
        setShowDateModal(true);
    };

    const handleCalendarDateSelect = (selectedDate: string) => {
        setEditedDate(selectedDate);
        setShowCalendar(false);
        // Reopen the date modal after date selection
        setTimeout(() => {
            setShowDateModal(true);
        }, 100);
    };

    const handleTimePickerSelect = (selectedTime: string) => {
        setEditedTime(selectedTime);
        setShowTimePicker(false);
        // Reopen the date modal after time selection
        setTimeout(() => {
            setShowDateModal(true);
        }, 100);
    };

    // Modern date/time picker handlers
    const handleModernDateChange = (date: Date) => {
        // Preserve the existing time, only update date components
        const newDateTime = new Date(selectedDateTime);
        newDateTime.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        
        setSelectedDateTime(newDateTime);
        // Update the string format for backward compatibility
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const newDateStr = `${year}-${month}-${day}`;
        setEditedDate(newDateStr);
        
        // Update receipt display states immediately for real-time feedback
        setReceiptDate(newDateStr);
    };

    const handleModernTimeChange = (time: Date) => {
        // Preserve the existing date, only update time components
        const newDateTime = new Date(selectedDateTime);
        newDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
        
        setSelectedDateTime(newDateTime);
        // Update the string format for backward compatibility
        const hours = String(time.getHours()).padStart(2, '0');
        const minutes = String(time.getMinutes()).padStart(2, '0');
        const newTimeStr = `${hours}:${minutes}`;
        setEditedTime(newTimeStr);
        
        // Update receipt display states immediately for real-time feedback
        setReceiptTime(newTimeStr);
    };

    const handleDateSave = async () => {
        if (!receiptId) {
            alert('Receipt ID is missing. Please try scanning the receipt again.');
            return;
        }
        
        if (!editedDate) {
            alert('Please provide a valid date');
            return;
        }

        // Basic date validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(editedDate)) {
            alert('Please enter date in YYYY-MM-DD format');
            return;
        }

        const parsedDate = new Date(editedDate);
        if (isNaN(parsedDate.getTime())) {
            alert('Please enter a valid date');
            return;
        }

        setDateSaving(true);
        try {
            const response = await ReceiptService.confirmReceiptDate(
                receiptId,
                editedDate,
                editedTime || undefined
            );

            if (response.success) {
                setReceiptDate(editedDate);
                setReceiptTime(editedTime);
                setDateValidation(null); // Clear validation warnings
                setShowDateModal(false);
                alert('✅ Date updated successfully! The receipt date has been corrected.');
            } else {
                alert('❌ Failed to update date. Please check the date format and try again.');
            }
        } catch (error) {
            let errorMessage = 'Failed to update date. Please try again.';
            if (isAxiosError(error)) {
                console.error('Axios error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message,
                    url: error.config?.url,
                    method: error.config?.method,
                    requestData: error.config?.data
                });
                
                // Get the most specific error message
                const serverError = error.response?.data;
                if (serverError && typeof serverError === 'object') {
                    errorMessage = serverError.error || serverError.message || serverError.detail || 'Server error occurred';
                } else {
                    errorMessage = error.message;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            alert(`❌ ${errorMessage}`);
            console.error('Date update error:', error);
        } finally {
            setDateSaving(false);
        }
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
            const response = await ReceiptService.processReceipt(formData);
            
            if (response.success && response.data) {
                if (response.data.items.length > 0) {
                    // Handle product items
                    const items = response.data.items.map((item: any, index: number) => ({ 
                        ...item, 
                        id: item.id || `temp-${index}`, 
                        price: parseFloat(item.price) || 0 
                    })) || [];
                    
                    setProductInfo(items);
                    
                    // Track receipt upload achievement for authenticated users
                    if (isAuthenticated) {
                        const receiptData = {
                            merchant: response.data.merchant,
                            items: items.map(item => ({
                                name: item.normalized_name || item.name,
                                price: item.final_price || item.price
                            })),
                            total: items.reduce((sum, item) => sum + (item.final_price || item.price), 0)
                        };
                        
                        // Track receipt upload
                        await trackReceiptUpload(receiptData);
                        
                        // Track OCR verification for the number of items processed
                        trackOCRVerification(items.length);
                        
                        // Check for new badges and tiers after a delay
                        setTimeout(() => {
                            checkForNewBadgesAndTiers();
                        }, 2000);
                    }
                    
                    // Handle merchant and address
                    setMerchantName(response.data.merchant || null);
                    setStoreAddress(response.data.store_address || null);
                    setReceiptId(response.data.receipt_id || null);
                    
                    // Handle date information
                    setReceiptDate(response.data.date || null);
                    setReceiptTime(response.data.time || null);
                    setDateValidation(response.data.dateValidation || null);
                    
                    // Handle store search result
                    if (response.data.store_search) {
                        setStoreSearchResult(response.data.store_search);
                        if (response.data.store_search.storeFound && response.data.store_search.store) {
                            // Store was found automatically
                            setSelectedStore(response.data.store_search.store);
                        }
                    }
                }
            } else {
                setError(response.message || 'Failed to analyze receipt.');
                setScanFailed(true);
            }
        } catch (err) {
            let errorMessage = 'A network error occurred.';
            if (isAxiosError(err)) {
                errorMessage = err.response?.data?.message || err.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
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
            return;
        }

        // TODO: 현재 로그인된 사용자의 ID를 가져와야 합니다.
        const userId = "123e4567-e89b-12d3-a456-426614174000";

        const itemsToConfirm = productInfo.map(item => ({
            normalizedProductSk: item.normalized_product_sk,
            normalizedName: item.normalized_name,
            brand: item.brand || '',
        }))

        try {
            const response = await ReceiptService.processConfirmations(userId, receiptId, itemsToConfirm);
            
            // Track receipt processing completion for authenticated users
            if (isAuthenticated && response.success) {
                // Check for new badges and tier promotions after successful save
                setTimeout(() => {
                    checkForNewBadgesAndTiers();
                }, 1000);
            }
            
            if (response.pendingSelectionProducts && response.pendingSelectionProducts.length > 0) {
                router.push({
                    pathname: '/product-selection',
                    params: { 
                        pendingSelectionProductsString: JSON.stringify(response.pendingSelectionProducts),
                        receiptId: receiptId
                    },
                });
            } else {
                alert('The receipt was successfully saved');
                router.push('/');
            }
        } catch (error) {
            alert('Save failed, please try again.');
        }
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
        if (percentage >= 80) return COLORS.success;
        // if (percentage >= 70) return COLORS.warning;
        return COLORS.danger;
    };

    if (scanFailed) {
        return <ReceiptScanFailed onRetake={onScanAgain} message={error} />
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={[styles.headerButton, { width: 40 }]} />
                    <View style={[styles.skeleton, styles.headerTitleSkeleton]} />
                    <View style={[styles.headerButton, { width: 40 }]} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Animated.View style={[styles.merchantCard, { opacity: pulseAnim }]}>
                        <View style={[styles.skeleton, styles.merchantNameSkeleton]} />
                        <View style={[styles.skeleton, styles.storeAddressSkeleton]} />
                    </Animated.View>
                    <View style={[styles.skeleton, styles.sectionTitleSkeleton]} />
                    {[...Array(5)].map((_, index) => (
                        <Animated.View key={index} style={[styles.productCard, { opacity: pulseAnim, marginBottom: 12 }]}>
                            <View style={styles.statusDot} />
                            <View style={styles.productDetails}>
                                <View style={[styles.skeleton, styles.productNameSkeleton]} />
                                <View style={[styles.skeleton, styles.productOriginalNameSkeleton]} />
                            </View>
                            <View style={styles.priceContainer}>
                                <View style={[styles.skeleton, styles.productPriceSkeleton]} />
                                <View style={[styles.skeleton, styles.confidenceScoreSkeleton]} />
                            </View>
                        </Animated.View>
                    ))}
                </ScrollView>
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
                <View style={styles.headerButton} />
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

                {/* Date Section */}
                {(receiptDate || dateValidation) && (
                    <View style={styles.dateSection}>
                        <View style={[
                            styles.dateCard,
                            dateValidation && !dateValidation.isValid && styles.dateCardWarning
                        ]}>
                            <View style={styles.dateCardHeader}>
                                <FontAwesome 
                                    name={dateValidation && !dateValidation.isValid ? "exclamation-triangle" : "calendar"} 
                                    size={20} 
                                    color={dateValidation && !dateValidation.isValid ? COLORS.warning : COLORS.primary} 
                                />
                                <Text style={styles.dateCardTitle}>Receipt Date</Text>
                                <TouchableOpacity onPress={handleDateEdit} style={styles.editButton}>
                                    <FontAwesome name="edit" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.dateInfo}>
                                <Text style={styles.dateText}>
                                    {receiptDate ? formatDateString(receiptDate) : 'Date not detected'}
                                </Text>
                                {receiptTime && (
                                    <Text style={styles.timeText}>{receiptTime}</Text>
                                )}
                            </View>

                            {dateValidation && !dateValidation.isValid && (
                                <View style={styles.dateWarnings}>
                                    {dateValidation.warnings.map((warning, index) => (
                                        <Text key={index} style={styles.warningText}>
                                            ⚠️ {warning}
                                        </Text>
                                    ))}
                                    {dateValidation.suggestedDate && (
                                        <TouchableOpacity 
                                            style={styles.suggestedDateButton}
                                            onPress={() => {
                                                if (dateValidation.suggestedDate) {
                                                    const suggestedDate = isDateObject(dateValidation.suggestedDate)
                                                        ? dateValidation.suggestedDate.toISOString().split('T')[0]
                                                        : String(dateValidation.suggestedDate);
                                                    setEditedDate(suggestedDate);
                                                }
                                                setShowDateModal(true);
                                            }}
                                        >
                                            <Text style={styles.suggestedDateText}>
                                                Use suggested: {formatDateString(dateValidation.suggestedDate)}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
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
                        <TouchableOpacity style={styles.productCard} activeOpacity={0.8} onPress={() => { handleOpenModal(item); }}>
                            <View style={[styles.statusDot, { backgroundColor: getConfidenceColor(item.confidence_score) }]} />
                            <View style={styles.productDetails}>
                                <Text style={styles.productName}>{item.brand && <Text>{item.brand} - </Text>}{item.normalized_name || item.name}</Text>
                                <Text style={styles.productOriginalName}>{item.name}</Text>
                            </View>
                            <View style={styles.priceContainer}>
                                {item.original_price && typeof item.final_price === 'number' && item.original_price !== item.final_price ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <Text style={styles.originalPrice}>
                                            {`${item.original_price.toFixed(2)}`}
                                        </Text>
                                        <Text style={styles.productPrice}>
                                            {` ${item.final_price.toFixed(2)}`}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.productPrice}>
                                        {typeof item.final_price === 'number' ? `${item.final_price.toFixed(2)}` : '$--.--'}
                                    </Text>
                                )}
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

            {/* Date Confirmation Modal */}
            <Modal 
                animationType="slide" 
                transparent={true} 
                visible={showDateModal} 
                onRequestClose={() => setShowDateModal(false)}
                presentationStyle="overFullScreen"
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flexOne}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Confirm Receipt Date</Text>
                            
                            {/* Modern Date/Time Picker */}
                            <ModernDateTimePicker
                                date={selectedDateTime}
                                onDateChange={handleModernDateChange}
                                onTimeChange={handleModernTimeChange}
                                mode="datetime"
                                title="Receipt Date & Time"
                            />

                            {dateValidation && !dateValidation.isValid && (
                                <View style={styles.modalWarnings}>
                                    <Text style={styles.modalWarningTitle}>⚠️ Date Issues:</Text>
                                    {dateValidation.warnings.map((warning, index) => (
                                        <Text key={index} style={styles.modalWarningText}>
                                            • {warning}
                                        </Text>
                                    ))}
                                </View>
                            )}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowDateModal(false)}>
                                    <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.saveButton, dateSaving && styles.saveButtonDisabled]} 
                                    onPress={handleDateSave}
                                    disabled={dateSaving}
                                >
                                    <Text style={styles.modalButtonText}>
                                        {dateSaving ? 'Updating...' : 'Confirm'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <TouchableOpacity style={styles.fab} onPress={handleSaveReceipt}>
                <FontAwesome name="check" size={24} color={COLORS.white} />
            </TouchableOpacity>

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

            {/* Calendar Date Picker - Render with higher z-index */}
            {showCalendar && (
                <CalendarDatePicker
                    visible={showCalendar}
                    onClose={() => {
                        setShowCalendar(false);
                        // Reopen the date modal after closing calendar
                        setTimeout(() => {
                            setShowDateModal(true);
                        }, 100);
                    }}
                    onDateSelect={handleCalendarDateSelect}
                    initialDate={editedDate}
                    title="Select Receipt Date"
                    maxDate={new Date()} // Can't select future dates
                />
            )}

            {/* Time Picker - Render with higher z-index */}
            {showTimePicker && (
                <TimePicker
                    visible={showTimePicker}
                    onClose={() => {
                        setShowTimePicker(false);
                        // Reopen the date modal after closing time picker
                        setTimeout(() => {
                            setShowDateModal(true);
                        }, 100);
                    }}
                    onTimeSelect={handleTimePickerSelect}
                    initialTime={editedTime}
                    title="Select Receipt Time"
                    is24Hour={false} // Use 12-hour format for better UX
                />
            )}
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
    originalPrice: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textDecorationLine: 'line-through',
        marginRight: 8,
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
    saveButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
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

    skeleton: {
        backgroundColor: COLORS.separator,
        borderRadius: 4,
    },
    headerTitleSkeleton: {
        height: 20,
        width: 120,
    },
    merchantNameSkeleton: {
        height: 22,
        width: '70%',
        marginBottom: 8,
    },
    storeAddressSkeleton: {
        height: 16,
        width: '90%',
    },
    sectionTitleSkeleton: {
        height: 28,
        width: 150,
        marginBottom: 16,
    },
    productNameSkeleton: {
        height: 20,
        width: '80%',
        marginBottom: 4,
    },
    productOriginalNameSkeleton: {
        height: 16,
        width: '60%',
    },
    productPriceSkeleton: {
        height: 20,
        width: 60,
        marginBottom: 4,
    },
    confidenceScoreSkeleton: {
        height: 16,
        width: 40,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },

    // Date section styles
    dateSection: {
        marginBottom: 24,
    },
    dateCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    dateCardWarning: {
        borderLeftColor: COLORS.warning,
        backgroundColor: '#FFF9F0',
    },
    dateCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginLeft: 8,
        flex: 1,
    },
    dateInfo: {
        marginBottom: 8,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    timeText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    dateWarnings: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.separator,
    },
    warningText: {
        fontSize: 13,
        color: COLORS.warning,
        marginBottom: 4,
        lineHeight: 18,
    },
    suggestedDateButton: {
        marginTop: 8,
        padding: 8,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    suggestedDateText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Date modal styles
    modalWarnings: {
        backgroundColor: '#FFF9F0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.warning,
    },
    modalWarningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.warning,
        marginBottom: 8,
    },
    modalWarningText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4,
        lineHeight: 18,
    },
    // Date picker button styles
    datePickerButton: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14, // Reduced padding for better height
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.separator,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        minHeight: 56, // Fixed height for consistency
    },
    datePickerTouchArea: {
        flex: 1,
        // Make sure the touch area covers the entire content
        minHeight: 44, // Ensure minimum touch target size
        justifyContent: 'center', // Center content vertically
    },
    datePickerButtonInvalid: {
        borderColor: COLORS.warning,
        backgroundColor: '#FFF9F0',
    },
    datePickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 24, // Ensure consistent content height
    },
    datePickerText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '500',
        marginLeft: 12,
        textAlignVertical: 'center', // Android alignment
        includeFontPadding: false, // Remove extra padding on Android
    },
    datePickerTextInvalid: {
        color: COLORS.warning,
        fontWeight: '600',
    },
});