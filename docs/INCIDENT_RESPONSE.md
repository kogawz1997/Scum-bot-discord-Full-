# Incident Response Runbook

เอกสารนี้ใช้ตอนเกิดเหตุด้านความปลอดภัยหรือการใช้งานผิดปกติในระบบ SCUM TH Bot

## 1) กรณี Token/Secret รั่ว

### อาการ

- มีคนสั่งบอทผิดปกติ
- มี login admin แปลกจาก IP/ช่วงเวลาไม่ปกติ
- พบว่า `.env` ถูกเผยแพร่

### ขั้นตอนทันที (ภายใน 15 นาที)

1. หยุดบอทชั่วคราว (`Ctrl+C` หรือ stop service)
2. หมุน secret ทุกตัวทันที:
   - `DISCORD_TOKEN`
   - `SCUM_WEBHOOK_SECRET`
   - `ADMIN_WEB_PASSWORD`
   - `ADMIN_WEB_TOKEN`
   - `RCON_PASSWORD`
3. ตรวจให้แน่ใจว่า `.env` ไม่ถูก track ใน git
4. เปิดระบบใหม่และรัน:
   - `npm run check`
   - `npm run security:check`

### หลังเหตุการณ์

1. ตรวจ log ย้อนหลังใน `shop-log`, `admin-log`, `deliveryAudit`
2. สรุปช่วงเวลาที่ได้รับผลกระทบ
3. แจ้งทีมงานว่ามีการ rotate secret แล้ว

## 2) กรณี Webhook Abuse / Flood

### อาการ

- webhook error rate สูงผิดปกติ
- event เข้าซ้ำจำนวนมาก
- queue โตเร็วผิดปกติ

### ขั้นตอนทันที

1. เปลี่ยน `SCUM_WEBHOOK_SECRET` แล้วรีสตาร์ต bot + watcher
2. ตรวจ `SCUM_WEBHOOK_MAX_BODY_BYTES` และ timeout ว่าไม่เปิดกว้างเกินไป
3. ตรวจแหล่งที่ยิงเข้ามาว่าถูกต้องตามระบบ watcher หรือไม่

### การป้องกันต่อเนื่อง

1. บังคับให้ watcher ส่งจาก host ที่ไว้ใจได้เท่านั้น
2. ตั้ง alert webhook error rate และ queue pressure

## 3) กรณี Admin Brute-force Login

### อาการ

- login failure spike สูง
- มีการยิง `/admin/api/login` ถี่จาก IP เดียว/หลาย IP

### ขั้นตอนทันที

1. เปลี่ยน `ADMIN_WEB_PASSWORD` และ `ADMIN_WEB_TOKEN`
2. ตรวจว่าใช้ค่าเหล่านี้จริง:
   - `ADMIN_WEB_ENFORCE_ORIGIN_CHECK=true`
   - `ADMIN_WEB_ALLOW_TOKEN_QUERY=false`
   - `ADMIN_WEB_SECURE_COOKIE=true` (production)
3. ถ้าจำเป็นให้จำกัดการเข้าถึง admin web ที่ network level (allowlist/VPN)

### การป้องกันต่อเนื่อง

1. เปิด 2FA (`ADMIN_WEB_2FA_ENABLED=true`)
2. ใช้ SSO role mapping สำหรับ admin
3. ติดตาม metrics `loginFailures` และตั้ง threshold แจ้งเตือน

## 4) ตรวจความพร้อมก่อนเปิดระบบกลับ

1. `npm run check` ผ่าน
2. `npm run security:check` ผ่าน
3. Slash commands อัปเดตล่าสุด (`npm run register-commands`)
4. ทดสอบ flow สำคัญ:
   - login admin
   - ซื้อสินค้า 1 รายการ
   - ตรวจ queue ส่งของ
   - webhook event จาก watcher
