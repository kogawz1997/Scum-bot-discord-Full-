# ADR-0004: Agent Mode Is An Operationally Constrained Backend

## Status

Accepted

## Context

Agent execution can cover flows that do not map cleanly to RCON, but it depends on a live Windows session and a working SCUM client. This makes it operationally different from a normal HTTP-only backend.

## Decision

Treat agent execution as a constrained backend with explicit safeguards:

- preflight before enqueue
- separate health status
- circuit breaker and failover policy
- optional/required runtime distinction
- operator-facing evidence and capability checks

## Consequences

Advantages:

- clearer operational model
- better failure reporting
- less risk of silent breakage when the client session is not valid

Costs:

- higher runtime dependency on local machine state
- more complex smoke and readiness logic
- live proof still depends on an actual SCUM client session

## Evidence

- `src/services/scumConsoleAgent.js`
- `src/services/rconDelivery.js`
- `scripts/post-deploy-smoke.js`
- `src/services/runtimeSupervisorService.js`
