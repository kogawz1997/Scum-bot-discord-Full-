# Data Layer Migration Checklist (JSON -> Prisma)

เอกสารนี้ใช้วางแผนย้ายระบบ persistence จาก JSON/fallback ไป Prisma แบบปลอดภัยและ rollback ได้

## เป้าหมาย

- ลดความเสี่ยงข้อมูลไม่สอดคล้องจากหลาย storage mode
- ปิด fallback JSON ใน production หลังย้ายครบ
- ทำให้ backup/restore/test เป็นมาตรฐานเดียวกัน

## สถานะล่าสุด (2026-03-07)

- เสร็จแล้ว: migration checklist + rollback plan
- เสร็จแล้ว: เพิ่ม `PERSIST_REQUIRE_DB` fail-fast ใน runtime persistence
- เสร็จแล้ว: เพิ่มสถานะ persistence ใน `GET /healthz` และ admin snapshot
- เสร็จแล้ว: เพิ่ม integration tests สำหรับ fallback/required-db mode
- คงค้าง: ย้าย store JSON ไป Prisma ทีละระบบจนปิด fallback production ได้เต็มรูปแบบ

## Scope ปัจจุบัน

- Runtime store หลัก:
  - wallet / shop / purchase
  - ticket / event / bounty
  - stats / weaponStats
  - vip / redeem / link / welcome
  - delivery queue / delivery dead-letter / delivery audit
  - rent bike tables

## Migration Strategy

1. ย้ายทีละระบบ (vertical slice)
2. ใส่ compatibility layer อ่านของเก่า/เขียนของใหม่ชั่วคราว
3. เปิด verification query ทุก deploy
4. ทำ rollback path ก่อน cutover ทุกครั้ง

## Checklist ต่อระบบ

### 1) Discovery

- [ ] ระบุ source of truth ปัจจุบัน
- [ ] ระบุ schema Prisma เป้าหมาย
- [ ] ระบุ read/write paths ทั้งหมดที่กระทบ

### 2) Implementation

- [ ] เพิ่ม Prisma model + migration
- [ ] เพิ่ม mapper normalize/validate
- [ ] เขียน dual-read หรือ data adapter ช่วงเปลี่ยนผ่าน
- [ ] เพิ่ม feature flag สำหรับ cutover

### 3) Data Backfill

- [ ] snapshot backup ก่อนย้าย
- [ ] import ข้อมูลเดิมเข้า Prisma
- [ ] ตรวจ record count/unique key/foreign key

### 4) Verification

- [ ] integration test ครอบคลุม CRUD หลัก
- [ ] e2e flow ธุรกิจหลักผ่าน
- [ ] observability ไม่มี error spike

### 5) Cutover

- [ ] สลับ write path ไป Prisma
- [ ] สลับ read path ไป Prisma
- [ ] monitor 24-48 ชั่วโมง

### 6) Cleanup

- [ ] ลบ code path เก่า
- [ ] ปิด fallback JSON เฉพาะ production
- [ ] อัปเดต runbook/docs

## Rollback Plan

หากหลัง cutover พบ incident ระดับสูง:

1. freeze write endpoint ชั่วคราว
2. restore จาก backup ล่าสุด
3. สลับ feature flag กลับ read/write path เดิม
4. re-run integrity checks
5. ทำ postmortem ก่อน rollout รอบใหม่

## Production Guard แนะนำ

- ตั้ง `PERSIST_REQUIRE_DB=true` ใน production หลังระบบหลักย้ายครบ
- fail fast หาก database backend ใช้งานไม่ได้
