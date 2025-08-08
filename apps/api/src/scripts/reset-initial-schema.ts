import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';

/**
 * Reset InitialSchema Migration Script (Staging/Production Only)
 * 
 * This script safely removes the InitialSchema migration record from the database
 * so it can run again with the fixed implementation.
 * 
 * ENVIRONMENT RESTRICTIONS:
 * - ✅ STAGING: Safe to run for staging database setup
 * - ✅ PRODUCTION: Safe to run for production database setup  
 * - ❌ DEVELOPMENT: Blocked - use `pnpm run db:reset` instead
 * 
 * USAGE:
 * - Staging: pnpm run migration:reset-initial:staging
 * - Production: pnpm run migration:reset-initial:production
 * 
 * IMPORTANT: This should only be run on databases where InitialSchema failed
 * to create tables but was marked as completed.
 */

async function resetInitialSchemaMigration() {
  console.log('🔄 Starting InitialSchema migration reset...');
  
  // ENVIRONMENT SAFETY: Only run on staging and production
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'development' || nodeEnv === 'dev') {
    console.error('🚨 ENVIRONMENT RESTRICTION: This script is not allowed on development environment');
    console.error('   This reset script is specifically for staging and production databases');
    console.error('   For development, use: pnpm run db:reset');
    throw new Error('InitialSchema reset blocked: Use db:reset for development environment');
  }

  console.log(`✅ Environment check passed: ${nodeEnv || 'unspecified'} (not development)`);
  console.log('   This script is intended for staging and production database setup');
  
  let dataSource: DataSource;

  try {
    // Initialize the data source
    dataSource = AppDataSource;
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Check current migration status
    console.log('🔍 Checking current migration status...');
    const migrations = await dataSource.query(`
      SELECT * FROM migrations 
      WHERE name = 'InitialSchema1700000000000'
      ORDER BY id
    `);

    if (migrations.length === 0) {
      console.log('ℹ️  InitialSchema migration not found in database - nothing to reset');
      return;
    }

    console.log(`📋 Found ${migrations.length} InitialSchema migration record(s)`);
    migrations.forEach((migration: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${migration.id}, Timestamp: ${migration.timestamp}, Name: ${migration.name}`);
    });

    // Check if tables actually exist
    console.log('🔍 Checking if tables actually exist...');
    const expectedTables = [
      'Store', 'Category', 'Product', 'ReceiptItem', 'Receipt', 
      'User', 'User_badges', 'Badges', 'User_score', 'Score_type', 
      'Price', 'Verification_logs'
    ];

    let existingTableCount = 0;
    const existingTables: string[] = [];

    for (const tableName of expectedTables) {
      const tableExists = (await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `)) as [{ exists: boolean }];
      
      if (tableExists[0]?.exists) {
        existingTableCount++;
        existingTables.push(tableName);
      }
    }

    console.log(`📊 Table status: ${existingTableCount}/${expectedTables.length} tables exist`);
    if (existingTableCount > 0) {
      console.log(`   Existing tables: ${existingTables.join(', ')}`);
    }

    // Decision logic
    if (existingTableCount === expectedTables.length) {
      console.log('✅ All tables exist - InitialSchema actually worked correctly');
      console.log('   No reset needed');
      return;
    }

    if (existingTableCount === 0) {
      console.log('🚨 No tables exist but migration is marked as completed');
      console.log('   This confirms InitialSchema failed silently');
      console.log('   Safe to reset migration');
    } else {
      console.log('⚠️  Some tables exist but schema is incomplete');
      console.log('   This suggests partial failure - proceeding with reset');
    }

    // Remove the migration record
    console.log('🗑️  Removing InitialSchema migration record...');
    const result = await dataSource.query(`
      DELETE FROM migrations 
      WHERE name = 'InitialSchema1700000000000'
    `);

    console.log(`✅ Removed ${result.affectedRows || 'unknown'} migration record(s)`);
    
    // Verify removal
    const verifyMigrations = await dataSource.query(`
      SELECT COUNT(*) as count FROM migrations 
      WHERE name = 'InitialSchema1700000000000'
    `);

    const remainingCount = parseInt(verifyMigrations[0]?.count || '0');
    if (remainingCount === 0) {
      console.log('✅ InitialSchema migration record successfully removed');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Run migrations again: pnpm run migration:run');
      console.log('   2. InitialSchema will now run with the fixed implementation');
      console.log('   3. All 13 tables should be created successfully');
    } else {
      console.log(`⚠️  ${remainingCount} migration record(s) still remain`);
    }

  } catch (error) {
    console.error('❌ Error resetting InitialSchema migration:', error);
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
  resetInitialSchemaMigration()
    .then(() => {
      console.log('🎉 InitialSchema reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 InitialSchema reset failed:', error);
      process.exit(1);
    });
}

export default resetInitialSchemaMigration;