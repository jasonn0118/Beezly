#!/usr/bin/env ts-node
import { AppDataSource } from '../config/data-source.config';
import { config } from 'dotenv';

// Load environment variables only if not in CI environment
if (process.env.CI !== 'true') {
  config();
}

/**
 * Mark the baseline migration as applied without running it
 * This is used when setting up TypeORM with an existing Supabase database
 */
async function markBaselineApplied() {
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
      console.log('📝 Creating migrations table...');

      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        );
      `);

      console.log('✅ Migrations table created');
    }

    // Check if baseline migration is already marked
    const baselineMigrationName = 'BaselineExistingTables1752772807627';
    const baselineTimestamp = 1752772807627;

    const existingBaseline: Array<{ name: string; timestamp: number }> =
      await AppDataSource.query(`SELECT * FROM migrations WHERE name = $1`, [
        baselineMigrationName,
      ]);

    if (existingBaseline.length > 0) {
      console.log('ℹ️  Baseline migration already marked as applied');
    } else {
      // Insert baseline migration record
      await AppDataSource.query(
        `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
        [baselineTimestamp, baselineMigrationName],
      );

      console.log('✅ Baseline migration marked as applied');
    }

    // Show current migration status
    console.log('\n📊 Current migration status:');
    const allMigrations: Array<{ name: string; timestamp: number }> =
      await AppDataSource.query(
        `SELECT * FROM migrations ORDER BY timestamp ASC`,
      );

    allMigrations.forEach((migration) => {
      console.log(`   - ${migration.name} (${migration.timestamp})`);
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to mark baseline migration:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void markBaselineApplied();
