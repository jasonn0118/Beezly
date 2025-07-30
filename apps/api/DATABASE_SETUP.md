# Database Environment Setup Guide

This guide explains how to set up and manage different database environments for Beezly API.

## 🚀 Quick Start (New Developers)

**For immediate setup with 1200+ real products:**
```bash
# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with your PostgreSQL credentials

# One-command setup (creates DB, runs migrations, seeds 1200+ products)
pnpm run dev:setup

# Start development server
pnpm run dev
```

**That's it!** Your database now has realistic grocery data ready for testing.

---

## Overview

Beezly uses three separate database environments:
- **Local**: PostgreSQL on your local machine for development
- **Staging**: Supabase database for staging/testing
- **Production**: Supabase database for production

## Migration Strategy

The project uses different migration approaches depending on the environment:

### New Developer (Empty Database)
- Uses `InitialSchema1700000000000` migration to create full schema
- Then applies subsequent migrations (like `AddBarcodeTypeToProduct`)

### Existing Environment (Staging/Production)
- Uses `BaselineExistingTables1752772807627` to mark existing tables as migrated
- Then applies only new migrations (like `AddBarcodeTypeToProduct`)

## Environment Configuration

### 1. Local Development Setup (New Developer)

#### Prerequisites
- PostgreSQL installed locally (version 14+)
- PostGIS extension for spatial features

#### Setup Steps

1. **Copy the local environment template:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your local PostgreSQL and Supabase credentials.

2. **Create the local database:**
   ```bash
   pnpm run db:create
   ```

3. **Run migrations (creates full schema):**
   ```bash
   pnpm run migration:run
   ```
   This will run `InitialSchema1700000000000` and any subsequent migrations.

4. **Seed the database with 1200+ real products:**
   ```bash
   pnpm run db:seed
   ```
   This includes users, stores, categories, 1200+ real products from OpenFoodFacts, badges, and score types.

5. **Quick setup (all-in-one):**
   ```bash
   pnpm run dev:setup
   ```
   This runs `db:reset` + `db:seed` in one command.

6. **Start development:**
   ```bash
   pnpm run dev
   ```
   For first-time users, this automatically runs database setup and starts the dev server.

### Automated Setup (Recommended)

The development scripts are smart and handle both scenarios:

**New Developer (Empty Database):**
- `pnpm run dev` automatically detects missing database
- Creates database, runs migrations, seeds data
- Starts development server

**Existing Developer (Database Exists):**
- `pnpm run dev` checks for pending migrations
- Runs any new migrations if needed
- Starts development server

This means **`pnpm run dev` always works** regardless of your database state!

## Migration Management

### Understanding the Migration Files

1. **`1700000000000-InitialSchema.ts`**
   - **Purpose**: Creates the complete database schema from scratch
   - **When to use**: New developer setups with empty databases
   - **Contains**: All tables, indexes, constraints, and foreign keys

2. **`1752772807627-BaselineExistingTables.ts`**
   - **Purpose**: Marks existing Supabase tables as already migrated
   - **When to use**: Existing environments that already have tables
   - **Contains**: No actual schema changes, just migration tracking

3. **`1752867138250-AddBarcodeTypeToProduct.ts`**
   - **Purpose**: Adds barcode_type column to Product table
   - **When to use**: All environments (after baseline or initial schema)
   - **Contains**: Safe column addition to existing table

### Migration Execution Order

#### New Developer Workflow:
```bash
1. InitialSchema1700000000000          # Creates all tables
2. AddBarcodeTypeToProduct1752867138250  # Adds barcode_type column
```

#### Existing Environment Workflow:
```bash
1. BaselineExistingTables1752772807627   # Marks existing tables
2. AddBarcodeTypeToProduct1752867138250  # Adds barcode_type column
```

### 2. Staging Environment Setup

1. **Copy the staging environment template:**
   ```bash
   cp .env.staging.example .env.staging
   ```

2. **Configure with your Supabase staging project:**
   - Get credentials from Supabase Dashboard → Settings → Database
   - Update `DB_HOST`, `DB_PASSWORD`, etc.

3. **GitHub Environment Secrets:**
   - Configure in **GitHub → Settings → Environments → staging**
   - Add secrets: `DB_HOST`, `DB_PASSWORD`, `SUPABASE_URL`, etc.
   - See [GitHub Environments & Secrets Configuration](#github-environments--secrets-configuration) section below

### 3. Production Environment Setup

1. **Copy the production environment template:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Configure with your Supabase production project:**
   - Use a SEPARATE Supabase project from staging
   - Get credentials from Supabase Dashboard

3. **GitHub Environment Secrets:**
   - Configure in **GitHub → Settings → Environments → production**
   - Add secrets: `DB_HOST`, `DB_PASSWORD`, `SUPABASE_URL`, etc.
   - See [GitHub Environments & Secrets Configuration](#github-environments--secrets-configuration) section below

## Database Management Commands

### Local Development

```bash
# Create local database
pnpm run db:create

# Drop local database
pnpm run db:drop

# Reset database (drop, create, migrate)
pnpm run db:reset

# Seed database with complete dataset (1200+ real products included!)
pnpm run db:seed

# Clear all data (except migrations)
pnpm run db:clear

# Full setup (reset + seed)
pnpm run dev:setup
```

### Migrations (All Environments)

```bash
# Generate a new migration
pnpm run migration:generate -- src/migrations/DescriptiveName

# Run pending migrations
pnpm run migration:run

# Check migration status
pnpm run migration:check

# Show applied migrations
pnpm run migration:show

# Revert last migration
pnpm run migration:revert
```

## Supabase Configuration Guide

### Understanding Supabase Keys and URLs

The application uses Supabase for:
- **Database hosting** (PostgreSQL with PostGIS)
- **File storage** (receipt and product images)
- **Authentication** (future user auth features)

### Required Supabase Configuration

#### 1. SUPABASE_URL
- **Format**: `https://<project-ref>.supabase.co`
- **Where to find**: Supabase Dashboard → Settings → General → Reference ID
- **Example**: `https://abcd1234.supabase.co`

#### 2. SUPABASE_ANON_KEY
- **Purpose**: Client-side operations, limited permissions
- **Where to find**: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **Security**: Safe to expose in client applications
- **Example**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...`

#### 3. SUPABASE_SERVICE_ROLE_KEY
- **Purpose**: Server-side operations, full permissions
- **Where to find**: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
- **Security**: ⚠️ **NEVER expose this key publicly** - server use only
- **Used for**: File uploads, admin operations, bypassing RLS
- **Example**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...`

### Setting Up Supabase Projects

#### For Local Development

Option 1: **Use Staging Supabase** (recommended for simplicity)
```bash
# In .env.local - copy from staging values
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
```

Option 2: **Separate Local Supabase Project** (recommended for production apps)
- Create a new Supabase project for local development
- Configure separate storage buckets
- Use in `.env.local`

#### For Staging Environment

1. **Create Staging Supabase Project**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create new project: `beezly-staging`
   - Choose a region close to your users
   - Set a strong database password

2. **Configure Storage Buckets**:
   ```sql
   -- In Supabase SQL Editor
   
   -- Create receipt storage bucket
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('receipt', 'receipt', false);
   
   -- Create product storage bucket
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('product', 'product', false);
   
   -- Set up storage policies (example)
   CREATE POLICY "Anyone can upload receipts" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'receipt');
   
   CREATE POLICY "Anyone can view receipts" ON storage.objects
   FOR SELECT USING (bucket_id = 'receipt');
   ```

3. **Get Configuration Values**:
   - URL: Dashboard → Settings → General
   - Keys: Dashboard → Settings → API

#### For Production Environment

1. **Create Production Supabase Project** (separate from staging):
   - Project name: `beezly-production`
   - Choose production-ready region
   - Enable daily backups
   - Set strong, unique database password

2. **Security Hardening**:
   - Enable RLS (Row Level Security) on all tables
   - Configure proper storage policies
   - Set up monitoring and alerts
   - Regular backup verification

### GitHub Environments & Secrets Configuration

For CI/CD deployments, use **Environment Secrets** for better security and organization:

#### Step 1: Create GitHub Environments

**Settings → Environments → New environment**

1. Create environment: `staging`
2. Create environment: `production`

#### Step 2: Configure Staging Environment Secrets

**Environments → staging → Add secret**

```
DB_HOST=db.your-staging-ref.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-staging-database-password
DB_NAME=postgres
SUPABASE_URL=https://your-staging-ref.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJh...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJh...
```

#### Step 3: Configure Production Environment Secrets

**Environments → production → Add secret**

```
DB_HOST=db.your-production-ref.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-production-database-password
DB_NAME=postgres
SUPABASE_URL=https://your-production-ref.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJh...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJh...
```

#### Benefits of Environment Secrets:
- 🔒 **Better Security**: Environment-specific secrets are isolated
- 🎯 **Cleaner Configuration**: No need for `STAGING_*` and `PRODUCTION_*` prefixes
- 🚀 **Auto-Selection**: CI/CD automatically uses correct environment based on branch
- ✅ **Approval Gates**: Optional deployment approvals for production

#### How CI/CD Environment Selection Works:
- **`staging` branch** → Uses `staging` environment secrets
- **`main` branch** → Uses `production` environment secrets
- **Same secret names** for both environments (no prefixes needed)

### Storage Configuration

The application expects these storage buckets:

1. **`receipt`** - For receipt images
   - Used by: `upload_receipt()` function
   - File types: WebP, JPEG, PNG, HEIC
   - Path structure: `{user_sk}/{store_sk}/receipt_{timestamp}_{uuid}.webp`

2. **`product`** - For product images
   - Used by: `upload_product()` function
   - File types: JPEG
   - Path structure: `{user_sk}/{store_sk}/product_{timestamp}_{uuid}.jpg`

### Troubleshooting Supabase Issues

#### Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     "https://your-project.supabase.co/rest/v1/"
```

#### Storage Issues
```bash
# Check if storage buckets exist
# Go to Supabase Dashboard → Storage
# Verify 'receipt' and 'product' buckets exist
```

#### Authentication Issues
```bash
# Verify service role key has proper permissions
# Check: Dashboard → Settings → API → JWT Settings
```

## Seed Data

Seed data is located in `src/seeds/data/` and includes:

### Complete Seed Data (Always Loaded)
- **Users**: Admin and test users
- **Stores**: Sample Canadian grocery stores (Loblaws, Metro, etc.)
- **Categories**: 18 comprehensive grocery categories
- **Products**: **1200+ real products** from OpenFoodFacts database
- **Badges**: Achievement badges for user engagement
- **Score Types**: Point earning actions

### Real Product Dataset Details
- **Source**: OpenFoodFacts database (real product data)
- **Content**: Product names, valid barcodes, images, categorization
- **Categories**: Automatically distributed across all grocery categories
- **Perfect for**: Barcode scanning, search, price comparison, receipt matching

**Product Categories Distribution:**
- Pantry & Dry Goods: ~570 products
- Dairy & Eggs: ~100 products
- Beverages: ~100 products
- Produce: ~90 products
- Snacks & Candy: ~65 products
- Bakery & Bread: ~50 products
- Meat & Seafood: ~25 products
- Frozen Foods: ~2 products

**Single command loads everything:**
```bash
pnpm run db:seed --filter=api
```

> 🎉 **New**: The full product dataset is now included by default - no separate commands needed!

## Sample Data

The seed data includes realistic Canadian and international grocery products:
- **Tim Hortons Coffee** (055742524001)
- **Coca-Cola Classic** (049000006346) 
- **Kraft Dinner Original** (0068100904826)
- **Heinz Ketchup** (0057000002992)
- **Creamy Peanut Butter** (0068100084245)
- **Loblaws No Name products**
- **Metro store brand items** 
- And **1200+ more real products** with valid barcodes from OpenFoodFacts!

This makes it easy to test:
- Barcode scanning functionality
- Product search and filtering
- Category-based browsing
- Price comparison features
- Receipt processing with real product matches

## Environment Variables

### Key Database Variables

| Variable | Local | Staging | Production |
|----------|-------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `DB_HOST` | localhost | Supabase URL | Supabase URL |
| `DB_PORT` | 5432 | 5432 | 5432 |
| `DB_USERNAME` | postgres | postgres | postgres |
| `DB_PASSWORD` | local password | staging password | production password |
| `DB_NAME` | beezly_local | postgres | postgres |
| `DB_SSL` | false | true | true |
| `DB_LOGGING` | true | false | false |
| `SUPABASE_URL` | staging or local | staging project | production project |
| `SUPABASE_ANON_KEY` | staging or local | staging anon key | production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging or local | staging service key | production service key |

## Running the Application

```bash
# Local development (uses .env.local)
pnpm run dev

# With specific environment
NODE_ENV=staging pnpm run start

# Production build
NODE_ENV=production pnpm run build
NODE_ENV=production pnpm run start:prod
```

## CI/CD Configuration

The GitHub Actions workflow automatically:
1. **Environment Selection**: 
   - `staging` branch → Uses `staging` environment secrets
   - `main` branch → Uses `production` environment secrets
2. **Database Operations**:
   - Validates schema comparison against target database
   - Runs pending migrations safely if needed
   - Never runs destructive operations (schema sync disabled)
3. **Security Features**:
   - Environment-isolated secrets
   - SSL-enforced connections
   - Discord notifications for deployment status
4. **Migration Safety**:
   - Uses safe `migration:run` instead of `schema:sync`
   - Validates migrations before applying
   - Automatic rollback on failures

## Important Notes

1. **NEVER** use the same database for staging and production
2. **NEVER** run `schema:sync` - it's disabled for safety (destroys all data!)
3. **ALWAYS** use migrations for schema changes
4. **ALWAYS** backup production before major changes
5. Local database uses `beezly_local` name to avoid conflicts

### 🛡️ Database Safety Features

This project includes multiple safety measures to prevent data loss:

- **`schema:sync` is disabled** - the dangerous synchronize command that drops all tables is blocked
- **Safe migration workflow** - only uses `migration:run` which preserves existing data
- **CI/CD protection** - GitHub Actions never runs destructive operations
- **Environment isolation** - local, staging, and production databases are completely separate
- **Migration validation** - CI automatically validates migrations before deployment

## Troubleshooting

### Local PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Check database exists
psql -U postgres -l | grep beezly_local

# Connect manually
psql -U postgres -d beezly_local
```

### Migration Issues
```bash
# If migrations are out of sync
pnpm run migration:show

# Mark baseline if needed (emergency only)
pnpm run migration:mark-baseline
```

### Environment Loading Issues
```bash
# Debug environment variables
pnpm run debug:env
```

## Security Best Practices

1. Never commit `.env.staging` or `.env.production`
2. Use strong passwords for all databases
3. Rotate credentials regularly
4. Use read-only credentials where possible
5. Enable SSL for all remote connections