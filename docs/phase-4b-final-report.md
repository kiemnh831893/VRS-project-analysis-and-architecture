# Phase 4B — Staging Deployment Preparation Report

**Date:** 2026-11-24
**Phase:** Phase 4b — staging deployment preparation only
**Production deployment:** Not performed
**Development database (`vrs`):** Not reset, deleted, or modified

---

## 1. Executive summary

Phase 4b is complete as a preparation phase.

- A production-like staging stack was prepared with Docker Compose: PostgreSQL 16, one-shot migration job, Express API, and nginx-served React SPA.
- Separate staging environment templates were added; no real `.env.staging` was created or committed.
- Staging-specific validation was added for JWT secrets, CORS, trust proxy, rate limits, structured logging, error sanitization, liveness/readiness health checks and HTTP security headers.
- Security review found no new confirmed authorization bypasses. Phase 4a ownership checks and account-status checks remain intact.
- Migration deployment was verified against a throwaway database: `prisma migrate deploy` applied the one migration and status reported up to date. The temporary database was removed.
- Backup/restore was verified locally: `pg_dump` → temporary database `pg_restore` produced matching table/user counts (27 tables, 3 users). The temporary database and dump file were removed.
- Scheduled tasks were reviewed honestly: pending-booking expiry has lazy/manual triggers only; overdue scanning and notification delivery are not implemented.
- All checks pass. Phase 4a results are preserved; Phase 4b added 4 API tests.

**Verdict:** The repository is **ready for staging deployment** once real staging secrets/DNS/TLS are configured on a staging host. It is **not ready for production** and no staging deployment or smoke test was executed in this workspace.

---

## 2. Files created or changed

### Created — deployment configuration

| File | Purpose |
|---|---|
| `docker-compose.staging.yml` | Four-service staging stack with health checks, loopback binds and migration-before-api dependency |
| `apps/api/Dockerfile` | Multi-stage API image with Prisma client generation and TypeScript build |
| `apps/web/Dockerfile` | Multi-stage Vite build served by nginx |
| `apps/web/nginx.conf` | SPA fallback, `/api` proxy, `/health`, static security headers |
| `.dockerignore` | Excludes `.env*`, `node_modules`, build output and generated Prisma files from images |
| `.env.staging.example` | Root staging env template; placeholders only |
| `apps/api/.env.staging.example` | API-outside-compose env template; placeholders only |

### Created — documentation

- `docs/deployment/staging-guide.md`
- `docs/deployment/environment-variables.md`
- `docs/deployment/backup-restore-guide.md`
- `docs/phase-4b-final-report.md`

### Changed — application code

| File | Change |
|---|---|
| `apps/api/src/config/env.ts` | Validates staging/production JWT secret and CORS; adds trust proxy and rate-limit settings |
| `apps/api/src/app.ts` | Adds liveness/readiness health endpoints, request IDs, structured access logs, Helmet config, CORS array, general/auth rate limits |
| `apps/api/src/lib/logger.ts` | New JSON logger with secret-key redaction; never logs request bodies/headers |
| `apps/api/src/middleware/errorHandler.ts` | Sanitizes Zod details so submitted passwords/tokens are not echoed; logs only safe fields |
| `apps/api/src/server.ts` | Uses structured logs, graceful Prisma disconnect, uncaught exception/rejection logging |
| `apps/api/tests/setup.ts` | Raises test rate limits to keep existing tests deterministic |
| `apps/api/tests/staging.test.ts` | New tests for health checks, security headers, request IDs, rate-limit headers and password redaction |
| `package.json` | Adds `db:migrate:deploy`, `staging:up`, `staging:down`, `staging:status`, `staging:logs` |
| `apps/api/package.json` | Adds `prisma:migrate:deploy`, `prisma:migrate:status`, `express-rate-limit` |
| `.gitignore` | Adds `backups/` so DB dumps cannot be committed accidentally |

Phase 4a documents and tests were not modified.

---

## 3. Staging configuration status

| Item | Status | Evidence |
|---|---|---|
| Production-like Docker stack | Prepared | `docker-compose.staging.yml`; compose config validated with `docker compose config --quiet` using a dummy env file outside the repo |
| Separate staging env vars | Prepared | `.env.staging.example`, `apps/api/.env.staging.example`; no real `.env.staging` exists in the workspace |
| PostgreSQL 16 connection | Prepared | `DATABASE_URL` from staging env; DB service uses `postgres:16-alpine`; no DB host port exposed |
| Migration before API start | Prepared | `migrate` service runs `prisma migrate deploy`; `api` depends on `service_completed_successfully` |
| Secure JWT handling | Prepared | Required secret; >=32 chars and placeholder rejection in staging/production |
| CORS | Prepared | Explicit comma-separated origins; `*` rejected in staging/production |
| API health checks | Implemented | `/api/health`, `/api/health/live`, `/api/health/ready` (DB connectivity) |
| Web health check | Prepared | `GET /health` in `apps/web/nginx.conf` |
| Logging | Implemented | Structured JSON logs, request IDs, redaction, no bodies/headers/tokens |
| Error handling | Implemented | Generic 500 response; sanitized validation details |
| HTTP security headers | Implemented | Helmet + no-referrer; HSTS only for staging/production |
| API rate limiting | Implemented | General + stricter auth limiter; JSON 429 response |
| Docker image build | Not completed | Image build was not finished in this workspace |
| Staging deployment | Not performed | No staging host, DNS, TLS or `.env.staging` was configured |
| Staging smoke test | Not performed | Exact curl/browser steps documented in staging guide |

---

## 4. Security review results

### Secrets

- `.gitignore` covers `.env`, `.env.*` and `backups/`; only `*.example` templates are allowed.
- `.dockerignore` excludes `.env*` from Docker build contexts.
- No real `.env.staging` was created. Example values are obvious placeholders.
- No bank/payment credentials or real payment integrations were added.
- API fails fast on placeholder/short JWT secrets in staging/production.

### Passwords and tokens in logs

- Access logs contain only request ID, method, path, status and duration.
- Logger redacts secret-like keys and error objects are reduced to `name`/`message`.
- Zod validation errors no longer return `received` values, so a submitted password cannot be echoed in a 400 response.
- New automated test asserts a submitted password is absent from validation output.

### Authentication and authorization

- JWT verification plus live DB `accountStatus` check remains in `authenticate`.
- Role guards remain on admin/staff/customer routes.
- Phase 4a ownership checks for bookings, contracts, invoices and PDF downloads remain intact.
- Phase 4a security suite (token tampering, locked-token reuse, cross-customer isolation, sensitive-field exposure) still passes.

### HTTP headers and rate limits

- Helmet supplies CSP, frameguard, no-sniff and cross-origin headers.
- HSTS enabled only for `staging`/`production`.
- Rate limits are per client IP with `TRUST_PROXY=1` behind nginx; auth routes have a stricter limit.
- New tests verify headers and rate-limit advertisement.

### File/document access

- No file upload endpoint exists; license image keys are DB fields only.
- `storage/` and `backups/` are gitignored.
- PDFs are generated on demand and stored only as metadata rows plus SHA-256/size/version in `contract_documents`.
- Download requires authentication and contract/customer ownership checks (verified in Phase 4a with a real HTTP 200 PDF response and ownership tests).

No new confirmed security bug was found in Phase 4b.

---

## 5. Database migration and backup readiness

### Migration deployment

- Procedure: `prisma migrate deploy` only.
- Verified on a throwaway database `vrs_migrate_check_*`: migration `20261123181556_init_phase1_schema` applied successfully and `prisma migrate status` reported up to date.
- The throwaway database was dropped immediately afterward.
- The development database `vrs` was not touched by this test.
- Destructive commands (`migrate reset`, `db push`, `down -v`) are explicitly forbidden in staging docs.

### Backup/restore

- Verified locally with `pg_dump -Fc` of `vrs` into a temporary dump, restore into a throwaway database, and count comparison: **27 tables and 3 users in both**.
- Throwaway database and dump file were removed.
- This proves the command sequence works in the local Docker PostgreSQL container. It does **not** prove a managed/staging provider backup works; that must be re-tested on the staging host.
- No backup scheduler is implemented. Infrastructure-level scheduling is required.
- See `docs/deployment/backup-restore-guide.md`.

---

## 6. Scheduled tasks review

| Task | Implemented | Missing |
|---|---|---|
| Pending booking expiry | Lazy expiry during booking creation; admin-triggered `POST /api/bookings/expire-pending`; `CANCELLED` + `PAYMENT_TIMEOUT` | Background cron/scheduler |
| Overdue contract scan | `OVERDUE` enum exists; late fees calculated at return from `fine_rules` | Hourly scan/status update job |
| Notification scheduling | `Notification` model and enums exist | Dispatcher, delivery channels, scheduler |

No scheduler was invented or claimed as running.

---

## 7. Test and check results

Phase 4a results were preserved and remain green: **61 API + 6 web = 67 tests**.
Phase 4b added **4 API tests**, giving the current suite: **65 API + 6 web = 71 tests**.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `pnpm typecheck` | Exit 0 |
| Lint | `pnpm lint` | Exit 0; 0 errors, 4 pre-existing web warnings |
| Build | `pnpm build` | Exit 0 |
| API tests | `pnpm --filter @vrs/api test` | 65/65 pass, 5 files |
| Web tests | `pnpm --filter @vrs/web test` | 6/6 pass, 1 file |
| Combined tests | `pnpm test` | Exit 0 |
| Format | `pnpm format:check` | Exit 0, all formatted |
| Prisma validate | `pnpm prisma validate` | Exit 0, schema valid |
| Migration status | `pnpm prisma migrate status` | Exit 0, dev DB up to date |
| Schema drift | `pnpm prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --exit-code` | Exit 0, no difference |
| Migration deploy on throwaway DB | `prisma migrate deploy` | PASS |
| Backup/restore on throwaway DB | `pg_dump`/`pg_restore` count comparison | PASS |
| Compose syntax | `docker compose -f docker-compose.staging.yml config --quiet` | Exit 0, dummy env only |

Non-blocking warnings: 4 pre-existing ESLint warnings in web files; Prisma 7 may print a Node 26 support warning.

---

## 8. Deployment and smoke-test results

- No staging environment was explicitly configured, so no staging deployment was performed.
- No production deployment was performed.
- No staging smoke test was performed.
- Exact remaining deployment and smoke-test commands are in `docs/deployment/staging-guide.md`.
- Docker Compose configuration syntax was validated; Docker image build was not completed in this workspace.

---

## 9. Remaining risks and limitations

1. Staging host, DNS, TLS and real secrets are still required.
2. Docker images were not built in this workspace; build should be verified on the staging host with `pnpm staging:up`.
3. nginx serves plain HTTP; TLS must be terminated by an external reverse proxy/ingress.
4. No automated backup scheduler or notification/overdue schedulers exist.
5. Managed PostgreSQL may require `btree_gist` extension permission.
6. Phase 4a partial/unimplemented specification items remain (extension workflow, license review UI, inventory checks, backup UI, notifications, real payments, charts/exports, granular RBAC, signed PDFs).
7. No object storage or upload pipeline exists; documents are generated on demand.
8. 4 pre-existing lint warnings remain.

---

## 10. Readiness verdict

- **Ready for staging deployment preparation handoff:** Yes. Configuration, documentation, security controls, health checks, migration procedure and backup/restore procedure are prepared and tested where possible.
- **Deployed to staging:** No. A configured staging host is still required.
- **Ready for production:** No. Functional gaps from Phase 4a remain, operational schedulers/backups are not implemented, and staging deployment/smoke has not occurred.

**Next step:** Stop here. Do not proceed to another phase without explicit approval.
