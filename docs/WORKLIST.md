# Worklist

This file is the single review backlog for work that is still worth doing after the current validation pass.

Use it as the source of truth for open items. Do not duplicate these lists across multiple docs unless the other document only links back here.

## Status Labels

- `open`: not started or not finished
- `partial`: implemented in part, but not at the target boundary yet
- `runtime-blocked`: depends on live infrastructure outside the repo
- `deferred`: valid work, but not required for the current review bar

## P1 Review-Critical

### 1. Split `src/adminWebServer.js`

- Status: `partial`
- Why it is still open:
  - auth/session runtime is now extracted
  - `entity`, `config/control-panel`, `commerce/delivery`, `platform`, `auth`, and portal-bridge POST route groups now live under `src/admin/api/`
  - GET/query routes now have a dedicated module under `src/admin/api/`
  - audit/export routing is extracted under `src/admin/audit/`
  - the entry file still carries HTTP composition, login/logout flow, and remaining cleanup of old inline route branches
  - review cost is still too high for a single HTTP surface
- Main files:
  - [src/adminWebServer.js](../src/adminWebServer.js)
  - [src/admin/auth/adminAuthRuntime.js](../src/admin/auth/adminAuthRuntime.js)
  - [src/admin/api/adminGetRoutes.js](../src/admin/api/adminGetRoutes.js)
  - [src/admin/api/adminAuthPostRoutes.js](../src/admin/api/adminAuthPostRoutes.js)
  - [src/admin/api/adminPortalPostRoutes.js](../src/admin/api/adminPortalPostRoutes.js)
  - [src/admin/api/adminEntityPostRoutes.js](../src/admin/api/adminEntityPostRoutes.js)
  - [src/admin/api/adminConfigPostRoutes.js](../src/admin/api/adminConfigPostRoutes.js)
  - [src/admin/api/adminCommerceDeliveryPostRoutes.js](../src/admin/api/adminCommerceDeliveryPostRoutes.js)
  - [src/admin/api/adminPlatformPostRoutes.js](../src/admin/api/adminPlatformPostRoutes.js)
  - [src/admin/audit/adminAuditRoutes.js](../src/admin/audit/adminAuditRoutes.js)
  - [src/utils/adminPermissionMatrix.js](../src/utils/adminPermissionMatrix.js)
  - [src/store/adminSecurityEventStore.js](../src/store/adminSecurityEventStore.js)
- Next cut:
  - remove the remaining legacy inline GET branches from `src/adminWebServer.js`
  - split remaining non-route helpers by concern where it reduces review cost
  - keep the entry file focused on HTTP composition and request gating
- Acceptance:
  - `src/adminWebServer.js` becomes composition/bootstrap only
  - route permissions are testable without loading the whole server file
  - current admin API integration tests stay green

### 2. Split `apps/web-portal-standalone/server.js`

- Status: `partial`
- Why it is still open:
  - startup validation and auth/session runtime are now separated
  - commerce/cart/redeem/bounty/rentbike routes now live under `apps/web-portal-standalone/api/`
  - profile/social/reward/general dashboard routes now live under `apps/web-portal-standalone/api/playerGeneralRoutes.js`
  - auth/session handling now lives under `apps/web-portal-standalone/auth/`
  - `server.js` still owns page routing, canonical redirects, and some remaining player/runtime composition
- Main files:
  - [apps/web-portal-standalone/server.js](../apps/web-portal-standalone/server.js)
  - [apps/web-portal-standalone/auth/portalAuthRuntime.js](../apps/web-portal-standalone/auth/portalAuthRuntime.js)
  - [apps/web-portal-standalone/runtime/portalRuntime.js](../apps/web-portal-standalone/runtime/portalRuntime.js)
  - [apps/web-portal-standalone/api/playerCommerceRoutes.js](../apps/web-portal-standalone/api/playerCommerceRoutes.js)
  - [apps/web-portal-standalone/api/playerGeneralRoutes.js](../apps/web-portal-standalone/api/playerGeneralRoutes.js)
  - [test/web-portal-standalone.player-mode.integration.test.js](../test/web-portal-standalone.player-mode.integration.test.js)
- Next cut:
  - move any remaining player/runtime helpers out of `server.js` where they still mix with page routing
  - keep `server.js` as HTTP composition only
- Acceptance:
  - route behavior and player-mode tests remain unchanged
  - `server.js` no longer owns business logic directly

### 3. Split `src/admin/dashboard.html`

- Status: `partial`
- Why it is still open:
  - file is still too large for practical review
  - UI behavior, templates, and admin operations logic are hard to inspect together
- Main files:
  - [src/admin/dashboard.html](../src/admin/dashboard.html)
- Next cut:
  - extract JS modules for auth/security, control panel, observability, delivery, and restore views
  - keep the HTML shell thin
- Acceptance:
  - no inline monolith for all admin behavior
  - admin UI regression tests and smoke still pass

### 4. Finish admin/config boundary audit

- Status: `partial`
- Why it is still open:
  - admin web exposes a growing subset of config/env, but not every high-impact setting yet
  - restart boundaries are not documented for every editable key
- Main files:
  - [src/config/adminEditableConfig.js](../src/config/adminEditableConfig.js)
  - [src/adminWebServer.js](../src/adminWebServer.js)
  - [docs/CONFIG_MATRIX.md](./CONFIG_MATRIX.md)
- Next cut:
  - audit remaining env/config switches
  - classify each one as `admin-editable`, `runtime-only`, or `secret-only`
  - document `reload-safe` vs `restart-required`
- Acceptance:
  - config matrix matches control-panel behavior
  - no hidden write path for a setting that should be admin-editable

### 5. Close the remaining tenant-boundary gaps

- Status: `partial`
- Why it is still open:
  - tenant scope exists in the main platform, commerce, and audit surfaces
  - shared tenant-scope helpers now exist, but some admin/config/query paths still rely on application discipline rather than stronger isolation
- Main files:
  - [src/admin/adminTenantScope.js](../src/admin/adminTenantScope.js)
  - [src/services/platformService.js](../src/services/platformService.js)
  - [src/services/platformTenantConfigService.js](../src/services/platformTenantConfigService.js)
  - [src/adminWebServer.js](../src/adminWebServer.js)
  - [apps/web-portal-standalone/server.js](../apps/web-portal-standalone/server.js)
- Next cut:
  - audit every admin/config/query path for tenant context
  - add policy tests for cross-tenant access denial
- Acceptance:
  - every tenant-facing path has an explicit tenant boundary
  - policy tests fail if tenant context is missing

### 6. Unify runtime status contract across checks

- Status: `partial`
- Why it is still open:
  - `doctor`, `security:check`, `readiness`, `smoke`, and `doctor:topology` are aligned better than before, but still not driven by one shared schema
- Main files:
  - [scripts/doctor.js](../scripts/doctor.js)
  - [scripts/security-check.js](../scripts/security-check.js)
  - [scripts/readiness-gate.js](../scripts/readiness-gate.js)
  - [scripts/post-deploy-smoke.js](../scripts/post-deploy-smoke.js)
  - [scripts/doctor-topology.js](../scripts/doctor-topology.js)
- Next cut:
  - define one machine-readable runtime report contract
  - make all validation scripts emit/consume the same structure
- Acceptance:
  - CI and operators can compare runtime state from one schema
  - degraded/disabled/required semantics are consistent across scripts

## P2 Hardening

### 7. Reduce `src/bot.js` further

- Status: `partial`
- Main files:
  - [src/bot.js](../src/bot.js)
  - [src/bootstrap/](../src/bootstrap/)
- Next cut:
  - move interaction handlers into `src/discord/interactions/`
  - move listeners into `src/discord/events/`
- Acceptance:
  - `src/bot.js` is mostly bootstrap and runtime composition

### 8. Reduce `src/worker.js` further

- Status: `partial`
- Main files:
  - [src/worker.js](../src/worker.js)
  - [src/bootstrap/workerHealthRuntime.js](../src/bootstrap/workerHealthRuntime.js)
  - [src/bootstrap/workerQueueRuntime.js](../src/bootstrap/workerQueueRuntime.js)
  - [src/bootstrap/backgroundJobsRuntime.js](../src/bootstrap/backgroundJobsRuntime.js)
- Next cut:
  - keep worker health/runtime helpers out of the entry file
  - separate queue ownership from background job ownership more explicitly
- Acceptance:
  - worker entrypoint is mostly bootstrap

### 9. Clean up document encoding and consistency

- Status: `partial`
- Why it is still open:
  - the main verification/evidence docs were rewritten to remove mojibake
  - some docs still mix review notes and operator notes too loosely
- Main files:
  - [docs/EVIDENCE_MAP_TH.md](./EVIDENCE_MAP_TH.md)
  - [docs/VERIFICATION_STATUS_TH.md](./VERIFICATION_STATUS_TH.md)
  - [docs/README.md](./README.md)
- Acceptance:
  - no mojibake in tracked docs
  - document roles are clear: source-of-truth, operator guide, or review note

### 10. Add stronger visual evidence

- Status: `open`
- Why it is still open:
  - repo evidence is strong in tests/logs, but weak in screenshots/diagrams/demo assets
- Main files:
  - [docs/EVIDENCE_MAP_TH.md](./EVIDENCE_MAP_TH.md)
  - [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- Acceptance:
  - add real dashboard screenshots
  - add exported architecture diagram image
  - link evidence assets from the docs index

### 11. Continue admin web coverage of high-impact settings

- Status: `partial`
- Main files:
  - [src/config/adminEditableConfig.js](../src/config/adminEditableConfig.js)
  - [src/admin/dashboard.html](../src/admin/dashboard.html)
  - [src/adminWebServer.js](../src/adminWebServer.js)
- Acceptance:
  - remaining important runtime settings are either exposed in admin or explicitly documented as runtime-only

## P3 Platform Expansion

### 12. Move tenant isolation beyond application scope

- Status: `deferred`
- Why it is deferred:
  - current review bar does not require database-per-tenant isolation
  - this is a larger platform decision, not a quick hardening pass
- Main files:
  - [docs/DATABASE_STRATEGY.md](./DATABASE_STRATEGY.md)
  - [src/services/platformService.js](../src/services/platformService.js)
- Acceptance:
  - choose either stronger schema isolation, RLS, or database-per-tenant
  - document operational consequences clearly

### 13. Expand release notes coverage

- Status: `partial`
- Main files:
  - [docs/releases/README.md](./releases/README.md)
  - [docs/releases/v1.0.0.md](./releases/v1.0.0.md)
- Acceptance:
  - every future release has release notes
  - release notes stay tied to verification and operator impact

## Runtime-Blocked Items

These are real open items, but they depend on infrastructure or a live game/runtime outside the repo.

### 14. Agent-mode live validation

- Status: `runtime-blocked`
- Main files:
  - [src/services/scumConsoleAgent.js](../src/services/scumConsoleAgent.js)
  - [scripts/send-scum-admin-command.ps1](../scripts/send-scum-admin-command.ps1)
  - [src/services/rconDelivery.js](../src/services/rconDelivery.js)
- Runtime prerequisite:
  - live Windows session
  - live SCUM client window/process
- Acceptance:
  - preflight passes on the real workstation
  - one live command/capability run succeeds

### 15. Watcher live readiness

- Status: `runtime-blocked`
- Main files:
  - [src/services/scumLogWatcherRuntime.js](../src/services/scumLogWatcherRuntime.js)
- Runtime prerequisite:
  - real `SCUM.log` path and expected log format
- Acceptance:
  - watcher reports `ready` against the configured live path

## Out of Scope for the Current Non-Delivery Review

- full game-side delivery proof for every item type
- database-per-tenant rollout
- framework rewrite of admin web or player portal
- TypeScript migration
