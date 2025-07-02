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
git clone https://github.com/your-org/beezly.git
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
```

## 📄 License
Updated here
