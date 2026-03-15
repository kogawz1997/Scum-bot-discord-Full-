# Refactor Plan

This file tracks the structural work that is still worth doing after the current hardening round.

## Completed in current state

- Runtime flag parsing moved into [src/config/](../src/config/).
- Bot and worker startup wiring moved into [src/bootstrap/](../src/bootstrap/).
- Admin control-panel env registry moved into [src/config/adminEditableConfig.js](../src/config/adminEditableConfig.js).
- Readiness and smoke checks now fail on required runtimes that report `ready: false`.
- Player portal startup validation and health payload assembly moved into [apps/web-portal-standalone/runtime/portalRuntime.js](../apps/web-portal-standalone/runtime/portalRuntime.js).
- Worker health payload assembly moved into [src/bootstrap/workerHealthRuntime.js](../src/bootstrap/workerHealthRuntime.js).
- Admin GET/query routing now has a dedicated module at [src/admin/api/adminGetRoutes.js](../src/admin/api/adminGetRoutes.js).
- Admin auth/session revoke and portal-bridge POST handlers now have dedicated modules under [src/admin/api/](../src/admin/api/).
- Player general/profile/social/reward API handlers now have a dedicated module at [apps/web-portal-standalone/api/playerGeneralRoutes.js](../apps/web-portal-standalone/api/playerGeneralRoutes.js).

## Still partial

### `src/bot.js`

Current state:

- Startup wiring is smaller than before.
- Interaction handlers, moderation listeners, and welcome flow are still in the same file.

Next cut:

- Move Discord interaction handlers into `src/discord/interactions/`.
- Move message moderation listeners into `src/discord/events/`.
- Keep [src/bot.js](../src/bot.js) as a thin entrypoint plus exports.

### `src/worker.js`

Current state:

- Worker startup, queue boot, and heartbeat are separated.
- Health payload assembly now lives in a bootstrap helper.
- Queue/background-job ownership is still composed in one entrypoint.

Next cut:

- Move worker health payload builder into a dedicated runtime service.
- Separate queue ownership from background job ownership more explicitly.

### `src/adminWebServer.js`

Current state:

- Config registry moved out.
- Auth/session runtime moved to `src/admin/auth/`.
- POST route groups moved to `src/admin/api/`.
- GET/query routes now have a dedicated module under `src/admin/api/`.
- Audit/export routes now live under `src/admin/audit/`.
- File is still too large and still mixes HTTP composition, login/logout, and leftover inline route cleanup.

Next cut:

- Remove the remaining legacy inline route branches from the entry file.
- Split large helper groups by concern where that reduces review cost.
- Keep the entry file focused on HTTP composition and request gating.

### `apps/web-portal-standalone/server.js`

Current state:

- Startup validation and health payload logic moved out.
- Auth/session handling moved out.
- Commerce/cart/redeem/bounty/rentbike handlers moved to `apps/web-portal-standalone/api/`.
- General/profile/social/reward/dashboard handlers moved to `apps/web-portal-standalone/api/playerGeneralRoutes.js`.
- `server.js` still owns page routing, canonical redirects, and remaining runtime composition.

Next cut:

- Move remaining non-page helpers out of `server.js`.
- Keep [apps/web-portal-standalone/server.js](../apps/web-portal-standalone/server.js) as a thin HTTP composition layer.

## Not planned in this pass

- Full TypeScript migration
- Framework rewrite of admin web or player portal
- Database-per-tenant isolation
- Replacing Prisma

## Acceptance bar for the next refactor pass

- Entry files should mostly parse env, create runtime container, and mount services.
- Runtime-specific env requirements should come from one config boundary.
- Admin route permissions should be testable without loading the whole HTTP server file.
- Tests should continue to pass under the PostgreSQL runtime profile used on this machine.
