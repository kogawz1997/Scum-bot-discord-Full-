# DB Engine Migration Path

สถานะปัจจุบัน:

- runtime มาตรฐานของระบบคือ PostgreSQL
- Prisma รองรับ `sqlite`, `postgresql`, `mysql`
- SQLite ยังมีไว้สำหรับ local dev, import/cutover source, และ offline tooling

เอกสารนี้ใช้สำหรับอธิบายเส้นทาง migration ระหว่าง engine โดยไม่ทำให้ narrative ชนกับ runtime ปัจจุบัน

## เป้าหมาย

- ให้ production ใช้ PostgreSQL เป็นมาตรฐานเดียว
- ให้ dev/import/offline tooling ยังใช้ SQLite ได้เมื่อเหมาะสม
- ให้การ migrate, restore, และ rollback มีขั้นตอนที่ชัด

## สิ่งที่มีแล้ว

- provider-aware Prisma commands
- cutover script จาก SQLite ไป PostgreSQL
- isolated provider-specific test runtime
- migration / rollback / restore policy แยกในเอกสาร

## การใช้งานตามบริบท

### Production

- ใช้ `DATABASE_PROVIDER=postgresql`
- ใช้ `DATABASE_URL=postgresql://...`
- ใช้ `PERSIST_REQUIRE_DB=true`
- ใช้ `PERSIST_LEGACY_SNAPSHOTS=false`

### Development / import / offline tooling

- อาจใช้ SQLite ได้
- ต้องไม่สับสนกับ runtime production

## ขั้นตอนเมื่อย้าย engine

1. ยืนยัน provider เป้าหมาย
2. generate Prisma client ตาม provider
3. deploy schema/migrations
4. ย้ายข้อมูลหรือ cut over
5. รัน `doctor`, `security:check`, `readiness:prod`

## อ้างอิง

- `scripts/prisma-with-provider.js`
- `scripts/cutover-sqlite-to-postgres.js`
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MIGRATION_ROLLBACK_POLICY_TH.md](./MIGRATION_ROLLBACK_POLICY_TH.md)
