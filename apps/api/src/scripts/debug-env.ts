#!/usr/bin/env ts-node
import { config } from 'dotenv';

// Load environment variables only if not in CI environment
if (process.env.CI !== 'true') {
  config();
}

console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CI:', process.env.CI);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log(
  'DB_PASSWORD:',
  process.env.DB_PASSWORD ? '***REDACTED***' : 'NOT SET',
);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_SSL:', process.env.DB_SSL);
console.log('DB_LOGGING:', process.env.DB_LOGGING);

// Test data source configuration
import { dataSourceConfig } from '../config/data-source.config';
console.log('\n🔧 Data Source Configuration:');
console.log('Type:', dataSourceConfig.type);
if (dataSourceConfig.type === 'postgres') {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log('Host:', (dataSourceConfig as any).host);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log('Port:', (dataSourceConfig as any).port);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log('Username:', (dataSourceConfig as any).username);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log('Database:', (dataSourceConfig as any).database);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log('SSL:', (dataSourceConfig as any).ssl);
}
console.log('Migrations path:', dataSourceConfig.migrations);
