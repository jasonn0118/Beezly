# CI/CD Pipeline Guide

This document outlines the CI/CD pipeline configuration for the Beezly monorepo, including testing, building, and quality assurance workflows.

## Pipeline Overview

Our CI/CD pipeline focuses on **testing and quality assurance** with automated workflows triggered on pull requests and pushes to main branches.

### Pipeline Triggers
- **Pull Requests**: All quality checks run on PRs to `main` and `staging`
- **Branch Pushes**: Pipeline runs on pushes to `main` and `staging` branches
- **Manual**: Can be triggered manually via GitHub Actions

## Pipeline Stages

### 1. Install Dependencies
- **Purpose**: Install and cache project dependencies
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
- **Outputs**: Cached build artifacts for potential deployment

### 5. Security Scanning
- **Dependencies**: Automated vulnerability scanning
- **Reports**: Security audit artifacts uploaded
- **Thresholds**: High-severity vulnerabilities flagged

## Application-Specific Configuration

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

# Dependencies
react-native-web@^0.20.0         # Web compatibility
@expo/metro-runtime@~5.0.4       # Metro bundler runtime
```

## Environment Variables

### Local Development
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
```

### CI/CD Environment
GitHub Actions automatically handles:
- Node.js v23 installation
- pnpm v10 setup
- Dependency caching
- Build artifact caching

## Running Locally

### Prerequisites
- Node.js 23+
- pnpm 10+
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/jasonn0118/Breezly.git
cd beezly

# Install dependencies
pnpm install

# Run development servers
pnpm dev --filter=web        # Web app on :3000
pnpm dev --filter=api        # API on :3001  
pnpm dev --filter=mobile     # Mobile with Expo
```

### Quality Checks
```bash
# Run all quality checks (same as CI)
pnpm run lint                 # Lint all apps
pnpm run build               # Build all apps  
pnpm run test --filter=api   # Run API tests
pnpm run type-check          # TypeScript validation
```

## GitHub Actions Configuration

### Workflow File
- **Location**: `.github/workflows/ci-cd.yml`
- **Node Version**: 23
- **Package Manager**: pnpm v10
- **Caching**: Dependency and build caching enabled

### Key Features
- **Parallel Jobs**: Lint, test, and build run in parallel
- **Smart Caching**: Dependencies and builds cached for speed
- **Error Handling**: Graceful fallbacks for lockfile issues
- **Security**: Automated dependency vulnerability scanning

### Performance Optimizations
- **Turbo Caching**: Monorepo build caching with Turborepo
- **Dependency Caching**: GitHub Actions cache for node_modules
- **Build Caching**: Cached build outputs between runs
- **Lockfile Handling**: Smart fallback for outdated lockfiles

## Troubleshooting

### Common Issues

#### Lockfile Out of Date
```bash
# Solution: Update lockfile locally
pnpm install --no-frozen-lockfile
git add pnpm-lock.yaml
git commit -m "update lockfile"
```

#### TypeScript Compilation Errors
```bash
# Check types locally
pnpm run type-check --filter=web
pnpm run type-check --filter=api  
pnpm run type-check --filter=mobile
```

#### Dependency Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install
```

### CI/CD Debugging
- Check GitHub Actions logs for detailed error messages
- Verify Node.js and pnpm versions match local setup
- Ensure all required dependencies are in package.json

## Future Deployment Integration

When ready to add deployment:

### Suggested Platforms
- **Web**: Vercel, Netlify, AWS Amplify
- **API**: Railway, Render, DigitalOcean App Platform  
- **Mobile**: Expo Application Services (EAS)

### Environment Setup
- Configure GitHub Secrets for deployment keys
- Set up staging and production environments
- Add deployment jobs to workflow after testing stages

### Deployment Commands
```bash
# Web deployment example
vercel --prod

# API deployment example  
railway deploy

# Mobile publishing example
eas submit --platform ios
eas submit --platform android
```

---

## Monitoring & Maintenance

- **Dependencies**: Dependabot configured for weekly updates
- **Security**: Automated vulnerability scanning
- **Performance**: Turbo caching for optimal build times
- **Quality**: Comprehensive linting and testing coverage

For questions or issues with the CI/CD pipeline, check the GitHub Actions logs or open an issue in the repository.