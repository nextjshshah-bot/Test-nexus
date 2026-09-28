# ---------------------------------------------------------------------------
# NexusCore Web — production image (Next.js standalone output)
# Build context must be the REPO ROOT:
#   docker build -f apps/web/Dockerfile \
#     --build-arg API_PROXY_TARGET=http://api:4000 .
# ---------------------------------------------------------------------------

# ----------------------------- Stage 1: deps -------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --ignore-scripts --no-audit --no-fund

# ---------------------------- Stage 2: builder -----------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

ARG API_PROXY_TARGET=http://127.0.0.1:4000
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_APP_NAME=NexusCore

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT_STANDALONE=true \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME} \
    API_PROXY_TARGET=${API_PROXY_TARGET}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN npm run build --workspace @nexuscore/web

# --------------------------- Stage 3: runtime ------------------------------
FROM node:20-alpine AS runner
RUN addgroup -S nexus && adduser -S nexus -G nexus

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nexus:nexus /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nexus:nexus /app/apps/web/.next/static ./apps/web/.next/static

USER nexus
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
