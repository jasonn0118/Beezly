# 🚀 Beezly Developer Setup Guide

Welcome to Beezly! This guide will help you get your development environment up and running quickly.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20+ recommended)
- **pnpm** (v10+) - Install with: `npm install -g pnpm@10`
- **PostgreSQL** (v14+ with PostGIS extension)
- **Git**

### Installing PostgreSQL with PostGIS

#### macOS (using Homebrew):
```bash
brew install postgresql@14
brew install postgis
brew services start postgresql@14
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql-14 postgresql-14-postgis-3
sudo systemctl start postgresql
```

#### Windows:
Download and install from [PostgreSQL official site](https://www.postgresql.org/download/windows/) and ensure PostGIS is selected during installation.

## 🎯 Quick Start (Recommended)

The fastest way to get started is to use our automated setup:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/beezly.git
cd beezly

# 2. Install dependencies
pnpm install

# 3. Start development (auto-setup included!)
pnpm dev

# This will automatically:
# - Check if your database exists
# - Create the database if needed
# - Run all migrations
# - Seed the database with sample data
# - Start all development servers
```

That's it! 🎉 The development environment will automatically set up your database on first run.

## 🔧 Manual Setup (Alternative)

If you prefer to set up manually or need more control:

### 1. Environment Configuration

```bash
# Copy environment templates
cp apps/api/.env.local.example apps/api/.env.local
cp apps/web/.env.local.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# Edit the files with your configuration
# Especially check the database credentials in apps/api/.env.local
```

### 2. Database Setup

```bash
# Navigate to API directory
cd apps/api

# Create database
pnpm run db:create

# Run migrations
pnpm run migration:run

# Seed database (optional)
pnpm run db:seed

# Or do everything at once:
pnpm run dev:setup
```

### 3. Start Development

```bash
# From the root directory
pnpm dev

# Or start individual apps:
pnpm dev --filter=api    # API only
pnpm dev --filter=web    # Web only
pnpm dev --filter=mobile # Mobile only
```

## 📱 Running Individual Apps

### API Server (NestJS)
```bash
pnpm dev --filter=api
# Runs on http://localhost:3006
# Auto-setup: YES ✅
```

### Web App (Next.js)
```bash
pnpm dev --filter=web
# Runs on http://localhost:3001
```

### Mobile App (Expo)
```bash
pnpm dev --filter=mobile
# Opens Expo developer tools
```

## 🛠️ Common Commands

### Database Management
```bash
# Check database status
pnpm run migration:show --filter=api

# Create a new migration
pnpm run migration:generate -- src/migrations/YourMigrationName --filter=api

# Reset database (careful!)
pnpm run db:reset --filter=api

# Clear all data (keeps schema)
pnpm run db:clear --filter=api

# Seed large product dataset (1000+ real products with barcodes)
pnpm run db:seed-large --filter=api
```

### Code Quality
```bash
# Run linting
pnpm lint

# Run tests
pnpm test

# Type checking
pnpm type-check
```

## 🔍 Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   pg_isready
   ```

2. **Verify credentials in `.env.local`:**
   - Default username: `postgres`
   - Default password: Check your PostgreSQL installation
   - Default database: `beezly_local`

3. **Create database manually if needed:**
   ```bash
   createdb beezly_local
   ```

### Auto-Setup Not Working?

If the automatic setup fails, you can:

1. **Run setup check manually:**
   ```bash
   cd apps/api
   pnpm run dev:check-setup
   ```

2. **Skip auto-setup and run directly:**
   ```bash
   cd apps/api
   pnpm run dev:no-setup
   ```

3. **Reset everything:**
   ```bash
   cd apps/api
   pnpm run db:drop
   pnpm run db:create
   pnpm run migration:run
   pnpm run db:seed
   ```

### Port Conflicts

Default ports:
- API: `3006`
- Web: `3001`
- Mobile: Expo default

Change in respective `.env.local` files if needed.

## 📚 Project Structure

```
beezly/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js web application
│   └── mobile/       # Expo mobile application
├── packages/         # Shared packages
├── turbo.json       # Turborepo configuration
└── package.json     # Root package configuration
```

## 🤝 Need Help?

- Check existing issues on GitHub
- Review the [Database Setup Guide](apps/api/DATABASE_SETUP.md)
- Ask in the team chat

Happy coding! 🎉