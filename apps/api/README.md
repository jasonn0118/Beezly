# Beezly API

The backend API for the Beezly application, built with NestJS and TypeScript.

## Overview

Beezly is a receipt processing and price comparison application that helps users track their purchases and find better deals. This API provides the core services for user management, receipt processing, product tracking, and data storage.

## Services

This API provides several core services:

### 📄 **OCR Service** - Receipt Processing
- **Azure Form Recognizer v4.0** integration for high-accuracy receipt parsing
- **Multiple image formats** support (PNG, JPG, JPEG, BMP, TIFF, WebP, HEIC, HEIF)
- **Asynchronous storage** upload to Supabase for improved performance
- **WebP conversion** for all stored images to optimize loading times
- **HEIC support** with intelligent two-step conversion (HEIC→JPEG→WebP)
- **Financial data extraction** (total, subtotal, tax, line items)
- **Confidence scoring** and fallback text parsing

📖 **[Detailed OCR Documentation](./src/ocr/README.md)**

**Quick Start:**
```bash
# Process a receipt
curl -X POST http://localhost:3001/ocr/process-receipt \
  -F "file=@receipt.jpg"

# Check service health
curl -X POST http://localhost:3001/ocr/health
```

### 🔐 **Auth Service**
- User authentication and authorization
- JWT token management
- Session handling

### 👥 **User Service**
- User profile management
- User data operations

### 🏪 **Store Service**
- Store information management
- Store-related operations

### 📦 **Product Service**
- Product catalog management
- Product data operations

### 🧾 **Receipt Service**
- Receipt data management
- Receipt processing workflows

### 📊 **Category Service**
- Product categorization
- Category management

## Project Setup

```bash
# Install dependencies
$ pnpm install

# Development
$ pnpm run start:dev

# Production
$ pnpm run start:prod
```

## Environment Configuration

Create a `.env` file in the `apps/api` directory with the following variables:

```bash
# Application Environment
NODE_ENV=development
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=beezly_db
DB_SSL=false
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Azure Form Recognizer Configuration
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_FORM_RECOGNIZER_API_KEY=your-azure-api-key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Testing

```bash
# Unit tests
$ pnpm run test

# E2E tests
$ pnpm run test:e2e

# Test coverage
$ pnpm run test:cov
```

## API Documentation

Once the server is running, you can access the Swagger API documentation at:
- **Development**: http://localhost:3001/api
- **Production**: https://your-domain.com/api

## Development

### Database Migrations

```bash
# Generate migration
$ pnpm run migration:generate

# Run migrations
$ pnpm run migration:run

# Revert migration
$ pnpm run migration:revert
```

### Code Quality

```bash
# Lint code
$ pnpm run lint

# Format code
$ pnpm run format
```

## Architecture

The API follows a modular architecture with:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Entities**: Define database models
- **DTOs**: Define data transfer objects
- **Guards**: Handle authentication and authorization
- **Interceptors**: Handle cross-cutting concerns

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run the test suite
5. Submit a pull request

## License

This project is part of the Beezly application.
