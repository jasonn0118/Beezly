# Deployment Configuration

This document outlines the deployment strategies for each application in the Beezly monorepo.

## Deployment Environments

### Staging Environment
- **Trigger**: Push to `staging` branch
- **Purpose**: Testing and validation before production
- **Apps Deployed**: Web, API, Mobile (Expo staging channel)

### Production Environment
- **Trigger**: Push to `main` branch
- **Purpose**: Live production environment
- **Apps Deployed**: Web, API, Mobile (Expo production channel)

## Application-Specific Deployment

### Web App (Next.js)
- **Build Command**: `pnpm run build --filter=web`
- **Output**: `.next/` directory
- **Suggested Platforms**: 
  - Vercel (recommended for Next.js)
  - Netlify
  - AWS Amplify
  - Custom server with PM2

### API (NestJS)
- **Build Command**: `pnpm run build --filter=api`
- **Output**: `dist/` directory
- **Suggested Platforms**:
  - Railway
  - Render
  - Heroku
  - AWS ECS
  - DigitalOcean App Platform

### Mobile App (React Native/Expo)
- **Build Command**: `expo build` (for native builds)
- **Publishing**: `expo publish` (for OTA updates)
- **Channels**: 
  - Staging: `expo publish --release-channel=staging`
  - Production: `expo publish --release-channel=production`

## Environment Variables

### Required Environment Variables
Create these in your CI/CD environment:

#### Web App
- `NEXT_PUBLIC_API_URL`: API base URL
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

#### API
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

#### Mobile App
- `EXPO_ACCESS_TOKEN`: Expo access token for publishing
- `EXPO_PUBLIC_API_URL`: API base URL

## GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```
# Deployment
STAGING_DEPLOY_KEY
PRODUCTION_DEPLOY_KEY

# Environment Variables
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL
JWT_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
EXPO_ACCESS_TOKEN
EXPO_PUBLIC_API_URL
```

## Deployment Steps

### Automatic Deployment
1. Push to `staging` branch → Deploy to staging
2. Push to `main` branch → Deploy to production
3. All tests must pass before deployment

### Manual Deployment
If you need to deploy manually:

```bash
# Build all apps
pnpm run build

# Deploy web app (example with Vercel)
cd apps/web && vercel --prod

# Deploy API (example with Railway)
cd apps/api && railway deploy

# Deploy mobile app (example with Expo)
cd apps/mobile && expo publish --release-channel=production
```

## Post-Deployment Verification

After each deployment, verify:
- [ ] Web app loads correctly
- [ ] API health check returns 200
- [ ] Mobile app receives OTA update
- [ ] Database migrations completed
- [ ] Environment variables are set correctly
- [ ] External services are accessible

## Rollback Strategy

If deployment fails:
1. Check the GitHub Actions logs
2. Revert the commit if necessary
3. Redeploy the previous working version
4. For mobile apps, publish a rollback update via Expo

## Monitoring

Set up monitoring for:
- Application uptime
- Error rates
- Performance metrics
- Database health
- API response times

Consider using:
- Sentry for error tracking
- Datadog/New Relic for performance monitoring
- UptimeRobot for uptime monitoring