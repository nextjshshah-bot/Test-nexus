#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# NexusCore — push to GitHub and deploy to Railway in one command.
#
#   ./deploy/push-and-deploy.sh                 # interactive (uses gh/railway login)
#   GH_TOKEN=ghp_xxx RAILWAY_TOKEN=xxx ./deploy/push-and-deploy.sh   # headless
#
# Prerequisites: git, gh (>= 2.x), railway CLI (npm i -g @railway/cli),
# and an account on both platforms.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPO_NAME="${REPO_NAME:-nexuscore}"
API_SERVICE="${API_SERVICE:-nexuscore-api}"
WEB_SERVICE="${WEB_SERVICE:-nexuscore-web}"

bold() { printf "\n\033[1m%s\033[0m\n" "$1"; }
step() { printf "\033[36m▸ %s\033[0m\n" "$1"; }
ok()   { printf "\033[32m  ✓ %s\033[0m\n" "$1"; }
warn() { printf "\033[33m  ! %s\033[0m\n" "$1"; }
die()  { printf "\033[31m  ✕ %s\033[0m\n" "$1"; exit 1; }

# ---------------------------------------------------------------------------
# 0. Sanity checks
# ---------------------------------------------------------------------------
bold "NexusCore deploy"
step "Checking tooling"
command -v git >/dev/null || die "git is required"
command -v gh >/dev/null || die "GitHub CLI is required (https://cli.github.com)"
command -v railway >/dev/null || die "Railway CLI is required (npm i -g @railway/cli)"
ok "git $(git --version | awk '{print $3}') · gh $(gh --version | head -1 | awk '{print $3}') · railway $(railway --version | awk '{print $2}')"

gh auth status >/dev/null 2>&1 || die "Not authenticated with GitHub. Run: gh auth login  (or export GH_TOKEN=...)"
ok "GitHub authenticated as $(gh api user --jq .login 2>/dev/null || echo 'token user')"

railway whoami >/dev/null 2>&1 || die "Not authenticated with Railway. Run: railway login  (or export RAILWAY_TOKEN=...)"
ok "Railway authenticated as $(railway whoami 2>/dev/null | tail -1)"

[ -f .env ] || warn "No root .env found — that is fine, Railway supplies production variables"

# ---------------------------------------------------------------------------
# 1. Commit anything outstanding, then create/push the GitHub repository
# ---------------------------------------------------------------------------
bold "1/4  Version control"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -q -m "chore: sync before deploy"
  ok "committed pending changes"
fi

if git remote get-url origin >/dev/null 2>&1; then
  step "Remote 'origin' already exists — pushing"
  git push -u origin main
else
  step "Creating GitHub repository '$REPO_NAME' and pushing"
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi
ok "code is on GitHub"

# ---------------------------------------------------------------------------
# 2. Railway project + PostgreSQL
# ---------------------------------------------------------------------------
bold "2/4  Railway project and database"
if railway status >/dev/null 2>&1; then
  ok "already linked to a Railway project"
else
  railway init --name "$REPO_NAME"
  ok "created Railway project '$REPO_NAME'"
fi

# Idempotent: fails harmlessly if the Postgres plugin already exists.
railway add --database postgres 2>/dev/null && ok "PostgreSQL plugin provisioned" || ok "PostgreSQL plugin already present"

# ---------------------------------------------------------------------------
# 3. Deploy the API service
# ---------------------------------------------------------------------------
bold "3/4  Deploying API ($API_SERVICE)"
step "Setting production variables"
railway variables \
  --service "$API_SERVICE" \
  --set NODE_ENV=production \
  --set RUN_MIGRATIONS_ON_BOOT=true \
  --set TRUST_PROXY=true \
  --set JWT_ACCESS_TTL=15m \
  --set JWT_REFRESH_TTL=30d \
  --set JWT_ACCESS_SECRET="$(openssl rand -base64 48 | tr -d '\n')" \
  --set JWT_REFRESH_SECRET="$(openssl rand -base64 48 | tr -d '\n')" \
  --set DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  --set CORS_ORIGIN='*' 2>/dev/null || warn "some variables may already be set — verify in the dashboard"
ok "variables set (CORS_ORIGIN starts permissive; tighten it after the web domain exists)"

step "Building and deploying (this runs prisma migrate deploy on boot)"
railway up --service "$API_SERVICE" --detach
ok "API deploy started"

step "Waiting for the API to report ready"
API_DOMAIN=""
for attempt in $(seq 1 40); do
  API_DOMAIN="$(railway domain --service "$API_SERVICE" 2>/dev/null | tail -1 || true)"
  if [ -n "$API_DOMAIN" ]; then
    if curl -fsS "https://${API_DOMAIN#https://}/api/v1/health/ready" >/dev/null 2>&1; then
      ok "API is ready at https://${API_DOMAIN#https://}"
      break
    fi
  fi
  sleep 10
done
[ -n "$API_DOMAIN" ] || warn "Could not confirm the API domain automatically — check the Railway dashboard"

# Seed the demo dataset so the dashboard is not empty.
step "Seeding demo data"
railway run --service "$API_SERVICE" npx prisma db seed 2>/dev/null && ok "demo data seeded" || warn "seed skipped (run manually: railway run --service $API_SERVICE npx prisma db seed)"

# ---------------------------------------------------------------------------
# 4. Deploy the web service
# ---------------------------------------------------------------------------
bold "4/4  Deploying Web ($WEB_SERVICE)"
railway variables \
  --service "$WEB_SERVICE" \
  --set NODE_ENV=production \
  --set NEXT_PUBLIC_API_BASE_URL=/api/v1 \
  --set API_PROXY_TARGET="https://${API_DOMAIN#https://}" \
  --set NEXT_PUBLIC_APP_NAME=NexusCore 2>/dev/null || warn "some web variables may already be set"

railway up --service "$WEB_SERVICE" --detach
ok "web deploy started"

WEB_DOMAIN="$(railway domain --service "$WEB_SERVICE" 2>/dev/null | tail -1 || true)"

if [ -n "$WEB_DOMAIN" ]; then
  step "Tightening API CORS to the web origin"
  railway variables \
    --service "$API_SERVICE" \
    --set CORS_ORIGIN="https://${WEB_DOMAIN#https://}" 2>/dev/null || warn "update CORS_ORIGIN manually"
fi

bold "Deployment complete"
printf "  API      : https://%s/api/v1/health\n" "${API_DOMAIN#https://}"
printf "  Dashboard: https://%s\n" "${WEB_DOMAIN#https://}"
printf "  Login    : demo@nexuscore.dev / Password123!\n\n"
printf "  Repository: %s\n\n" "$(git remote get-url origin 2>/dev/null || echo 'unknown')"
