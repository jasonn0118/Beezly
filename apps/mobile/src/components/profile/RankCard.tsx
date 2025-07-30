import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

export default function ProfileHeader() {
    // In a real app, user data would be passed in as props
    const user = {
        name: 'Your Profile',
        rank: 'Scout Bee',
        points: 1250,
        progress: 60, // Progress percentage
        pointsToNextRank: 750,
        avatarUrl: 'https://placehold.co/80x80/212529/FFC107?text=You',
    };

    return (
        <View style={styles.profileHeader}>
            <Image source={{ uri: user.avatarUrl }} style={styles.profileImage} />
            <Text style={styles.profileName}>{user.name}</Text>
            <View style={styles.rankCard}>
                <View style={styles.rankInfo}>
                    <Text style={styles.rankLabel}>RANK</Text>
                    <Text style={styles.rankName}>{user.rank}</Text>
                </View>
                <View style={styles.pointsInfo}>
                    <Text style={styles.rankLabel}>POINTS</Text>
                    <Text style={styles.rankPoints}>{user.points.toLocaleString()} P</Text>
                </View>
            </View>
            <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarForeground, { width: `${user.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{user.pointsToNextRank.toLocaleString()} P to next rank!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    profileHeader: { 
        backgroundColor: '#1f2937', 
        padding: 20, 
        paddingTop: 60, 
        alignItems: 'center' 
    },
    profileImage: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        borderWidth: 3, 
        borderColor: '#FFC107' 
    },
    profileName: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: 'white', 
        marginTop: 12 
    },
    rankCard: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%', 
        marginTop: 20 
    },
    rankInfo: {},
    pointsInfo: { 
        alignItems: 'flex-end' 
    },
    rankLabel: { 
        color: '#9ca3af', 
        fontSize: 12, 
        fontWeight: '600' 
    },
    rankName: { 
        color: 'white', 
        fontSize: 18, 
        fontWeight: 'bold' 
    },
    rankPoints: { 
        color: '#FFC107', 
        fontSize: 18, 
        fontWeight: 'bold' 
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
        marginTop: 4 
    },
});
