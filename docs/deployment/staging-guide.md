# VRS Staging Deployment Guide

**Status:** configuration prepared, not deployed in this workspace.
**Scope:** staging only. Production deployment is out of scope.

---

## 1. What was prepared

| File | Purpose |
|---|---|
| `docker-compose.staging.yml` | Production-like four-service stack: PostgreSQL 16, one-shot migration job, Express API, nginx-served SPA |
| `apps/api/Dockerfile` | Multi-stage API image; generates the Prisma client and builds TypeScript |
| `apps/web/Dockerfile` | Multi-stage web image; builds Vite output and serves it with nginx |
| `apps/web/nginx.conf` | SPA fallback, `/api` reverse proxy, `/health` endpoint, basic static security headers |
| `.env.staging.example` | Root compose environment template (all values are placeholders) |
| `apps/api/.env.staging.example` | Template for running the API outside compose |
| `.dockerignore` | Keeps `.env*`, `node_modules`, build output and generated Prisma files out of images |
| `apps/api/src/config/env.ts` | Validates staging/production secrets, CORS, rate limits and trust proxy |
| `apps/api/src/app.ts` | Health endpoints, request IDs, structured logging, Helmet, CORS, rate limits |
| `apps/api/src/lib/logger.ts` | JSON logger that redacts secret-like keys and never receives request bodies/headers |
| `apps/api/src/middleware/errorHandler.ts` | Sanitized Zod details and generic 500 responses |

The development database `vrs` is untouched. `vrs_test` is still reset only by the API test `globalSetup`.

---

## 2. Prerequisites on the staging host

- Docker Engine with Compose v2.
- Outbound access to pull `node:20-alpine`, `nginx:1.27-alpine`, and `postgres:16-alpine` images (or a pre-populated image cache).
- A dedicated staging DNS name and TLS termination (nginx in this stack listens on plain HTTP behind your ingress/reverse proxy).
- A password manager or secret store for the generated DB password and JWT secret.

The compose file binds API and web to `127.0.0.1` by default. Use an SSH tunnel or place the host behind a TLS reverse proxy; do not expose the database port publicly. The DB service has no host port mapping.

---

## 3. Configure staging secrets

```bash
cp .env.staging.example .env.staging
```

Replace **every** placeholder in `.env.staging`:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` — host must be `db`; URL-encode special characters in the password
- `CORS_ORIGIN` — the real staging browser origin, e.g. `https://staging.example.edu`
- `JWT_SECRET` — generate with `openssl rand -hex 32` (at least 32 characters)

The API refuses to start in `staging`/`production` when `JWT_SECRET` is short or still contains `change_me`, `replace_with`, or `local_only`, or when `CORS_ORIGIN` is `*`.

`.env.staging` is ignored by `.gitignore`. Never commit it or paste its values into tickets/docs.

---

## 4. Services and ports

| Service | Container | Internal | Host bind (default) | Health check |
|---|---|---|---|---|
| `db` | `vrs-staging-postgres` | `5432` | none | `pg_isready` |
| `migrate` | `vrs-staging-migrate` | — | — | one-shot `prisma migrate deploy` |
| `api` | `vrs-staging-api` | `4000` | `127.0.0.1:4001` | `GET /api/health` |
| `web` | `vrs-staging-web` | `80` | `127.0.0.1:4173` | `GET /health` |

`api` starts only after `migrate` completes successfully. `web` starts only after `api` is healthy.

---

## 5. Deployment procedure (not executed here)

From the staging host checkout:

```bash
# 1. Preflight checks on the source tree
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm format:check

# 2. Build/start the staging stack (includes migrate deploy)
pnpm staging:up

# 3. Inspect service state
pnpm staging:status
pnpm staging:logs
```

The `migrate` service applies only pending migrations with `prisma migrate deploy`. Never use `prisma migrate reset`, `prisma db push`, `docker compose down -v`, or any destructive command against staging or development data. See `docs/deployment/backup-restore-guide.md`.

The initial migration includes PostgreSQL-specific SQL (`btree_gist`, CHECK constraints, audit triggers). On managed PostgreSQL, the database role must be able to create the `btree_gist` extension or it must be preinstalled by the provider.

---

## 6. Staging smoke checks

Once the stack is running on the staging host:

```bash
curl -fsS http://127.0.0.1:4001/api/health
curl -fsS http://127.0.0.1:4001/api/health/live
curl -fsS http://127.0.0.1:4001/api/health/ready
curl -fsS http://127.0.0.1:4173/health
curl -fsS http://127.0.0.1:4173/api/health
```

Expected:

- `/api/health` and `/api/health/live`: `{"status":"ok",...}`
- `/api/health/ready`: `{"status":"ready","database":"connected",...}`
- `/health` on web: `ok`
- proxied `/api/health` through web: same as API health

Then perform a browser smoke test with a staging-only account:

1. Log in with each role (CUSTOMER, STAFF, ADMIN).
2. Customer: catalog search → booking creation.
3. Staff: deposit confirmation → handover → return/invoice.
4. Admin: dashboard, staff, configs, fine rules, reports, audit logs.
5. Confirm a contract PDF download requires authentication.

No staging host or `.env.staging` was configured in this workspace, so these steps were **not executed**. Compose file syntax was validated with `docker compose config --quiet` using dummy values only.

---

## 7. Scheduled tasks review

| Task | Current implementation | Missing for production-like operation |
|---|---|---|
| Pending booking expiration (30 min) | Lazy expiry inside booking creation and admin-triggered `POST /api/bookings/expire-pending`; status becomes `CANCELLED` with `PAYMENT_TIMEOUT` | No background scheduler/cron job |
| Overdue contract scan | `OVERDUE` exists in the enum; late fees are calculated at return from `fine_rules` | No hourly job scans active contracts or updates status to `OVERDUE` |
| Notification scheduling | `Notification` model exists with scheduled/type/channel fields | No scheduler, dispatcher, or delivery integration |

Do not claim these schedulers are running in staging. They remain explicit limitations and should be handled by a later approved phase.

---

## 8. Logging, headers and rate limits

- Structured JSON logs include timestamp, level, service, environment, event, request ID, method, path, status and duration. Request bodies, headers, tokens and passwords are never logged.
- Helmet sets security headers. HSTS is enabled only when `NODE_ENV=staging|production`.
- CORS allows only the explicit `CORS_ORIGIN` list.
- Rate limits are per client IP (with `TRUST_PROXY=1` behind nginx):
  - general API: `RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS`
  - auth routes: `AUTH_RATE_LIMIT_MAX` per the same window
  - exceeded limits return JSON `429 { "error": "Too many requests", "code": "RATE_LIMITED" }`

---

## 9. Stopping and rollback

```bash
pnpm staging:down
```

This stops/removes containers but **keeps the named volume** `vrs_staging_pgdata`. Do not delete the volume unless you intentionally want to destroy staging data.

For data rollback, follow `docs/deployment/backup-restore-guide.md` against the staging database only. Never point restore commands at `vrs` or `vrs_test`.
