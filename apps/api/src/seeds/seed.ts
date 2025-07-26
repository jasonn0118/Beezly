#!/usr/bin/env ts-node
import { AppDataSource } from '../config/data-source.config';
import { config } from 'dotenv';
import { seedUsers } from './data/users.seed';
import { seedStores } from './data/stores.seed';
import { seedCategories } from './data/categories.seed';
import { seedProducts } from './data/products.seed';
import { seedBadges } from './data/badges.seed';
import { seedScoreTypes } from './data/score-types.seed';

// Load local environment
config({ path: '.env.local' });

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Run seeds in order (respecting foreign key constraints)
    console.log('\n📍 Seeding users...');
    await seedUsers(AppDataSource);

    console.log('\n🏪 Seeding stores...');
    await seedStores(AppDataSource);

    console.log('\n📁 Seeding categories...');
    await seedCategories(AppDataSource);

    console.log(
      '\n📦 Seeding products (1000+ real products from OpenFoodFacts)...',
    );
    await seedProducts(AppDataSource);

    console.log('\n🏆 Seeding badges...');
    await seedBadges(AppDataSource);

    console.log('\n⭐ Seeding score types...');
    await seedScoreTypes(AppDataSource);

    console.log('\n✅ Seeding completed successfully!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seeding
void runSeeds();
