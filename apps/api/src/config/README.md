# Configuration Services

> 📖 **[← Back to Main README](../../README.md)** | **[📚 All Docs](../../docs/README.md)**

## Overview

This directory contains **TypeScript configuration services** that manage environment variables, database connections, and service initialization for the Beezly API.

> 📖 **For setup instructions**: See [Authentication Guide](../../../docs/AUTHENTICATION.md) and [Database Guide](../../../docs/DATABASE.md)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│  Local Dev      │    │   Staging       │
│                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │
│  │ API App   │  │    │  │ API App   │  │
│  └───────────┘  │    │  └───────────┘  │
│        │        │    │        │        │
│        ▼        │    │        ▼        │
│  ┌───────────┐  │    │  ┌───────────┐  │
│  │Local PG   │  │    │  │Supabase   │  │
│  │Database   │  │    │  │PostgreSQL │  │
│  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                     │
                     ▼
         ┌─────────────────────┐
         │ Shared Supabase     │
         │ Auth Instance       │
         │                     │
         │ • JWT tokens        │
         │ • User management   │
         │ • Authentication    │
         └─────────────────────┘
```

## Environment Configuration

### Local Development (.env.local)
```bash
# Local PostgreSQL for application data
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=beezly_local
DB_SSL=false

# Shared Supabase for authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Azure Form Recognizer (for receipt OCR)
AZURE_FORM_RECOGNIZER_ENDPOINT=your-endpoint
AZURE_FORM_RECOGNIZER_KEY=your-key

# OpenAI (for embeddings)
OPENAI_API_KEY=your-openai-key

# Optional
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3006
```

### Staging (.env.staging)
```bash
# Supabase PostgreSQL for application data
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-db-password
DB_NAME=postgres
DB_SSL=true

# Same Supabase instance for authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Production services
AZURE_FORM_RECOGNIZER_ENDPOINT=your-production-endpoint
AZURE_FORM_RECOGNIZER_KEY=your-production-key
OPENAI_API_KEY=your-production-openai-key
FRONTEND_URL=https://your-staging-frontend.com
```

## Configuration Services

## Service Files

### `auth.config.ts` - AuthConfigService
- **Purpose**: Validates and loads Supabase authentication configuration
- **Features**: Type-safe environment validation, secure logging, URL format checking
- **Usage**: Injected into auth modules for Supabase client initialization

### `data-source.config.ts` - DataSourceConfig  
- **Purpose**: Configures TypeORM DataSource for PostgreSQL connections
- **Features**: Environment-aware database switching, migration support, SSL handling
- **Usage**: Main database configuration for the application

### `config.module.ts` - ConfigModule
- **Purpose**: NestJS module that registers all configuration services  
- **Features**: Global configuration provider, dependency injection setup
- **Usage**: Imported in AppModule to make configs available throughout the app

## Implementation Details

### Type Safety
All configuration services use TypeScript interfaces and validation:

```typescript
interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}
```

### Environment Validation
Services validate required environment variables at startup:

```typescript
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required');
}
```

### Dependency Injection
Configuration services are registered globally and can be injected anywhere:

```typescript
@Injectable()
export class AuthService {
  constructor(private authConfig: AuthConfigService) {}
}
```

## Architecture Benefits

- **🔒 Type Safety**: All configurations are strongly typed
- **✅ Validation**: Environment variables validated at startup  
- **🔄 Reusability**: Services can be injected throughout the application
- **🛡️ Security**: Sensitive data handling with secure logging
- **🌍 Environment Aware**: Automatic switching between local/staging/production