# SCUM TH Platform

[![CI](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/ci.yml/badge.svg)](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/ci.yml)
[![Release](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/release.yml/badge.svg)](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/release.yml)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-2f7d32?style=for-the-badge&logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-v14.25.1-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

Last updated: **2026-03-15**

SCUM TH Platform is a control plane for a SCUM community stack built around:

- a Discord bot
- an admin web UI
- a player portal
- a worker runtime
- a watcher runtime
- an optional console-agent

If a statement in this repository is not backed by code, tests, CI artifacts, or runtime logs, treat it as supporting context rather than evidence.

## Primary Documents

- Docs index: [docs/README.md](./docs/README.md)
- System status: [PROJECT_HQ.md](./PROJECT_HQ.md)
- Verification status: [docs/VERIFICATION_STATUS_TH.md](./docs/VERIFICATION_STATUS_TH.md)
- Evidence map: [docs/EVIDENCE_MAP_TH.md](./docs/EVIDENCE_MAP_TH.md)
- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Runtime topology: [docs/RUNTIME_TOPOLOGY.md](./docs/RUNTIME_TOPOLOGY.md)
- Worklist: [docs/WORKLIST.md](./docs/WORKLIST.md)
- Refactor plan: [docs/REFACTOR_PLAN.md](./docs/REFACTOR_PLAN.md)
- Config matrix: [docs/CONFIG_MATRIX.md](./docs/CONFIG_MATRIX.md)
- Database strategy: [docs/DATABASE_STRATEGY.md](./docs/DATABASE_STRATEGY.md)
- PostgreSQL cutover checklist: [docs/POSTGRESQL_CUTOVER_CHECKLIST.md](./docs/POSTGRESQL_CUTOVER_CHECKLIST.md)
- Delivery capability matrix: [docs/DELIVERY_CAPABILITY_MATRIX_TH.md](./docs/DELIVERY_CAPABILITY_MATRIX_TH.md)
- Migration / rollback / restore: [docs/MIGRATION_ROLLBACK_POLICY_TH.md](./docs/MIGRATION_ROLLBACK_POLICY_TH.md)
- Limits and SLA notes: [docs/LIMITATIONS_AND_SLA_TH.md](./docs/LIMITATIONS_AND_SLA_TH.md)
- Release notes: [docs/releases/README.md](./docs/releases/README.md)
- Release policy: [docs/RELEASE_POLICY.md](./docs/RELEASE_POLICY.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

## What Works Now

### Runtime and topology

- Split processes for `bot`, `worker`, `watcher`, `admin web`, `player portal`, and `console-agent`
- Health endpoints for each runtime
- Topology checks, production checks, smoke checks, and PM2 manifests
- Split origin deployment for admin and player surfaces
- Runtime env parsing now has a dedicated boundary under `src/config/`
- Bot and worker startup wiring now lives under `src/bootstrap/`
- Admin route groups are partly split under `src/admin/api/` and `src/admin/audit/`
- Player API groups are partly split under `apps/web-portal-standalone/api/`

### Persistence

- PostgreSQL is supported as the active runtime database provider
- Prisma generation and migration commands are provider-aware
- SQLite-to-PostgreSQL cutover tooling exists in-repo
- Tests run against isolated provider-specific databases or schemas instead of the live runtime database

### Admin and player surfaces

- Admin login from database credentials
- Discord SSO for admin
- TOTP 2FA and step-up auth for sensitive routes
- Session revoke, security events, request trail, audit, and restore preview
- Player portal with wallet, purchase history, redeem, profile, and Steam link flows
- Control panel for a growing subset of runtime and bot settings

### Operations and observability

- Runtime supervisor with per-role status
- Notification center and reconcile findings in admin
- Backup / restore preview and restore guardrails
- CI artifacts for lint, tests, doctor, security checks, readiness, and smoke
- `lint` now covers syntax, text-encoding scan, ESLint, and formatting checks for repo metadata/docs
- Policy checks now include runtime profile, control-panel config registry, smoke behavior, readiness sequencing, and module docs

## What Is Partial

- Admin web still does not cover every `.env` or config setting
- Multi-tenant isolation is application-scoped, not database-per-tenant or RLS-backed
- Restore still relies on a guarded maintenance flow rather than fully automatic rollback
- Evidence in the repository is still stronger in logs/tests than in screenshots, diagrams, or recorded demos
- `src/adminWebServer.js` and `apps/web-portal-standalone/server.js` are still larger than the target module split

## What Is Runtime-Dependent

- `agent` delivery execution depends on a live Windows session and a working SCUM client window
- Watcher health depends on a real `SCUM.log` path being present
- Some SCUM command behavior still depends on the target server configuration and game patch level

## Known Limitations

- SQLite remains in dev/import/compatibility paths, but it is no longer the target runtime path for this workstation
- Admin web is not yet a full replacement for direct env/config editing
- Tenant isolation is not yet database-level
- Game-side verification is not inventory-native proof for every case
- Screenshots, GIFs, and exported architecture images are still missing from the repository

## Evidence

Source of truth for verification status:

- `artifacts/ci/verification-summary.json`
- `artifacts/ci/verification-summary.md`
- `artifacts/ci/lint.log`
- `artifacts/ci/test.log`
- `artifacts/ci/doctor.log`
- `artifacts/ci/security-check.log`
- `artifacts/ci/readiness.log`
- `artifacts/ci/smoke.log`

Commands used for local verification:

```bash
npm run lint
npm run test:policy
npm test
npm run doctor
npm run security:check
npm run readiness:prod
npm run smoke:postdeploy
```

## Architecture Summary

```mermaid
flowchart LR
  A[SCUM.log] --> B[Watcher runtime]
  B --> C[/scum-event webhook]
  C --> D[Bot / Admin Web]
  D --> E[(PostgreSQL)]
  F[Worker] --> E
  F --> G[Delivery runtime]
  G --> H[RCON or Console Agent]
  I[Player Portal] --> E
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for file-level references.

## Quick Start

### Windows quick start

```bash
npm run setup:easy
```

### Prepare local PostgreSQL

```bash
npm run postgres:local:setup
npm run db:generate:postgresql
npm run db:migrate:deploy:postgresql
```

### Cut over from SQLite to PostgreSQL

```bash
npm run db:cutover:postgresql -- --source-sqlite prisma/prisma/production.db
```

## Environment Notes

### Database

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@127.0.0.1:55432/scum_th_platform?schema=public
PERSIST_REQUIRE_DB=true
PERSIST_LEGACY_SNAPSHOTS=false
```

### Admin web

```env
ADMIN_WEB_SSO_DISCORD_ENABLED=true
ADMIN_WEB_2FA_ENABLED=true
ADMIN_WEB_STEP_UP_ENABLED=true
```

### Delivery-related runtime

```env
DELIVERY_EXECUTION_MODE=agent
SCUM_CONSOLE_AGENT_BASE_URL=http://127.0.0.1:3213
SCUM_CONSOLE_AGENT_TOKEN=put_a_strong_agent_token_here
SCUM_WATCHER_ENABLED=false
SCUM_CONSOLE_AGENT_REQUIRED=false
```

For the full env reference, see [docs/ENV_REFERENCE_TH.md](./docs/ENV_REFERENCE_TH.md).
