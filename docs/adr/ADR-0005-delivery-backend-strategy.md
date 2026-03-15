# ADR-0005: Delivery Backend Strategy Uses Explicit RCON And Agent Paths

## Status

Accepted

## Context

The platform supports more than one execution backend for delivery. Without a clear backend model, debugging and audit trails become ambiguous.

## Decision

Each order must carry explicit execution metadata:

- `executionMode`
- `backend`
- `commandPath`
- `retryCount`

The system keeps both RCON and agent paths explicit rather than hiding them behind a generic opaque executor.

## Consequences

Advantages:

- easier debugging
- clearer audit and evidence records
- better support for failover and backend-specific policy

Costs:

- more code paths to test
- more operator-facing state to document

## Evidence

- `src/services/rconDelivery.js`
- `src/store/deliveryAuditStore.js`
- `docs/DELIVERY_CAPABILITY_MATRIX_TH.md`
- `test/rcon-delivery.integration.test.js`
