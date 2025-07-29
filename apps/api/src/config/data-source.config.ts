import { DataSource, DataSourceOptions } from 'typeorm';
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
  NormalizedProduct,
  ReceiptItemNormalization,
  UnprocessedProduct,
} from '../entities';

// Load environment variables based on NODE_ENV
// CI environments should have environment variables already set
if (process.env.CI !== 'true') {
  // Determine which env file to load based on NODE_ENV
  const envFile =
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : process.env.NODE_ENV === 'staging'
        ? '.env.staging'
        : process.env.NODE_ENV === 'test'
          ? '.env.test'
          : '.env.local'; // Default to local for development

  config({ path: envFile });
  console.log(`📁 Loaded environment from: ${envFile}`);
}

// Build migrations path based on environment
const getMigrationsPath = (): string[] => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCi = process.env.CI === 'true';

  if (isProduction || isCi) {
    // In production/CI, use compiled JS files
    return ['dist/api/src/migrations/*.js'];
  }

  // In development, use TypeScript files
  return ['src/migrations/*.ts'];
};

// Function to get configuration dynamically
export const getDataSourceConfig = (): DataSourceOptions => {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'beezly_db',
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
      NormalizedProduct,
      ReceiptItemNormalization,
      UnprocessedProduct,
    ],
    migrations: getMigrationsPath(),
    synchronize: false, // Never use synchronize in production
    logging: process.env.DB_LOGGING === 'true',
    migrationsRun: false, // Don't auto-run migrations
    migrationsTableName: 'migrations',
    // Force IPv4 if running in CI to avoid IPv6 connectivity issues
    ...(process.env.CI === 'true' && {
      extra: {
        options:
          '-c tcp_keepalives_idle=20 -c tcp_keepalives_interval=20 -c tcp_keepalives_count=3',
      },
    }),
  };
};

// Export static configuration for backward compatibility
export const dataSourceConfig: DataSourceOptions = getDataSourceConfig();

// Create and export the DataSource instance
export const AppDataSource = new DataSource(getDataSourceConfig());
