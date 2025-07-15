import * as dotenv from 'dotenv';
import { join } from 'path';

// Load test environment variables
const result = dotenv.config({ path: join(__dirname, '../.env.test') });

if (result.error) {
  console.error('Failed to load .env.test file:', result.error);
} else {
  console.log('Test environment loaded successfully');
}

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';
