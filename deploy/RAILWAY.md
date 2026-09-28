# Deploying NexusCore to Railway

Railway hosts three pieces: a **PostgreSQL** database, the **API** service (Express + Prisma), and the **Web** service (Next.js). The repository already contains everything Railway needs — `railway.json` for the API and `railway.web.json` for the web tier.

---

## 0. Prerequisites

```bash
# Railway CLI
npm i -g @railway/cli
# or: brew install railway

# GitHub CLI (to create the remote repository)
#  macOS: brew install gh   ·  Debian/Ubuntu: sudo apt-get install gh
gh auth login

railway login      # opens a browser or accepts RAILWAY_TOKEN for CI
```

Both CLIs also work headless with tokens:

```bash
export GH_TOKEN=ghp_xxx            # repo scope
export RAILWAY_TOKEN=xxxxxxxx      # account token from railway.app/account/tokens
```

---

## 1. Push the repository to GitHub

```bash
git init
git add .
git commit -m "feat: NexusCore full-stack analytics dashboard"
gh repo create nexuscore --public --source=. --remote=origin --push
```

---

## 2. Create the Railway project and database

```bash
railway init --name nexuscore          # or: railway link (existing project)
railway add --database postgres        # injects DATABASE_URL into linked services
```

`DATABASE_URL` is now available as a project variable. If the plugin is created in a different environment, promote the variable to the service that needs it:

```bash
railway variables --service nexuscore-api --set DATABASE_URL='${{Postgres.DATABASE_URL}}'
```

---

## 3. Deploy the API

```bash
# Link the repo root to the API service (uses railway.json → apps/api/Dockerfile)
railway service nexuscore-api

railway variables \
  --set NODE_ENV=production \
  --set RUN_MIGRATIONS_ON_BOOT=true \
  --set TRUST_PROXY=true \
  --set JWT_ACCESS_SECRET="$(openssl rand -base64 48)" \
  --set JWT_REFRESH_SECRET="$(openssl rand -base64 48)" \
  --set JWT_ACCESS_TTL=15m \
  --set JWT_REFRESH_TTL=30d \
  --set CORS_ORIGIN="https://<your-web-domain>.up.railway.app"

railway up --service nexuscore-api
```

Notes:

- `PORT` is injected by Railway; the container already reads it.
- `RUN_MIGRATIONS_ON_BOOT=true` makes the container run `prisma migrate deploy` before it starts listening, so schema changes ship with the deploy. It is logged and non-fatal, so a slow database never crash-loops the app.
- The health check at `/api/v1/health/ready` returns 503 until PostgreSQL is reachable, which keeps Railway from routing traffic to a half-started instance.

Seed the demo data once (optional, recommended for a showcase deploy):

```bash
railway run --service nexuscore-api npx prisma db seed
```

---

## 4. Deploy the web tier

```bash
railway service nexuscore-web

railway variables \
  --set NODE_ENV=production \
  --set NEXT_PUBLIC_API_BASE_URL=/api/v1 \
  --set API_PROXY_TARGET="https://<your-api-domain>.up.railway.app" \
  --set NEXT_PUBLIC_APP_NAME=NexusCore

railway up --service nexuscore-web
```

- The browser always talks to `/api/v1` on the web origin; Next.js rewrites that to `API_PROXY_TARGET`. No CORS, no third-party cookies.
- Build args in `railway.web.json` mirror these variables so the image bakes in the correct public base URL.
- After both services are up, set the API's `CORS_ORIGIN` to the final web domain and redeploy the API if you created the web service second.

---

## 5. Verify

```bash
curl https://<api-domain>.up.railway.app/api/v1/health/ready
# {"success":true,"data":{"status":"ready","checks":{"database":"up","process":"up"}}}

curl -I https://<web-domain>.up.railway.app/login
# HTTP/2 200
```

Then open the web URL, sign in with `demo@nexuscore.dev` / `Password123!`, and confirm the dashboard renders live rows from PostgreSQL.

---

## 6. Alternative: single service with Compose-style split

Prefer deploying both tiers from one repository with separate root directories?

| Setting           | API service     | Web service     |
| ----------------- | --------------- | --------------- |
| Root directory    | `/`             | `/`             |
| Config file       | `railway.json`  | `railway.web.json` |
| Dockerfile        | `apps/api/Dockerfile` | `apps/web/Dockerfile` |
| Health check      | `/api/v1/health/ready` | `/login` |
| Public networking | enabled (API domain) | enabled (dashboard domain) |

Railway resolves `dockerfilePath` relative to the repository root, which is why both Dockerfiles expect the **repo root** as their build context.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Invalid production configuration` on boot | Placeholder `JWT_*_SECRET` values | Generate real secrets (`openssl rand -base64 48`) and redeploy |
| `/health/ready` returns 503 | `DATABASE_URL` missing or database still starting | Confirm the Postgres plugin variable is linked to the API service |
| Web shows “Demo data” badge | Browser cannot reach `/api/v1` | Check `API_PROXY_TARGET` points at the API's public domain, then redeploy the web service |
| Login returns 403 from the browser console | `CORS_ORIGIN` does not include the web domain | Update the variable and redeploy; both `https://*.up.railway.app` and sandbox preview origins are also allow-listed by regex |
| Cookies not persisted | `COOKIE_SECURE` true over plain HTTP, or cross-site domain | Serve the web tier over HTTPS and keep `NEXT_PUBLIC_API_BASE_URL=/api/v1` so requests stay first-party |
| Build OOM | 2 GB builder limit | Both Dockerfiles are multi-stage; the web build runs with `NEXT_OUTPUT_STANDALONE=true` to keep the runtime image small |

---

## 8. Rollback

Railway keeps the last N deployments per service:

```bash
railway status
railway redeploy --service nexuscore-api --deployment <deployment-id>
```

Database rollbacks are manual: write a forward migration rather than reverting `prisma/migrations`, since `migrate deploy` is append-only.
