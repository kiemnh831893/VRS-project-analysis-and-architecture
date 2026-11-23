# VRS-project-analysis-and-architecture

Vehicle Rental System (VRS) implementation and architecture workspace for the university Software
Engineering project. This repository contains the running React/Express application, PostgreSQL
schema and migrations, design documents, and Phase 4b staging-preparation artifacts.

> **Current status: Phase 4b — Staging Deployment Preparation.**
> The implementation and staging configuration are complete and validated locally. No staging or
> production deployment has been performed.

The original remote repository heading above is preserved intentionally. This branch was created
from the existing `main` commit `72c32b6` (`Initial commit`) and keeps that history intact.

## Approved stack

| Layer           | Technology                       |
| --------------- | -------------------------------- |
| Frontend        | React 19 + TypeScript + Vite     |
| Backend         | Node.js + Express 5 + TypeScript |
| Database        | PostgreSQL 16                    |
| ORM             | Prisma 7                         |
| Package manager | pnpm                             |

## What is implemented

- Customer registration/login, JWT authentication, live account-status checks and role guards.
- Vehicle categories, branches, vehicles, catalog search and vehicle detail views.
- Booking creation with calendar-day pricing, 30-minute pending-payment holds and deposit rules.
- Manual deposit confirmation, contracts, QR handover, inspection, return and invoicing.
- Fine rules, late-fee calculation, reports, audit logs and admin configuration pages.
- Ownership checks for customer bookings, invoices, contracts and PDF downloads.
- Phase 4b staging preparation: Docker Compose stack, migration job, health checks, structured
  logging, HTTP security headers, CORS validation and API rate limiting.

The source of truth remains `docs/specification/` and `docs/diagrams/`. Business rules approved in
earlier phases are unchanged.

## Repository structure

```text
.
├─ apps/
│  ├─ api/                         # Express + TypeScript API
│  │  ├─ prisma/                   # schema and SQL migration
│  │  ├─ src/                      # routes, services, middleware, config
│  │  └─ tests/                    # API test suite
│  └─ web/                         # React + TypeScript + Vite frontend
│     ├─ src/                      # pages, components, API clients
│     └─ Dockerfile/nginx.conf     # production-like static hosting
├─ docs/
│  ├─ specification/               # original specification (preserved)
│  ├─ diagrams/                    # original draw.io diagrams (preserved)
│  ├─ deployment/                  # Phase 4b deployment guides
│  └─ phase-*-final-report.md      # phase reports and traceability matrix
├─ docker-compose.yml              # local PostgreSQL
├─ docker-compose.staging.yml      # staging stack (not deployed here)
├─ pnpm-workspace.yaml
└─ README.md
```

## Local development

Prerequisites: Node.js 20.19+/22.12+/24+, pnpm 10+, Docker Engine with Compose v2.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
pnpm db:up
pnpm prisma:generate
pnpm dev
```

The example files contain local-only placeholders. Never commit real `.env`, `.env.staging` or
credential files; they are gitignored.

Useful endpoints:

- API health: `GET http://localhost:4000/api/health`
- API readiness: `GET http://localhost:4000/api/health/ready`
- Web dev server: `http://localhost:5173`

## Quality gates

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm lint
pnpm prisma:validate
```

Current local results: API 65/65 tests, web 6/6 tests, typecheck/build/format all passing. Lint has
0 errors and 4 pre-existing web warnings.

## Deployment documentation

- `docs/deployment/staging-guide.md` — exact staging deployment and smoke-test steps.
- `docs/deployment/environment-variables.md` — secret and configuration reference.
- `docs/deployment/backup-restore-guide.md` — local backup/restore evidence and procedures.
- `docs/phase-4a-final-report.md` — approved Phase 4a baseline.
- `docs/phase-4b-final-report.md` — Phase 4b scope, evidence and limitations.

Staging is **prepared, not deployed**. There is no real payment/bank integration, no SMTP/SMS
delivery, and no background scheduler in this build.

## Known limitations

- Pending booking expiry uses lazy logic plus an admin trigger; no cron scheduler is running.
- Overdue contract scanning and notification delivery are not implemented.
- Backups must be scheduled externally; no in-app backup scheduler exists.
- Real payment processing and signed PDF storage are out of scope.
- Full Phase 4a limitations are recorded in `docs/phase-4a-final-report.md`.
