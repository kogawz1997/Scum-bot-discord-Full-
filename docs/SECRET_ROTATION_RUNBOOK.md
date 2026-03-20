# Secret Rotation Runbook

Use this runbook when rotating production secrets without changing business logic,
tenant behavior, or route contracts.

## Scope

This covers the main secrets used by the platform today:

- `DISCORD_TOKEN`
- `SCUM_WEBHOOK_SECRET`
- `ADMIN_WEB_PASSWORD`
- `ADMIN_WEB_TOKEN`
- `ADMIN_WEB_2FA_SECRET`
- `ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET`
- `WEB_PORTAL_DISCORD_CLIENT_SECRET`
- `RCON_PASSWORD`
- `SCUM_CONSOLE_AGENT_TOKEN`

## 1. Before rotation

1. Confirm which runtimes are active:
   - bot
   - worker
   - watcher
   - admin web
   - player portal
   - console-agent
2. Preview the current reload/validation matrix:

```bash
npm run security:rotation:check
```

3. If you need to regenerate production-safe secrets and cookie/origin defaults,
   preview first:

```bash
npm run security:rotate:prod:dry
```

## 2. Rotate secrets

Apply the production rotation scaffold:

```bash
npm run security:rotate:prod -- --write
```

If Discord secrets are rotated outside the repo, update them in the relevant env
files before reload.

## 3. Required operator actions after rotation

1. Import the new `ADMIN_WEB_2FA_SECRET` into the authenticator app before the
   next admin login.
2. Reload the affected runtimes shown by `security:rotation:check`.
3. Keep a short note of:
   - what secret was rotated
   - when it was rotated
   - which runtimes were reloaded
   - who performed the change

## 4. Post-rotation validation

Run the checks in this order:

```bash
npm run security:rotation:check
npm run doctor
npm run security:check
npm run readiness:prod
```

Recommended manual smoke checks:

- admin login
- player portal login
- webhook ingest path
- one delivery preflight or dry-run
- console-agent preflight when agent mode is enabled

## 5. What the rotation check gives you

`npm run security:rotation:check` reports:

- which secrets are required right now
- which runtimes must be reloaded after each rotation
- which validation steps should run next
- drift that can break post-rotation login or runtime recovery

Use JSON output when you need to archive evidence:

```bash
npm run security:rotation:check -- --json
```

## 6. Common failure patterns

- `ADMIN_WEB_SSO_DISCORD_REDIRECT_URI origin ... is not listed`
  - fix admin origin / redirect mismatch before reopening admin login
- `WEB_PORTAL_LEGACY_ADMIN_URL origin ... is not listed`
  - fix split-origin config before reopening player login
- `Delivery ownership is split across bot and worker`
  - choose one delivery owner before rotating `RCON_PASSWORD`
- `... is missing or still placeholder`
  - do not reopen production traffic until the real secret is set
