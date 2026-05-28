# ── Stage 1: Build frontend ──────────────────────────────────────
FROM node:22-alpine AS web-builder
WORKDIR /web

COPY web/package.json web/package-lock.json ./
RUN npm install

COPY web/ ./
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install

COPY backend/ ./
RUN npm run build

# ── Stage 3: Runtime ─────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Copy backend compiled output
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules

# Copy entire frontend build (assets + img + html) into /app/public
COPY --from=web-builder /web/dist ./public

COPY backend/package.json ./

EXPOSE 3333
CMD ["node", "dist/server.js"]
