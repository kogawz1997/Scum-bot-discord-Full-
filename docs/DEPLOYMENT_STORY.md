# Deployment Story (Production)

This runbook is for end-to-end production deployment using the current split-runtime topology.

- player portal: `https://player.genz.noah-dns.online`
- admin portal: `https://admin.genz.noah-dns.online/admin`

## 1. Recommended Topology

- `bot`
  - Discord gateway
  - slash/button/modal interactions
  - admin web
  - SCUM webhook receiver
  - restart scheduler
- `worker`
  - delivery queue
  - rent bike runtime
- `watcher`
  - tail `SCUM.log`
  - forward events to webhook
- `web-portal`
  - player portal

## 2. Baseline Env

- `NODE_ENV=production`
- `DATABASE_PROVIDER=postgresql`
- `DATABASE_URL=postgresql://...`
- `PERSIST_REQUIRE_DB=true`
- `PERSIST_LEGACY_SNAPSHOTS=false`

Secrets that must be rotated for production:

- `DISCORD_TOKEN`
- `SCUM_WEBHOOK_SECRET`
- `ADMIN_WEB_PASSWORD`
- `ADMIN_WEB_TOKEN`
- `RCON_PASSWORD`
- `WEB_PORTAL_DISCORD_CLIENT_SECRET`

Starting files:

```bat
copy .env.production.example .env
copy apps\web-portal-standalone\.env.production.example apps\web-portal-standalone\.env
```

## 3. Deploy With PM2

```bash
npm install
npm run db:generate:postgresql
npm run db:migrate:deploy:postgresql
npm run doctor:topology:prod
npm run pm2:start:prod
pm2 status
```

Reload after env changes:

```bash
npm run pm2:reload:prod
```

Windows helpers:

```bat
deploy\start-production-stack.cmd
deploy\reload-production-stack.cmd
deploy\stop-production-stack.cmd
```

## 4. Deploy With Docker Compose

Files:

- `Dockerfile`
- `deploy/docker-compose.production.yml`

Commands:

```bash
docker compose -f deploy/docker-compose.production.yml up -d --build
docker compose -f deploy/docker-compose.production.yml ps
```

## 5. Reverse Proxy

Reference file:

- `deploy/nginx.player-admin.example.conf`

Routing:

- `https://admin.genz.noah-dns.online/admin` -> `127.0.0.1:3200`
- `https://player.genz.noah-dns.online` -> `127.0.0.1:3300`

OAuth redirects:

- player portal: `https://player.genz.noah-dns.online/auth/discord/callback`
- admin SSO: `https://admin.genz.noah-dns.online/admin/auth/discord/callback`

## 6. Health Matrix

- bot: `127.0.0.1:3210/healthz`
- worker: `127.0.0.1:3211/healthz`
- watcher: `127.0.0.1:3212/healthz`
- admin: `127.0.0.1:3200/healthz`
- player: `127.0.0.1:3300/healthz`
- console-agent: `127.0.0.1:3213/healthz`

## 7. Data Hygiene

Scan text issues:

```bash
npm run text:scan
```

Repair:

```bash
npm run text:repair
```

If runtime is PostgreSQL, use the database-specific repair path and keep a current backup before modifying production data.

## 8. Backup / Restore

Backup:

1. log in with owner/admin
2. export backup from admin
3. store backup outside the host

Restore drill:

1. restore in staging first
2. run validation
3. restore in production
4. verify wallet / purchase / queue / dead-letter integrity

## 9. Rollback

1. roll runtime back to previous release
2. restore DB from the pre-deploy backup
3. confirm `healthz` and smoke pass
4. re-open traffic gradually

## 10. Gates Before Opening Traffic

```bash
npm run security:check
npm run doctor:topology:prod
npm run readiness:prod
```

All must pass before opening the system to real users.
