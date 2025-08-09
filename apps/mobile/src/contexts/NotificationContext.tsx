import React, { createContext, useContext, useState, useRef } from 'react';

export interface Achievement {
  id: string;
  type: 'points' | 'badge' | 'tier' | 'streak';
  title: string;
  message: string;
  points?: number;
  icon?: string;
  color?: string;
  duration?: number; // milliseconds
}

interface NotificationContextType {
  showAchievement: (achievement: Omit<Achievement, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const idCounter = useRef(0);

  const showAchievement = (achievement: Omit<Achievement, 'id'>) => {
    const id = `achievement-${idCounter.current++}`;
    const newAchievement: Achievement = {
      ...achievement,
      id,
      duration: achievement.duration || 3000, // Default 3 seconds
    };

    setAchievements(prev => [...prev, newAchievement]);

    // Auto-remove after duration
    setTimeout(() => {
      setAchievements(prev => prev.filter(a => a.id !== id));
    }, newAchievement.duration);
  };

  const value = {
    showAchievement,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <AchievementOverlay achievements={achievements} />
    </NotificationContext.Provider>
  );
};

// Achievement Overlay Component
import { StyleSheet, View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AchievementOverlayProps {
  achievements: Achievement[];
}

const AchievementOverlay: React.FC<AchievementOverlayProps> = ({ achievements }) => {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {achievements.map((achievement, index) => (
        <AchievementCard 
          key={achievement.id} 
          achievement={achievement} 
          index={index}
        />
      ))}
    </View>
  );
};

// Individual Achievement Card Component
interface AchievementCardProps {
  achievement: Achievement;
  index: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, index }) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Slide out animation after delay
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, (achievement.duration || 3000) - 500);

    return () => clearTimeout(timeout);
  }, []);

  const getIconName = (type: Achievement['type']) => {
    switch (type) {
      case 'points': return 'flash';
      case 'badge': return 'ribbon';
      case 'tier': return 'trophy';
      case 'streak': return 'flame';
      default: return 'star';
    }
  };

  const getColor = (type: Achievement['type']) => {
    if (achievement.color) return achievement.color;
    
    switch (type) {
      case 'points': return '#FFC107';
      case 'badge': return '#9B59B6';
      case 'tier': return '#E67E22';
      case 'streak': return '#ff6b35';
      default: return '#FFC107';
    }
  };

  return (
    <Animated.View
      style={[
        styles.achievementCard,
        {
          top: 100 + (index * 80), // Stack multiple achievements
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: getColor(achievement.type) }]}>
        <Ionicons 
          name={getIconName(achievement.type) as any} 
          size={24} 
          color="white" 
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementMessage}>{achievement.message}</Text>
        {achievement.points && (
          <Text style={styles.pointsText}>+{achievement.points} points</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  achievementCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  achievementMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFC107',
    marginTop: 4,
  },
});