# Database Backup and Restore Guide

## 1. Status

**Tested:** 2026-11-24 in the local PostgreSQL container `vrs-postgres` using the development database as the *source only*.

What was tested:

1. `pg_dump -Fc` of `vrs` to a temporary file inside the container.
2. Creation of a throwaway database `vrs_restore_check_*`.
3. `pg_restore` into that throwaway database.
4. Comparison of table and user counts: `27` tables and `3` users in both databases.
5. Removal of the throwaway database and temporary dump file.

Result: **PASS**. The development database `vrs` was not reset, deleted, or modified. No staging/managed PostgreSQL backup was tested; re-run this procedure on the actual staging host before relying on it there.

There is no automated backup scheduler in the application. Backups must be scheduled at the infrastructure level (host cron, managed DB backups, or an operator-run job).

---

## 2. Backup (staging compose stack)

Set the environment from the staging file, then dump from the DB container:

```bash
set -a
. ./.env.staging
set +a

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups

docker exec vrs-staging-postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  -f "/tmp/vrs-staging-$STAMP.dump"

docker cp \
  vrs-staging-postgres:/tmp/vrs-staging-$STAMP.dump \
  "backups/vrs-staging-$STAMP.dump"

docker exec vrs-staging-postgres rm -f "/tmp/vrs-staging-$STAMP.dump"
```

`backups/` is gitignored because dumps contain personal data. Store copies encrypted and off-host. Verify that backup files are not committed or uploaded to chat/tickets.

---

## 3. Restore into an empty staging database

Restoring overwrites data. Use a verified backup and confirm the target database name before continuing. Never restore into the development database `vrs` or the test database `vrs_test`.

```bash
set -a
. ./.env.staging
set +a

# Stop writers.
docker compose -f docker-compose.staging.yml --env-file .env.staging stop api web migrate

# Use a fresh/empty target database for the safest restore.
RESTORE_DB="${POSTGRES_DB}_restore_$(date +%Y%m%d%H%M%S)"
docker exec vrs-staging-postgres createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$RESTORE_DB"

docker cp backups/vrs-staging-YYYYMMDD-HHMMSS.dump \
  vrs-staging-postgres:/tmp/vrs-restore.dump

docker exec vrs-staging-postgres \
  pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner --no-privileges /tmp/vrs-restore.dump

docker exec vrs-staging-postgres rm -f /tmp/vrs-restore.dump
```

Verify before switching the application to the restored database:

```bash
docker exec vrs-staging-postgres psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc \
  "select count(*) from information_schema.tables where table_schema='public';"

docker exec vrs-staging-postgres psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc \
  "select count(*) from users;"
```

To replace the live staging DB with the verified restored copy, stop the stack, drop/rename the live DB, rename the restore DB to `POSTGRES_DB`, then start the stack again. Because this is destructive, it requires operator approval and a fresh backup taken immediately before the operation.

`--clean --if-exists` may be used only with a disposable target database that you intend to overwrite. Do not run it against the live database unless a full replacement is explicitly intended.

---

## 4. Migrations and backups

- Apply schema changes only with `prisma migrate deploy` via the `migrate` compose service.
- The initial migration includes custom SQL (`btree_gist` exclusion constraint, CHECK constraints, audit-log immutability triggers). Managed PostgreSQL must allow or preinstall `btree_gist`.
- Take a backup before any migration.
- Never use `prisma migrate reset`, `prisma migrate dev`, `prisma db push`, or `docker compose down -v` against staging data.
- Verify with `prisma migrate status` that the target database reports `Database schema is up to date!`.

---

## 5. Local evidence commands

The local test used commands equivalent to:

```bash
docker exec vrs-postgres pg_dump -U vrs -d vrs -Fc -f /tmp/vrs-backup-check.dump
docker exec vrs-postgres createdb -U vrs -O vrs vrs_restore_check_<id>
docker exec vrs-postgres pg_restore -U vrs -d vrs_restore_check_<id> --no-owner --no-privileges /tmp/vrs-backup-check.dump
docker exec vrs-postgres dropdb -U vrs --if-exists vrs_restore_check_<id>
docker exec vrs-postgres rm -f /tmp/vrs-backup-check.dump
```

These commands are not a deployment action and must not be pointed at a database you do not intend to inspect.
