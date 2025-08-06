import React from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

// Define the structure for a badge object
interface Badge {
    id: string;
    name: string;
    icon: keyof typeof FontAwesome.glyphMap; // Use FontAwesome icon names
    earned: boolean;
}

// Mock data for demonstration
const MOCK_BADGES: Badge[] = [
    { id: '1', name: 'First Scan', icon: 'users', earned: true },
    { id: '2', name: 'First Deal Found', icon: 'star', earned: true },
    { id: '3', name: 'Top 10 Ranker', icon: 'users', earned: false },
    { id: '4', name: 'Scanner Pro', icon: 'star', earned: false },
    // Add more badges as needed
    // { id: '5', name: 'Contributor', icon: 'plus-circle', earned: false },
    // { id: '6', name: 'Super Saver', icon: 'piggy-bank', earned: false },
    // { id: '6', name: 'Super Saver', icon: 'piggy-bank', earned: false },
];

// --- Reusable Badge Item Component ---
const BadgeItem = ({ badge }: { badge: Badge }) => {
    // FIX: Explicitly cast badge.icon to a string for comparison to resolve TS error
    const iconColor = badge.earned ? (String(badge.icon) === 'medal' ? '#FFC107' : '#20c997') : '#d1d5db';
    
    return (
        <View style={styles.badgeContainer}>
            <FontAwesome name={badge.icon} size={40} color={iconColor} />
            {/* You can optionally add a label below the icon */}
            {/* <Text style={[styles.badgeLabel, { color: iconColor }]}>{badge.name}</Text> */}
        </View>
    );
};


// --- Main Badges Component ---
export default function Badges() {
    // In a real app, you would fetch this data from an API
    const badges = MOCK_BADGES;

    return (
        <View style={styles.cardContainer}>
            <Text style={styles.title}>My Badges</Text>
            <FlatList
                data={badges}
                keyExtractor={(item) => item.id}
                // FIX: Corrected syntax from "in" to "=>"
                renderItem={({ item }) => <BadgeItem badge={item} />}
                numColumns={3} // Display 3 badges per row
                contentContainerStyle={styles.gridContainer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 20,
        textAlign: 'center',
    },
    gridContainer: {
        alignItems: 'center',
    },
    badgeContainer: {
        width: '33%', // Each item takes up a third of the container width
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    badgeLabel: {
        marginTop: 8,
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
});
