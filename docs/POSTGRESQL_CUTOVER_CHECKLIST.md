# PostgreSQL Cutover Checklist

Use this checklist when moving a runtime from SQLite-based local state to PostgreSQL.

## Before cutover

- Confirm PostgreSQL is reachable from the target host.
- Confirm `DATABASE_URL` uses `postgresql://` or `postgres://`.
- Confirm `PRISMA_SCHEMA_PROVIDER=postgresql`.
- Run `npm run db:generate`.
- Run `npm run db:migrate:deploy` or `npm run db:migrate:deploy:safe`.
- Take an admin backup before changing the live runtime.

## Cutover

- Stop `bot`, `worker`, `watcher`, and `console-agent` if they share the same database.
- Apply the production env profile.
- Run `npm run db:cutover:postgresql` if data import is part of the move.
- Start the runtime again with `--update-env` if PM2 is used.

## After cutover

- Run `npm run doctor`.
- Run `npm run security:check`.
- Run `npm run readiness:prod`.
- Run `npm run smoke:postdeploy`.
- Confirm required runtimes report `ready`, not only `200 OK`.
- Confirm admin login users are the expected set and do not contain test leakage.

## Evidence to keep

- database provider from runtime logs
- readiness output
- smoke output
- backup name used before cutover
- timestamp of PM2 reload or restart
