# 🐝 Beezly

Beezly is an AI-powered receipt intelligence platform that helps users compare local prices, track spending, and make smarter offline purchasing decisions.

## 🧱 Monorepo Structure (Turborepo)

```
beezly/
├── apps/
│   ├── web/        # Next.js 15 app (receipt feedback, viral microsite)
│   ├── api/        # NestJS backend API (auth, points, normalization) → [API Docs](apps/api/README.md)
│   ├── mobile/     # React Native app via Expo (scanning, profile, leaderboard)
│   └── ai/         # Python FastAPI OCR/NLP engine (not part of Turbo workspace)
├── packages/
│   └── shared/     # Shared types and utilities (TypeScript)
├── turbo.json      # Turbo pipeline config
├── tsconfig.json   # TypeScript path mapping
├── package.json    # Workspace and scripts
```

## 🚀 Getting Started

1. Clone the repo:
```bash
git clone https://github.com/BeezlyAI/Beezly.git
cd beezly
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy example env files and configure
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit the .env files with your database and API credentials
```

4. Set up the database:
```bash
# Run API database migrations
pnpm run migration:run --filter=api
```

5. Run dev servers:
```bash
pnpm dev --filter=web
pnpm dev --filter=api
cd apps/mobile && npx expo start
cd apps/ai && uvicorn app.main:app --port 8000 #Add later
```

## 🧠 Core Technologies

- [Turborepo](https://turbo.build/repo)
- [Next.js](https://nextjs.org/)
- [NestJS](https://nestjs.com/)
- [React Native + Expo](https://expo.dev/)
- [FastAPI + Python](https://fastapi.tiangolo.com/)
- [Supabase](https://supabase.com/) (Auth, storage)
- [PostgreSQL + PostGIS](https://postgis.net/)
- [TypeORM](https://typeorm.io/) (Database ORM with geospatial support)
- [OpenAI](https://openai.com/) (NLP summary)

## 📦 Scripts

```bash
pnpm dev        # Start all dev apps with Turbo
pnpm build      # Build all apps
pnpm lint       # Lint all apps
pnpm test       # Run tests for all apps
pnpm type-check # TypeScript type checking
```

## 🚀 API Documentation

The Beezly API is built with NestJS and provides comprehensive endpoints for receipt processing, price tracking, and user management.

**📖 [Complete API Documentation](apps/api/README.md)**

### Key Features
- **🛢️ PostgreSQL + PostGIS** - Geospatial database with location-based queries
- **🗄️ TypeORM Migrations** - Version-controlled database schema management
- **🔐 JWT Authentication** - Secure user authentication and authorization
- **📱 Receipt Processing** - OCR integration and intelligent parsing
- **🌍 Store Locations** - Geospatial mapping with distance-based price comparison
- **🎯 Product Matching** - Barcode scanning and product normalization
- **🏆 Gamification** - Points, badges, and user scoring system

### Quick API Setup
```bash
# Install dependencies
pnpm install

# Set up database
pnpm run migration:run --filter=api

# Start API server
pnpm dev --filter=api

# Access Swagger docs at http://localhost:3001/api-docs
```

## 🧪 CI/CD Pipeline

This project includes comprehensive automated CI/CD pipelines for testing, building, and quality assurance. All workflows run on pull requests and pushes to main branches.

📋 **[Complete CI/CD Guide](.github/workflows/deploy.md)**

**Pipeline Overview:**
- **🔍 Lint**: Code style and quality checks across all apps
- **🧪 Test**: Unit and integration tests with coverage
- **🏗️ Build**: Production build verification and optimization
- **🛡️ Security**: Automated dependency vulnerability scanning
- **📱 Mobile Deploy**: Automated Expo builds and deployments via EAS
- **⚡ Performance**: Smart caching with Turborepo and GitHub Actions
- **📱 Apps**: Web (Next.js), API (NestJS), Mobile (React Native/Expo)

**Key Features:**
- Node.js 23 + pnpm 10 with smart dependency caching
- Parallel job execution for faster builds
- Automatic lockfile handling and error recovery
- TypeScript validation across all applications

## Commit & Branch Workflow

To keep the codebase stable and enable safe testing, we use a `staging` branch as an integration environment before merging to `main`.

**Workflow:**

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: short description of your change"
   ```
3. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```
4. **Open a Pull Request:**
   - Go to GitHub and open a PR **into `staging`** (not `main`).
   - Wait for code review and CI checks.
5. **Testing:**
   - All new features and fixes are tested on `staging` before merging to `main`.
6. **Merging to main:**
   - After successful testing and review, changes from `staging` are merged into `main`.

> **Note:** Never commit directly to `main` or `staging`. Always use feature branches and PRs.

## 📄 License
