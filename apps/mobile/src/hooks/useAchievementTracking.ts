import { useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { gamificationService, RANK_TIER_NAMES } from '../services/gamificationService';

export interface AchievementEvent {
  type: 'receipt_upload' | 'ocr_verification' | 'points_earned' | 'badge_earned' | 'tier_promoted' | 'streak_milestone' | 'barcode_scanned';
  data: any;
}

export const useAchievementTracking = () => {
  const { showAchievement } = useNotifications();

  const trackAchievement = useCallback(async (event: AchievementEvent) => {
    try {
      switch (event.type) {
        case 'receipt_upload':
          showAchievement({
            type: 'points',
            title: 'Receipt Uploaded! 📄',
            message: 'Great job capturing your receipt',
            points: event.data.points || 30,
            color: '#10B981',
            duration: 3000,
          });
          break;

        case 'ocr_verification':
          showAchievement({
            type: 'points',
            title: 'Data Verified! ✅',
            message: 'Thank you for improving accuracy',
            points: event.data.points || 25,
            color: '#3B82F6',
            duration: 3000,
          });
          break;

        case 'points_earned':
          if (event.data.points >= 50) {
            // Show notification for significant point gains
            showAchievement({
              type: 'points',
              title: `+${event.data.points} Points! 🎉`,
              message: event.data.activity || 'Great work!',
              points: event.data.points,
              duration: 4000,
            });
          }
          break;

        case 'badge_earned':
          showAchievement({
            type: 'badge',
            title: 'New Badge Earned! 🏆',
            message: event.data.badgeName || 'You earned a new badge!',
            color: '#9B59B6',
            duration: 5000,
          });
          break;

        case 'tier_promoted':
          const tierName = RANK_TIER_NAMES[event.data.newTier] || event.data.newTier;
          showAchievement({
            type: 'tier',
            title: 'Tier Promotion! 🌟',
            message: `Welcome to ${tierName}!`,
            color: '#E67E22',
            duration: 6000,
          });
          break;

        case 'barcode_scanned':
          showAchievement({
            type: 'points',
            title: 'Barcode Scanned! 📱',
            message: 'Nice scan! Product details loading',
            points: event.data.points || 10,
            color: '#8B5CF6',
            duration: 2500,
          });
          break;

        case 'streak_milestone':
          const streakDays = event.data.streakDays;
          let streakMessage = '';
          let streakEmoji = '🔥';
          
          if (streakDays === 7) {
            streakMessage = 'One week streak!';
            streakEmoji = '🔥';
          } else if (streakDays === 30) {
            streakMessage = 'One month streak!';
            streakEmoji = '🎯';
          } else if (streakDays % 10 === 0) {
            streakMessage = `${streakDays} day streak!`;
            streakEmoji = '⚡';
          }

          if (streakMessage) {
            showAchievement({
              type: 'streak',
              title: `${streakEmoji} ${streakMessage}`,
              message: 'Keep up the amazing consistency!',
              color: '#ff6b35',
              duration: 4000,
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error tracking achievement:', error);
    }
  }, [showAchievement]);

  const trackReceiptUpload = useCallback(async (receiptData: any) => {
    trackAchievement({
      type: 'receipt_upload',
      data: { 
        points: 30,
        merchant: receiptData.merchant,
        itemCount: receiptData.items?.length || 0
      }
    });

    // Check for potential streak achievements
    try {
      const profile = await gamificationService.getUserProfile();
      if (profile.streakDays > 0) {
        trackAchievement({
          type: 'streak_milestone',
          data: { streakDays: profile.streakDays }
        });
      }
    } catch (error) {
      console.error('Error checking streak:', error);
    }
  }, [trackAchievement]);

  const trackOCRVerification = useCallback((itemCount: number = 1) => {
    trackAchievement({
      type: 'ocr_verification',
      data: { 
        points: 25 * itemCount,
        itemCount
      }
    });
  }, [trackAchievement]);

  const trackBarcodeScanned = useCallback((barcodeData: { barcode: string; type: string }) => {
    trackAchievement({
      type: 'barcode_scanned',
      data: {
        points: 10,
        barcode: barcodeData.barcode,
        type: barcodeData.type
      }
    });
  }, [trackAchievement]);

  const checkForNewBadgesAndTiers = useCallback(async () => {
    try {
      const profile = await gamificationService.getUserProfile();
      const badges = await gamificationService.getBadgesProgress();
      
      // Check for recently earned badges (within the last day)
      const recentBadges = badges.earned.filter(badge => {
        const awardedAt = new Date(badge.badge.awardedAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return awardedAt > oneDayAgo;
      });

      recentBadges.forEach(badge => {
        trackAchievement({
          type: 'badge_earned',
          data: { badgeName: badge.badge.name }
        });
      });

      // Check recent activities for tier promotions
      const recentActivities = profile.recentActivities.slice(0, 5);
      const tierPromotions = recentActivities.filter(activity => 
        activity.activityType.includes('TIER') || 
        activity.activityType.includes('RANK')
      );

      tierPromotions.forEach(promotion => {
        trackAchievement({
          type: 'tier_promoted',
          data: { newTier: profile.rankTier }
        });
      });

    } catch (error) {
      console.error('Error checking for new achievements:', error);
    }
  }, [trackAchievement]);

  return {
    trackAchievement,
    trackReceiptUpload,
    trackOCRVerification,
    trackBarcodeScanned,
    checkForNewBadgesAndTiers,
  };
};