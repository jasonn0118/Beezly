import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { gamificationService, UserGamificationProfile, RANK_TIER_NAMES } from '../../services/gamificationService';

export default function RankCard() {
    const { isAuthenticated, user } = useAuth();
    const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchProfile = async () => {
        if (!isAuthenticated) return;
        
        setLoading(true);
        try {
            const gamificationProfile = await gamificationService.getUserProfile();
            setProfile(gamificationProfile);
        } catch (error) {
            console.error('Error fetching gamification profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <View style={styles.profileHeader}>
                <Ionicons name="person-circle-outline" size={80} color="#FFC107" />
                <Text style={styles.profileName}>Welcome to Beezly!</Text>
                <View style={styles.guestRankCard}>
                    <Text style={styles.guestText}>Sign in to start your journey</Text>
                    <Text style={styles.guestSubtext}>Track your progress and earn rewards</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.profileHeader, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#FFC107" />
                <Text style={styles.loadingText}>Loading your profile...</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.profileHeader}>
                <Ionicons name="person-circle" size={80} color="#FFC107" />
                <Text style={styles.profileName}>
                    {user?.firstName || user?.lastName 
                        ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                        : user?.email || 'Beezly User'}
                </Text>
                <View style={styles.rankCard}>
                    <View style={styles.rankInfo}>
                        <Text style={styles.rankLabel}>RANK</Text>
                        <Text style={styles.rankName}>🥚 Buzzling Egg</Text>
                    </View>
                    <View style={styles.pointsInfo}>
                        <Text style={styles.rankLabel}>POINTS</Text>
                        <Text style={styles.rankPoints}>0 P</Text>
                    </View>
                </View>
            </View>
        );
    }

    const tierDisplayName = RANK_TIER_NAMES[profile.rankTier] || profile.rankTier;
    
    return (
        <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={80} color="#FFC107" />
                {profile.streakDays > 0 && (
                    <View style={styles.streakBadge}>
                        <Ionicons name="flame" size={12} color="#ff6b35" />
                        <Text style={styles.streakText}>{profile.streakDays}</Text>
                    </View>
                )}
            </View>
            
            <Text style={styles.profileName}>
                {user?.firstName || user?.lastName 
                    ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                    : user?.email?.split('@')[0] || 'Beezly User'}
            </Text>

            <View style={styles.rankCard}>
                <View style={styles.rankInfo}>
                    <Text style={styles.rankLabel}>RANK</Text>
                    <Text style={styles.rankName}>{tierDisplayName}</Text>
                    {profile.currentRank && (
                        <Text style={styles.globalRank}>#{profile.currentRank} globally</Text>
                    )}
                </View>
                <View style={styles.pointsInfo}>
                    <Text style={styles.rankLabel}>POINTS</Text>
                    <Text style={styles.rankPoints}>
                        {gamificationService.formatPoints(profile.totalPoints)} P
                    </Text>
                    <Text style={styles.weeklyPoints}>
                        +{gamificationService.formatPoints(profile.weeklyPoints)} this week
                    </Text>
                </View>
            </View>

            {/* Progress bar to next tier */}
            <View style={styles.progressBarBackground}>
                <View style={[
                    styles.progressBarForeground, 
                    { width: `${profile.tierProgression.progressPercentage}%` }
                ]} />
            </View>
            
            <Text style={styles.progressText}>
                {profile.tierProgression.pointsToNextTier 
                    ? `${gamificationService.formatPoints(profile.tierProgression.pointsToNextTier)} P to ${RANK_TIER_NAMES[profile.tierProgression.nextTier || ''] || 'next rank'}!`
                    : `You've reached the highest tier! 🎉`}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    profileHeader: { 
        backgroundColor: '#1f2937', 
        padding: 20, 
        paddingTop: 70, // Increased to accommodate menu button
        alignItems: 'center' 
    },
    loadingContainer: {
        justifyContent: 'center',
        minHeight: 200,
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 16,
        marginTop: 12,
    },
    avatarContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    streakBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#1f2937',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ff6b35',
    },
    streakText: {
        color: '#ff6b35',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    profileName: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: 'white', 
        marginTop: 12,
        textAlign: 'center',
    },
    rankCard: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%', 
        marginTop: 20 
    },
    guestRankCard: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)',
    },
    guestText: {
        color: '#FFC107',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    guestSubtext: {
        color: '#9ca3af',
        fontSize: 14,
    },
    rankInfo: {},
    pointsInfo: { 
        alignItems: 'flex-end' 
    },
    rankLabel: { 
        color: '#9ca3af', 
        fontSize: 12, 
        fontWeight: '600',
        marginBottom: 4,
    },
    rankName: { 
        color: 'white', 
        fontSize: 18, 
        fontWeight: 'bold',
        marginBottom: 4,
    },
    globalRank: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '500',
    },
    rankPoints: { 
        color: '#FFC107', 
        fontSize: 18, 
        fontWeight: 'bold',
        marginBottom: 4,
    },
    weeklyPoints: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '500',
    },
    progressBarBackground: { 
        backgroundColor: '#4b5563', 
        height: 10, 
        width: '100%', 
        borderRadius: 5, 
        marginTop: 16 
    },
    progressBarForeground: { 
        backgroundColor: '#FFC107', 
        height: 10, 
        borderRadius: 5 
    },
    progressText: { 
        color: '#9ca3af', 
        fontSize: 12, 
        alignSelf: 'flex-end', 
        marginTop: 4,
        textAlign: 'right',
    },
});
