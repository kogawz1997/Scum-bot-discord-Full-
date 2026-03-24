# Split Origin And 2FA Guide

ใช้เอกสารนี้เมื่อจะย้ายจาก local/shared-origin setup ไปเป็น production baseline ที่ปลอดภัยกว่า

## Fast start

สร้างไฟล์ split-origin env พร้อม secrets scaffold:

```bash
npm run security:scaffold-split-env -- --admin-origin https://admin.example.com --player-origin https://player.example.com
```

ไฟล์ที่จะถูกสร้าง:

- `.env.production.split`
- `apps/web-portal-standalone/.env.production.split`

ใช้ไฟล์ scaffold กับ runtime env จริง:

```bash
npm run security:apply-split-env -- --write
```

ตัวเลือกเสริม:

- `--with-readiness` รัน `readiness:prod` ต่อ
- `--skip-validate` ใช้เฉพาะ backup + apply
- ถ้าไม่ใส่ `--write` จะเป็น preview เท่านั้น

## One-command activation

```bash
npm run security:activate-split-env -- --admin-origin https://admin.example.com --player-origin https://player.example.com --write --with-readiness
```

## Suggested topology

- admin origin: `https://admin.example.com`
- player origin: `https://player.example.com`
- admin entry paths:
  - `/owner`
  - `/tenant`
  - `/admin` ยังใช้เป็น entry/compatibility path ได้

## Admin hardening env

```env
ADMIN_WEB_ALLOWED_ORIGINS=https://admin.example.com
ADMIN_WEB_SECURE_COOKIE=true
ADMIN_WEB_HSTS_ENABLED=true
ADMIN_WEB_TRUST_PROXY=true
ADMIN_WEB_SESSION_COOKIE_NAME=scum_admin_session
ADMIN_WEB_SESSION_COOKIE_PATH=/
ADMIN_WEB_SESSION_COOKIE_SAMESITE=Strict
ADMIN_WEB_SESSION_COOKIE_DOMAIN=admin.example.com
ADMIN_WEB_2FA_ENABLED=true
ADMIN_WEB_2FA_SECRET=<generated-base32-secret>
ADMIN_WEB_STEP_UP_ENABLED=true
ADMIN_WEB_SSO_DISCORD_REDIRECT_URI=https://admin.example.com/admin/auth/discord/callback
```

สร้าง TOTP secret:

```bash
npm run security:generate-admin-2fa
```

## Player portal env

```env
WEB_PORTAL_BASE_URL=https://player.example.com
WEB_PORTAL_LEGACY_ADMIN_URL=https://admin.example.com/admin
WEB_PORTAL_SECURE_COOKIE=true
WEB_PORTAL_SESSION_COOKIE_NAME=scum_portal_session
WEB_PORTAL_SESSION_COOKIE_PATH=/
WEB_PORTAL_COOKIE_DOMAIN=player.example.com
WEB_PORTAL_COOKIE_SAMESITE=Lax
WEB_PORTAL_DISCORD_REDIRECT_PATH=/auth/discord/callback
```

## Validation commands

```bash
npm run security:rotation:check
npm run doctor
npm run security:check
npm run readiness:prod
```

## Notes

- admin cookie path ปัจจุบันต้องเป็น `/` เพราะ owner และ tenant surfaces ใช้ top-level routes
- split origin ยังเป็นท่าที่ปลอดภัยกว่า shared origin
- local recovery ต้องปิดก่อนนับว่า production posture ผ่าน

ดู flow การหมุน secrets แบบละเอียดต่อได้ที่ [SECRET_ROTATION_RUNBOOK.md](./SECRET_ROTATION_RUNBOOK.md)
