# คู่มืออธิบายตัวแปร `.env`

อัปเดตล่าสุด: **2026-03-24**

เอกสารนี้สรุปตัวแปรสำคัญที่ใช้จริงกับ runtime และ validation ปัจจุบันของ repo

ไฟล์อ้างอิง:

- root local: [../.env.example](../.env.example)
- root production: [../.env.production.example](../.env.production.example)
- portal local: [../apps/web-portal-standalone/.env.example](../apps/web-portal-standalone/.env.example)
- portal production: [../apps/web-portal-standalone/.env.production.example](../apps/web-portal-standalone/.env.production.example)

## หลักการใช้งาน

- `.env.example` ใช้เป็น template สำหรับ local หรือ development
- `.env.production.example` ใช้เป็น baseline สำหรับ production
- player portal โหลดค่าจาก `apps/web-portal-standalone/.env` ก่อน แล้ว fallback บางตัวไป root `.env`
- production runtime ควรใช้ external runtime-data path ไม่ใช่เก็บ mutable state ใน repo

## 1. Core runtime

### Discord bot

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`

### Database

- `DATABASE_URL`
- `DATABASE_PROVIDER`
- `PRISMA_SCHEMA_PROVIDER`
- `TENANT_DB_TOPOLOGY_MODE`
  - `shared`
  - `schema-per-tenant`
  - `database-per-tenant`

production ควรใช้ PostgreSQL

### Persistence

- `PERSIST_REQUIRE_DB=true`
- `PERSIST_LEGACY_SNAPSHOTS=false`
- `BOT_DATA_DIR`
  - ถ้าตั้งเอง ระบบจะใช้ path นี้
  - ถ้าไม่ตั้ง:
    - dev/local แบบไม่บังคับ DB-only จะใช้ `./data`
    - production หรือ `PERSIST_REQUIRE_DB=true` จะใช้ OS-managed state dir

## 2. Admin web

### Host และ origin

- `ADMIN_WEB_HOST`
- `ADMIN_WEB_PORT`
- `ADMIN_WEB_ALLOWED_ORIGINS`
- `ADMIN_WEB_TRUST_PROXY`
- `ADMIN_WEB_ENFORCE_ORIGIN_CHECK=true`

### Session และ cookies

- `ADMIN_WEB_SESSION_COOKIE_NAME`
- `ADMIN_WEB_SESSION_COOKIE_PATH=/`
- `ADMIN_WEB_SESSION_COOKIE_SAMESITE=Strict`
- `ADMIN_WEB_SESSION_COOKIE_DOMAIN`
- `ADMIN_WEB_SESSION_TTL_HOURS`
- `ADMIN_WEB_SECURE_COOKIE=true` ใน production
- `ADMIN_WEB_HSTS_ENABLED=true` ใน production

หมายเหตุ:

- route หลักปัจจุบันคือ `/owner` และ `/tenant`
- เพราะฉะนั้น `ADMIN_WEB_SESSION_COOKIE_PATH` ต้องเป็น `/`

### Auth hardening

- `ADMIN_WEB_PASSWORD`
- `ADMIN_WEB_TOKEN`
- `ADMIN_WEB_2FA_ENABLED=true`
- `ADMIN_WEB_2FA_SECRET`
- `ADMIN_WEB_STEP_UP_ENABLED=true`
- `ADMIN_WEB_STEP_UP_TTL_MINUTES`
- `ADMIN_WEB_LOCAL_RECOVERY=false` ใน production

### Discord SSO ฝั่ง admin

- `ADMIN_WEB_SSO_DISCORD_ENABLED`
- `ADMIN_WEB_SSO_DISCORD_CLIENT_ID`
- `ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET`
- `ADMIN_WEB_SSO_DISCORD_REDIRECT_URI`
  - ต้องลงท้ายด้วย `/admin/auth/discord/callback`
- `ADMIN_WEB_SSO_DISCORD_GUILD_ID`
- `ADMIN_WEB_SSO_DEFAULT_ROLE`
- กลุ่ม mapping เพิ่มเติม:
  - `ADMIN_WEB_SSO_DISCORD_OWNER_ROLE_IDS`
  - `ADMIN_WEB_SSO_DISCORD_ADMIN_ROLE_IDS`
  - `ADMIN_WEB_SSO_DISCORD_MOD_ROLE_IDS`
  - `ADMIN_WEB_SSO_DISCORD_OWNER_ROLE_NAMES`
  - `ADMIN_WEB_SSO_DISCORD_ADMIN_ROLE_NAMES`
  - `ADMIN_WEB_SSO_DISCORD_MOD_ROLE_NAMES`

### Owner control additions

- `ADMIN_LOG_LANGUAGE`
  - owner เปลี่ยนได้จาก `/owner#control`
  - ใช้กำหนดภาษา owner-facing Discord ops alerts

## 3. Player portal

### Core

- `WEB_PORTAL_MODE=player`
- `WEB_PORTAL_HOST`
- `WEB_PORTAL_PORT`
- `WEB_PORTAL_BASE_URL`
- `WEB_PORTAL_LEGACY_ADMIN_URL`

### Session และ security

- `WEB_PORTAL_SESSION_TTL_HOURS`
- `WEB_PORTAL_SESSION_COOKIE_NAME`
- `WEB_PORTAL_SESSION_COOKIE_PATH=/`
- `WEB_PORTAL_COOKIE_DOMAIN`
- `WEB_PORTAL_SECURE_COOKIE=true` ใน production
- `WEB_PORTAL_COOKIE_SAMESITE=Lax`
- `WEB_PORTAL_ENFORCE_ORIGIN_CHECK=true`

### Discord OAuth ฝั่ง player

- `WEB_PORTAL_DISCORD_CLIENT_ID`
- `WEB_PORTAL_DISCORD_CLIENT_SECRET`
- `WEB_PORTAL_DISCORD_REDIRECT_PATH=/auth/discord/callback`

## 4. Delivery, watcher, console-agent

### Watcher

- `SCUM_LOG_PATH`
- `SCUM_WEBHOOK_URL`
- `SCUM_WEBHOOK_SECRET`
- `SCUM_WATCHER_HEALTH_HOST`
- `SCUM_WATCHER_HEALTH_PORT`

### Delivery mode

- `DELIVERY_EXECUTION_MODE=rcon|agent`

#### RCON mode

- `RCON_HOST`
- `RCON_PORT`
- `RCON_PASSWORD`
- `RCON_PROTOCOL`
- `RCON_EXEC_TEMPLATE`

#### Agent mode

- `SCUM_CONSOLE_AGENT_BASE_URL`
- `SCUM_CONSOLE_AGENT_HOST`
- `SCUM_CONSOLE_AGENT_PORT`
- `SCUM_CONSOLE_AGENT_TOKEN`
- `SCUM_CONSOLE_AGENT_BACKEND=exec|process`
- `SCUM_CONSOLE_AGENT_EXEC_TEMPLATE`
- `SCUM_CONSOLE_AGENT_AUTOSTART`

### Agent role/scope visibility

control plane และ web surfaces ตอนนี้สามารถแสดง:

- `Sync agent`
- `Execute agent`
- `Hybrid agent`
- `Read path only`
- `Write path only`
- `Read + write path`

สิ่งนี้เป็น metadata เชิง routing/visibility ไม่ใช่การเปลี่ยน auth contract ของ agent

## 5. Runtime split

### Bot

- `BOT_ENABLE_SCUM_WEBHOOK`
- `BOT_ENABLE_RESTART_SCHEDULER`
- `BOT_ENABLE_ADMIN_WEB`
- `BOT_ENABLE_RENTBIKE_SERVICE`
- `BOT_ENABLE_DELIVERY_WORKER`
- `BOT_ENABLE_OPS_ALERT_ROUTE`
- `BOT_HEALTH_HOST`
- `BOT_HEALTH_PORT`

### Worker

- `WORKER_ENABLE_RENTBIKE`
- `WORKER_ENABLE_DELIVERY`
- `WORKER_HEARTBEAT_MS`
- `WORKER_HEALTH_HOST`
- `WORKER_HEALTH_PORT`

ข้อสำคัญ:

- ห้ามเปิด delivery worker พร้อมกันทั้ง bot และ worker

## 6. Production baseline ที่ควรใช้

```env
NODE_ENV=production
PERSIST_REQUIRE_DB=true
PERSIST_LEGACY_SNAPSHOTS=false

ADMIN_WEB_ALLOWED_ORIGINS=https://admin.example.com
ADMIN_WEB_SECURE_COOKIE=true
ADMIN_WEB_HSTS_ENABLED=true
ADMIN_WEB_SESSION_COOKIE_PATH=/
ADMIN_WEB_2FA_ENABLED=true
ADMIN_WEB_STEP_UP_ENABLED=true
ADMIN_WEB_LOCAL_RECOVERY=false

WEB_PORTAL_BASE_URL=https://player.example.com
WEB_PORTAL_SECURE_COOKIE=true
WEB_PORTAL_ENFORCE_ORIGIN_CHECK=true
WEB_PORTAL_DISCORD_REDIRECT_PATH=/auth/discord/callback
```

## 7. วิธีตรวจหลังแก้ env

```bash
npm run doctor
npm run doctor:topology:prod
npm run security:check
npm run readiness:prod
```

หลัง deploy จริง:

```bash
npm run smoke:postdeploy
```
