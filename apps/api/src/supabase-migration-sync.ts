/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  User,
  Store,
  Receipt,
  Product,
  ReceiptItem,
  Category,
  Badges,
  ScoreType,
  UserBadges,
  UserScore,
  Price,
  VerificationLogs,
} from './entities';

// Load environment variables only if not in CI environment
// CI environments should have environment variables already set
if (process.env.CI !== 'true') {
  config();
}

// Create dynamic data source that respects current environment
const createDataSource = () => {
  // Determine database name: use postgres for production/CI, beezly_db for local dev
  const dbName =
    process.env.DB_NAME ||
    (process.env.NODE_ENV === 'production' || process.env.CI
      ? 'postgres'
      : 'beezly_db');

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [
      User,
      Store,
      Receipt,
      Product,
      ReceiptItem,
      Category,
      Badges,
      ScoreType,
      UserBadges,
      UserScore,
      Price,
      VerificationLogs,
    ],
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    migrationsRun: false,
  });
};

interface MigrationRecord {
  id: number;
  timestamp: number;
  name: string;
}

async function syncMigrationsToSupabase() {
  console.log('🚀 Starting Supabase migration sync...\n');

  // Debug environment variables
  console.log('🔧 Environment variables:');
  console.log(`DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
  console.log(`DB_USERNAME: ${process.env.DB_USERNAME || 'undefined'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
  console.log(`DB_SSL: ${process.env.DB_SSL || 'undefined'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n`);

  const dataSource = createDataSource();

  const host =
    'host' in dataSource.options ? dataSource.options.host : 'unknown';
  console.log(
    `🔌 Connecting to database: ${String(dataSource.options.database || 'unknown')} at ${String(host)}`,
  );

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Check if migrations table exists
    const migrationsTableExists = await checkMigrationsTableExists(dataSource);

    if (!migrationsTableExists) {
      console.log('📝 Creating migrations table...');
      await createMigrationsTable(dataSource);
    }

    // Get current migrations from database
    const appliedMigrations = await getAppliedMigrations(dataSource);
    console.log(`📊 Found ${appliedMigrations.length} applied migrations`);

    // Check for initial migration
    const hasInitialMigration = appliedMigrations.some(
      (m) =>
        m.name.includes('InitialMigration') || m.timestamp === 1752710172007,
    );

    if (!hasInitialMigration) {
      console.log('🔄 Running schema synchronization...');

      // First, ensure PostGIS extension is enabled
      await enablePostGISExtension(dataSource);

      // Run schema sync to create all tables and relationships
      await dataSource.synchronize();

      // Record the initial migration as applied
      await recordInitialMigration(dataSource);

      console.log('✅ Schema synchronized successfully');
    } else {
      console.log('✅ Schema is already up to date');
    }

    // Verify PostGIS functionality
    await verifyPostGISFunctionality(dataSource);

    console.log('\n🎉 Supabase migration sync completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration sync:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function checkMigrationsTableExists(
  dataSource: DataSource,
): Promise<boolean> {
  try {
    const result = await dataSource.query(`
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

async function createMigrationsTable(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      name VARCHAR NOT NULL
    );
  `);
}

async function getAppliedMigrations(
  dataSource: DataSource,
): Promise<MigrationRecord[]> {
  try {
    return await dataSource.query(`
      SELECT id, timestamp, name 
      FROM migrations 
      ORDER BY timestamp ASC;
    `);
  } catch {
    return [];
  }
}

async function enablePostGISExtension(dataSource: DataSource): Promise<void> {
  try {
    console.log('🌍 Enabling PostGIS extension...');

    // Enable UUID extension
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Enable PostGIS extension
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    console.log('✅ PostGIS extension enabled');
  } catch (error) {
    console.error('⚠️  Warning: Could not enable PostGIS extension:', error);
    // Don't fail the sync if PostGIS is already enabled or not available
  }
}

async function recordInitialMigration(dataSource: DataSource): Promise<void> {
  const timestamp = 1752710172007;
  const name = 'InitialMigration';

  await dataSource.query(
    `
    INSERT INTO migrations (timestamp, name) 
    VALUES ($1, $2) 
    ON CONFLICT DO NOTHING;
  `,
    [timestamp, name],
  );

  console.log(`📝 Recorded initial migration: ${name}`);
}

async function verifyPostGISFunctionality(
  dataSource: DataSource,
): Promise<void> {
  try {
    console.log('🧪 Verifying PostGIS functionality...');

    // Test basic PostGIS functions

    const result = await dataSource.query(`
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

// Configuration check - only require DB_HOST and DB_PASSWORD for actual Supabase (production)
function validateEnvironment(): boolean {
  // For actual production (not test), we need at least DB_HOST and DB_PASSWORD
  if (process.env.NODE_ENV === 'production' && process.env.CI) {
    const required = ['DB_HOST', 'DB_PASSWORD'];
    const missing = required.filter((env) => !process.env[env]);

    if (missing.length > 0) {
      console.error(
        `❌ Missing required environment variables for production: ${missing.join(', ')}`,
      );
      console.error('💡 Make sure GitHub secrets are configured properly');
      return false;
    }
  }

  // For test environments, we don't require DB_PASSWORD (local PostgreSQL with trust auth)
  if (process.env.NODE_ENV === 'test' && process.env.CI) {
    console.log('ℹ️  Running in test environment - DB_PASSWORD not required');
    return true;
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
