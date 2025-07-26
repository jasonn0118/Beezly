#!/usr/bin/env ts-node
import { spawn } from 'child_process';
import * as path from 'path';
import { setupDatabase } from './dev-setup';

const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No Color

async function main() {
  console.log(`${BLUE}🚀 Starting Beezly API development environment...${NC}\n`);

  try {
    // Run database setup
    console.log(`${BLUE}🔍 Checking database setup...${NC}`);
    await setupDatabase();
    
    console.log(`${GREEN}✅ Database setup complete!${NC}\n`);
    console.log(`${BLUE}🚀 Starting NestJS development server...${NC}\n`);
    
    // Start the development server
    const devServer = spawn('pnpm', ['run', 'start:dev'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      devServer.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      devServer.kill('SIGTERM');
      process.exit(0);
    });
    
    devServer.on('exit', (code) => {
      process.exit(code || 0);
    });
    
  } catch (error) {
    console.error(`${RED}❌ Failed to start development environment:${NC}`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}