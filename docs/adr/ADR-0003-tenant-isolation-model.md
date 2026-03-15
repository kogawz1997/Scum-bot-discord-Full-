# ADR-0003: Tenant Isolation Is Application-Scoped Today

## Status

Accepted

## Context

The repository now has tenant-aware billing, quota, config, analytics, and audit foundations. However, tenant isolation is not yet implemented as database-per-tenant or row-level security.

## Decision

Current tenant isolation is enforced in the application layer:

- API layer
- service layer
- audit and analytics paths
- tenant config boundaries

The repository must not claim database-level isolation until that work exists.

## Consequences

Advantages:

- faster feature delivery while tenant features are still evolving
- less migration overhead in early platform stages

Costs:

- every new query path must be reviewed for tenant context
- policy tests are required to reduce cross-tenant leak risk
- future migration to stronger isolation still needs a roadmap

## Evidence

- `src/services/platformService.js`
- `src/services/platformTenantConfigService.js`
- `src/adminWebServer.js`
- `README.md`
- `PROJECT_HQ.md`
