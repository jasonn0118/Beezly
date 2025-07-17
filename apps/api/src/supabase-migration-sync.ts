/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { AppDataSource } from './data-source';
import { config } from 'dotenv';

// Load environment variables
config();

interface MigrationRecord {
  id: number;
  timestamp: number;
  name: string;
}

async function syncMigrationsToSupabase() {
  console.log('🚀 Starting Supabase migration sync...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    // Check if migrations table exists
    const migrationsTableExists = await checkMigrationsTableExists();

    if (!migrationsTableExists) {
      console.log('📝 Creating migrations table...');
      await createMigrationsTable();
    }

    // Get current migrations from database
    const appliedMigrations = await getAppliedMigrations();
    console.log(`📊 Found ${appliedMigrations.length} applied migrations`);

    // Check for initial migration
    const hasInitialMigration = appliedMigrations.some(
      (m) =>
        m.name.includes('InitialMigration') || m.timestamp === 1752710172007,
    );

    if (!hasInitialMigration) {
      console.log('🔄 Running schema synchronization...');

      // First, ensure PostGIS extension is enabled
      await enablePostGISExtension();

      // Run schema sync to create all tables and relationships
      await AppDataSource.synchronize();

      // Record the initial migration as applied
      await recordInitialMigration();

      console.log('✅ Schema synchronized successfully');
    } else {
      console.log('✅ Schema is already up to date');
    }

    // Verify PostGIS functionality
    await verifyPostGISFunctionality();

    console.log('\n🎉 Supabase migration sync completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration sync:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function checkMigrationsTableExists(): Promise<boolean> {
  try {
    const result = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    return result[0].exists;
  } catch {
    return false;
  }
}

async function createMigrationsTable(): Promise<void> {
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      name VARCHAR NOT NULL
    );
  `);
}

async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  try {
    return await AppDataSource.query(`
      SELECT id, timestamp, name 
      FROM migrations 
      ORDER BY timestamp ASC;
    `);
  } catch {
    return [];
  }
}

async function enablePostGISExtension(): Promise<void> {
  try {
    console.log('🌍 Enabling PostGIS extension...');

    // Enable UUID extension
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Enable PostGIS extension
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    console.log('✅ PostGIS extension enabled');
  } catch (error) {
    console.error('⚠️  Warning: Could not enable PostGIS extension:', error);
    // Don't fail the sync if PostGIS is already enabled or not available
  }
}

async function recordInitialMigration(): Promise<void> {
  const timestamp = 1752710172007;
  const name = 'InitialMigration';

  await AppDataSource.query(
    `
    INSERT INTO migrations (timestamp, name) 
    VALUES ($1, $2) 
    ON CONFLICT DO NOTHING;
  `,
    [timestamp, name],
  );

  console.log(`📝 Recorded initial migration: ${name}`);
}

async function verifyPostGISFunctionality(): Promise<void> {
  try {
    console.log('🧪 Verifying PostGIS functionality...');

    // Test basic PostGIS functions

    const result = await AppDataSource.query(`
      SELECT 
        ST_Distance(
          ST_Point(-79.4163, 43.6426), 
          ST_Point(-79.3832, 43.6532)
        ) as distance,
        ST_AsText(ST_Point(-79.4163, 43.6426)) as point_text;
    `);

    console.log(
      `✅ PostGIS test successful - Distance: ${result[0].distance.toFixed(4)}`,
    );

    console.log(`✅ Point creation test: ${result[0].point_text}`);
  } catch (error) {
    console.error('⚠️  Warning: PostGIS verification failed:', error);
    // Don't fail the sync for PostGIS issues
  }
}

// Configuration check
function validateEnvironment(): boolean {
  const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((env) => !process.env[env]);

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missing.join(', ')}`,
    );
    return false;
  }

  return true;
}

// Run the sync if this file is executed directly
if (require.main === module) {
  if (validateEnvironment()) {
    void syncMigrationsToSupabase();
  } else {
    process.exit(1);
  }
}

export { syncMigrationsToSupabase };
