# Deployment Story (Production)

Runbook นี้ใช้สำหรับติดตั้งระบบจริงให้ลูกค้าแบบ end-to-end

## 1) Topology ที่แนะนำ

- `bot` process: Discord gateway + command handler + admin web
- `worker` process: queue delivery + rentbike runtime
- `watcher` process: tail `SCUM.log` -> webhook
- `web-portal` process: player portal (Discord OAuth)

## 2) Baseline Env ที่ต้องมี

- `NODE_ENV=production`
- `DATABASE_URL=file:/.../prod.db`
- `PERSIST_REQUIRE_DB=true`
- secrets ที่ต้องหมุน:
  - `DISCORD_TOKEN`
  - `SCUM_WEBHOOK_SECRET`
  - `ADMIN_WEB_PASSWORD`
  - `ADMIN_WEB_TOKEN`
  - `RCON_PASSWORD`
  - `WEB_PORTAL_DISCORD_CLIENT_SECRET`

## 3) Deploy ด้วย PM2 (แนะนำ)

```bash
npm install
npx prisma generate
npx prisma migrate deploy
pm2 start deploy/pm2.ecosystem.config.cjs --update-env
pm2 status
```

ตรวจความพร้อมหลังขึ้นระบบ:

```bash
npm run readiness:prod
npm run smoke:postdeploy
```

Windows one-click:

```bat
npm run deploy:oneclick:win
```

## 4) Deploy ด้วย Docker Compose

ไฟล์ที่ใช้:
- `Dockerfile`
- `deploy/docker-compose.production.yml`

คำสั่ง:

```bash
docker compose -f deploy/docker-compose.production.yml up -d --build
docker compose -f deploy/docker-compose.production.yml ps
```

หยุด:

```bash
docker compose -f deploy/docker-compose.production.yml down
```

## 5) Deploy ด้วย systemd (Linux)

```bash
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now scum-bot scum-worker scum-watcher scum-web-portal
sudo systemctl status scum-bot
```

ดู log:

```bash
journalctl -u scum-bot -f
journalctl -u scum-worker -f
```

## 6) Reverse Proxy Example (Nginx)

ดูไฟล์ตัวอย่าง: `deploy/nginx.player-admin.example.conf`

แนวทาง:
- `admin.example.com` -> `127.0.0.1:3200`
- `player.example.com` -> `127.0.0.1:3300`
- บังคับ HTTPS

## 7) Health Matrix

- Bot: `127.0.0.1:3210/healthz`
- Worker: `127.0.0.1:3211/healthz`
- Watcher: `127.0.0.1:3212/healthz`
- Admin: `127.0.0.1:3200/healthz`
- Player: `127.0.0.1:3300/healthz`

ควรผูก uptime monitor ทุก endpoint

## 8) Backup / Restore (Step-by-step)

### Backup

1. Login ด้วย owner/admin
2. export backup จากหน้า admin
3. เก็บไฟล์ backup ลง external storage

### Restore Drill (ก่อน go-live)

1. restore ใน staging ก่อน
2. run dry-run validation
3. restore จริง
4. ตรวจ integrity (wallet/purchase/queue/dead-letter)

### Incident Restore

1. เปิด maintenance
2. restore snapshot ล่าสุด
3. รัน `npm run smoke:postdeploy`
4. เฝ้า metrics หลังเปิดระบบ

## 9) Rollback

1. rollback process ด้วย PM2 ไป release ก่อนหน้า
2. restore DB จาก backup ก่อน deploy
3. ยืนยัน health + smoke ผ่าน
4. เปิด traffic กลับตามลำดับ

## 10) Gate ก่อนเปิดใช้งานจริง

```bash
npm run security:check
npm run readiness:prod
npm run smoke:postdeploy
```

ต้องผ่านทั้ง 3 ชุดก่อนเปิดรับผู้เล่นจริง
