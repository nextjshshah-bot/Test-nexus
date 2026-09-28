#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# NexusCore — one-shot local bootstrap
#   ./scripts/bootstrap.sh
# Installs dependencies, prepares the database, applies migrations, seeds demo
# data, and reports how to start the stack.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
step() { printf "\n\033[36m▸ %s\033[0m\n" "$1"; }
ok()   { printf "\033[32m  ✓ %s\033[0m\n" "$1"; }
warn() { printf "\033[33m  ! %s\033[0m\n" "$1"; }

bold "NexusCore bootstrap"

step "Checking toolchain"
command -v node >/dev/null || { echo "Node.js 20+ is required."; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node.js 20+ is required (found $(node -v))."; exit 1; }
ok "node $(node -v) · npm $(npm -v)"

step "Preparing environment files"
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  ok "created apps/api/.env (review DATABASE_URL before running)"
else
  warn "apps/api/.env already exists — left untouched"
fi

if [ ! -f apps/web/.env ]; then
  cp apps/web/.env.example apps/web/.env
  ok "created apps/web/.env"
else
  warn "apps/web/.env already exists — left untouched"
fi

step "Installing workspace dependencies"
npm install --no-audit --no-fund
ok "dependencies installed"

step "Generating Prisma client"
npx prisma generate --schema apps/api/prisma/schema.prisma
ok "client generated"

step "Applying database migrations"
if npx prisma migrate deploy --schema apps/api/prisma/schema.prisma; then
  ok "migrations applied"
else
  warn "migrate deploy failed — is DATABASE_URL reachable? Falling back to db push"
  npx prisma db push --schema apps/api/prisma/schema.prisma --accept-data-loss
fi

step "Seeding demo data"
npx tsx apps/api/prisma/seed.ts || warn "seed failed — the app still runs, dashboards just start empty"

bold "\nReady. Start the stack with:"
printf "  npm run dev        # API :4000 + Web :3000\n"
printf "  npm test           # API test suite\n\n"
printf "Demo login: demo@nexuscore.dev / Password123!\n\n"
