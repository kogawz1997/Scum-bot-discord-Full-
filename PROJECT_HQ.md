# Project HQ

[![CI](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/ci.yml/badge.svg)](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/ci.yml)
[![Release](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/release.yml/badge.svg)](https://github.com/kogawz1997/Scum-bot-discord-Full-/actions/workflows/release.yml)

Last updated: **2026-03-15**

This document is the working status register for the repository. It should stay factual. Do not use it as a sales page.

## Reference Set

- Repository overview: [README.md](./README.md)
- Docs index: [docs/README.md](./docs/README.md)
- Verification status: [docs/VERIFICATION_STATUS_TH.md](./docs/VERIFICATION_STATUS_TH.md)
- Evidence map: [docs/EVIDENCE_MAP_TH.md](./docs/EVIDENCE_MAP_TH.md)
- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Runtime topology: [docs/RUNTIME_TOPOLOGY.md](./docs/RUNTIME_TOPOLOGY.md)
- Worklist: [docs/WORKLIST.md](./docs/WORKLIST.md)
- Refactor plan: [docs/REFACTOR_PLAN.md](./docs/REFACTOR_PLAN.md)
- Config matrix: [docs/CONFIG_MATRIX.md](./docs/CONFIG_MATRIX.md)
- Database strategy: [docs/DATABASE_STRATEGY.md](./docs/DATABASE_STRATEGY.md)
- PostgreSQL cutover checklist: [docs/POSTGRESQL_CUTOVER_CHECKLIST.md](./docs/POSTGRESQL_CUTOVER_CHECKLIST.md)
- Migration / rollback / restore: [docs/MIGRATION_ROLLBACK_POLICY_TH.md](./docs/MIGRATION_ROLLBACK_POLICY_TH.md)
- Release policy: [docs/RELEASE_POLICY.md](./docs/RELEASE_POLICY.md)
- Release notes: [docs/releases/README.md](./docs/releases/README.md)

## Current State

### Closed

- Runtime is split into `bot`, `worker`, `watcher`, `admin web`, `player portal`, and `console-agent`
- This workstation has already cut over the runtime database to PostgreSQL
- Prisma tooling is provider-aware and test-safe
- Runtime env parsing has a dedicated boundary under `src/config/`
- Bot and worker startup wiring has been moved into `src/bootstrap/`
- Admin auth includes DB login, Discord SSO, TOTP 2FA, step-up auth, session revoke, and security event logging
- Admin route groups are partly split under `src/admin/api/` and `src/admin/audit/`
- Player API groups are partly split under `apps/web-portal-standalone/api/`
- Production validation commands exist and CI artifacts are written on every verification run
- `lint` now includes syntax, encoding, ESLint, and docs/metadata formatting checks
- Policy checks now cover runtime profile parsing, control-panel env registry rules, smoke behavior, readiness ordering, and module docs
- Tenant scope exists across core platform, commerce, and audit surfaces

### Partial

- Admin web still does not expose every env/config switch
- Tenant isolation is not database-per-tenant or RLS-backed
- Restore remains a controlled maintenance workflow with confirmation gates
- Documentation evidence is still stronger than visual evidence; screenshots and GIFs are still missing
- `src/adminWebServer.js` and `apps/web-portal-standalone/server.js` still need further module extraction

### Runtime-dependent

- `agent` execution still depends on Windows session state and a real SCUM client window
- Watcher readiness depends on an actual `SCUM.log` path
- Some live SCUM command behavior remains server-dependent

## Current Workstation Notes

- Database provider in `.env`: `postgresql`
- Runtime database endpoint: `127.0.0.1:55432`
- Admin origin: `https://admin.genz.noah-dns.online/admin`
- Player origin: `https://player.genz.noah-dns.online`
- `DELIVERY_EXECUTION_MODE` in `.env`: `agent`
- `SCUM_WATCHER_ENABLED=false`
- `SCUM_CONSOLE_AGENT_REQUIRED=false`

These are machine-specific notes. Keep them aligned with the active env when this workstation changes.

## Validation Notes

Current validation stack:

- `npm run lint`
- `npm test`
- `npm run doctor`
- `npm run security:check`
- `npm run readiness:prod`
- `npm run smoke:postdeploy`

Important detail:

- `readiness:prod` now includes `smoke:postdeploy`
- `smoke:postdeploy` no longer treats required runtimes as healthy based only on HTTP 200 and `{ ok: true }`
- optional runtimes such as a disabled watcher or an optional console-agent are reported without failing the run

## Remaining Non-Delivery Gaps

Use [docs/WORKLIST.md](./docs/WORKLIST.md) as the only detailed backlog.

Short form:

- `P1`: finish module extraction for admin/player surfaces, close remaining admin/config and tenant-boundary gaps, unify runtime status contract
- `P2`: reduce entrypoint size further, clean up docs encoding/consistency, improve visual evidence, move more high-impact settings into admin web
- `P3`: stronger tenant isolation model and broader release-note coverage

## Review Warnings

- Do not claim full tenant isolation; it is still application-level
- Do not claim every setting is editable from admin web
- Do not claim agent execution is independent of Windows and SCUM client state
- Do not use hardcoded test counts in documents; use CI artifacts instead

## Summary

The repository is in reviewable shape: PostgreSQL runtime is in place, validation commands are wired, the main admin/player/runtime surfaces exist, and the main documentation set now points back to evidence. The remaining work is mostly boundary hardening and coverage, not missing core infrastructure.
