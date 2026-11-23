# Environment Variables

## 1. Files

| File | Used by | Committed? | Purpose |
|---|---|---|---|
| `.env.example` | local `docker-compose.yml` | Yes, template only | Local DB user/password/db/port |
| `.env` | local `docker-compose.yml` | **No** | Local development DB values |
| `apps/api/.env.example` | API dev | Yes, template only | Local API settings |
| `apps/api/.env` | API dev / Prisma CLI | **No** | Local API settings |
| `.env.staging.example` | staging compose | Yes, template only | Staging stack settings |
| `.env.staging` | staging compose | **No** | Real staging secrets |
| `apps/api/.env.staging.example` | API outside compose | Yes, template only | Non-container staging API settings |

`.gitignore` ignores `.env`, `.env.*`, `backups/` and allows only `*.example` files. `.dockerignore` also excludes `.env*` (except examples) from Docker build contexts.

---

## 2. Root local Docker variables (`.env`)

| Name | Required | Example | Notes |
|---|---|---|---|
| `POSTGRES_USER` | Yes | `vrs` | Local dev DB role |
| `POSTGRES_PASSWORD` | Yes | local-only value | Never reuse in staging/production |
| `POSTGRES_DB` | Yes | `vrs` | Development database name |
| `POSTGRES_PORT` | No | `5432` | Host bind port for local DB only |

---

## 3. API variables

| Name | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Use `staging` or `production` on deployed environments |
| `PORT` | No | `4000` | Integer 1–65535 |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string; URL-encode special characters |
| `JWT_SECRET` | **Yes** | — | At least 32 chars in staging/production; placeholders rejected |
| `JWT_EXPIRES_IN` | No | `1d` | `jsonwebtoken` duration string |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Comma-separated explicit origins; `*` rejected in staging/production |
| `TRUST_PROXY` | No | `1` | `false`, `true`, hop count, or trusted CIDR; needed behind nginx |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Positive integer milliseconds |
| `RATE_LIMIT_MAX` | No | `300` | General API requests per IP per window |
| `AUTH_RATE_LIMIT_MAX` | No | `30` | `/api/auth/*` requests per IP per window |

Secrets are never logged. The logger redacts keys matching `password|token|secret|authorization|cookie|database_url|connectionstring`, and access logs contain only method/path/status/duration/request ID.

---

## 4. Staging compose variables (`.env.staging`)

In addition to the API variables above, the root staging file supplies:

| Name | Required | Notes |
|---|---|---|
| `POSTGRES_USER` | Yes | Staging DB role |
| `POSTGRES_PASSWORD` | Yes | Generate a unique value; URL-encode in `DATABASE_URL` |
| `POSTGRES_DB` | Yes | Staging DB name, e.g. `vrs_staging` |
| `DATABASE_URL` | Yes | Must use host `db` inside the compose network |
| `CORS_ORIGIN` | Yes | Real staging HTTPS origin |
| `JWT_SECRET` | Yes | Generate with `openssl rand -hex 32` |
| `STAGING_API_PORT` | No | Host bind, default `4001` |
| `STAGING_WEB_PORT` | No | Host bind, default `4173` |
| `RATE_LIMIT_WINDOW_MS` | No | Default `900000` |
| `RATE_LIMIT_MAX` | No | Default `300` |
| `AUTH_RATE_LIMIT_MAX` | No | Default `30` |
| `STAGING_ENV_FILE` | No | Overrides service `env_file`; default `.env.staging` |

No bank, card, e-wallet, SMTP, SMS or object-storage credentials exist in the application. Do not add them as part of staging preparation; real payment integration is out of scope.

---

## 5. Secret generation and handling

```bash
openssl rand -hex 32
```

- Generate separate values for `JWT_SECRET` and `POSTGRES_PASSWORD`.
- Store them in a secret manager or restricted password manager.
- Do not place them in `docker-compose.staging.yml`, Dockerfiles, docs, test fixtures, or source code.
- Rotate `JWT_SECRET` by redeploying; existing JWTs will become invalid.
- Rotate the DB password by updating both `POSTGRES_PASSWORD` and `DATABASE_URL`, then recreate the stack.

The API fails fast in staging/production when `JWT_SECRET` is missing, too short, or a placeholder. It also fails when `CORS_ORIGIN` is `*`.

---

## 6. Validation performed

The compose file was parsed successfully with `docker compose config --quiet` using a temporary dummy env file outside the repository. No real secret or staging environment file was created in the workspace.
