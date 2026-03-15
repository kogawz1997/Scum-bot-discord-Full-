# ADR-0001: The Project Uses A Custom SCUM Control Plane

## Status

Accepted

## Context

This repository is not only a Discord bot. It operates as a control plane across:

- Discord bot
- worker
- watcher
- admin web
- player portal
- console-agent

SCUM operations require workflow-specific behavior that generic bot tooling does not cover well:

- some actions are possible over RCON while others need an admin client
- order debugging needs traceability across multiple runtimes
- operators need a control surface beyond Discord commands

## Decision

Build the runtime and admin surface as a custom control plane instead of relying only on a generic bot framework or a generic admin dashboard framework.

## Consequences

Advantages:

- operational flow can match the SCUM domain closely
- debugging can use domain-specific evidence and audit trails
- admin UX can reflect actual runtime boundaries

Costs:

- maintenance cost is higher than a small single-process bot
- docs, CI, migration policy, and runtime boundaries need more discipline
- runtime separation between bot, worker, watcher, web, and agent needs stronger review

## Evidence

- `src/services/rconDelivery.js`
- `src/adminWebServer.js`
- `src/services/scumConsoleAgent.js`
- `docs/ARCHITECTURE.md`
- `docs/DELIVERY_CAPABILITY_MATRIX_TH.md`
