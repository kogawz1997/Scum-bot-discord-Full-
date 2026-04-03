# คู่มือเริ่มต้นสำหรับ Operator

Language:

- English: [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md)
- Thai: `OPERATOR_QUICKSTART_TH.md`

เอกสารนี้คือเส้นทางสั้นที่สุดสำหรับ operator ที่ต้องตอบคำถามพื้นฐานให้ได้เร็วว่า

- ระบบยังสุขภาพดีอยู่ไหม
- ควรเปิดหน้าไหนก่อน
- ถ้าเกิด incident ควรอ่านเอกสารไหนต่อ
- ก่อน reopen traffic ต้องเช็กอะไร

## 1. เปิด surface ให้ถูกก่อน

- owner login: `/owner/login`
- owner console: `/owner`
- tenant login: `/tenant/login`
- tenant console: `/tenant`
- player/public checks: `/player` และ `/player/login`

หลักการ:

- ให้ใช้ surface หลักก่อน
- อย่าเริ่มจาก legacy pages ถ้า workflow หลักยังใช้งานได้
- `/admin/legacy` ควรถูกมองเป็น compatibility fallback

## 2. ชุด health check 5 นาที

รันก่อนเป็นอย่างแรก:

```bash
npm run doctor
npm run security:check
npm run security:rotation:check
```

สิ่งที่คำสั่งเหล่านี้ช่วยตอบ:

- `doctor`
  - runtime health
  - PostgreSQL-first topology
  - split-origin drift
  - duplicate worker ownership
- `security:check`
  - cookie/origin/OAuth drift
  - security policy posture
- `security:rotation:check`
  - secret ไหนกระทบ runtime ไหน
  - ต้อง reload อะไรหลังหมุน secret
  - ต้อง validate อะไรก่อน reopen

## 3. runtime helper ที่ควรรู้

```bat
npm run runtime:install:server-bot -- -Help
npm run runtime:install:delivery-agent -- -Help
npm run runtime:inventory
```

ประโยชน์:

- `runtime:install:server-bot`
  - สร้าง env bundle สำหรับ `Server Bot`
- `runtime:install:delivery-agent`
  - สร้าง env bundle สำหรับ `Delivery Agent`
- `runtime:inventory`
  - พิมพ์สถานะ runtime ปัจจุบันจาก control-plane registry
  - เขียน JSON ลง `artifacts/runtime-inventory/latest.json`

## 4. ถ้ามีอาการผิดปกติ

- ถ้า delivery ค้างหรือของไม่ถึงผู้เล่น
  - เริ่มจาก delivery workspace, request logs, dead letters, และ delivery audit
- ถ้า runtime offline
  - เช็ก inventory, health, และ token/binding state
- ถ้า config/apply/restart แปลก
  - เช็ก config jobs, backup/rollback path, restart history, และ diagnostics

## 5. ควรอ่านอะไรต่อ

- [RUNTIME_OPERATOR_CHECKLIST.md](./RUNTIME_OPERATOR_CHECKLIST.md)
- [TWO_MACHINE_AGENT_TOPOLOGY.md](./TWO_MACHINE_AGENT_TOPOLOGY.md)
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
- [SECRET_ROTATION_RUNBOOK.md](./SECRET_ROTATION_RUNBOOK.md)

ไฟล์นี้เป็นสรุปไทยสำหรับเปิดอ่านเร็วบน GitHub ถ้าต้องการรายละเอียด canonical ให้ยึด [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md) ร่วมด้วย
