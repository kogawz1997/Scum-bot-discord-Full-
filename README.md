# SCUM TH Bot

เอกสารหลักของโปรเจกต์อยู่ที่:

- [PROJECT_HQ.md](./PROJECT_HQ.md)

## Quick Start

```bash
npm install
npm run register-commands
npm start
node scum-log-watcher.js
```

## Verify

```bash
npm run check
npm run security:check
npm run security:generate-secrets
```

## Cart System

- ปุ่ม `เพิ่มลงตะกร้า` บนการ์ดสินค้าใช้งานได้แล้ว
- ใช้คำสั่ง `/cart` เพื่อจัดการตะกร้า:
  - `/cart view`
  - `/cart add item:<ชื่อหรือรหัส> qty:<จำนวน>`
  - `/cart remove item:<ชื่อหรือรหัส> qty:<จำนวน>`
  - `/cart clear`
  - `/cart checkout`
- ถ้าช่องร้านค้ายังมีปุ่ม `Checkout` แบบเก่า ให้รัน:
  - `/panel shop-refresh-buttons limit:50`
  - ระบบจะไล่แก้ข้อความร้านค้าเก่าในช่องนั้นอัตโนมัติ

## Delivery Ops (Admin Web)

- มีคิวส่งของอัตโนมัติ + retry + audit + dead-letter
- Admin web รองรับ:
  - retry งานใน queue (`/admin/api/delivery/retry`)
  - retry จาก dead-letter (`/admin/api/delivery/dead-letter/retry`)
  - ลบ dead-letter (`/admin/api/delivery/dead-letter/delete`)
## Production Hardening (Recommended)

ก่อนขึ้นใช้งานจริง ให้ตั้งค่าอย่างน้อยดังนี้:

```env
NODE_ENV=production
ADMIN_WEB_SECURE_COOKIE=true
ADMIN_WEB_HSTS_ENABLED=true
ADMIN_WEB_ALLOWED_ORIGINS=https://admin.your-domain.com
ADMIN_WEB_ALLOW_TOKEN_QUERY=false
ADMIN_WEB_ENFORCE_ORIGIN_CHECK=true
```

จากนั้นรันตรวจ:

```bash
npm run check
npm run security:check
```

หมายเหตุสำคัญ:
- ถ้าเคยเผยแพร่ token/secret ในที่สาธารณะ ให้ rotate ทันที
- `.env` ต้องไม่ถูก track ใน git
- incident runbook: `docs/INCIDENT_RESPONSE.md`
