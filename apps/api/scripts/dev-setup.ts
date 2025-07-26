#!/usr/bin/env ts-node
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

const execAsync = promisify(exec);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else if (fs.existsSync(path.resolve(__dirname, '../.env'))) {
  config({ path: path.resolve(__dirname, '../.env') });
} else {
  console.error('❌ No .env.local or .env file found!');
  console.log('📝 Creating .env.local from template...');
  
  const templatePath = path.resolve(__dirname, '../.env.local.example');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envPath);
    console.log('✅ Created .env.local from template');
    console.log('⚠️  Please edit .env.local with your database credentials and run again');
    process.exit(1);
  } else {
    console.error('❌ No .env.local.example template found!');
    process.exit(1);
  }
}

const DB_NAME = process.env.DB_NAME || 'beezly_local';
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';

async function checkDatabaseExists(): Promise<boolean> {
  try {
    // Use psql to check if database exists
    const { stdout } = await execAsync(
      `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} -lqt | cut -d \\| -f 1 | grep -qw ${DB_NAME}`,
      { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }
    );
    return true;
  } catch {
    return false;
  }
}

async function checkMigrationsTable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} -d ${DB_NAME} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations');" -t`,
      { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }
    );
    return stdout.trim() === 't';
  } catch {
    return false;
  }
}

async function createDatabase(): Promise<void> {
  console.log(`📦 Creating database '${DB_NAME}'...`);
  try {
    await execAsync(
      `createdb -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} ${DB_NAME}`,
      { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }
    );
    console.log('✅ Database created successfully');
  } catch (error) {
    console.error('❌ Failed to create database:', error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');
  try {
    const { stdout, stderr } = await execAsync(
      'pnpm run migration:run',
      { cwd: path.resolve(__dirname, '..') }
    );
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('query:')) console.error(stderr);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    throw error;
  }
}

async function runSeeds(): Promise<void> {
  console.log('🌱 Running database seeds...');
  try {
    const { stdout, stderr } = await execAsync(
      'pnpm run db:seed',
      { cwd: path.resolve(__dirname, '..') }
    );
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('query:')) console.error(stderr);
    console.log('✅ Database seeded successfully');
  } catch (error) {
    // Seeding is optional, so we just warn
    console.warn('⚠️  Failed to seed database (this is optional):', error);
  }
}

async function main() {
  console.log('🔍 Checking database setup for development...\n');
  
  try {
    // Check if database exists
    const dbExists = await checkDatabaseExists();
    
    if (!dbExists) {
      console.log(`ℹ️  Database '${DB_NAME}' not found.`);
      console.log('👋 Welcome! Setting up development database for first-time use...\n');
      
      // Create database
      await createDatabase();
      
      // Run migrations (will create all tables)
      await runMigrations();
      
      // Run seeds
      await runSeeds();
      
      console.log('\n🎉 Development database setup complete!');
      console.log('📚 You can now start developing with a fully configured database.\n');
    } else {
      // Database exists, check if it needs migrations
      const hasMigrations = await checkMigrationsTable();
      
      if (!hasMigrations) {
        console.log('ℹ️  Database exists but no migrations table found.');
        console.log('🔄 Running initial migrations...\n');
        
        await runMigrations();
        await runSeeds();
        
        console.log('\n✅ Database initialized with migrations!');
      } else {
        // Check for pending migrations
        try {
          await execAsync('pnpm run migration:check', { cwd: path.resolve(__dirname, '..') });
          console.log('✅ Database is up to date!\n');
        } catch {
          console.log('📝 Pending migrations detected.');
          console.log('🔄 Running pending migrations...\n');
          
          await runMigrations();
          console.log('\n✅ Database updated with latest migrations!');
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure PostgreSQL is running: pg_isready');
    console.log('2. Check your .env.local database credentials');
    console.log('3. Make sure you have createdb permissions');
    console.log('4. Try running manually: pnpm run db:create && pnpm run migration:run\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as setupDatabase };