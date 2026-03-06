# System Updates Log

เอกสารนี้ใช้บันทึกการเปลี่ยนแปลงทุกครั้งที่มีการอัปเดตระบบจริง

## วิธีใช้งาน

1. ทุกครั้งที่แก้ระบบ ให้เพิ่มหัวข้อวันที่ใหม่
2. ระบุ `เป้าหมาย`, `สิ่งที่เปลี่ยน`, `ผลกระทบ`, `วิธีทดสอบ`
3. อ้างอิงไฟล์ที่แก้หลักอย่างน้อย 1 จุด

---

## 2026-03-06

### เป้าหมาย
- ปิดงานค้าง A-D จากรีวิวโปรเจกต์

### สิ่งที่เปลี่ยน
- แก้ข้อความ legacy/mojibake ในระบบหลักให้เป็น UTF-8
- เพิ่ม integration tests:
  - flow ซื้อสินค้า -> queue -> ส่งของสำเร็จ
  - admin API auth + validation
  - watcher parse log หลายรูปแบบ
- บังคับมาตรฐาน RCON bundle template:
  - ถ้าเป็นหลายไอเทม ต้องมี `{gameItemId}` หรือ `{quantity}`
  - ถ้าไม่ตรงเงื่อนไขจะ reject ตอน enqueue
- เพิ่ม observability/alerts:
  - queue length
  - delivery fail rate
  - watcher webhook error rate
  - admin login failure spikes
- เพิ่ม endpoint `GET /admin/api/observability`
- เพิ่มสคริปต์ guard ป้องกัน mojibake เข้าโค้ดอีก:
  - `scripts/check-text-encoding.js`
  - ผูกเข้ากับ `npm run lint`

### ผลกระทบ
- เพิ่มความปลอดภัยเชิงคุณภาพของ release
- ลดความเสี่ยงส่งของผิดรายการใน bundle
- ทีมแอดมินติดตามปัญหา production ได้ไวขึ้น

### วิธีทดสอบ
- `npm run lint`
- `npm test`

### ไฟล์หลักที่อัปเดต
- `src/adminWebServer.js`
- `src/services/rconDelivery.js`
- `scum-log-watcher.js`
- `test/admin-api.integration.test.js`
- `test/rcon-delivery.integration.test.js`
- `test/scum-log-watcher.parse.test.js`
- `scripts/check-text-encoding.js`
- `package.json`
