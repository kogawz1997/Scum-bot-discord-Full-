# Architecture Overview

## Runtime Components
- `src/bot.js`: Discord client entrypoint, command loader, automod, VIP expiry job.
- `src/scumWebhookServer.js`: HTTP webhook receiver for SCUM events.
- `scum-log-watcher.js`: Tail SCUM log and send normalized webhook events.

## Data Layer
- Current primary persistence: JSON stores under `src/store/*` and `data/*`.
- Prepared future layer: Prisma schema under `prisma/schema.prisma`.

## Event Flow (SCUM -> Discord)
1. `scum-log-watcher.js` parses SCUM logs.
2. Watcher calls `POST /scum-event` with secret + guildId.
3. `scumWebhookServer` validates input and dispatches by event type.
4. `src/services/scumEvents.js` sends messages to configured channels.

## Discord Command Flow
1. `src/register-commands.js` publishes slash command metadata.
2. `src/bot.js` loads each command module from `src/commands`.
3. On interaction, matching command's `execute()` runs.

## Reliability Baseline
- Environment validation centralized at `src/utils/env.js`.
- CI workflow runs syntax lint + unit tests on push/PR.
