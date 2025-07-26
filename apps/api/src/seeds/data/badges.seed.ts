import { DataSource } from 'typeorm';
import { Badges } from '../../entities/badges.entity';

export async function seedBadges(dataSource: DataSource) {
  const badgeRepository = dataSource.getRepository(Badges);

  // Check if badges already exist
  const existingBadges = await badgeRepository.count();
  if (existingBadges > 0) {
    console.log('  ⏭️  Badges already seeded, skipping...');
    return;
  }

  const badges = [
    {
      name: 'First Purchase',
      description: 'Awarded for making your first purchase',
      icon: '🛒',
      points: 10,
    },
    {
      name: 'Smart Shopper',
      description: 'Save $50 or more in a single month',
      icon: '💰',
      points: 50,
    },
    {
      name: 'Eco Warrior',
      description: 'Purchase 50 eco-friendly products',
      icon: '🌱',
      points: 100,
    },
    {
      name: 'Receipt Master',
      description: 'Upload 100 receipts',
      icon: '📋',
      points: 75,
    },
    {
      name: 'Early Bird',
      description: 'Shop before 9 AM five times',
      icon: '🌅',
      points: 25,
    },
    {
      name: 'Loyalty Champion',
      description: 'Shop at the same store 20 times',
      icon: '🏪',
      points: 40,
    },
    {
      name: 'Budget Boss',
      description: 'Stay under budget for 3 consecutive months',
      icon: '📊',
      points: 60,
    },
    {
      name: 'Healthy Habits',
      description: 'Purchase fresh produce 10 times in a month',
      icon: '🥗',
      points: 30,
    },
    {
      name: 'Deal Hunter',
      description: 'Use 50 coupons or catch 50 sales',
      icon: '🎯',
      points: 45,
    },
    {
      name: 'Community Helper',
      description: 'Share 10 product reviews',
      icon: '🤝',
      points: 35,
    },
  ];

  const createdBadges = await badgeRepository.save(badges);
  console.log(`  ✅ Created ${createdBadges.length} badges`);
}
