# Data Ownership Map

This document maps the current runtime intent of the platform by ownership boundary.

It is not a replacement for schema review, but it gives operators and maintainers one place to answer:

- Which data belongs to the platform?
- Which data belongs to a tenant?
- Which data belongs to a player?
- Which data is runtime-only and should not be treated as business truth?

Use this together with:

- [DATABASE_STRATEGY.md](./DATABASE_STRATEGY.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MIGRATION_ROLLBACK_POLICY_TH.md](./MIGRATION_ROLLBACK_POLICY_TH.md)

## Ownership Classes

### Platform-scoped

Shared control-plane data owned by the platform itself.

Examples:

- platform tenants
- subscriptions
- licenses
- API keys
- webhook endpoints
- agent runtimes
- marketplace offers
- global admin users / sessions / security events
- platform notifications and ops state

Default policy:

- backup: include in owner backups
- restore: owner-only
- export: owner-only or support-only
- purge: guarded, rarely tenant-triggered

### Tenant-scoped

Operational or commercial data that must stay inside one tenant boundary.

Examples:

- tenant config
- shop catalog
- purchases
- purchase status history
- delivery queue / dead-letter / audit
- tenant-scoped analytics and reconcile findings
- tenant-scoped notifications
- tenant player account links where the tenant relationship matters

Default policy:

- backup: include with tenant-aware restore scope
- restore: owner-only unless an explicitly safe tenant workflow exists
- export: owner or the signed-in tenant operator
- purge: tenant-aware rules only

### Player-scoped

Data tied primarily to one player identity, but still evaluated inside the tenant/runtime context that produced it.

Examples:

- wallet balances and wallet ledger
- Steam link / player account binding
- redeem state
- player-facing transaction history
- inventory-style purchase views in the portal

Default policy:

- backup: include with tenant data
- restore: guarded because balance/history mistakes are user-visible
- export: tenant or support path
- purge: privacy-aware and tenant-aware

### Runtime-only / transient

Ephemeral operational state that helps the system run but should not be treated as the only durable business source of truth.

Examples:

- in-memory queue snapshots
- live runtime supervisor snapshots
- SSE/live-feed messages
- current automation attempt windows
- current health/readiness summaries
- temporary preview tokens

Default policy:

- backup: only when useful for operator restore context
- restore: usually recreated, not authoritative
- export: acceptable for diagnostics
- purge: safe once no longer needed

## Current Practical Mapping

## Commercial + tenant management

| Area                   | Ownership       | Notes                                          |
| ---------------------- | --------------- | ---------------------------------------------- |
| Tenant records         | Platform-scoped | owner-managed control-plane identity           |
| Subscription lifecycle | Platform-scoped | commercial truth, referenced by tenant tooling |
| Licenses               | Platform-scoped | owner-issued, tenant-visible                   |
| Marketplace offers     | Platform-scoped | owner packaging layer                          |
| Tenant config          | Tenant-scoped   | routed through tenant-aware runtime paths      |

## Commerce + delivery

| Area                    | Ownership     | Notes                                                     |
| ----------------------- | ------------- | --------------------------------------------------------- |
| Shop catalog            | Tenant-scoped | tenant-owned operational catalog                          |
| Purchases               | Tenant-scoped | may imply player context, but tenant boundary comes first |
| Purchase status history | Tenant-scoped | operational audit trail of purchase state                 |
| Delivery queue          | Tenant-scoped | runtime execution state with business consequences        |
| Delivery dead-letter    | Tenant-scoped | requires guided operator review                           |
| Delivery audit evidence | Tenant-scoped | part of support and proof posture                         |

## Player identity + wallet

| Area                      | Ownership     | Notes                                         |
| ------------------------- | ------------- | --------------------------------------------- |
| Wallet balance            | Player-scoped | must still remain inside tenant-aware flow    |
| Wallet ledger             | Player-scoped | durable evidence for balance changes          |
| Steam link / account bind | Player-scoped | frequently used by support and delivery flows |
| Redeem / claim state      | Player-scoped | also tenant-aware for scope and rewards       |

## Admin + support

| Area                       | Ownership                                        | Notes                                     |
| -------------------------- | ------------------------------------------------ | ----------------------------------------- |
| Admin users / sessions     | Platform-scoped                                  | owner security posture                    |
| Security events            | Platform-scoped                                  | cross-tenant operator visibility          |
| Request logs               | Platform-scoped                                  | support/security evidence                 |
| Tenant diagnostics bundles | Platform-scoped export of tenant-scoped data     | owner-only support workflow               |
| Tenant support case        | Platform-scoped support wrapper over tenant data | summarizes lifecycle, onboarding, signals |

## Runtime + operations

| Area                        | Ownership                          | Notes                                              |
| --------------------------- | ---------------------------------- | -------------------------------------------------- |
| Runtime supervisor status   | Runtime-only                       | operational signal, not business truth             |
| Automation state windows    | Runtime-only                       | protects recovery loops                            |
| Monitoring snapshots        | Runtime-only                       | used for visibility and support                    |
| Restore preview token/state | Runtime-only + operator-controlled | should never be treated as long-term business data |

## Guardrail Intent

When adding a new entity, classify it before wiring routes:

1. Is it `platform-scoped`, `tenant-scoped`, `player-scoped`, or `runtime-only`?
2. Should it appear in owner backup/export?
3. Should it ever be writable from a tenant surface?
4. Should it be part of support diagnostics?
5. Does it need tenant DB routing or stricter DB boundaries?

If the answer is not written down, the default assumption should not be “shared until proven otherwise”.

## Database Direction

Current repository target for multi-tenant deployments:

- PostgreSQL-first
- `schema-per-tenant` as the default multi-tenant runtime target
- `database-per-tenant` as a stricter isolation tier

This map exists partly to reduce reliance on service-layer guesses for ownership and boundary decisions.
