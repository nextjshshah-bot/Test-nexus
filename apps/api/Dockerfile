# ---------------------------------------------------------------------------
# NexusCore API — production image
# Multi-stage npm-workspaces build. Build context must be the REPO ROOT:
#   docker build -f apps/api/Dockerfile .
# ---------------------------------------------------------------------------

# ----------------------------- Stage 1: deps -------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install the full workspace tree (postinstall hooks are skipped here so the
# Prisma client is generated explicitly in the build stage against the schema).
RUN npm ci --ignore-scripts --no-audit --no-fund

# ---------------------------- Stage 2: build -------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace @nexuscore/api

# Prune dev dependencies but keep the generated Prisma client.
RUN npm prune --omit=dev --workspace @nexuscore/api --no-audit --no-fund || true

# --------------------------- Stage 3: runtime ------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl && addgroup -S nexus && adduser -S nexus -G nexus

ENV NODE_ENV=production \
    PORT=4000 \
    API_PREFIX=/api/v1 \
    RUN_MIGRATIONS_ON_BOOT=true

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json

USER nexus
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
