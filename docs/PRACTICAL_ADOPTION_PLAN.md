# Practical Adoption Plan

Last updated: `2026-03-20`

This file maps the practical ideas worth borrowing from smaller community-bot repos into the real remaining gaps of this platform.

It is intentionally separate from:

- [WORKLIST.md](./WORKLIST.md), which remains the source of truth for the required backlog
- [PRODUCT_READY_GAP_MATRIX.md](./PRODUCT_READY_GAP_MATRIX.md), which remains the stricter product-ready overlay

Use this file when the question is:

- "What should we simplify next?"
- "Which ideas from smaller SCUM bots are worth adapting here?"
- "How do we reduce complexity without throwing away the platform architecture?"

## What We Borrow On Purpose

The main ideas worth borrowing are not architectural downgrades. They are practical usability patterns:

- shorter onboarding path
- clearer support shortcuts
- faster operator actions
- better single-host deployment profile
- more obvious first-run player guidance
- optional community features instead of everything feeling mandatory

## Mapping: Borrowed Idea -> Current Gap

| Borrowed idea                      | Why it helps                                                                                                                    | Current gap it improves                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Single-host community profile      | Makes the platform easier to adopt for one-server customers without pretending they need the full multi-tenant story on day one | Deployment simplification, documentation polish, commercial readiness |
| Short operator shortcuts           | Reduces clicks and cognitive load for common support/ops tasks                                                                  | Admin operational tools, admin UX polish                              |
| 15-minute setup path               | Gives operators a fast "get it running first" route instead of dropping them into full platform docs immediately                | Deployment simplification, documentation polish                       |
| Restart announcement preset        | Turns a common community workflow into a supported pattern instead of tribal knowledge                                          | Admin operational tools, support workflow                             |
| Support-first commands/actions     | Makes player and tenant issues easier to resolve from one surface                                                               | Admin operational tools, commercial readiness                         |
| First-run player onboarding        | Helps players understand wallet, link, redeem, and purchase state quickly                                                       | Player portal improvement                                             |
| Optional community modules         | Lets simple tenants stay simple and advanced tenants opt into more                                                              | Commercial readiness, admin UX polish                                 |
| Short runtime boundary explanation | Makes the platform feel easier to trust and operate                                                                             | Documentation polish, deployment simplification                       |

## Priority Order

### Phase 1: Simplify What Operators Touch Every Day

These are the highest-value local improvements because they reduce friction without changing the platform model.

1. Add more quick actions to owner and tenant surfaces for the most common support tasks
2. Add preset restart-announcement and maintenance communication flows
3. Add a short single-host deployment profile to docs and setup scripts
4. Add player first-run guidance for wallet, Steam link, purchase, and redeem
5. Add tenant-side recommended presets and optional-module guides so smaller communities can stay simple without losing the deeper workbench

Expected impact:

- faster support handling
- easier onboarding for smaller communities
- less fear around daily operations

Current local repo pass already includes:

- single-host profile overlays and bootstrap docs
- owner / tenant quick actions and support toolkit surfaces
- restart announcement preset docs and tenant support entry point
- first-run player guidance
- optional community modules / recommended presets
- short runtime boundary explainer docs

## Phase 2: Make The Platform Feel Smaller Without Making It Weaker

These items keep the multi-tenant platform intact, but let simpler tenants experience it as a smaller system.

1. Make community features explicitly optional packs or presets
2. Add tenant-facing "recommended defaults" for common server types
3. Split docs more aggressively into:
   - 5-minute operator path
   - single-host production path
   - multi-tenant production path
4. Keep legacy/deep workflows behind advanced workbench paths instead of the main path

Expected impact:

- lower complexity for small tenants
- cleaner operator experience
- better sales/demo story

## Phase 3: Pair Simplicity With The Hard Remaining Product Gaps

These are still the real hard blockers from the stricter product-ready bar.

1. Reduce console-agent dependency on Windows session and SCUM client state
2. Prove native delivery verification on more than one environment
3. Harden restore / rollback into a flow another operator can run confidently
4. Centralize more config control into admin instead of manual env edits

Borrowed simplicity patterns help here too:

- use short guided runbooks instead of deep operator knowledge
- provide one-click diagnostics before manual intervention
- keep the visible state machine simple even if the backend remains complex

## Concrete Next Tasks

If the goal is "continue the repo-side work in the most pragmatic order", do this next:

1. Add a `single-host-prod` bootstrap path that is intentionally smaller than the full multi-tenant production profile
2. Add owner/tenant quick actions for the top support flows:
   - delivery stuck
   - wallet mismatch
   - Steam link issue
   - restart announcement
3. Add player first-run guidance blocks in the portal:
   - link Steam
   - check wallet
   - understand order states
   - redeem flow basics
4. Keep pushing command-state / event-state clarity so operators always know:
   - queued
   - sent
   - acknowledged
   - verified
   - failed
5. After that, continue only with the real hard blockers:
   - console-agent dependency
   - native proof across environments

## Important Non-Goals

Do not borrow these from smaller community-bot repos:

- monolithic bot-only architecture
- weak deployment discipline
- shared-everything data assumptions
- loose operational evidence standards
- "works on our server" as a release bar

The value to borrow is simplicity and ergonomics, not lower engineering standards.
