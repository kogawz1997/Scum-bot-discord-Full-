# FIIX Brief

Source prompt preserved from the former root `fiix.txt` so the repository root stays clean and validation-safe.

## Repository reality to respect

- Separate runtimes already exist for:
  - Discord bot
  - admin web UI
  - player portal
  - worker
  - watcher
  - optional console-agent
- PostgreSQL is the active production/runtime database path.
- Prisma is the ORM/schema toolchain.
- SQLite remains only for dev, import, compatibility, or offline tooling paths.
- The repo already contains health, readiness, smoke, and security checks, plus admin/player surfaces, audit foundations, control/config surfaces, restore preview, and delivery verification foundations.
- Some areas are intentionally partial today: not every config/env setting is admin-covered, restore is guarded rather than a full automatic rollback engine, native-proof coverage is still incomplete across multiple environments, and some operator/player flows remain long-tail rather than fully productized.

## Main mission

Upgrade the repository toward a stronger production-ready state without breaking existing behavior, contracts, or runtime boundaries.

## Primary focus areas

1. security hardening
2. observability and alert-friendly runtime visibility
3. restore and rollback safety
4. centralized admin config control coverage
5. reduced fragility around console-agent-dependent paths
6. multi-environment verification and evidence coverage
7. API and data contract consistency
8. admin operational tools for delivery, support, and incidents
9. player portal long-tail UX and confidence
10. deployment and operator onboarding simplification
11. keeping the three web surfaces production-safe while preserving current behavior

## Hard non-breaking rules

Do not:

- rewrite the project into React, Vue, Next, Nuxt, or another frontend framework
- change route names
- change endpoint URLs
- change request/response contracts unless clearly backward-compatible
- change auth, session, cookie, or CSRF assumptions in a breaking way
- break Discord SSO
- break TOTP or step-up flows
- break SSE/live/admin runtime behavior
- break worker, watcher, or bot runtime boundaries
- break Prisma or database behavior
- remove current auditability
- remove current restore safeguards
- fake evidence or verification

You must:

- preserve backward compatibility where practical
- make improvements incrementally
- prefer additive hardening over risky rewrites
- preserve operator visibility
- preserve current runtime topology
- keep changes auditable and production-safe

## Delivery process

1. Inspect the current implementation for each focus area.
2. Identify gaps that are real and code-backed.
3. Prioritize the highest-value, lowest-risk improvements first.
4. Implement changes incrementally.
5. Preserve backward compatibility and auditability.
6. Update docs, runbooks, and operator guidance where needed.
7. Add tests, checks, or validation where appropriate.
8. At the end, provide:
   - a summary of changes
   - compatibility notes
   - residual risks
   - follow-up recommendations

## Success criteria

Success means:

- stronger security without breaking auth flows
- clearer observability and incident visibility
- safer restore and rollback operations
- broader but still safe admin config control
- less fragile console-agent-dependent operations
- better multi-environment verification and evidence
- more consistent contracts
- stronger admin support tooling
- better player portal clarity and confidence
- easier and safer deployment and onboarding
- all existing core behaviors still working
- all changes remaining honest, production-safe, and auditable
