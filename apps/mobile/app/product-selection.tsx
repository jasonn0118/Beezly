import React, { useState, useMemo } from 'react';
import { View, Text, Image, SectionList, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Pressable, Animated, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import ReceiptService from '../src/services/receiptService';

// Enhanced Design System Colors
const COLORS = {
    primary: '#007AFF',
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#1C1C1E',
    textSecondary: '#8A8A8E',
    textTertiary: '#C7C7CC',
    separator: '#E5E5EA',
    white: '#FFFFFF',
    lightBlue: '#E9F5FF',
    lightGray: '#E5E5EA',
    red: '#FF3B30',
};

const NO_MATCH_SK = null;

const ProductSelectionScreen = () => {
    const router = useRouter();
    const { pendingSelectionProductsString, receiptId } = useLocalSearchParams();
    const pendingSelectionProducts = JSON.parse(pendingSelectionProductsString as string);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selections, setSelections] = useState<{ [key: string]: any }>({});
    const [animatedValue] = useState(new Animated.Value(0));
    const [isSaving, setIsSaving] = useState(false);

    const sections = useMemo(() => pendingSelectionProducts.map((product: any, index: number) => ({
        title: product.name,
        index: index,
        data: [...product.topMatches, { productSk: NO_MATCH_SK, name: 'None of these match' }],
    })), [pendingSelectionProducts]);

    const allSectionsSelected = useMemo(() => {
        const allSelected = sections.length === Object.keys(selections).length;
        Animated.timing(animatedValue, {
            toValue: allSelected ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
        return allSelected;
    }, [sections, selections, animatedValue]);

    const handleSelectProduct = (sectionIndex: number, product: any) => {
        setSelections(prev => ({
            ...prev,
            [sectionIndex]: product,
        }));
    };

    const handleSave = async () => {
        if (!allSectionsSelected || isSaving) return;
        setIsSaving(true);

        const finalSelections = Object.entries(selections).map(([sectionIndex, selectedProduct]) => {
            const originalProduct = pendingSelectionProducts[parseInt(sectionIndex, 10)];
            const isNoMatch = (selectedProduct as any).productSk === NO_MATCH_SK;
            return {
                normalizedProductSk: originalProduct.normalizedProduct?.normalizedProductSk,
                selectedProductSk: isNoMatch ? null : (selectedProduct as any).productSk,
                selectionReason: isNoMatch ? 'No suitable product found' : 'Selected best match',
            };
        });

        const payload = {
            selections: finalSelections,
            userId: '' as string,
            receiptId: receiptId as string,
        };

        try {
            await ReceiptService.processPendingSelections(payload);
            Alert.alert('Success', 'Your selections have been saved.');
            router.push('/');
        } catch (error) {
            console.error('Failed to save selections:', error);
            Alert.alert('Error', 'Failed to save your selections. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const openImageModal = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setModalVisible(true);
    };

    const closeImageModal = () => {
        setModalVisible(false);
        setSelectedImage(null);
    };

    const buttonStyle = {
        backgroundColor: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [COLORS.lightGray, COLORS.primary]
        }),
        transform: [{
            scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05]
            })
        }]
    };

    return (
        <SafeAreaView style={styles.container}>
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeImageModal}
            >
                <Pressable style={styles.modalContainer} onPress={closeImageModal}>
                    <View style={styles.modalContent}>
                        {selectedImage && <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />}
                        <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
                            <FontAwesome name="close" size={30} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <FontAwesome name="arrow-left" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Matches</Text>
                <View style={{ width: 40 }} />
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item.productSk + index}
                contentContainerStyle={styles.listContentContainer}
                renderItem={({ item, section }) => {
                    const isSelected = selections[section.index]?.productSk === item.productSk;
                    if (item.productSk === NO_MATCH_SK) {
                        return (
                            <Animated.View style={[styles.card, styles.noMatchCard, isSelected && styles.cardSelected]}>
                                <TouchableOpacity onPress={() => handleSelectProduct(section.index, item)} style={styles.touchableCard}>
                                    <FontAwesome name="times-circle-o" size={24} color={COLORS.red} style={{ marginRight: 12 }} />
                                    <View style={styles.infoContainer}>
                                        <Text style={styles.noMatchText}>{item.name}</Text>
                                    </View>
                                    <FontAwesome name={isSelected ? "check-circle" : "circle-o"} size={24} color={isSelected ? COLORS.primary : COLORS.textTertiary} />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    }
                    return (
                        <Animated.View style={[styles.card, isSelected && styles.cardSelected]}>
                            <TouchableOpacity onPress={() => handleSelectProduct(section.index, item)} style={styles.touchableCard}>
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); item.imageUrl && openImageModal(item.imageUrl); }}>
                                    <Image source={{ uri: item.imageUrl || undefined }} style={styles.image} />
                                </TouchableOpacity>
                                <View style={styles.infoContainer}>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.brand}>{item.brandName}</Text>
                                </View>
                                <FontAwesome name={isSelected ? "check-circle" : "circle-o"} size={24} color={isSelected ? COLORS.primary : COLORS.textTertiary} />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>Select a match for "{title}"</Text>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />} 
            />

            <View style={styles.footer}>
                <Animated.View style={[styles.completeButton, buttonStyle]}>
                    <TouchableOpacity onPress={handleSave} disabled={!allSectionsSelected || isSaving} style={styles.completeButtonTouchable}>
                        {isSaving ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.completeButtonText}>Complete Selection</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
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
    listContentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Footer padding
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 24,
        marginBottom: 12,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    cardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    touchableCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: COLORS.separator,
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
        marginRight: 10,
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    brand: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    noMatchCard: {
        backgroundColor: COLORS.card,
    },
    noMatchText: {
        fontSize: 16,
        fontStyle: 'italic',
        color: COLORS.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderTopWidth: 1,
        borderTopColor: COLORS.separator,
    },
    completeButton: {
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeButtonTouchable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
        width: '90%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
    },
});

export default ProductSelectionScreen;