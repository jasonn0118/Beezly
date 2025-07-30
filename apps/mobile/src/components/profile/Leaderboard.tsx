import React from 'react';
import { StyleSheet, Text, View, FlatList, Image } from 'react-native';

// Define the structure for a user object
interface User {
    id: string;
    rank: number;
    name: string;
    points: number;
    avatarInitial: string;
    avatarColor?: string; // Optional color for the avatar
}

// Mock data for demonstration
const MOCK_LEADERBOARD_USERS: User[] = [
    { id: '2', rank: 1, name: 'Alex', points: 5430, avatarInitial: 'A', avatarColor: '#E67E22' },
    { id: '3', rank: 2, name: 'Benny', points: 4980, avatarInitial: 'B', avatarColor: '#3498DB' },
    { id: '4', rank: 3, name: 'Chloe', points: 4550, avatarInitial: 'C', avatarColor: '#9B59B6' },
    { id: '5', rank: 4, name: 'David', points: 4200, avatarInitial: 'D', avatarColor: '#2ECC71' },
    { id: '6', rank: 5, name: 'Eva', points: 3950, avatarInitial: 'E', avatarColor: '#E74C3C' },
];

const MOCK_CURRENT_USER: User = {
    id: '1',
    rank: 12,
    name: 'You',
    points: 1250,
    avatarInitial: 'You',
    avatarColor: '#212529' // Dark color for the current user
};

// --- Reusable Leaderboard Item Component ---
const LeaderboardItem = ({ user }: { user: User }) => (
    <View style={styles.itemContainer}>
        <View style={styles.rankContainer}>
            <Text style={styles.rankText}>{user.rank}</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: user.avatarColor || '#6B7280' }]}>
            <Text style={styles.avatarText}>{user.avatarInitial}</Text>
        </View>
        <Text style={styles.nameText}>{user.name}</Text>
        <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{user.points.toLocaleString()} P</Text>
        </View>
    </View>
);

// --- Main Leaderboard Component ---
export default function Leaderboard() {
    // In a real app, you would fetch this data from an API
    const users = MOCK_LEADERBOARD_USERS;
    const currentUser = MOCK_CURRENT_USER;

    return (
        <View style={styles.container}>
            {/* Highlighted Current User Card */}
            <View style={[styles.itemContainer, styles.currentUserContainer]}>
                <View style={styles.rankContainer}>
                    <Text style={styles.currentUserRankText}>{currentUser.rank}</Text>
                </View>
                <View style={[styles.avatar, { backgroundColor: currentUser.avatarColor }]}>
                    <Text style={styles.currentUserAvatarText}>{currentUser.avatarInitial}</Text>
                </View>
                <Text style={styles.currentUserNameText}>{currentUser.name}</Text>
                <View style={styles.pointsContainer}>
                    <Text style={styles.currentUserPointsText}>{currentUser.points.toLocaleString()} P</Text>
                </View>
            </View>

            {/* List of Other Users */}
            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <LeaderboardItem user={item} />}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6', // Light gray background
        padding: 20,
    },
    listContent: {
        paddingTop: 16,
    },
    // Styles for a single leaderboard item
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    // Special styles for the current user's card
    currentUserContainer: {
        backgroundColor: 'white',
        borderColor: '#FFC107', // Brand Yellow
        borderWidth: 2,
        shadowColor: '#FFC107',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280', // Gray-500
    },
    currentUserRankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937', // Darker text
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    avatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    currentUserAvatarText: {
        color: '#FFC107', // Yellow text for "You"
        fontWeight: 'bold',
        fontSize: 12,
    },
    nameText: {
        flex: 1, // Take up remaining space
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    currentUserNameText: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    pointsContainer: {
        // Aligns points to the right
    },
    pointsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4b5563',
    },
    currentUserPointsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFC107',
    },
});
