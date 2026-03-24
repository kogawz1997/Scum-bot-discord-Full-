# รายงานช่องว่างระหว่าง `.env` ปัจจุบันกับ production baseline

อัปเดตล่าสุด: **2026-03-24**

เอกสารนี้สรุปความต่างระหว่าง `.env` ที่ใช้งานบนเครื่องปัจจุบันกับ baseline ที่ระบบใช้ตรวจจริงผ่าน `doctor` และ `security:check`

ไฟล์อ้างอิง:

- root runtime: [../.env](../.env)
- root baseline: [../.env.production.example](../.env.production.example)
- portal runtime: [../apps/web-portal-standalone/.env](../apps/web-portal-standalone/.env)
- portal baseline: [../apps/web-portal-standalone/.env.production.example](../apps/web-portal-standalone/.env.production.example)

## สรุปภาพรวม

production baseline ปัจจุบันบังคับ:

- `NODE_ENV=production`
- `PERSIST_REQUIRE_DB=true`
- `PERSIST_LEGACY_SNAPSHOTS=false`
- `DATABASE_URL` ต้องเป็น PostgreSQL สำหรับ production
- `ADMIN_WEB_SECURE_COOKIE=true`
- `ADMIN_WEB_HSTS_ENABLED=true`
- `ADMIN_WEB_ALLOWED_ORIGINS` ต้องเป็น HTTPS origin ที่ชัดเจน
- `ADMIN_WEB_SESSION_COOKIE_PATH=/`
- `ADMIN_WEB_LOCAL_RECOVERY=false`
- แนะนำให้ใช้ split origin:
  - admin: `https://admin.example.com`
  - player: `https://player.example.com`

## สถานะล่าสุดของเครื่องนี้

### ปิดแล้ว

- ใช้ PostgreSQL เป็น runtime database แล้ว
- `PERSIST_REQUIRE_DB=true`
- `PERSIST_LEGACY_SNAPSHOTS=false`
- split-origin path ของ player/admin ถูกตั้งไว้แล้ว
- player portal ใช้ HTTPS base URL แล้ว
- cookie path ฝั่ง admin ถูกปรับเป็น `/` ตาม route ปัจจุบันที่ใช้ `/owner` และ `/tenant`

### ต้องระวัง

ค่าด้านล่างไม่ควรเปิดค้างใน production จริง:

- `ADMIN_WEB_LOCAL_RECOVERY=true`
- `ADMIN_WEB_SECURE_COOKIE=false`
- `ADMIN_WEB_2FA_ENABLED=false`
- `ADMIN_WEB_STEP_UP_ENABLED=false`

ค่าทั้ง 4 ตัวข้างบนเป็น drift ที่ `doctor` และ `security:check` ใช้ตรวจโดยตรง

## baseline ที่ควรใช้ใน production

```env
NODE_ENV=production
PERSIST_REQUIRE_DB=true
PERSIST_LEGACY_SNAPSHOTS=false

ADMIN_WEB_ALLOWED_ORIGINS=https://admin.example.com
ADMIN_WEB_SECURE_COOKIE=true
ADMIN_WEB_HSTS_ENABLED=true
ADMIN_WEB_TRUST_PROXY=true
ADMIN_WEB_SESSION_COOKIE_PATH=/
ADMIN_WEB_2FA_ENABLED=true
ADMIN_WEB_STEP_UP_ENABLED=true
ADMIN_WEB_LOCAL_RECOVERY=false

WEB_PORTAL_BASE_URL=https://player.example.com
WEB_PORTAL_LEGACY_ADMIN_URL=https://admin.example.com/admin
WEB_PORTAL_SECURE_COOKIE=true
WEB_PORTAL_ENFORCE_ORIGIN_CHECK=true
```

## สิ่งที่ยังต้องทำในหน้าใช้งานจริง

- ลง reverse proxy และ TLS ให้ `admin` และ `player`
- ลง redirect URI ใน Discord Developer Portal ให้ตรง
- หมุน secrets และเก็บใน secret manager ตามรอบงานจริง
- เก็บหลักฐาน native proof เพิ่มใน environment อื่น

## คำสั่งตรวจหลังปรับ env

```bash
npm run doctor
npm run security:check
npm run readiness:prod
npm run smoke:postdeploy
```

## ข้อสรุป

repository-local baseline ตอนนี้ชัดแล้วว่า production ต้องใช้:

- PostgreSQL
- external runtime-data path
- secure cookie
- 2FA + step-up
- local recovery ปิด

สิ่งที่ยังเหลือคือการนำค่าเหล่านี้ไปใช้ใน environment จริง และยืนยันด้วย runtime proof เพิ่มเติม
