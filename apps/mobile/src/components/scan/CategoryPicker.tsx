import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { categoryService, category as ApiCategory } from '../../services/categoryService';

// This is the internal interface used by the component for UI properties.
interface Category {
    id: string;
    name: string;
    icon: keyof typeof FontAwesome.glyphMap;
    color: string;
    // We no longer need subCategories here, as they are fetched dynamically.
}

// This function maps the API response to the component's internal Category type.
// It assigns a default icon and color.
const mapApiCategoryToComponentCategory = (apiCategory: ApiCategory): Category => {
    // TODO: You can implement logic here to assign specific icons/colors based on category name or slug.
    return {
        id: apiCategory.id,
        name: apiCategory.name,
        icon: 'folder', // Default icon
        color: '#6b7280', // Default color
    };
};


interface CategoryPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectCategory: (category: string) => void;
}

export default function CategoryPicker({ visible, onClose, onSelectCategory }: CategoryPickerProps) {
    // State to keep track of the navigation history (path)
    const [history, setHistory] = useState<Category[]>([]);
    // State to hold the categories currently being displayed
    const [displayedCategories, setDisplayedCategories] = useState<Category[]>([]);
    // State to manage loading indicator
    const [isLoading, setIsLoading] = useState(false);

    const currentParentCategory = history.length > 0 ? history[history.length - 1] : null;
    const isSubCategoryView = !!currentParentCategory;

    // Function to fetch categories from the API
    const fetchCategories = async (parentId: string | null) => {
        setIsLoading(true);
        try {
            // We assume a function `getCategories` exists in your service.
            // If parentId is null, it fetches top-level categories.
            // Otherwise, it fetches sub-categories for the given parentId.
            const apiCategories = await categoryService.getAllCategories();
            const componentCategories = apiCategories.map(mapApiCategoryToComponentCategory);
            setDisplayedCategories(componentCategories);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            // Optionally, show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch initial categories when the modal becomes visible
    useEffect(() => {
        if (visible) {
            fetchCategories(null); // Fetch top-level categories
        } else {
            // Reset history when modal is closed
            setHistory([]);
        }
    }, [visible]);


    const handleCategoryPress = async (category: Category) => {
        setIsLoading(true);
        try {
            // Check if the selected category has sub-categories by trying to fetch them.
            const subCategories = await categoryService.getCategories(category.id);
            if (subCategories && subCategories.length > 0) {
                // If it has sub-categories, go deeper
                setHistory([...history, category]);
                setDisplayedCategories(subCategories.map(mapApiCategoryToComponentCategory));
            } else {
                // If it's a final selection, call the callback and close
                onSelectCategory(category.name);
                onClose();
            }
        } catch (error) {
            console.error("Failed to check for sub-categories:", error);
            // If there's an error, assume it's a final selection
            onSelectCategory(category.name);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackPress = () => {
        // Go back one level
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);
        const parentId = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : null;
        fetchCategories(parentId);
    };

    const renderCategoryItem = ({ item }: { item: Category }) => {
        if (isSubCategoryView) {
            // Render as a list for sub-categories
            return (
                <TouchableOpacity style={styles.listItem} onPress={() => handleCategoryPress(item)}>
                    <Text style={styles.listItemText}>{item.name}</Text>
                </TouchableOpacity>
            );
        }
        // Render as a grid for main categories
        return (
            <TouchableOpacity style={styles.gridItem} onPress={() => handleCategoryPress(item)}>
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                    <FontAwesome name={item.icon} size={24} color="white" />
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{isSubCategoryView ? 'Sub Category' : 'Category'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <FontAwesome name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {isSubCategoryView && currentParentCategory && (
                        <View style={styles.backBar}>
                            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
                                <FontAwesome name="chevron-left" size={16} color="#6b7280" />
                                <View style={[styles.backIconContainer, { backgroundColor: currentParentCategory.color }]}>
                                    <FontAwesome name={currentParentCategory.icon} size={16} color="white" />
                                </View>
                                <Text style={styles.backButtonText}>{currentParentCategory.name}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#6b7280" />
                    ) : (
                        <FlatList
                            data={displayedCategories}
                            renderItem={renderCategoryItem}
                            keyExtractor={(item) => item.id}
                            key={isSubCategoryView ? 'list' : 'grid'} // Change key to force re-render on layout change
                            numColumns={isSubCategoryView ? 1 : 4}
                            contentContainerStyle={isSubCategoryView ? styles.listContainer : styles.gridContainer}
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)' 
    },
    modalContent: { 
        backgroundColor: 'white', 
        borderTopLeftRadius: 20, 
        borderTopRightRadius: 20, 
        padding: 20, height: '60%', 
        justifyContent: 'center' 
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    backBar: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 12, marginBottom: 12 },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    backIconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
    backButtonText: { fontSize: 16, fontWeight: '600' },
    // Grid Styles
    gridContainer: { justifyContent: 'center' },
    gridItem: { flex: 1, alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    categoryName: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#4b5563' },
    // List Styles
    listContainer: {},
    listItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    listItemText: { fontSize: 16 },
});
