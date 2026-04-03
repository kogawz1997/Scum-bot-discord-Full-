# Staging Run Sheet 2026-04-03

เอกสารนี้เป็น run sheet แบบสั้นสำหรับคนรัน staging จริง

## 1. Before Start

- ยืนยัน branch/commit ที่จะทดสอบ
- ยืนยันว่า env ของ staging ถูกต้อง
- ยืนยันว่า database backup ล่าสุดพร้อม
- ยืนยันว่า runtime target machines พร้อมใช้งาน

## 2. Baseline Commands

```bash
npm run doctor
npm run security:check
npm run readiness:prod
npm run smoke:postdeploy
```

ถ้ามี provider/schema change:

```bash
npm run db:generate
npm run db:migrate:deploy
```

## 3. Web Check

### Owner

- login ผ่าน
- tenant detail เปิดได้
- support/commercial workspace แสดงข้อมูลได้

### Tenant

- onboarding checklist เปิดได้
- runtime pages เปิดได้
- config / restart / logs & sync ใช้งานได้

### Player

- login/profile เปิดได้
- shop / orders / supporters / public slug routes เปิดได้

## 4. Runtime Check

### Server Bot

- setup token ออกได้
- install/runtime env check ผ่าน
- online ใน control plane
- config access / restart probe / log sync ผ่าน

### Delivery Agent

- setup token ออกได้
- install/runtime env check ผ่าน
- online ใน control plane
- preflight / simulator / announce / test send ผ่าน

## 5. Identity + Billing Check

- preview signup ผ่าน
- identity summary แสดงสถานะถูก
- billing page แสดง plan/status ถูก
- retry/replay paths ไม่สร้าง state ซ้ำ

## 6. First Fail = Stop Conditions

หยุดและบันทึกทันทีถ้า:

- login surface หลักพัง
- runtime หลักไม่ online
- config/restart path พัง
- billing state เพี้ยน
- smoke/readiness ตก

## 7. Evidence To Save

- commit ที่ทดสอบ
- doctor output
- readiness output
- smoke output
- runtime inventory / machine validation
- screenshot หรือ log สั้น ๆ ของ failure ถ้ามี

## 8. Pass Criteria

ถือว่า staging ผ่านเมื่อ:

- owner / tenant / player ผ่าน
- `Server Bot` ผ่าน
- `Delivery Agent` ผ่าน
- identity / billing paths ผ่าน
- readiness / smoke ผ่าน
