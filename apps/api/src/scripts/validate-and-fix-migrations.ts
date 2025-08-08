import { execSync } from 'child_process';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import resetInitialSchemaMigration from './reset-initial-schema';

/**
 * Smart Migration Validator and Fixer for CI/CD
 *
 * This script intelligently detects and fixes migration issues in staging/production:
 * - Detects failed InitialSchema migrations that are marked as completed
 * - Automatically triggers reset and re-run for failed InitialSchema
 * - Validates database schema completeness before proceeding
 *
 * ENVIRONMENT SAFETY:
 * - ✅ STAGING: Automatic validation and fixes
 * - ✅ PRODUCTION: Automatic validation and fixes
 * - ❌ DEVELOPMENT: Blocked - use standard migration workflow
 *
 * Usage in CI/CD:
 * pnpm run validate-staging-migration
 * pnpm run validate-production-migration
 */

async function validateAndFixMigrations(): Promise<void> {
  console.log('🔍 Starting smart migration validation...');

  // ENVIRONMENT SAFETY: Only run on staging and production
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'development' || nodeEnv === 'dev') {
    console.error(
      '🚨 ENVIRONMENT RESTRICTION: Smart validation is for staging/production only',
    );
    console.error('   Development should use standard migration workflow');
    throw new Error(
      'Smart migration validation blocked: Use standard workflow for development',
    );
  }

  console.log(
    `✅ Environment: ${nodeEnv || 'unspecified'} - proceeding with validation`,
  );

  let dataSource: DataSource | undefined;
  let needsMigrationRun = false;
  let resetPerformed = false;

  try {
    // Initialize the data source
    dataSource = AppDataSource;
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Step 1: Check if InitialSchema migration exists and is marked as completed
    console.log('🔍 Step 1: Checking InitialSchema migration status...');

    // Check if migrations table exists first
    const migrationsTableCount = await dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('information_schema.tables', 'tables')
      .where('table_schema = :schema', { schema: 'public' })
      .andWhere('table_name = :tableName', { tableName: 'migrations' })
      .getRawOne<{ count: string }>();

    if (!migrationsTableCount || parseInt(migrationsTableCount.count) === 0) {
      console.log(
        'ℹ️  Migrations table not found - this is a fresh environment',
      );
      needsMigrationRun = true;
    } else {
      const initialSchemaMigrationCount = await dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('migrations', 'migrations')
        .where('name = :name', { name: 'InitialSchema1700000000000' })
        .getRawOne<{ count: string }>();

      if (
        !initialSchemaMigrationCount ||
        parseInt(initialSchemaMigrationCount.count) === 0
      ) {
        console.log(
          'ℹ️  InitialSchema migration not found - this is a fresh environment',
        );
        needsMigrationRun = true;
      } else {
        console.log(
          `📋 Found InitialSchema migration record (marked as completed)`,
        );

        // Step 2: Verify tables actually exist
        console.log('🔍 Step 2: Verifying schema completeness...');
        const expectedTables = [
          'Store',
          'Category',
          'Product',
          'ReceiptItem',
          'Receipt',
          'User',
          'User_badges',
          'Badges',
          'User_score',
          'Score_type',
          'Price',
          'Verification_logs',
        ];

        let existingTableCount = 0;
        const existingTables: string[] = [];

        for (const tableName of expectedTables) {
          const tableCount = await dataSource
            .createQueryBuilder()
            .select('COUNT(*)', 'count')
            .from('information_schema.tables', 'tables')
            .where('table_schema = :schema', { schema: 'public' })
            .andWhere('table_name = :tableName', { tableName })
            .getRawOne<{ count: string }>();

          if (tableCount && parseInt(tableCount.count) > 0) {
            existingTableCount++;
            existingTables.push(tableName);
          }
        }

        console.log(
          `📊 Schema status: ${existingTableCount}/${expectedTables.length} expected tables exist`,
        );

        if (existingTableCount === expectedTables.length) {
          console.log('✅ All expected tables found - schema is complete');
        } else if (existingTableCount === 0) {
          console.log(
            '🚨 CRITICAL: No tables exist but InitialSchema is marked as completed',
          );
          console.log('   This indicates InitialSchema failed silently');
          console.log('   🔧 Triggering automatic reset and fix...');

          await dataSource.destroy();
          dataSource = undefined;

          // Trigger automatic reset
          await resetInitialSchemaMigration();
          resetPerformed = true;
          needsMigrationRun = true;

          console.log(
            '✅ InitialSchema reset completed - ready for migration re-run',
          );
        } else {
          console.log(
            `⚠️  Partial schema detected: ${existingTableCount}/${expectedTables.length} tables exist`,
          );
          console.log(`   Existing tables: ${existingTables.join(', ')}`);
          console.log('   🔧 Triggering automatic reset and fix...');

          await dataSource.destroy();
          dataSource = undefined;

          // Trigger automatic reset for partial schema
          await resetInitialSchemaMigration();
          resetPerformed = true;
          needsMigrationRun = true;

          console.log(
            '✅ Partial schema reset completed - ready for migration re-run',
          );
        }
      }
    }

    // Step 3: Run migrations if needed
    if (needsMigrationRun) {
      console.log('🔄 Step 3: Running migrations to ensure complete schema...');

      const migrationCommand =
        'ts-node -r tsconfig-paths/register src/scripts/migration-run-safe.ts';

      try {
        console.log(`⚡ Executing: ${migrationCommand}`);
        execSync(migrationCommand, {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: nodeEnv },
        });
        console.log('✅ Migration execution completed');
      } catch (migrationError) {
        console.error('❌ Migration execution failed:', migrationError);
        throw new Error(
          `Migration execution failed: ${String(migrationError)}`,
        );
      }
    } else {
      console.log('ℹ️  No migration run needed - schema is already complete');
    }

    // Step 4: Final validation
    console.log('🔍 Step 4: Final schema validation...');

    // Reconnect if we disconnected for reset
    if (!dataSource || !dataSource.isInitialized) {
      dataSource = AppDataSource;
      await dataSource.initialize();
    }

    const expectedTables = [
      'Store',
      'Category',
      'Product',
      'ReceiptItem',
      'Receipt',
      'User',
      'User_badges',
      'Badges',
      'User_score',
      'Score_type',
      'Price',
      'Verification_logs',
      'typeorm_metadata',
    ];

    let finalTableCount = 0;
    for (const tableName of expectedTables) {
      const tableCount = await dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('information_schema.tables', 'tables')
        .where('table_schema = :schema', { schema: 'public' })
        .andWhere('table_name = :tableName', { tableName })
        .getRawOne<{ count: string }>();

      if (tableCount && parseInt(tableCount.count) > 0) {
        finalTableCount++;
      }
    }

    console.log(
      `📊 Final validation: ${finalTableCount}/${expectedTables.length} expected tables found`,
    );

    if (finalTableCount === expectedTables.length) {
      console.log(
        '✅ VALIDATION PASSED: Database schema is complete and ready',
      );

      if (resetPerformed) {
        console.log('');
        console.log('🎉 SMART FIX APPLIED:');
        console.log('   • Detected failed InitialSchema migration');
        console.log('   • Automatically reset migration record');
        console.log('   • Re-ran migrations with fixed implementation');
        console.log('   • Verified complete schema creation');
        console.log('');
        console.log('✅ Database is now ready for production deployment');
      }
    } else {
      const missingCount = expectedTables.length - finalTableCount;
      console.error(
        `❌ VALIDATION FAILED: ${missingCount} tables still missing after fixes`,
      );
      throw new Error(
        `Schema validation failed: ${missingCount} expected tables missing`,
      );
    }
  } catch (error) {
    console.error('❌ Smart migration validation failed:', error);
    throw error;
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  validateAndFixMigrations()
    .then(() => {
      console.log('🎉 Smart migration validation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Smart migration validation failed:', error);
      process.exit(1);
    });
}

export default validateAndFixMigrations;
