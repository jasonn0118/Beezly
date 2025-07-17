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
} from '../entities';

// Load environment variables only if not in CI environment
// CI environments should have environment variables already set
if (process.env.CI !== 'true') {
  config();
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

// Export configuration for use in different contexts
export const dataSourceConfig: DataSourceOptions = {
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
  ],
  migrations: getMigrationsPath(),
  synchronize: false, // Never use synchronize in production
  logging: process.env.DB_LOGGING === 'true',
  migrationsRun: false, // Don't auto-run migrations
  migrationsTableName: 'migrations',
};

// Create and export the DataSource instance
export const AppDataSource = new DataSource(dataSourceConfig);
