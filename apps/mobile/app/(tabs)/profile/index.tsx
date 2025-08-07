import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import the reusable components
import Leaderboard from '../../../src/components/profile/Leaderboard'; // Adjust path if needed
import Badges from '../../../src/components/profile/Badge';             // Adjust path if needed
import RankCard from '../../../src/components/profile/RankCard'; // Adjust path if needed
import { useAuth } from '../../../src/contexts/AuthContext';

export default function ProfilePage() {
    // State to manage which tab is currently active
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'badges'
    const { isAuthenticated, isLoading, user, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        Alert.alert('Signed Out', 'You have been signed out successfully.');
                    }
                }
            ]
        );
    };

    // Show loading state
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // Show authentication options if not authenticated
    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <View style={styles.authContainer}>
                    <View style={styles.authHeader}>
                        <Ionicons name="person-circle-outline" size={80} color="#FFC107" />
                        <Text style={styles.authTitle}>Welcome to Beezly!</Text>
                        <Text style={styles.authSubtitle}>
                            Sign in to track your shopping rewards, compete on leaderboards, and earn badges
                        </Text>
                    </View>

                    <View style={styles.authButtons}>
                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={() => router.push('/login')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="log-in-outline" size={20} color="#212529" style={styles.buttonIcon} />
                            <Text style={styles.primaryButtonText}>Sign In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.secondaryButton}
                            onPress={() => router.push('/signup')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="person-add-outline" size={20} color="#FFC107" style={styles.buttonIcon} />
                            <Text style={styles.secondaryButtonText}>Create Account</Text>
                        </TouchableOpacity>

                    </View>

                    <View style={styles.features}>
                        <Text style={styles.featuresTitle}>What you'll get:</Text>
                        <View style={styles.featureItem}>
                            <Ionicons name="trophy-outline" size={20} color="#FFC107" />
                            <Text style={styles.featureText}>Compete on leaderboards</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="ribbon-outline" size={20} color="#FFC107" />
                            <Text style={styles.featureText}>Earn achievement badges</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="gift-outline" size={20} color="#FFC107" />
                            <Text style={styles.featureText}>Track your rewards points</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    // Show authenticated user content
    const renderHeader = () => (
        <View>
            {/* User info section */}
            <View style={styles.userInfo}>
                <Ionicons name="person-circle" size={60} color="#FFC107" />
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                        {user?.firstName || user?.lastName 
                            ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                            : user?.email}
                    </Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <Text style={styles.userPoints}>{user?.pointBalance || 0} points</Text>
                </View>
                <View style={styles.userActions}>
                    <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => router.push('/profile-edit')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pencil-outline" size={18} color="#FFC107" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#dc3545" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tab switcher */}
            <View style={styles.tabSwitcher}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'leaderboard' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('leaderboard')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>Leaderboard</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'badges' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('badges')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>My Badges</Text>
                </TouchableOpacity>
            </View>
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
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
    },
    authContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    authHeader: {
        alignItems: 'center',
        marginBottom: 40,
    },
    authTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        textAlign: 'center',
    },
    authSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 24,
    },
    authButtons: {
        marginBottom: 40,
    },
    primaryButton: {
        backgroundColor: '#FFC107',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFC107',
    },
    buttonIcon: {
        marginRight: 8,
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    secondaryButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFC107',
    },
    features: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        fontSize: 16,
        color: '#4b5563',
        marginLeft: 12,
    },
    userInfo: {
        backgroundColor: 'white',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    userDetails: {
        flex: 1,
        marginLeft: 16,
    },
    userActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editButton: {
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFC107',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    userEmail: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    userPoints: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFC107',
        marginTop: 4,
    },
    signOutButton: {
        padding: 8,
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
