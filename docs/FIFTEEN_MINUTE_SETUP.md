# 15-Minute Setup Path

Last updated: `2026-03-20`

This is the shortest practical path for getting a production-style stack prepared without reading the whole repository first.

Use this path when the goal is:

- get a single-host production-style environment prepared quickly
- confirm the platform shape before deeper hardening
- avoid falling into the full multi-tenant operator docs on day one

## Who This Is For

- a small community operator
- a tenant pilot deployment
- a reviewer or customer who needs the stack running first and deeper polish second

## 1. Pick A Profile

For one-host production-style setup:

```bash
npm run env:prepare:single-host-prod
```

For a fuller multi-tenant production-style setup:

```bash
npm run env:prepare:multi-tenant-prod
```

If you want the bootstrap script to prepare env and continue on Windows:

```bash
npm run platform:bootstrap:single-host-prod:win
```

or:

```bash
npm run platform:bootstrap:multi-tenant-prod:win
```

## 2. Prepare PostgreSQL

If you do not already have PostgreSQL ready:

```bash
npm run postgres:local:setup
npm run db:generate:postgresql
npm run db:migrate:deploy:postgresql
```

Production should stay PostgreSQL-first. Do not treat SQLite as the production default path.

## 3. Start The Runtime

Manual start:

```bash
npm run start:bot
npm run start:worker
npm run start:watcher
npm run start:scum-agent
npm run start:web-standalone
```

Or use PM2:

```bash
npm run pm2:start:prod
```

## 4. Verify Before You Open Traffic

Run:

```bash
npm run doctor
npm run security:check
npm run security:rotation:check
```

If the environment is meant to act like a production deployment, also run:

```bash
npm run readiness:prod
```

## 5. Open The Right Surface

- Platform owner: `/owner`
- Tenant operator: `/tenant`
- Player portal: `/player`

Use the main role-based surfaces first. Do not start from legacy pages unless the main surface clearly does not expose the workflow you need.

## 6. First Things To Configure

Platform owner:

- confirm split-origin / cookie / OAuth settings
- confirm runtime topology and worker ownership
- confirm secret rotation readiness

Tenant operator:

- review recommended presets
- enable only the modules needed now
- validate commerce, Steam support, and delivery paths before enabling deeper community features

Players:

- link Steam
- check wallet
- understand order states
- review redeem flow basics

## 7. Important Truths

- `console-agent` still depends on Windows session and a live SCUM client
- native proof is not yet verified across every environment
- not every config is editable from the web UI
- restore is guarded and should still be treated as a maintenance workflow

## Related Documents

- [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md)
- [SINGLE_HOST_PRODUCTION_PROFILE.md](./SINGLE_HOST_PRODUCTION_PROFILE.md)
- [CUSTOMER_ONBOARDING.md](./CUSTOMER_ONBOARDING.md)
- [DATABASE_STRATEGY.md](./DATABASE_STRATEGY.md)
- [LIMITATIONS_AND_SLA_TH.md](./LIMITATIONS_AND_SLA_TH.md)
