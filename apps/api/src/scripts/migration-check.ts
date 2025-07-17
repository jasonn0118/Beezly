#!/usr/bin/env ts-node
import { AppDataSource } from '../config/data-source.config';
import { config } from 'dotenv';

// Load environment variables only if not in CI environment
if (process.env.CI !== 'true') {
  config();
}

/**
 * Check if migrations need to be run
 * Returns exit code 0 if no migrations pending, 1 if migrations are needed
 */
async function checkMigrations() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Check if migrations table exists
    const migrationsTableExists: Array<{ exists: boolean }> =
      await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (!migrationsTableExists[0].exists) {
      console.log(
        '⚠️  Migrations table does not exist. Running migrations for the first time.',
      );
      await AppDataSource.destroy();
      process.exit(1);
    }

    // Get pending migrations
    const pendingMigrations = await AppDataSource.showMigrations();
    const pendingCount = pendingMigrations ? 1 : 0;

    if (pendingCount > 0) {
      console.log(`⚠️  Found ${pendingCount} pending migration(s)`);
      await AppDataSource.destroy();
      process.exit(1);
    }

    console.log('✅ All migrations are up to date');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(2);
  }
}

void checkMigrations();
