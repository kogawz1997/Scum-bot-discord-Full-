# ADR-0002: PostgreSQL Is The Runtime Standard

## Status

Accepted

## Context

The repository still contains SQLite support for local development, import paths, and compatibility tooling. That created ambiguity when runtime documentation and operational notes were not explicit about which provider was actually intended for production.

## Decision

PostgreSQL is the runtime standard for production and reviewable deployments.

SQLite remains allowed only for:

- local development
- import / cutover source data
- offline tooling where a production-like runtime is not required

## Consequences

Advantages:

- clearer production story
- fewer operator mistakes during deployment
- better alignment with multi-tenant and operational growth

Costs:

- provider-aware tooling must be maintained
- docs must stay explicit about dev/import/runtime boundaries

## Evidence

- `scripts/prisma-with-provider.js`
- `scripts/cutover-sqlite-to-postgres.js`
- `scripts/run-tests-with-provider.js`
- `README.md`
- `docs/ARCHITECTURE.md`
