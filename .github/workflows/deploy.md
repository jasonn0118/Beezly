# CI/CD Pipeline & Deployment Guide

A comprehensive guide for setting up and using the Beezly CI/CD pipeline with automated testing, building, and deployment.

## 🚀 Quick Start

### 1. First Time Setup
```bash
# Clone and install
git clone https://github.com/jasonn0118/Beezly.git
cd beezly
pnpm install

# Set up environment variables (see Environment Setup section)
cp .env.example .env
# Edit .env with your values

# Run quality checks locally
pnpm run lint
pnpm run build
pnpm run test --filter=api
```

### 2. Configure GitHub Secrets
- Add `DISCORD_WEBHOOK_URL` for notifications
- Add `EXPO_TOKEN` for mobile deployments
- See detailed setup in [GitHub Secrets Configuration](#github-secrets-configuration)

### 3. Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and test locally
pnpm dev --filter=web
pnpm dev --filter=api
pnpm dev --filter=mobile

# Run same checks as CI
pnpm run lint
pnpm run build
pnpm run test --filter=api

# Push and create PR to staging
git push origin feature/your-feature
# Open PR to staging branch on GitHub
```

## 📋 Pipeline Overview

### How It Works
Our CI/CD pipeline automatically runs on:
- **Pull Requests**: All quality checks run on PRs to `main` and `staging`
- **Branch Pushes**: Full pipeline runs on pushes to `main` and `staging`
- **Staging Branch**: Triggers Expo preview builds
- **Main Branch**: Triggers Expo production builds and deployment

### Pipeline Flow
```mermaid
graph LR
    A[Code Push] --> B[Install Dependencies]
    B --> C[Lint & Quality]
    B --> D[Run Tests]
    B --> E[Build Apps]
    B --> F[Security Scan]
    
    C --> G[Mobile: Expo Build]
    D --> G
    E --> G
    F --> G
    
    G --> H[Deploy to Expo]
    H --> I[Discord Notification]
```

### What Gets Checked
- **🔍 Linting**: Code style and quality across all apps
- **🧪 Testing**: Unit and integration tests with coverage
- **🏗️ Building**: Production build verification
- **🛡️ Security**: Dependency vulnerability scanning
- **📱 Mobile**: Expo builds and deployments
- **⚡ Performance**: Optimized with caching and parallel execution

## 🛠️ Environment Setup

### Prerequisites
- Node.js 23+
- pnpm 10+
- Git
- Expo CLI (for mobile development)

### Local Development Environment
Create a `.env` file in project root:

```bash
# Web App (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API (NestJS) 
DATABASE_URL=postgresql://user:password@localhost:5432/beezly
JWT_SECRET=your_jwt_secret_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Mobile App (Expo)
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PROJECT_ID=523ce246-775f-4d34-97d0-4c5b7f375946
```

### Development Commands
```bash
# Start all development servers
pnpm dev --filter=web        # Web app on :3000
pnpm dev --filter=api        # API on :3001  
pnpm dev --filter=mobile     # Mobile with Expo

# Quality checks (same as CI)
pnpm run lint                # Lint all apps
pnpm run build               # Build all apps  
pnpm run test --filter=api   # Run API tests
pnpm run type-check          # TypeScript validation
```

## 🔧 GitHub Secrets Configuration

### Required Secrets
Go to Repository Settings → Secrets and variables → Actions, then add:

#### 1. Discord Notifications
```
Secret Name: DISCORD_WEBHOOK_URL
Purpose: Build status and repository activity notifications
```

**Setup Steps:**
1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Click "New Webhook" and configure channel
4. Copy the webhook URL and add as GitHub secret

#### 2. Expo Mobile Deployment
```
Secret Name: EXPO_TOKEN
Purpose: Mobile app building and publishing (Required)
```

**Setup Steps:**
1. Go to https://expo.dev/accounts/jasonn_0118/settings/access-tokens
2. Click "Create Token"
3. Name it "GitHub Actions CI/CD"
4. Select permissions: `read:project`, `write:project`, `read:user`
5. Copy token and add as GitHub secret

#### 3. Future Deployment Keys
```
VERCEL_TOKEN        # For web app deployment
RAILWAY_TOKEN       # For API deployment
```

## 📱 Mobile Deployment with Expo

### Automated Deployment Flow
- **Staging**: Push to `staging` → EAS preview build
- **Production**: Push to `main` → EAS production build + deployment
- **Manual**: Use EAS CLI for local testing

### EAS Build Profiles
| Profile | Purpose | Distribution | Trigger |
|---------|---------|--------------|---------|
| Development | Local testing | Internal | Manual |
| Preview | Staging environment | Internal | Push to `staging` |
| Production | App store release | App stores | Push to `main` |

### Manual Deployment Commands
```bash
# Install EAS CLI
npm install -g eas-cli

# Build for different environments
eas build --profile development
eas build --profile preview  
eas build --profile production

# Publish updates
eas update --branch production --message "Update message"

# Submit to app stores
eas submit --platform ios
eas submit --platform android

# Check build status
eas build:list
```

## 🏗️ Pipeline Stages Deep Dive

### 1. Install Dependencies
- **Tools**: pnpm v10 with Node.js v23
- **Caching**: Smart dependency caching for faster builds
- **Fallback**: Automatic lockfile handling for compatibility

### 2. Linting & Code Quality
- **Web App**: Next.js ESLint rules
- **API**: TypeScript ESLint with NestJS best practices  
- **Mobile**: TypeScript compilation checking
- **Performance**: Runs in parallel for all apps

### 3. Testing
- **API Tests**: Jest unit tests and e2e tests
- **Type Checking**: TypeScript validation across all apps
- **Coverage**: Test coverage reporting (API)

### 4. Building
- **Web App**: Next.js production build with optimization
- **API**: NestJS compilation and bundling
- **Mobile**: TypeScript compilation validation
- **Outputs**: Cached build artifacts

### 5. Security Scanning
- **Dependencies**: Automated vulnerability scanning
- **Reports**: Security audit artifacts uploaded
- **Thresholds**: High-severity vulnerabilities flagged

### 6. Mobile Build & Deploy (Expo)
- **EAS Builds**: Automated builds for staging and production
- **Updates**: OTA updates published to production
- **Platforms**: iOS and Android builds

### 7. Notifications
- **Discord**: Real-time build status and repository activity
- **Rich Format**: Includes commit info, author, and direct links

## 🎯 Application-Specific Configuration

### Web App (Next.js)
```bash
# Commands
pnpm run lint --filter=web      # ESLint checking
pnpm run build --filter=web     # Production build
pnpm run type-check --filter=web # TypeScript validation

# Outputs
apps/web/.next/                  # Build output
apps/web/out/                    # Static export (if configured)
```

### API (NestJS)
```bash
# Commands  
pnpm run lint --filter=api       # ESLint with TypeScript
pnpm run build --filter=api      # NestJS compilation
pnpm run test --filter=api       # Jest unit tests
pnpm run test:e2e --filter=api   # End-to-end tests

# Outputs
apps/api/dist/                   # Compiled JavaScript
apps/api/coverage/               # Test coverage reports
```

### Mobile App (React Native/Expo)
```bash
# Commands
pnpm run lint --filter=mobile    # TypeScript checking
pnpm run build --filter=mobile   # TypeScript validation
pnpm run type-check --filter=mobile # Type checking

# Key Dependencies
react-native-web@^0.20.0         # Web compatibility
@expo/metro-runtime@~5.0.4       # Metro bundler runtime
expo@~53.0.19                    # Expo SDK
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Lockfile Out of Date
```bash
# Local solution
pnpm install --no-frozen-lockfile
git add pnpm-lock.yaml
git commit -m "update lockfile"
```

#### 2. TypeScript Compilation Errors
```bash
# Check types locally
pnpm run type-check --filter=web
pnpm run type-check --filter=api  
pnpm run type-check --filter=mobile
```

#### 3. Dependency Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install
```

#### 4. Expo Build Failures
- Check build logs in Expo dashboard
- Verify `EXPO_TOKEN` permissions
- Ensure app.config.js is properly configured
- Check EAS build limits and quotas

#### 5. CI/CD Pipeline Issues
- Check GitHub Actions logs for detailed error messages
- Verify Node.js and pnpm versions match local setup
- Ensure all required secrets are configured
- Check if GitHub Actions limits are reached

### Debug Commands
```bash
# Local debugging
pnpm install --verbose
pnpm run build --verbose
eas build --platform ios --profile development

# Check pipeline status
gh workflow list
gh run list
```

## 🔧 Technical Configuration

### Workflow Files
- **Main CI/CD**: `.github/workflows/ci-cd.yml`
- **Discord Notifications**: `.github/workflows/discord-notifications.yml`
- **Install Script**: `.github/workflows/install-deps.sh`

### Performance Optimizations
- **Turbo Caching**: Monorepo build caching with Turborepo
- **Dependency Caching**: GitHub Actions cache for node_modules
- **Build Caching**: Cached build outputs between runs
- **Parallel Jobs**: Lint, test, and build run simultaneously
- **Smart Fallbacks**: Graceful handling of cache misses

### Key Features
- **Node Version**: 23
- **Package Manager**: pnpm v10
- **Caching**: Multi-layer caching strategy
- **Error Handling**: Graceful fallbacks for common issues
- **Security**: Automated vulnerability scanning
- **Notifications**: Real-time Discord integration

## 📊 Monitoring & Maintenance

### What's Monitored
- **Dependencies**: Dependabot configured for weekly updates
- **Security**: Automated vulnerability scanning with reports
- **Performance**: Build times and cache hit rates
- **Quality**: Comprehensive linting and testing coverage
- **Deployments**: Expo build success/failure rates

### Maintenance Tasks
- Review and merge Dependabot PRs weekly
- Monitor security audit reports
- Update Node.js and pnpm versions quarterly
- Review and optimize cache strategies
- Update EAS build profiles as needed

---

## 🤝 Getting Help

For questions or issues:
1. Check GitHub Actions logs for detailed error messages
2. Review this guide for common troubleshooting steps
3. Check Expo dashboard for mobile build issues
4. Open an issue in the repository with relevant logs

**Quick Links:**
- [GitHub Actions](https://github.com/jasonn0118/Beezly/actions)
- [Expo Dashboard](https://expo.dev/accounts/jasonn_0118/projects/beezly)
- [Discord Notifications Setup](https://discord.com/developers/docs/resources/webhook)