# Port Configuration

## Default Ports

- **API Server**: `3006` (NestJS)
- **Web App**: `3000` or `3001` (Next.js) 
- **Mobile App**: `8081` (Expo default) or `19000-19002` (Expo dev server)

## CORS Configuration

The API server is configured to accept requests from:

- `http://localhost:3000` - Next.js web app (default)
- `http://localhost:3001` - Next.js web app (alternative)
- `http://localhost:8081` - Expo mobile app 
- `http://localhost:19000` - Expo dev server
- `http://localhost:19001` - Expo dev server (alternative)
- `http://localhost:19002` - Expo web port

## Environment Variables

### API (.env)
```bash
PORT=3006
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8081,http://localhost:19000,http://localhost:19001,http://localhost:19002
```

### Web App (.env.local)
```bash
PORT=3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3006
```

### Mobile App (.env)
```bash
API_BASE_URL=http://localhost:3006
```

## Development Commands

```bash
# Start API server (port 3006)
cd apps/api && pnpm run dev

# Start web app (port 3000 or 3001)  
cd apps/web && pnpm run dev

# Start mobile app (port 8081 or 19000-19002)
cd apps/mobile && pnpm run dev
```