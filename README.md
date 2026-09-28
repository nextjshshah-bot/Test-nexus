# NexusCore

**A production-ready, full-stack SaaS analytics dashboard.**
Next.js (App Router) + React + TypeScript + Tailwind on the front end, Express + Prisma + PostgreSQL on the back end, with JWT authentication, rotating refresh tokens, project CRUD, and SQL-aggregated analytics visualised in dependency-free SVG charts.

```
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────┐
│  Next.js dashboard   │  /api  │   Express REST API   │ Prisma │  PostgreSQL  │
│  React · Tailwind    ├───────►│   JWT · Zod · Helmet ├───────►│   17-alpine  │
│  :3000               │ rewrite│   :4000              │        │   :5432      │
└──────────────────────┘        └──────────────────────┘        └──────────────┘
```

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [API reference](#api-reference)
- [Database](#database)
- [Testing](#testing)
- [Docker](#docker)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Project structure](#project-structure)
- [Scripts](#scripts)

---

## Features

**Authentication**
- Email + password registration and login with bcrypt (12 rounds) hashing.
- Short-lived JWT access tokens (15 min) plus long-lived rotating refresh tokens (30 days) stored hashed in PostgreSQL.
- Refresh-token rotation with replay detection — presenting a used token revokes every session for that user.
- Tokens delivered both in the JSON body (for the `Authorization` header) and as `httpOnly` cookies (for reload recovery).
- Session listing, "revoke all sessions", and forced sign-out on password change.

**Projects CRUD**
- Create, read, update, and delete projects scoped to the authenticated owner.
- Server-side validation with Zod and mirrored client-side validation with server error mapping back onto form fields.
- Unique per-owner slugs, tags, status and priority enums, budget (Prisma `Decimal`), progress, start/due dates.
- Filtering (search across name/description/tags, status, priority), six sortable columns, and pagination.

**Analytics**
- Aggregated overview: revenue, sessions, signups, conversions, conversion rate, churn rate and ARPU with period-over-period deltas.
- Timeseries with automatic bucketing: daily (7d/30d), weekly (90d), monthly (12m).
- Top performers ranked by revenue with sparkline trends and delivery progress.
- Activity audit trail written on every auth and project mutation.
- Insights engine that surfaces automated highlights and warnings.

**Platform**
- Structured JSON logging, request-id correlation, tiered rate limiting, Helmet, CORS allow-listing, graceful shutdown.
- Health endpoints (`/health`, `/health/ready`, `/health/diagnostics`) suitable for Railway probes.
- Docker images for both apps, Docker Compose for the full stack, and GitHub Actions CI (typecheck → migrate → test → build → images).
- Graceful offline demo mode: if the API is unreachable the dashboard renders a bundled dataset and labels itself "Demo data" rather than showing an empty shell.

---

## Tech stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Front end  | Next.js 14 (App Router), React 18, TypeScript 5.7, Tailwind CSS 3 |
| Charts     | Hand-rolled SVG (area, bar, donut, sparkline) — zero chart deps    |
| Back end   | Node.js 20, Express 4, TypeScript                                 |
| Validation | Zod (request schemas), mirrored client-side validators             |
| Auth       | jsonwebtoken (HS256), bcryptjs, httpOnly cookies                   |
| ORM / DB   | Prisma 5, PostgreSQL 17                                            |
| Testing    | Vitest + Supertest                                                 |
| Tooling    | npm workspaces, tsx, ESLint, Prettier, Docker, GitHub Actions      |

---

## Quick start

### Option A — Docker Compose (one command)

```bash
git clone <your-repo-url> nexuscore && cd nexuscore
cp apps/api/.env.example apps/api/.env
docker compose up --build
```

- Dashboard → http://localhost:3000
- API → http://localhost:4000/api/v1

Then seed the demo data inside the API container:

```bash
docker compose exec api npx prisma db seed
```

### Option B — Local Node + a Postgres you already have

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# edit apps/api/.env → DATABASE_URL

# 3. Create the schema and seed demo data
npm run db:generate
npm run db:migrate     # or: npm run db:push
npm run db:seed

# 4. Run both apps
npm run dev            # API :4000 + Web :3000
```

Open http://localhost:3000 and sign in with:

```
email:    demo@nexuscore.dev
password: Password123!
```

That account owns 9 seeded projects with **400 days of daily metrics** (≈3,600 rows) plus a full activity trail, so every chart and table renders meaningful data immediately.

---

## Environment variables

### API (`apps/api/.env`)

| Variable                 | Default        | Notes                                                    |
| ------------------------ | -------------- | -------------------------------------------------------- |
| `NODE_ENV`               | `development`  | `production` enables safety assertions and JSON logging   |
| `PORT`                   | `4000`         | Railway injects its own `PORT`                            |
| `API_PREFIX`             | `/api/v1`      | Mount point for all routes                                |
| `DATABASE_URL`           | —              | `postgresql://user:pass@host:5432/db?schema=public`       |
| `JWT_ACCESS_SECRET`      | dev placeholder| **≥32 chars**, must differ from the refresh secret         |
| `JWT_REFRESH_SECRET`     | dev placeholder| **≥32 chars**, rotate with `openssl rand -base64 48`       |
| `JWT_ACCESS_TTL`         | `15m`          | Access token lifetime                                     |
| `JWT_REFRESH_TTL`        | `30d`          | Refresh token + stored session lifetime                   |
| `CORS_ORIGIN`            | `http://localhost:3000` | Comma-separated allow-list                      |
| `COOKIE_DOMAIN`          | _(empty)_      | Set for cross-subdomain cookies                           |
| `COOKIE_SECURE`          | `true` in prod | Requires HTTPS                                            |
| `RATE_LIMIT_WINDOW_MS`   | `900000`       | 15 minutes                                                |
| `RATE_LIMIT_MAX`         | `300`          | Requests per window per IP                                |
| `AUTH_RATE_LIMIT_MAX`    | `25`           | Stricter bucket on credential endpoints                   |
| `RUN_MIGRATIONS_ON_BOOT` | `false`        | `true` runs `prisma migrate deploy` before listening      |
| `TRUST_PROXY`            | `true` in prod | Needed for correct client IPs behind Railway's proxy      |

### Web (`apps/web/.env`)

| Variable                   | Default                 | Notes                                                                 |
| -------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1`               | Browser-facing base; keep relative so cookies stay first-party        |
| `API_PROXY_TARGET`         | `http://127.0.0.1:4000` | Server-side rewrite target (`http://api:4000` in Compose)             |
| `NEXT_PUBLIC_APP_NAME`     | `NexusCore`             | Branding                                                              |
| `NEXT_PUBLIC_AUTH_MODE`    | `live`                  | Set to `demo` to force the bundled offline dataset                    |

---

## Architecture

### Request flow

1. The browser calls **same-origin** `/api/v1/*`.
2. Next.js rewrites that to the Express API (`API_PROXY_TARGET`), so cookies are first-party and CORS never applies to browser traffic.
3. Express runs: Helmet → CORS allow-list → compression → body parsing → cookie parsing → request-id → rate limit → routes → 404 → centralised error handler.
4. Controllers delegate to services; services own Prisma access and business rules; Zod schemas validate every payload before it reaches a controller.
5. Responses always use the same envelope:

```jsonc
// success
{ "success": true, "data": { /* … */ }, "meta": { /* pagination, when relevant */ } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ /* zod issues */ ] } }
```

### Front-end data flow

- `AuthProvider` restores the session on boot, refreshing the token pair when needed.
- `lib/api-client.ts` centralises `fetch`, injects the bearer token, and transparently retries once after a token refresh (with in-flight de-duplication so ten simultaneous 401s trigger exactly one refresh).
- `lib/hooks.ts` wraps each resource in a hook that falls back to the bundled demo dataset when the API is unreachable.

---

## API reference

Base URL: `/api/v1` · All authenticated routes accept `Authorization: Bearer <accessToken>` **or** the `nexus_access_token` cookie.

### Health

| Method | Path                       | Auth | Description                               |
| ------ | -------------------------- | ---- | ----------------------------------------- |
| GET    | `/health`                  | —    | Liveness + version                        |
| GET    | `/health/ready`            | —    | Readiness incl. PostgreSQL probe (503 if down) |
| GET    | `/health/diagnostics`      | —    | Runtime diagnostics (no secrets)          |
| GET    | `/`                        | —    | API index and route map                   |

### Auth

| Method | Path                      | Auth | Description                                        |
| ------ | ------------------------- | ---- | -------------------------------------------------- |
| POST   | `/auth/register`          | —    | Create account, returns tokens + sets cookies      |
| POST   | `/auth/login`             | —    | Authenticate, returns tokens + sets cookies        |
| POST   | `/auth/refresh`           | —    | Rotate the refresh token (cookie or body)          |
| POST   | `/auth/logout`            | opt  | Revoke the presented refresh token and clear cookies |
| GET    | `/auth/me`                | ✔    | User + account overview (plan, seats, usage, billing) |
| PATCH  | `/auth/me`                | ✔    | Update name, company, job title, avatar            |
| POST   | `/auth/change-password`   | ✔    | Change password, revoke every session              |
| GET    | `/auth/sessions`          | ✔    | List active sessions                               |
| DELETE | `/auth/sessions`          | ✔    | Revoke all sessions                                |
| POST   | `/auth/password-strength` | —    | Score a candidate password                         |

### Projects

| Method | Path                  | Auth | Description                                            |
| ------ | --------------------- | ---- | ------------------------------------------------------ |
| GET    | `/projects`           | ✔    | List with `search`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `pageSize` |
| POST   | `/projects`           | ✔    | Create (auto slug, activity entry)                     |
| GET    | `/projects/stats`     | ✔    | Portfolio aggregates (status/priority/budget/overdue)  |
| GET    | `/projects/:id`       | ✔    | Single project + 30-day metric summary                 |
| PATCH  | `/projects/:id`       | ✔    | Partial update (status changes are logged distinctly)  |
| PUT    | `/projects/:id`       | ✔    | Alias of PATCH                                         |
| DELETE | `/projects/:id`       | ✔    | Delete project and cascade its metrics                 |
| GET    | `/projects/:id/metrics` | ✔  | Per-project timeseries for a range                     |

### Metrics

| Method | Path                   | Auth | Description                                   |
| ------ | ---------------------- | ---- | --------------------------------------------- |
| GET    | `/metrics/overview`    | ✔    | KPIs, deltas, timeseries, breakdowns, insights. `?range=7d\|30d\|90d\|12m` |
| GET    | `/metrics/timeseries`  | ✔    | Bucketed series only                          |
| GET    | `/metrics/activity`    | ✔    | Activity feed (`?limit=` ≤ 50)                |

### Examples

```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@company.com","password":"Password123!"}'

# Login and capture the access token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@nexuscore.dev","password":"Password123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

# Create a project
curl -X POST http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Atlas Checkout Revamp","status":"ACTIVE","priority":"CRITICAL","budget":184000,"progress":72,"tags":["payments","q4"]}'

# Filter, sort, paginate
curl "http://localhost:4000/api/v1/projects?status=ACTIVE&sortBy=budget&sortOrder=desc&page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

# 90-day analytics
curl "http://localhost:4000/api/v1/metrics/overview?range=90d" -H "Authorization: Bearer $TOKEN"
```

---

## Database

**Models:** `User`, `RefreshToken`, `Project`, `DailyMetric`, `ActivityLog`
**Enums:** `Role`, `ProjectStatus`, `Priority`, `ActivityAction`

Key constraints:

- `User.email` unique; `Project @@unique([ownerId, slug])` so slugs are unique per owner, not globally.
- `DailyMetric @@unique([projectId, date])` makes metric ingestion idempotent.
- Deleting a user cascades to their projects, metrics, and sessions. Deleting a project cascades to its metrics and activity rows.

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev (interactive, creates a migration)
npm run db:push       # push schema without a migration (fast prototyping)
npm run db:seed       # seed demo user + 9 projects + 400 days of metrics
npm run db:studio     # Prisma Studio at :5555
npm run db:reset      # drop, re-migrate, re-seed
```

Seeded credentials: **demo@nexuscore.dev / Password123!** (ADMIN) and `maya@nexuscore.dev` (USER). Re-running the seed is idempotent — it clears and recreates only the demo data.

---

## Testing

```bash
npm test                        # both suites
npm run test --workspace @nexuscore/api
```

- `tests/unit.utils.test.ts` — serialisation/decimal rounding, slug generation, pagination clamping, password scoring.
- `tests/api.integration.test.ts` — boots the real Express app with Supertest: index + health probes, 401 handling, structured 404s, Zod validation errors, the full register → login → CRUD → stats → metrics → delete → logout lifecycle against PostgreSQL, and a cross-tenant isolation check (user B cannot read user A's project).

Integration assertions that need PostgreSQL skip themselves automatically when the database is unreachable, so the suite is safe to run anywhere.

---

## Docker

```bash
# Full stack
docker compose up --build

# API image only (build context is the repo ROOT)
docker build -f apps/api/Dockerfile -t nexuscore-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_ACCESS_SECRET=$(openssl rand -base64 48) \
  -e JWT_REFRESH_SECRET=$(openssl rand -base64 48) \
  nexuscore-api

# Web image only (Next.js standalone output)
docker build -f apps/web/Dockerfile --build-arg API_PROXY_TARGET=http://api:4000 -t nexuscore-web .
```

Both images are multi-stage `node:20-alpine`, run as a non-root user, and ship health checks.

---

## Deployment

Full step-by-step instructions live in [`deploy/RAILWAY.md`](deploy/RAILWAY.md). TL;DR:

```bash
# 1. GitHub
gh repo create nexuscore --public --source=. --remote=origin --push

# 2. Railway
npm i -g @railway/cli
railway login
railway init --name nexuscore                       # or: railway link
railway add --database postgres                     # provisions PostgreSQL + DATABASE_URL

# API service (repo-root railway.json)
railway variables \
  --set JWT_ACCESS_SECRET="$(openssl rand -base64 48)" \
  --set JWT_REFRESH_SECRET="$(openssl rand -base64 48)" \
  --set RUN_MIGRATIONS_ON_BOOT=true \
  --set CORS_ORIGIN="https://<web-domain>.up.railway.app"
railway up

# 3. Web service → point API_PROXY_TARGET at the API's Railway domain
railway variables --set API_PROXY_TARGET="https://<api-domain>.up.railway.app" \
  --set NEXT_PUBLIC_API_BASE_URL="/api/v1"
```

Railway configuration files in the repo:

| File               | Service | Notes                                                              |
| ------------------ | ------- | ------------------------------------------------------------------ |
| `railway.json`     | API     | Dockerfile builder, start command, `/api/v1/health/ready` probe     |
| `railway.web.json` | Web     | Dockerfile builder for `apps/web`, `/login` probe                   |

---

## Security notes

- Passwords are hashed with bcrypt at 12 rounds; login compares against a dummy hash when the account is missing to blunt user-enumeration timing.
- Refresh tokens are stored as SHA-256 hashes, so a database leak does not yield live sessions, and rotation detects replay (reuse revokes all sessions).
- Every authenticated request re-reads the user row, so deactivated or deleted accounts lose access immediately instead of at token expiry.
- Helmet is enabled; the API intentionally serves JSON only, so CSP is disabled there while the Next.js layer sets `Referrer-Policy`, `X-Content-Type-Options`, and `Permissions-Policy`.
- Rate limiting is applied globally and more aggressively to credential endpoints; successful logins do not count against the auth bucket.
- `assertProductionSafety()` refuses to boot in production with placeholder JWT secrets, identical secrets, or a non-Postgres `DATABASE_URL`.
- Ownership is enforced in the query layer (`where: { id, ownerId }`), so cross-tenant reads 404 rather than leaking existence.

---

## Project structure

```
nexuscore/
├── apps/
│   ├── api/                     # Express + Prisma REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # 5 models, 4 enums
│   │   │   ├── migrations/      # SQL migration history (deploy with prisma migrate deploy)
│   │   │   └── seed.ts          # demo user, 11 projects, 3,600 metric rows
│   │   ├── src/
│   │   │   ├── config/          # env loader + safety assertions, constants
│   │   │   ├── controllers/     # thin request/response adapters
│   │   │   ├── lib/             # prisma client, logger, jwt, password
│   │   │   ├── middleware/      # auth, validation, security, rate limit, errors
│   │   │   ├── routes/          # health, auth, projects, metrics + aggregator
│   │   │   ├── schemas/         # Zod request schemas
│   │   │   ├── services/        # business logic (auth, project, metrics, activity)
│   │   │   └── utils/           # http-error, pagination, serialise, slug, async-handler
│   │   ├── tests/               # Vitest unit + Supertest integration suites
│   │   └── Dockerfile
│   └── web/                     # Next.js App Router dashboard
│       ├── app/
│       │   ├── page.tsx                 # marketing landing
│       │   ├── login/ · register/       # auth flows
│       │   └── dashboard/               # overview, projects, projects/[id], analytics, settings
│       ├── components/
│       │   ├── auth/ · charts/ · dashboard/ · layout/ · projects/ · ui/
│       └── lib/                # api-client, auth-context, hooks, format, status, demo-data
├── deploy/RAILWAY.md           # Railway runbook
├── .github/workflows/ci.yml    # typecheck → migrate → test → build → docker images
├── docker-compose.yml          # Postgres + API + Web
├── railway.json                # API service config
└── railway.web.json            # Web service config
```

---

## Scripts

| Command                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Run API (`:4000`) and Web (`:3000`) together       |
| `npm run build`        | Build both workspaces for production               |
| `npm start`            | Start both production servers                      |
| `npm run typecheck`    | TypeScript check across both workspaces            |
| `npm test`             | API test suite (Vitest + Supertest)                |
| `npm run db:migrate`   | Create/apply a development migration               |
| `npm run db:seed`      | Seed demo data                                     |
| `npm run db:reset`     | Drop, re-migrate, re-seed                          |
| `npm run setup`        | Install, generate, push schema, seed in one shot   |
| `npm run clean`        | Remove `node_modules`, build output and caches     |

---

## License

MIT — see [LICENSE](LICENSE).
