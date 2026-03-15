# Database Strategy

## Runtime standard

Production runtime is PostgreSQL.

The repository still keeps SQLite compatibility for:

- local import and offline recovery workflows
- local smoke or scratch environments
- compatibility tooling during cutover and restore exercises

## Current implementation

- Runtime provider detection: [src/utils/dbEngine.js](../src/utils/dbEngine.js)
- Prisma wrapper by provider: [scripts/prisma-with-provider.js](../scripts/prisma-with-provider.js)
- Main schema: [prisma/schema.prisma](../prisma/schema.prisma)
- Cutover helper: [scripts/cutover-sqlite-to-postgres.js](../scripts/cutover-sqlite-to-postgres.js)

## Operational rules

- Do not run production on SQLite.
- Do not mix SQLite and PostgreSQL env values in the same runtime session.
- Run schema generation and migrate/deploy against the same provider you will boot with.
- Validate restore and smoke checks after any provider change.

## Rollback posture

- Schema changes must go through `db:migrate:deploy` or `db:migrate:deploy:safe`.
- Backups and restore previews are part of the admin web flow.
- A rollback plan must identify whether the rollback is schema-only, data-only, or full runtime rollback.

## Gaps still open

- No database-per-tenant isolation
- No read-replica path
- No automated failover between database providers
