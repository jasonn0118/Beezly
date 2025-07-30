import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList } from 'react-native';

// Import the reusable components
import Leaderboard from '../../../src/components/profile/Leaderboard'; // Adjust path if needed
import Badges from '../../../src/components/profile/Badge';             // Adjust path if needed
import RankCard from '../../../src/components/profile/RankCard'; // Adjust path if needed

export default function ProfilePage() {
    // State to manage which tab is currently active
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'badges'
    const renderHeader = () => (
        <View style={styles.tabSwitcher}>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'leaderboard' && styles.tabButtonActive]}
                onPress={() => setActiveTab('leaderboard')}
            >
                <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'badges' && styles.tabButtonActive]}
                onPress={() => setActiveTab('badges')}
            >
                <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>My Badges</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <RankCard />
            <FlatList
                data={[1]} // Dummy data to render one item
                keyExtractor={() => 'profile-content'}
                ListHeaderComponent={renderHeader}
                renderItem={() => (
                    activeTab === 'leaderboard' ? <Leaderboard /> : <Badges />
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f3f4f6' 
    },
    tabSwitcher: { 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        margin: 20, 
        borderRadius: 12, 
        padding: 4, 
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    tabButton: { 
        flex: 1, 
        paddingVertical: 10, 
        borderRadius: 8, 
        alignItems: 'center' 
    },
    tabButtonActive: { 
        backgroundColor: '#FFC107' 
    },
    tabText: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: '#4b5563' 
    },
    tabTextActive: { 
        color: '#1f2937' 
    },
});
