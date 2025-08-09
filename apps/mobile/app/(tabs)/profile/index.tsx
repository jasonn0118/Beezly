import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import the reusable components
import Leaderboard from '../../../src/components/profile/Leaderboard'; // Adjust path if needed
import Badges from '../../../src/components/profile/Badge';             // Adjust path if needed
import RankCard from '../../../src/components/profile/RankCard'; // Adjust path if needed
import { useAuth } from '../../../src/contexts/AuthContext';
import { gamificationService, UserGamificationProfile } from '../../../src/services/gamificationService';

export default function ProfilePage() {
    // State to manage which tab is currently active
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'badges'
    const [gamificationProfile, setGamificationProfile] = useState<UserGamificationProfile | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const { isAuthenticated, isLoading, user, signOut } = useAuth();
    const router = useRouter();

    // Fetch gamification profile for authenticated users
    const fetchGamificationProfile = async () => {
        if (!isAuthenticated) return;
        
        try {
            const profile = await gamificationService.getUserProfile();
            setGamificationProfile(profile);
        } catch (error) {
            console.error('Error fetching gamification profile:', error);
        }
    };

    useEffect(() => {
        fetchGamificationProfile();
    }, [isAuthenticated]);

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
            {/* Menu button in top-right corner */}
            <View style={styles.topBar}>
                <TouchableOpacity 
                    style={styles.menuButton}
                    onPress={() => setShowMenu(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="ellipsis-vertical" size={24} color="white" />
                </TouchableOpacity>
            </View>

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

            {/* Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={styles.menuDropdown}>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                router.push('/profile-edit');
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="pencil-outline" size={20} color="#1f2937" style={styles.menuIcon} />
                            <Text style={styles.menuText}>Edit Profile</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.menuSeparator} />
                        
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                handleSignOut();
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#dc3545" style={styles.menuIcon} />
                            <Text style={[styles.menuText, styles.menuTextDanger]}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
    topBar: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
    },
    menuButton: {
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 100,
        paddingRight: 20,
    },
    menuDropdown: {
        backgroundColor: 'white',
        borderRadius: 12,
        minWidth: 160,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuIcon: {
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
    },
    menuTextDanger: {
        color: '#dc3545',
    },
    menuSeparator: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
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
