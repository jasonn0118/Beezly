import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { gamificationService, LeaderboardEntry, RANK_TIER_NAMES } from '../../services/gamificationService';

// --- Reusable Leaderboard Item Component ---
const LeaderboardItem = ({ entry, isCurrentUser = false }: { entry: LeaderboardEntry; isCurrentUser?: boolean }) => {
    const getAvatarColor = (rank: number) => {
        const colors = ['#E67E22', '#3498DB', '#9B59B6', '#2ECC71', '#E74C3C', '#F39C12', '#16A085', '#8E44AD'];
        return colors[rank % colors.length] || '#6B7280';
    };

    const avatarInitial = entry.displayName.charAt(0).toUpperCase();
    const tierEmoji = gamificationService.getTierEmoji(entry.rankTier);
    
    return (
        <View style={[styles.itemContainer, isCurrentUser && styles.currentUserContainer]}>
            <View style={styles.rankContainer}>
                <Text style={[styles.rankText, isCurrentUser && styles.currentUserRankText]}>
                    #{entry.currentRank}
                </Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: isCurrentUser ? '#212529' : getAvatarColor(entry.currentRank) }]}>
                <Text style={[styles.avatarText, isCurrentUser && styles.currentUserAvatarText]}>
                    {isCurrentUser ? 'You' : avatarInitial}
                </Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={[styles.nameText, isCurrentUser && styles.currentUserNameText]}>
                    {entry.displayName}
                </Text>
                <Text style={styles.tierText}>
                    {tierEmoji} {RANK_TIER_NAMES[entry.rankTier] || entry.rankTier}
                </Text>
            </View>
            <View style={styles.pointsContainer}>
                <Text style={[styles.pointsText, isCurrentUser && styles.currentUserPointsText]}>
                    {gamificationService.formatPoints(entry.totalPoints)} P
                </Text>
                <Text style={styles.weeklyPointsText}>
                    +{gamificationService.formatPoints(entry.weeklyPoints)} this week
                </Text>
            </View>
        </View>
    );
};

// --- Auth Required Message Component ---
const AuthRequiredMessage = ({ onSignIn }: { onSignIn: () => void }) => (
    <View style={styles.authMessage}>
        <Ionicons name="lock-closed-outline" size={48} color="#FFC107" />
        <Text style={styles.authTitle}>Sign in Required</Text>
        <Text style={styles.authSubtitle}>
            Sign in to see your position on the leaderboard and track your progress
        </Text>
        <TouchableOpacity style={styles.signInButton} onPress={onSignIn} activeOpacity={0.8}>
            <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
    </View>
);

// --- Main Leaderboard Component ---
export default function Leaderboard() {
    const { isAuthenticated, user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);
        
        try {
            if (isAuthenticated) {
                // Fetch full leaderboard data for authenticated users
                const response = await gamificationService.getLeaderboard();
                setLeaderboard(response.global);
                setUserPosition(response.userPosition || null);
            } else {
                // Fetch public leaderboard for non-authenticated users
                const publicLeaderboard = await gamificationService.getPublicLeaderboard();
                setLeaderboard(publicLeaderboard);
                setUserPosition(null);
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            setError('Unable to load leaderboard. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [isAuthenticated]);

    const handleSignInPress = () => {
        // This would typically navigate to sign in screen
        // For now we'll just show an alert
        console.log('Navigate to sign in');
    };

    if (loading && leaderboard.length === 0) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#FFC107" />
                <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchLeaderboard} activeOpacity={0.8}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Show current user position if authenticated */}
            {isAuthenticated && userPosition && (
                <>
                    <Text style={styles.sectionTitle}>Your Position</Text>
                    <LeaderboardItem entry={userPosition} isCurrentUser={true} />
                    <Text style={styles.sectionTitle}>Top Players</Text>
                </>
            )}

            {/* Show auth required message for some features if not authenticated */}
            {!isAuthenticated && (
                <AuthRequiredMessage onSignIn={handleSignInPress} />
            )}

            {/* Leaderboard list */}
            {leaderboard.length > 0 ? (
                <FlatList
                    data={leaderboard}
                    keyExtractor={(item) => item.userSk}
                    renderItem={({ item }) => <LeaderboardItem entry={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="trophy-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptyText}>No leaderboard data available</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 20,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
        marginTop: 8,
    },
    // Leaderboard item styles
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
    currentUserContainer: {
        backgroundColor: 'white',
        borderColor: '#FFC107',
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
        color: '#6b7280',
    },
    currentUserRankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
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
        color: '#FFC107',
        fontWeight: 'bold',
        fontSize: 12,
    },
    userInfo: {
        flex: 1,
    },
    nameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    currentUserNameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 2,
    },
    tierText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
    pointsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4b5563',
        marginBottom: 2,
    },
    currentUserPointsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFC107',
        marginBottom: 2,
    },
    weeklyPointsText: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '500',
    },
    // Auth required message styles
    authMessage: {
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    authTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    authSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    signInButton: {
        backgroundColor: '#FFC107',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    signInButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    // Loading and error states
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 40,
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 16,
    },
});
