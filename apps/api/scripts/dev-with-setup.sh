#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Beezly API development environment...${NC}\n"

# Change to API directory
cd "$(dirname "$0")/.." || exit 1

# Check if .env.local exists
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env.local file found!${NC}"
    echo -e "${BLUE}📝 Creating .env.local from template...${NC}"
    
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✅ Created .env.local from template${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env.local with your database credentials and run again${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env.local.example template found!${NC}"
        exit 1
    fi
fi

# Run database setup
echo -e "${BLUE}🔍 Checking database setup...${NC}"
npx ts-node scripts/dev-setup.ts

# Check if setup was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database setup complete!${NC}\n"
    echo -e "${BLUE}🚀 Starting NestJS development server...${NC}\n"
    
    # Start the development server
    exec pnpm run start:dev
else
    echo -e "${RED}❌ Database setup failed. Please check the errors above.${NC}"
    exit 1
fi