#!/usr/bin/env ts-node
import { AppDataSource } from '../config/data-source.config';
import { config } from 'dotenv';

config();

/**
 * Safely run migrations with proper error handling and rollback support
 */
async function runMigrationsSafely() {
  let queryRunner: any = null;

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Create a query runner for transaction support
    queryRunner = AppDataSource.createQueryRunner();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await queryRunner.connect();

    // Start transaction
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await queryRunner.startTransaction();
    console.log('🔄 Starting migration transaction...');

    try {
      // Run migrations
      const migrations = await AppDataSource.runMigrations({
        transaction: 'each',
      });

      if (migrations.length === 0) {
        console.log('✅ No pending migrations to run');
      } else {
        console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach((migration) => {
          console.log(`   - ${migration.name}`);
        });
      }

      // Commit transaction
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await queryRunner.commitTransaction();
      console.log('✅ Migration transaction committed');
    } catch (migrationError) {
      console.error('❌ Migration failed:', migrationError);

      // Rollback transaction
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await queryRunner.rollbackTransaction();
      console.log('🔄 Migration transaction rolled back');

      throw migrationError;
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);

    if (queryRunner) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await queryRunner.release();
      } catch (releaseError) {
        console.error('Error releasing query runner:', releaseError);
      }
    }

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }

    process.exit(1);
  }
}

// Check if this is the first migration run
async function checkFirstRun() {
  try {
    await AppDataSource.initialize();

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
        '📝 First migration run detected. Creating migrations table...',
      );

      // Create migrations table
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        );
      `);

      // Insert baseline migration record
      const baselineMigrationName = 'BaselineExistingTables1752772807627';
      const baselineTimestamp = 1752772807627;

      console.log('📝 Marking baseline migration as applied...');
      await AppDataSource.query(
        `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
        [baselineTimestamp, baselineMigrationName],
      );

      console.log('✅ Baseline migration marked as applied');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error during first run check:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    throw error;
  }
}

// Main execution
void (async () => {
  try {
    await checkFirstRun();
    await runMigrationsSafely();
  } catch {
    console.error('❌ Migration process failed');
    process.exit(1);
  }
})();
