# 🚀 Beezly API

The backend API for Beezly's receipt intelligence platform, built with NestJS and TypeORM with PostgreSQL + PostGIS.

## 🏗️ Architecture Overview

```
api/
├── src/
│   ├── auth/              # Authentication & authorization
│   ├── user/              # User management
│   ├── store/             # Store data with geospatial features
│   ├── product/           # Product catalog & normalization
│   ├── receipt/           # Receipt processing & OCR integration
│   ├── receiptItem/       # Individual receipt items
│   ├── category/          # Product categorization
│   ├── entities/          # TypeORM entities with PostGIS support
│   ├── migrations/        # Database migration scripts
│   └── main.ts           # Application entry point
├── test/                  # End-to-end tests
└── README.md             # This file
```

## 🛢️ Database Schema

### Core Entities
- **User** - User accounts with UUID-based keys
- **Store** - Physical store locations with geospatial data (PostGIS)
- **Product** - Product catalog with barcode tracking
- **Receipt** - Receipt metadata with OCR parsing results
- **ReceiptItem** - Individual items from receipts
- **Category** - Hierarchical product categorization
- **Price** - Historical price tracking per store/product
- **UserScore** - Gamification points system
- **Badges** - Achievement system
- **VerificationLogs** - User contribution tracking

### 🌍 Geospatial Features
- PostGIS extension for location-based queries
- GIST indexes for efficient spatial operations
- Store location mapping with lat/lng coordinates
- Distance-based price comparison queries

## 🚀 Quick Start

### Prerequisites
- Node.js 23+
- pnpm 10+
- PostgreSQL 14+ with PostGIS extension
- Supabase account (for storage)

### 1. Environment Setup

Create `.env` file in the API directory:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=beezly_db

# Supabase (for file storage)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Authentication
JWT_SECRET=your_jwt_secret

# OpenAI (for NLP features)
OPENAI_API_KEY=your_openai_key
```

### 2. Database Setup

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm run migration:run

# Verify migration status
pnpm run migration:show
```

### 3. Development

```bash
# Start in development mode
pnpm run start:dev

# Or from project root
pnpm dev --filter=api
```

The API will be available at `http://localhost:3001` with Swagger docs at `/api-docs`.

## 📋 Available Scripts

### Development
```bash
pnpm run start:dev      # Start with hot reload
pnpm run start:debug    # Start with debugging
pnpm run build          # Build for production
pnpm run start:prod     # Run production build
```

### Database Management
```bash
pnpm run migration:show     # Show migration status
pnpm run migration:run      # Apply pending migrations
pnpm run migration:revert   # Revert last migration
pnpm run migration:generate src/migrations/NameOfMigration  # Generate new migration
pnpm run test:migration     # Run migration test suite
```

### Code Quality
```bash
pnpm run lint           # ESLint with auto-fix
pnpm run type-check     # TypeScript validation
pnpm run format         # Prettier formatting
```

### Testing
```bash
pnpm run test           # Unit tests
pnpm run test:watch     # Unit tests in watch mode
pnpm run test:e2e       # End-to-end tests
pnpm run test:cov       # Test coverage report
```

## 🗄️ Database Migrations

This API uses TypeORM migrations for database schema management:

### Migration Workflow
1. **Make entity changes** in `src/entities/`
2. **Generate migration**: `pnpm run migration:generate src/migrations/DescriptiveName`
3. **Review generated SQL** in the new migration file
4. **Apply migration**: `pnpm run migration:run`
5. **Test migration**: `pnpm run test:migration`

### Migration Files
- **Location**: `src/migrations/`
- **Naming**: `{timestamp}-{DescriptiveName}.ts`
- **Current**: `1752710172007-InitialMigration.ts` (PostGIS setup + all tables)

### PostGIS Integration
The initial migration automatically:
- ✅ Enables PostGIS and UUID-OSSP extensions
- ✅ Creates all entity tables with proper relationships
- ✅ Sets up geospatial indexes for location queries
- ✅ Configures foreign key constraints with UUIDs

## 🔧 Configuration

### TypeORM Configuration
- **Config file**: `src/data-source.ts`
- **CLI integration**: Automatic with `-d` parameter
- **Migration tracking**: PostgreSQL `migrations` table
- **Synchronization**: Disabled (migration-based)

### Supabase Integration
- **Storage buckets**: `receipts/`, `products/`, `users/`
- **File uploads**: Handled via `supabase.client.ts`
- **Public URLs**: Generated for receipt images

## 🚦 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh

### Users
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update profile
- `GET /user/scores` - Get user points/badges

### Stores
- `GET /store` - List stores (with geospatial filtering)
- `POST /store` - Create new store
- `GET /store/:id` - Get store details

### Products
- `GET /product` - Search products
- `POST /product` - Add new product
- `GET /product/:id` - Get product details
- `GET /product/barcode/:code` - Find by barcode

### Receipts
- `POST /receipt/upload` - Upload receipt image
- `GET /receipt` - List user receipts
- `GET /receipt/:id` - Get receipt details
- `PUT /receipt/:id/verify` - Verify receipt data

### Receipt Items
- `GET /receiptItem/:receiptId` - Get items for receipt
- `PUT /receiptItem/:id` - Update item details

## 🧪 Testing

### Migration Testing
```bash
# Run comprehensive migration test
pnpm run test:migration
```

The migration test suite validates:
- ✅ Database connection
- ✅ PostGIS functionality  
- ✅ All tables created (14 tables)
- ✅ Indexes created (22 indexes)
- ✅ Foreign key constraints (13 constraints)
- ✅ Data insertion/querying
- ✅ Geospatial queries with GIST indexes

### Unit & E2E Tests
```bash
# Run all tests with coverage
pnpm run test:cov

# E2E tests with test database
pnpm run test:e2e
```

## 🔍 Debugging

### Database Issues
```bash
# Check migration status
pnpm run migration:show

# Test database connection
pnpm run test:migration

# Check PostGIS version
psql -d beezly_db -c "SELECT postgis_version();"
```

### Development Tools
- **Swagger UI**: `http://localhost:3001/api-docs`
- **Database logs**: Set `logging: true` in DataSource
- **TypeORM queries**: Visible in console during development

## 🚀 Deployment

### Environment Variables
Ensure all production environment variables are set:
- Database connection details
- Supabase credentials
- JWT secrets
- External API keys

### Migration Strategy
```bash
# In production environment
pnpm run migration:run  # Apply pending migrations
pnpm run build         # Build application
pnpm run start:prod    # Start production server
```

### Health Checks
- `GET /health` - Application health status
- Database connectivity validation
- PostGIS extension verification

## 📚 Additional Resources

- **Main Project**: [../../README.md](../../README.md)
- **NestJS Docs**: [https://docs.nestjs.com](https://docs.nestjs.com)
- **TypeORM Docs**: [https://typeorm.io](https://typeorm.io)
- **PostGIS Docs**: [https://postgis.net](https://postgis.net)
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)

## 🐛 Troubleshooting

### Common Issues

**"Missing datasource" error**
```bash
# Ensure you're using the scripts with -d parameter
pnpm run migration:show  # Uses -d src/data-source.ts automatically
```

**PostGIS not found**
```bash
# Install PostGIS extension in PostgreSQL
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Migration conflicts**
```bash
# Check for conflicts
ls src/migrations/
# Ensure migration timestamps are unique
```

**Foreign key errors**
```bash
# Run migration test to validate schema
pnpm run test:migration
```

For more help, check the [main project README](../../README.md) or open an issue.