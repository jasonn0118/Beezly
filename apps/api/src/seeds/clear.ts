#!/usr/bin/env ts-node
import { AppDataSource } from '../config/data-source.config';
import { config } from 'dotenv';

// Load local environment
config({ path: '.env.local' });

async function clearDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');

    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Get all table names except migrations
    const tables: Array<{ tablename: string }> = await AppDataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != 'migrations'
      AND tablename != 'spatial_ref_sys'
    `);

    // Disable foreign key checks temporarily
    await AppDataSource.query('SET session_replication_role = replica;');

    // Clear all tables
    for (const { tablename } of tables) {
      console.log(`🗑️  Clearing table: ${tablename}`);
      await AppDataSource.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }

    // Re-enable foreign key checks
    await AppDataSource.query('SET session_replication_role = DEFAULT;');

    console.log('\n✅ Database cleared successfully!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database clear failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the cleanup
void clearDatabase();
