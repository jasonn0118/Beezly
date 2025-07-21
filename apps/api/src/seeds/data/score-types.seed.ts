import { DataSource } from 'typeorm';
import { ScoreType } from '../../entities/score-type.entity';

export async function seedScoreTypes(dataSource: DataSource) {
  const scoreTypeRepository = dataSource.getRepository(ScoreType);

  // Check if score types already exist
  const existingScoreTypes = await scoreTypeRepository.count();
  if (existingScoreTypes > 0) {
    console.log('  ⏭️  Score types already seeded, skipping...');
    return;
  }

  const scoreTypes = [
    {
      scoreType: 'receipt_upload',
      description: 'Points earned for uploading a receipt',
      defaultPoints: 5,
    },
    {
      scoreType: 'product_review',
      description: 'Points earned for reviewing a product',
      defaultPoints: 10,
    },
    {
      scoreType: 'price_report',
      description: 'Points earned for reporting a price',
      defaultPoints: 3,
    },
    {
      scoreType: 'store_visit',
      description: 'Points earned for visiting a store',
      defaultPoints: 2,
    },
    {
      scoreType: 'referral',
      description: 'Points earned for referring a friend',
      defaultPoints: 50,
    },
    {
      scoreType: 'daily_login',
      description: 'Points earned for daily app login',
      defaultPoints: 1,
    },
    {
      scoreType: 'survey_completion',
      description: 'Points earned for completing a survey',
      defaultPoints: 15,
    },
    {
      scoreType: 'photo_upload',
      description: 'Points earned for uploading product photos',
      defaultPoints: 7,
    },
    {
      scoreType: 'deal_sharing',
      description: 'Points earned for sharing a deal',
      defaultPoints: 8,
    },
    {
      scoreType: 'monthly_challenge',
      description: 'Points earned for completing monthly challenges',
      defaultPoints: 100,
    },
  ];

  const createdScoreTypes = await scoreTypeRepository.save(scoreTypes);
  console.log(`  ✅ Created ${createdScoreTypes.length} score types`);
}
