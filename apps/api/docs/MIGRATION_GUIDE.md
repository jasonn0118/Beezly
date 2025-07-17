# Beezly API - Migration Guide

## Migration Strategy

This project uses a **Supabase-first migration approach** with TypeORM to prevent conflicts with existing database schema.

### Initial Setup (First Time Only)

1. **Mark baseline migration as applied** (for existing Supabase tables):
   ```bash
   pnpm run migration:mark-baseline
   ```
   This marks the baseline migration as applied without running it, preventing TypeORM from trying to recreate existing tables.

2. **Verify migration status**:
   ```bash
   pnpm run migration:show
   ```

### Daily Development Workflow

1. **Generate new migrations** for entity changes:
   ```bash
   pnpm run migration:generate
   ```

2. **Run migrations safely**:
   ```bash
   pnpm run migration:run
   ```
   This uses our safe migration runner that includes transaction support and rollback.

3. **Check migration status**:
   ```bash
   pnpm run migration:check
   ```

### Migration Commands

| Command | Description |
|---------|-------------|
| `pnpm run migration:generate` | Generate migration from entity changes |
| `pnpm run migration:run` | Run pending migrations safely |
| `pnpm run migration:run:unsafe` | Run migrations directly (not recommended) |
| `pnpm run migration:revert` | Revert last migration |
| `pnpm run migration:show` | Show all migrations and their status |
| `pnpm run migration:check` | Check if migrations need to be run |
| `pnpm run migration:mark-baseline` | Mark baseline migration as applied |

### CI/CD Integration

The CI/CD pipeline automatically:
1. Checks for pending migrations
2. Runs migrations if needed
3. Validates schema compatibility
4. Syncs with Supabase

### Important Notes

- **Never use `synchronize: true`** in production
- **Always generate migrations** for schema changes
- **Test migrations locally** before pushing
- The baseline migration (`BaselineExistingTables`) should remain empty
- New migrations will be applied on top of the existing Supabase schema

### Troubleshooting

If you encounter migration issues:

1. **Check migration status**:
   ```bash
   pnpm run migration:show
   ```

2. **Verify database connection**:
   ```bash
   pnpm run schema:compare
   ```

3. **For fresh environments**, ensure baseline is marked:
   ```bash
   pnpm run migration:mark-baseline
   ```