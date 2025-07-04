# 🐝 Beezly

Beezly is an AI-powered receipt intelligence platform that helps users compare local prices, track spending, and make smarter offline purchasing decisions.

## 🧱 Monorepo Structure (Turborepo)

```
beezly/
├── apps/
│   ├── web/        # Next.js 15 app (receipt feedback, viral microsite)
│   ├── api/        # NestJS backend API (auth, points, normalization)
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

3. Run dev servers:
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
- [OpenAI](https://openai.com/) (NLP summary)

## 📦 Scripts

```bash
pnpm dev        # Start all dev apps with Turbo
pnpm build      # Build all apps
pnpm lint       # Lint all apps
pnpm test       # Run tests for all apps
pnpm type-check # TypeScript type checking
```

## 🚀 CI/CD & Deployment

This project includes automated CI/CD pipelines for testing and deployment. For detailed deployment instructions and configuration, see:

📋 **[Deployment Guide](.github/workflows/deploy.md)**

**Quick Overview:**
- **Staging**: Auto-deploy on push to `staging` branch
- **Production**: Auto-deploy on push to `main` branch
- **Pipeline**: Lint → Test → Build → Deploy
- **Apps**: Web (Next.js), API (NestJS), Mobile (Expo)

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
