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
  - Discord OAuth client logic now lives under `src/admin/auth/`
  - `entity`, `config/control-panel`, `commerce/delivery`, `platform`, `auth`, and portal-bridge POST route groups now live under `src/admin/api/`
  - public/platform/SSO routes now live under `src/admin/api/adminPublicRoutes.js`
  - GET/query routes now have a dedicated module under `src/admin/api/`
  - audit/export routing is extracted under `src/admin/audit/`
  - tenant scope helpers and permission gating are extracted
  - admin page/template/static asset loading now lives under `src/admin/runtime/adminPageRuntime.js`
  - admin HTTP/cookie/TOTP/response helpers now live under `src/admin/runtime/adminHttpRuntime.js`
  - admin request/origin/body helpers and restore-maintenance gating now live under `src/admin/runtime/adminRequestRuntime.js`
  - admin access/session/cookie gating helpers now live under `src/admin/runtime/adminAccessRuntime.js`
  - admin control-panel env/application helpers now live under `src/admin/runtime/adminControlPanelRuntime.js`
  - admin login/rate-limit/security-event helpers now live under `src/admin/runtime/adminSecurityRuntime.js`
  - admin live/SSE/metrics helpers now live under `src/admin/runtime/adminLiveRuntime.js`
  - admin security event export helpers now live under `src/admin/runtime/adminSecurityExportRuntime.js`
  - admin request handler composition now lives under `src/admin/runtime/adminServerRuntime.js`
  - admin server lifecycle/bootstrap wiring now lives under `src/admin/runtime/adminServerLifecycleRuntime.js`
  - the remaining inline GET duplication has been removed from the entry file
  - login/logout flow now lives in the auth POST route module
  - the entry file is now mostly dependency wiring, but it still concentrates a large amount of runtime assembly in one place
- Main files:
  - [src/adminWebServer.js](../src/adminWebServer.js)
  - [src/admin/auth/adminAuthRuntime.js](../src/admin/auth/adminAuthRuntime.js)
  - [src/admin/auth/adminDiscordOauthClient.js](../src/admin/auth/adminDiscordOauthClient.js)
  - [src/admin/api/adminGetRoutes.js](../src/admin/api/adminGetRoutes.js)
  - [src/admin/api/adminAuthPostRoutes.js](../src/admin/api/adminAuthPostRoutes.js)
  - [src/admin/api/adminPortalPostRoutes.js](../src/admin/api/adminPortalPostRoutes.js)
  - [src/admin/api/adminEntityPostRoutes.js](../src/admin/api/adminEntityPostRoutes.js)
  - [src/admin/api/adminConfigPostRoutes.js](../src/admin/api/adminConfigPostRoutes.js)
  - [src/admin/api/adminCommerceDeliveryPostRoutes.js](../src/admin/api/adminCommerceDeliveryPostRoutes.js)
  - [src/admin/api/adminPlatformPostRoutes.js](../src/admin/api/adminPlatformPostRoutes.js)
  - [src/admin/runtime/adminPageRuntime.js](../src/admin/runtime/adminPageRuntime.js)
  - [src/admin/runtime/adminHttpRuntime.js](../src/admin/runtime/adminHttpRuntime.js)
  - [src/admin/runtime/adminRequestRuntime.js](../src/admin/runtime/adminRequestRuntime.js)
  - [src/admin/runtime/adminAccessRuntime.js](../src/admin/runtime/adminAccessRuntime.js)
  - [src/admin/runtime/adminControlPanelRuntime.js](../src/admin/runtime/adminControlPanelRuntime.js)
  - [src/admin/runtime/adminSecurityRuntime.js](../src/admin/runtime/adminSecurityRuntime.js)
  - [src/admin/runtime/adminLiveRuntime.js](../src/admin/runtime/adminLiveRuntime.js)
  - [src/admin/runtime/adminSecurityExportRuntime.js](../src/admin/runtime/adminSecurityExportRuntime.js)
  - [src/admin/runtime/adminServerRuntime.js](../src/admin/runtime/adminServerRuntime.js)
  - [src/admin/runtime/adminServerLifecycleRuntime.js](../src/admin/runtime/adminServerLifecycleRuntime.js)
  - [src/admin/audit/adminAuditRoutes.js](../src/admin/audit/adminAuditRoutes.js)
  - [src/utils/adminPermissionMatrix.js](../src/utils/adminPermissionMatrix.js)
  - [src/store/adminSecurityEventStore.js](../src/store/adminSecurityEventStore.js)
- Next cut:
  - reduce the remaining dependency assembly surface only if it lowers review cost materially
  - keep the entry file focused on composition/bootstrap only
- Acceptance:
  - `src/adminWebServer.js` stays composition/bootstrap only
  - route permissions are testable without loading the whole server file
  - current admin API integration tests stay green

### 2. Split `apps/web-portal-standalone/server.js`

- Status: `partial`
- Why it is still open:
  - startup validation and auth/session runtime are now separated
  - commerce/cart/redeem/bounty/rentbike routes now live under `apps/web-portal-standalone/api/`
  - profile/social/reward/general dashboard routes now live under `apps/web-portal-standalone/api/playerGeneralRoutes.js`
  - auth/session handling now lives under `apps/web-portal-standalone/auth/`
  - page routing and canonical redirect handling now have a dedicated module under `apps/web-portal-standalone/runtime/portalPageRoutes.js`
  - portal runtime URL/path helpers now also live under `apps/web-portal-standalone/runtime/portalRuntime.js`
  - shared portal env/body/player helper assembly now lives under `apps/web-portal-standalone/runtime/portalHelperRuntime.js`
  - portal response/security/notification helpers now live under `apps/web-portal-standalone/runtime/portalResponseRuntime.js`
  - portal reward/wheel/timezone helpers now live under `apps/web-portal-standalone/runtime/portalRewardRuntime.js`
  - request dispatch and cleanup timer now live under `apps/web-portal-standalone/runtime/portalRequestRuntime.js`
  - page/static asset loading now lives under `apps/web-portal-standalone/runtime/portalPageAssetRuntime.js`
  - HTTP server listen/error/signal wiring now lives under `apps/web-portal-standalone/runtime/portalServerLifecycle.js`
  - helper/auth/route bootstrap wiring now lives under `apps/web-portal-standalone/runtime/portalBootstrapRuntime.js`
  - `server.js` is now a thin bootstrap entrypoint
- Main files:
  - [apps/web-portal-standalone/server.js](../apps/web-portal-standalone/server.js)
  - [apps/web-portal-standalone/auth/portalAuthRuntime.js](../apps/web-portal-standalone/auth/portalAuthRuntime.js)
  - [apps/web-portal-standalone/runtime/portalPageAssetRuntime.js](../apps/web-portal-standalone/runtime/portalPageAssetRuntime.js)
  - [apps/web-portal-standalone/runtime/portalRequestRuntime.js](../apps/web-portal-standalone/runtime/portalRequestRuntime.js)
  - [apps/web-portal-standalone/runtime/portalRuntime.js](../apps/web-portal-standalone/runtime/portalRuntime.js)
  - [apps/web-portal-standalone/runtime/portalHelperRuntime.js](../apps/web-portal-standalone/runtime/portalHelperRuntime.js)
  - [apps/web-portal-standalone/runtime/portalResponseRuntime.js](../apps/web-portal-standalone/runtime/portalResponseRuntime.js)
  - [apps/web-portal-standalone/runtime/portalRewardRuntime.js](../apps/web-portal-standalone/runtime/portalRewardRuntime.js)
  - [apps/web-portal-standalone/runtime/portalBootstrapRuntime.js](../apps/web-portal-standalone/runtime/portalBootstrapRuntime.js)
  - [apps/web-portal-standalone/runtime/portalServerLifecycle.js](../apps/web-portal-standalone/runtime/portalServerLifecycle.js)
  - [apps/web-portal-standalone/runtime/portalPageRoutes.js](../apps/web-portal-standalone/runtime/portalPageRoutes.js)
  - [apps/web-portal-standalone/api/playerCommerceRoutes.js](../apps/web-portal-standalone/api/playerCommerceRoutes.js)
  - [apps/web-portal-standalone/api/playerGeneralRoutes.js](../apps/web-portal-standalone/api/playerGeneralRoutes.js)
  - [test/web-portal-standalone.player-mode.integration.test.js](../test/web-portal-standalone.player-mode.integration.test.js)
- Next cut:
  - keep follow-up changes out of `server.js` unless the entrypoint grows again
  - add targeted tests only if new bootstrap responsibilities appear
- Acceptance:
  - route behavior and player-mode tests remain unchanged
  - `server.js` no longer owns business logic directly
  - `server.js` stays a thin bootstrap entrypoint

### 3. Split `src/admin/dashboard.html`

- Status: `partial`
- Why it is still open:
  - inline CSS is now extracted to `src/admin/assets/dashboard.css`
  - auth/security UI helpers now live in `src/admin/assets/dashboard-auth.js`
  - delivery/notification UI helpers now live in `src/admin/assets/dashboard-delivery.js`
  - audit/dataset UI helpers now live in `src/admin/assets/dashboard-audit.js`
  - observability/chart/export helpers now live in `src/admin/assets/dashboard-observability.js`
  - overview/landing helpers now live in `src/admin/assets/dashboard-overview.js`
  - control-panel helpers now live in `src/admin/assets/dashboard-control.js`
  - browser shell/common helpers now live in `src/admin/assets/dashboard-shell.js`
  - config-editor/simple-config helpers now live in `src/admin/assets/dashboard-config.js`
  - shop catalog/bundle helpers now live in `src/admin/assets/dashboard-shop.js`
  - snapshot/session/form runtime helpers now live in `src/admin/assets/dashboard-runtime.js`
  - browser DOM refs now live in `src/admin/assets/dashboard-dom.js`
  - browser mutable state now lives in `src/admin/assets/dashboard-state.js`
  - browser event binding/startup wiring now lives in `src/admin/assets/dashboard-bindings.js`
  - the HTML shell is smaller, but the UI is still split across large browser assets and remains expensive to review
- Main files:
  - [src/admin/dashboard.html](../src/admin/dashboard.html)
  - [src/admin/assets/dashboard-audit.js](../src/admin/assets/dashboard-audit.js)
  - [src/admin/assets/dashboard-auth.js](../src/admin/assets/dashboard-auth.js)
  - [src/admin/assets/dashboard-dom.js](../src/admin/assets/dashboard-dom.js)
  - [src/admin/assets/dashboard-control.js](../src/admin/assets/dashboard-control.js)
  - [src/admin/assets/dashboard-shell.js](../src/admin/assets/dashboard-shell.js)
  - [src/admin/assets/dashboard-state.js](../src/admin/assets/dashboard-state.js)
  - [src/admin/assets/dashboard-config.js](../src/admin/assets/dashboard-config.js)
  - [src/admin/assets/dashboard-delivery.js](../src/admin/assets/dashboard-delivery.js)
  - [src/admin/assets/dashboard-observability.js](../src/admin/assets/dashboard-observability.js)
  - [src/admin/assets/dashboard-overview.js](../src/admin/assets/dashboard-overview.js)
  - [src/admin/assets/dashboard-shop.js](../src/admin/assets/dashboard-shop.js)
  - [src/admin/assets/dashboard-runtime.js](../src/admin/assets/dashboard-runtime.js)
  - [src/admin/assets/dashboard-bindings.js](../src/admin/assets/dashboard-bindings.js)
  - [src/admin/assets/dashboard.css](../src/admin/assets/dashboard.css)
- Next cut:
  - keep browser assets grouped by concern as new UI work lands
  - avoid reintroducing a new monolithic browser runtime file
- Acceptance:
  - no single browser asset owns the entire admin UI behavior
  - admin UI regression tests and smoke still pass

### 4. Finish admin/config boundary audit

- Status: `partial`
- Why it is still open:
  - env registry now classifies keys as `admin-editable`, `runtime-only`, or `secret-only`
  - control-panel payload now exposes env catalog rows, policy summary, and `restart-required` metadata
  - control-panel UI now renders the env catalog and policy/apply mode per key
  - high-impact admin, watcher, agent, delivery, worker, login/rate-limit, and portal session/map settings are now in the registry
  - admin web still does not surface every high-impact setting as a first-class dedicated form input
- Main files:
  - [src/config/adminEditableConfig.js](../src/config/adminEditableConfig.js)
  - [src/adminWebServer.js](../src/adminWebServer.js)
  - [src/admin/dashboard.html](../src/admin/dashboard.html)
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
  - shared tenant-scope helpers now exist and cross-tenant denial tests cover key platform routes
  - tenant denial tests now also cover control-panel settings, config mutation gates, tenant-config reads, quota/webhook scope, and monitoring scope for tenant-scoped admins
  - some admin/config/query paths still rely on application discipline rather than stronger isolation
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
  - runtime health normalization now has a shared helper under `src/utils/runtimeStatus.js`
  - `doctor`, `security:check`, `readiness`, `smoke`, and `doctor:topology` now emit the same machine-readable report shape via `--json`
  - downstream consumers and docs now have an exported contract diagram
  - `ci:verify` now parses the shared JSON reports into `artifacts/ci/verification-contract.json`
  - downstream consumers outside `ci:verify` are still mostly log-driven
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

### 7. Clean up document encoding and consistency

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

### 8. Add stronger visual evidence

- Status: `partial`
- Why it is still open:
  - exported architecture and validation diagrams now exist under `docs/assets/`
  - admin login, authenticated admin dashboard, player landing, player login, and player showcase PNG captures now exist under `docs/assets/`
  - a simple demo GIF now exists under `docs/assets/platform-demo.gif`
  - scripted PNG capture now boots local admin/player surfaces without forcing the test Prisma datasource
  - repo evidence is still weak in authenticated player screenshots and live in-game evidence
- Main files:
  - [docs/EVIDENCE_MAP_TH.md](./EVIDENCE_MAP_TH.md)
  - [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
  - [docs/assets/README.md](./assets/README.md)
  - [docs/assets/CAPTURE_CHECKLIST.md](./assets/CAPTURE_CHECKLIST.md)
- Acceptance:
  - add real dashboard screenshots
  - keep exported architecture and validation diagrams current
  - link evidence assets from the docs index

### 9. Continue admin web coverage of high-impact settings

- Status: `partial`
- Main files:
  - [src/config/adminEditableConfig.js](../src/config/adminEditableConfig.js)
  - [src/admin/dashboard.html](../src/admin/dashboard.html)
  - [src/adminWebServer.js](../src/adminWebServer.js)
- Acceptance:
  - remaining important runtime settings are either exposed in admin or explicitly documented as runtime-only

## P3 Platform Expansion

### 10. Move tenant isolation beyond application scope

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

### 11. Expand release notes coverage

- Status: `partial`
- Main files:
  - [docs/releases/README.md](./releases/README.md)
  - [docs/releases/v1.0.0.md](./releases/v1.0.0.md)
- Acceptance:
  - every future release has release notes
  - release notes stay tied to verification and operator impact

## Runtime-Blocked Items

These are real open items, but they depend on infrastructure or a live game/runtime outside the repo.

### 12. Agent-mode live validation

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
