# Single-Host Production Profile

Last updated: `2026-03-20`

Use this profile when one host is enough for the current customer:

- one SCUM community or one tenant at a time
- PostgreSQL-backed runtime
- split owner / tenant / player surfaces still kept intact
- no claim that this equals the full multi-environment proof bar

This profile is intentionally smaller than the full multi-tenant production shape, but it does **not** roll the platform back into a bot-only monolith.

## What This Profile Means

`single-host-prod` keeps:

- owner console
- tenant console
- player portal
- PostgreSQL-first persistence
- watcher support
- optional console-agent support

It simplifies by running delivery and rent-bike work inside the bot process on the same host instead of requiring a dedicated worker process.

## Prepare Env Files

Preview the merged env files first:

```bat
npm run env:preview:single-host-prod
```

Materialize `.env` files from the profile:

```bat
npm run env:prepare:single-host-prod
```

If you want the bootstrap script to prepare the env profile for you:

```bat
npm run platform:bootstrap:single-host-prod:win
```

## Runtime Shape

This profile assumes:

- `bot`
  - Discord gateway
  - admin web
  - delivery worker enabled
  - rent-bike worker enabled
- `watcher`
  - optional but recommended
- `web`
  - standalone player portal
- dedicated `worker`
  - disabled for this profile

## Database Stance

- PostgreSQL is still required
- `PERSIST_REQUIRE_DB=true`
- `PERSIST_LEGACY_SNAPSHOTS=false`

Do **not** treat SQLite as the production path for this profile.

## When To Use This

Use `single-host-prod` when:

- the customer is small
- one machine is acceptable operationally
- you need a simpler bootstrap path
- you still want the official owner / tenant / player surface split

## When Not To Use This

Do **not** use this as your proof bar for:

- native delivery verification across multiple environments
- high-confidence runtime separation claims
- larger multi-tenant operational scale

For that, keep using the full multi-tenant production posture and the live evidence requirements in:

- [WORKLIST.md](./WORKLIST.md)
- [PRODUCT_READY_GAP_MATRIX.md](./PRODUCT_READY_GAP_MATRIX.md)
- [CUSTOMER_ONBOARDING.md](./CUSTOMER_ONBOARDING.md)
