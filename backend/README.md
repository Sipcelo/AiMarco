# AiMarco - Backend

### Purpose
Minimal backend bootstrap for the AiMarco project, focusing on a TypeScript ESM foundation.

### Current Stack
- **Runtime:** Node.js
- **Language:** TypeScript (ESM)
- **Development Runner:** tsx

### Current Files
- `package.json`: Project configuration and scripts.
- `tsconfig.json`: TypeScript compiler settings.
- `.env.example`: Template for environment variables.
- `src/server.ts`: Initial plain Node.js HTTP server.

### Available Routes
- `GET /`: Returns plain text "OK".
- `GET /health`: Returns JSON `{"status":"ok"}`.

### npm Scripts
- `dev`: Runs `tsx watch src/server.ts`.
- `build`: Runs `tsc -p tsconfig.json`.
- `start`: Runs `node dist/server.js`.

### Development Run
1. Copy `.env.example` to `.env` (optional).
2. Run `npm run dev`.
3. Access at `http://localhost:3333`.

### Production Build/Run
1. Run `npm run build`.
2. Run `npm start`.

### Notes
- Supabase integration is planned but not yet implemented.
