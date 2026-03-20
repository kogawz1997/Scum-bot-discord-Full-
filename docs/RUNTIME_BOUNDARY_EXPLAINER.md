# Runtime Boundary Explainer

This is the shortest explanation of what each runtime is responsible for.

Use it when someone asks:

- "Which process owns this behavior?"
- "Why does this action belong in worker and not bot?"
- "Which runtime should I restart or inspect first?"

## Runtime Roles

| Runtime         | Main job                                                              | First place to look                           |
| --------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `bot`           | Discord gateway, commands, admin web bootstrap, SCUM webhook receiver | `/owner`, `/tenant`, Discord command behavior |
| `worker`        | Delivery queue work and background jobs                               | delivery queue, dead-letter, lifecycle watch  |
| `watcher`       | Read `SCUM.log` and post parsed events into the webhook path          | event ingestion, log tail health              |
| `admin web`     | Admin API, auth, RBAC, recovery, observability, guarded config        | `/owner` and `/tenant`                        |
| `player portal` | Player login, wallet, orders, redeem, profile, Steam link             | `/player`                                     |
| `console-agent` | Optional bridge between commands and SCUM admin client                | agent-mode execution only                     |

## Simple Rules

- If the problem is player-facing purchase execution, start with `worker` and delivery lifecycle.
- If the problem is Discord commands or admin auth, start with `bot` and admin web.
- If the problem is SCUM event ingestion, start with `watcher`.
- If the problem is player self-service pages, start with `player portal`.
- If the problem exists only in `agent` mode, inspect `console-agent` and the Windows / SCUM client reality behind it.

## Important Boundaries

- `bot` is not the same thing as `worker`
- `admin web` is an operational surface, not the delivery engine itself
- `player portal` is separate from admin flows on purpose
- `console-agent` is optional and still depends on Windows session + SCUM client state

## When Operators Get Stuck

- Delivery issue: open `/tenant` -> `Commerce + Delivery`
- Tenant support issue: open `/owner` -> `Tenant Fleet` -> `Support Case`
- Security or session issue: open `/owner` -> `Security + Audit`
- Restart / maintenance communication: use the restart preset, then the legacy delivery workbench if deeper flow is needed

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md)
- [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md)
