# Beezly API - Authentication Setup Guide

> 📖 **[← Back to Main README](../README.md)** | **[📚 All Docs](README.md)**

## Overview

This guide covers setting up the Beezly API authentication system using Supabase for JWT-based authentication while maintaining separate PostgreSQL databases for application data across local development and staging environments.

## Prerequisites

1. **Supabase Project**: Create a Supabase project at [supabase.com](https://supabase.com)
2. **API Keys**: Obtain your project's API keys from Supabase Dashboard → Settings → API

## Environment Configuration

### 1. Staging Environment

Update `.env.staging` with your Supabase credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Frontend URL for password reset redirects
FRONTEND_URL=https://your-staging-frontend.com
```

### 2. Local Development

Create `.env.local` with the **same** Supabase credentials as staging:

```bash
# Local PostgreSQL Database (for application data)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=beezly_local
DB_SSL=false

# Shared Supabase Configuration (for authentication)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Local frontend URL for password reset redirects
FRONTEND_URL=http://localhost:3000

# Azure Form Recognizer (for receipt OCR)
AZURE_FORM_RECOGNIZER_ENDPOINT=your-endpoint
AZURE_FORM_RECOGNIZER_KEY=your-key

# OpenAI (for product embeddings)
OPENAI_API_KEY=your-openai-key

# Other local config...
NODE_ENV=development
PORT=3006
```

## Supabase Dashboard Configuration

### 1. Authentication Settings

Navigate to **Authentication → Settings** in your Supabase dashboard:

1. **Site URL**: Set to your frontend URL
2. **Redirect URLs**: Add both staging and local frontend URLs:
   - `https://your-staging-frontend.com/**`
   - `http://localhost:3000/**`

### 2. Row Level Security (RLS)

If you plan to use Supabase database for application data, ensure RLS is properly configured:

```sql
-- Example RLS policy for user data
CREATE POLICY "Users can access own data" 
ON user_profiles 
FOR ALL 
USING (auth.uid() = id);

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### 3. Email Templates (Optional)

Customize email templates in **Authentication → Templates**:
- **Confirm signup**
- **Reset password**
- **Magic link**

## API Endpoints

### Public Endpoints (No Authentication Required)

- `GET /` - Health check
- `GET /categories` - Get product categories
- `POST /auth/signin` - User sign in
- `POST /auth/signup` - User registration  
- `POST /auth/reset-password` - Password reset request

### Protected Endpoints (JWT Token Required)

#### Authentication
- `GET /auth/me` - Get current user profile
- `POST /auth/signout` - Sign out user
- `PUT /auth/profile` - Update user profile
- `PUT /auth/password` - Change password

#### Receipt Processing
- `POST /ocr/process-receipt-enhanced` - Process receipt with enhanced OCR and product matching
- `GET /products/receipt/confirmation-candidates` - Get products requiring confirmation
- `POST /products/receipt/process-confirmations` - Process user confirmations
- `GET /products/receipt/:receiptId/pending-selections` - Get products requiring selection
- `POST /products/receipt/process-selections` - Process user selections

#### Product Management
- `GET /products/search` - Search products with embedding similarity
- `POST /products/embeddings/update` - Update product embeddings (batch)
- `GET /products/embeddings/stats` - Get embedding statistics

#### Barcode & Product Lookup
- `GET /barcode/:barcode` - Get product by barcode
- `POST /barcode/:barcode/price` - Add price for barcode product

### Admin-Only Endpoints (Admin Role + JWT Required)

- `GET /auth/users` - List all users (paginated)
- `GET /auth/users/:userId` - Get user by ID
- `PUT /auth/users/:userId` - Update user metadata
- `DELETE /auth/users/:userId` - Delete user

## Authentication Flow

### 1. User Registration

```bash
curl -X POST http://localhost:3006/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. User Sign In

```bash
curl -X POST http://localhost:3006/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

Response includes JWT token:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pointBalance": 0,
    "level": null,
    "rank": null,
    "badges": [],
    "createdAt": "2025-01-31T...",
    "updatedAt": "2025-01-31T..."
  },
  "expiresIn": 3600
}
```

### 3. Authenticated Requests

Include the JWT token in the Authorization header:

```bash
curl -X GET http://localhost:3006/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Testing Authentication

### 1. Test Public Endpoints

```bash
# Health check (should work)
curl http://localhost:3006/

# Categories (should work)
curl http://localhost:3006/categories
```

### 2. Test Protected Endpoints

```bash
# Without token (should return 401)
curl http://localhost:3006/auth/me

# With valid token (should return user data)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3006/auth/me
```

### 3. Test Admin Endpoints

First, update a user's metadata to admin level in Supabase dashboard or via admin API:

```bash
# List users (admin only)
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" http://localhost:3006/auth/users
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized on all endpoints**
   - Check SUPABASE_URL and SUPABASE_ANON_KEY in environment
   - Verify JWT token is not expired
   - Ensure Authorization header format: `Bearer <token>`

2. **Admin endpoints return 403 Forbidden**
   - User needs `level: "admin"` in user_metadata
   - Update via Supabase dashboard or admin API

3. **Password reset emails not sent**
   - Check FRONTEND_URL environment variable
   - Verify redirect URLs in Supabase dashboard
   - Check email settings in Supabase Authentication

4. **CORS issues**
   - Add frontend domain to Supabase dashboard CORS settings
   - Verify Site URL in Authentication settings

### Debugging

Enable debug logging by setting:

```bash
# In .env.local or .env.staging
LOG_LEVEL=debug
```

Check application logs for detailed authentication flow information.

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` or `.env.staging` files
2. **Service Role Key**: Only use for server-side operations, never expose to frontend
3. **JWT Expiration**: Tokens expire after 1 hour by default
4. **Rate Limiting**: Consider implementing rate limiting for auth endpoints
5. **HTTPS**: Always use HTTPS in production for JWT token security

## Production Deployment

For production:

1. Create separate Supabase project for production
2. Update environment variables with production Supabase credentials
3. Configure proper redirect URLs for production frontend
4. Set up monitoring and alerting for authentication failures
5. Enable audit logging in Supabase dashboard