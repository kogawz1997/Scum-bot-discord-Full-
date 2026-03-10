# Architecture Overview

สถาปัตยกรรมปัจจุบันรองรับ runtime split แบบ production-ready

## 1) Components

- `src/bot.js`
  - Discord gateway + command routing
  - Admin web server
  - SCUM webhook receiver
- `src/worker.js`
  - RCON delivery queue worker
  - Rentbike scheduler/runtime
- `scum-log-watcher.js`
  - tail SCUM.log
  - parse event และยิง webhook เข้าบอท
- `apps/web-portal-standalone/server.js`
  - Player-only web portal (Discord OAuth)
  - ใช้ service/store โดยตรง ไม่พึ่ง `/admin/api`

## 2) Data Layer

- Primary data store: Prisma + SQLite
- Runtime cache: in-memory + startup hydration + Prisma write-through
- Production guard:
  - `NODE_ENV=production` ต้องมี `PERSIST_REQUIRE_DB=true`
  - ถ้า DB ไม่พร้อม ระบบจะ fail-fast (ไม่ fallback)

## 3) Flow

```mermaid
flowchart LR
  A[SCUM.log] --> B[Watcher]
  B --> C[/scum-event webhook]
  C --> D[Bot]
  D --> E[Discord]
  D --> F[(Prisma/SQLite)]
  G[Worker] --> F
  H[Player Portal] --> F
  I[Admin Panel] --> D
  I --> F
```

## 4) Runtime Flags

- Bot:
  - `BOT_ENABLE_SCUM_WEBHOOK`
  - `BOT_ENABLE_ADMIN_WEB`
  - `BOT_ENABLE_RENTBIKE_SERVICE`
  - `BOT_ENABLE_DELIVERY_WORKER`
- Worker:
  - `WORKER_ENABLE_RENTBIKE`
  - `WORKER_ENABLE_DELIVERY`

## 5) Health Endpoints

- Bot: `http://<BOT_HEALTH_HOST>:<BOT_HEALTH_PORT>/healthz`
- Worker: `http://<WORKER_HEALTH_HOST>:<WORKER_HEALTH_PORT>/healthz`
- Watcher: `http://<SCUM_WATCHER_HEALTH_HOST>:<SCUM_WATCHER_HEALTH_PORT>/healthz`
- Admin Web: `http://<ADMIN_WEB_HOST>:<ADMIN_WEB_PORT>/healthz`
- Player Portal: `http://<WEB_PORTAL_HOST>:<WEB_PORTAL_PORT>/healthz`

## 6) Readiness / Smoke

- ก่อน deploy:
  - `npm run readiness:prod`
- หลัง deploy:
  - `npm run smoke:postdeploy`
