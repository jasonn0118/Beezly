import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, Modal, FlatList, SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import CategoryService, { CategoryTreeDTO } from '../../services/categoryService';

interface CategoryPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectCategory: (categoryId: string, categoryName: string) => void;
}

export default function CategoryPicker({ visible, onClose, onSelectCategory }: CategoryPickerProps) {
    const [baseCategories, setBaseCategories] = useState<CategoryTreeDTO[]>([]);
    const [currentCategories, setCurrentCategories] = useState<CategoryTreeDTO[]>([]);
    const [selectionPath, setSelectionPath] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            fetchCategories();
        }
    }, [visible]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const categoryTree = await CategoryService.getCategoryTree();
            setBaseCategories(categoryTree);
            setCurrentCategories(categoryTree);
        } catch (error) {
            Alert.alert("Error", "Failed to load categories.");
            console.error("Failed to fetch categories:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (category: CategoryTreeDTO) => {
        const newPath = [...selectionPath, category.name];
        setSelectionPath(newPath);

        if (category.subcategories && category.subcategories.length > 0) {
            setCurrentCategories(category.subcategories);
        } else {
            onSelectCategory(String(category.id), newPath.join(' > '));
            resetAndClose();
        }
    };

    const handleBack = () => {
        const newPath = selectionPath.slice(0, -1);
        setSelectionPath(newPath);

        let categoriesToShow = baseCategories;
        for (const pathPart of newPath) {
            const nextLevel = categoriesToShow.find(c => c.name === pathPart);
            if (nextLevel && nextLevel.subcategories) {
                categoriesToShow = nextLevel.subcategories;
            } else {
                break; 
            }
        }
        setCurrentCategories(categoriesToShow);
    };

    const resetAndClose = () => {
        setSelectionPath([]);
        setCurrentCategories(baseCategories);
        onClose();
    };

    const renderCategory = ({ item }: { item: CategoryTreeDTO }) => (
        <TouchableOpacity style={styles.categoryItem} onPress={() => handleSelect(item)}>
            <Text style={styles.categoryName}>{item.name}</Text>
            {item.subcategories && item.subcategories.length > 0 && (
                <FontAwesome name="chevron-right" size={16} color="#6b7280" />
            )}
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={resetAndClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        {selectionPath.length > 0 && (
                            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                <FontAwesome name="arrow-left" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                            {selectionPath.length > 0 ? selectionPath.join(' > ') : 'Select a Category'}
                        </Text>
                        <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
                            <FontAwesome name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator style={styles.loader} size="large" color="#4b5563" />
                    ) : (
                        <FlatList
                            data={currentCategories}
                            renderItem={renderCategory}
                            keyExtractor={(item) => String(item.id)}
                        />
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '60%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 40, 
    },
    backButton: {
        position: 'absolute',
        left: 0,
        zIndex: 1,
        padding: 5,
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        zIndex: 1,
        padding: 5,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4b5563',
    },
});
