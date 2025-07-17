# 🗄️ Database Migration Guide

This guide explains how to manage database migrations and schema synchronization between local development, CI/CD pipelines, and Supabase production environments.

## 📋 Overview

The Beezly API uses TypeORM for database management with PostgreSQL and PostGIS extensions. We support both local development and Supabase deployment with automated migration checking through GitHub Actions.

## 🛠️ Available Scripts

### Schema Management
```bash
# Compare current database schema with TypeORM entities
pnpm run schema:compare --filter=api

# Sync schema to Supabase (create tables, indexes, extensions)
pnpm run supabase:sync --filter=api

# Generate a new migration from entity changes
pnpm run migration:generate --filter=api

# Run pending migrations
pnpm run migration:run --filter=api

# Show migration status
pnpm run migration:show --filter=api

# Revert last migration
pnpm run migration:revert --filter=api
```

### Development
```bash
# Run API with automatic schema sync (development only)
pnpm run dev --filter=api

# Build and start production API
pnpm run build --filter=api
pnpm run start:prod --filter=api
```

## 🌍 Environment Configuration

### Local Development
Use the standard `.env` file with local PostgreSQL:

```env
# Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=beezly_db
DB_SSL=false
NODE_ENV=development
```

### Supabase Production
Copy `.env.supabase.example` to `.env.supabase` and configure:

```env
# Supabase Database
DB_HOST=db.<your-project-ref>.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<your-supabase-db-password>
DB_NAME=postgres
DB_SSL=true
NODE_ENV=production
```

## 🔄 Migration Workflow

### 1. Local Development
```bash
# 1. Make changes to entity files
# 2. Generate migration
pnpm run migration:generate --filter=api

# 3. Review generated migration file
# 4. Apply migration locally
pnpm run migration:run --filter=api

# 5. Test changes
pnpm run dev --filter=api
```

### 2. CI/CD Pipeline
The GitHub Actions workflow automatically:
- Validates entity changes
- Runs schema comparison
- Tests migration sync
- Verifies API startup

### 3. Supabase Deployment
```bash
# Set Supabase environment variables
export DB_HOST=db.<your-project-ref>.supabase.co
export DB_USERNAME=postgres
export DB_PASSWORD=<your-supabase-password>
export DB_NAME=postgres
export DB_SSL=true

# Sync schema to Supabase
pnpm run supabase:sync --filter=api

# Or run specific migrations
pnpm run migration:run --filter=api
```

## 🏗️ Schema Structure

### Core Tables
- **User**: User accounts and authentication
- **Store**: Physical store locations with PostGIS support
- **Product**: Product catalog with categories
- **Receipt**: Scanned receipts with parsed data
- **ReceiptItem**: Individual items from receipts
- **Price**: Price history and verification data

### Relationship Tables
- **User_badges**: User achievement tracking
- **User_score**: Point system and scoring
- **Category**: Product categorization hierarchy

### System Tables
- **Score_type**: Scoring system configuration
- **Verification_logs**: User verification activities
- **migrations**: TypeORM migration tracking

## 🔍 Schema Validation

### Compare Schema with Entities
```bash
pnpm run schema:compare --filter=api
```

This script will show:
- Current database tables and columns
- Expected TypeORM entity structure  
- Active indexes and foreign keys
- PostGIS extension status

### Common Schema Issues

#### 1. Column Type Mismatches
**Problem**: Entity type doesn't match database column type
```bash
# Example: Entity expects 'uuid' but database has 'varchar'
```

**Solution**: Update entity definition or create migration
```typescript
@Column({ type: 'uuid', name: 'user_sk' })
userSk: string;
```

#### 2. Missing Foreign Key Constraints
**Problem**: Database missing expected foreign key relationships

**Solution**: Generate migration to add constraints
```bash
pnpm run migration:generate --filter=api
```

#### 3. PostGIS Extension Missing
**Problem**: Geospatial queries fail

**Solution**: Run Supabase sync to enable PostGIS
```bash
pnpm run supabase:sync --filter=api
```

## 🚨 Troubleshooting

### Migration Conflicts
If multiple developers create migrations simultaneously:

```bash
# 1. Pull latest changes
git pull origin main

# 2. Check for migration conflicts
pnpm run migration:show --filter=api

# 3. If conflicts exist, revert local migration
pnpm run migration:revert --filter=api

# 4. Regenerate migration with latest entities
pnpm run migration:generate --filter=api
```

### Supabase Connection Issues
1. Verify Supabase credentials in environment variables
2. Check IP allowlist in Supabase dashboard
3. Ensure SSL is enabled for Supabase connections

### Schema Sync Failures
1. Check PostGIS extension is available
2. Verify user has sufficient privileges
3. Review migration order and dependencies

## 📊 CI/CD Integration

### GitHub Actions Workflow
Located at `.github/workflows/database-migration-check.yml`

**Triggers:**
- Pull requests to `main` or `staging`
- Pushes to `main` or `staging`
- Changes to entity files or migrations

**Steps:**
1. Set up PostgreSQL with PostGIS
2. Build API application
3. Run schema comparison
4. Test Supabase migration sync
5. Verify API startup and health check

### Required Secrets
For production deployments, configure these GitHub secrets:
- `SUPABASE_DB_HOST`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_NAME`
- `DISCORD_WEBHOOK` - Discord webhook URL for CI notifications

#### Setting up Discord Notifications
1. **Create Discord Webhook**:
   - Open your Discord server
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Choose the channel for notifications
   - Copy the webhook URL

2. **Add GitHub Secret**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `DISCORD_WEBHOOK`
   - Value: Your Discord webhook URL
   - Click "Add secret"

3. **Notification Types**:
   - ✅ **Success**: Schema validation passed, API started successfully
   - ❌ **Failure**: Migration checks failed, review required
   - 📋 **PR Validation**: Migration script syntax validation results

## 🔧 Advanced Usage

### Custom Migration Scripts
Create manual migrations for complex changes:

```bash
# Create empty migration file
pnpm run typeorm migration:create src/migrations/CustomMigration

# Edit the migration file with custom SQL
# Run the migration
pnpm run migration:run --filter=api
```

### Multiple Environment Support
Use different environment files:

```bash
# Development
NODE_ENV=development pnpm run migration:run --filter=api

# Staging
NODE_ENV=staging pnpm run migration:run --filter=api

# Production
NODE_ENV=production pnpm run migration:run --filter=api
```

### Backup and Rollback
```bash
# Backup before major changes
pg_dump -h localhost -U postgres beezly_db > backup.sql

# Rollback if needed
pnpm run migration:revert --filter=api

# Or restore from backup
psql -h localhost -U postgres beezly_db < backup.sql
```

## 📚 Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations locally** before committing
3. **Use descriptive migration names** that explain the change
4. **Backup production data** before major schema changes
5. **Run schema comparison** after entity modifications
6. **Keep entity definitions in sync** with database schema
7. **Use CI/CD pipeline** to catch migration issues early

## 🆘 Getting Help

If you encounter issues:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review CI/CD pipeline logs for detailed error messages
3. Run `pnpm run schema:compare --filter=api` to diagnose schema mismatches
4. Consult TypeORM documentation for migration patterns

---

📝 **Note**: This guide assumes you have proper PostgreSQL with PostGIS installed locally and valid Supabase credentials for production deployment.