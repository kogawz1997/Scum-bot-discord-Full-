# Verification Status

เอกสารนี้เป็นจุดอ้างอิงสำหรับสถานะการตรวจคุณภาพของ repo

ให้ยึด artifact จาก CI และผลรันคำสั่งตรวจจริงเป็นหลัก ไม่ใช่ตัวเลข test count ที่เขียนค้างไว้ในเอกสารอื่น

## Source of Truth

ใช้ข้อมูลจากชุดนี้ก่อนเสมอ:

- GitHub Actions workflow: `.github/workflows/ci.yml`
- GitHub Actions release workflow: `.github/workflows/release.yml`
- `artifacts/ci/verification-summary.json`
- `artifacts/ci/verification-summary.md`
- `artifacts/ci/lint.log`
- `artifacts/ci/test.log`
- `artifacts/ci/doctor.log`
- `artifacts/ci/security-check.log`
- `artifacts/ci/readiness.log`
- `artifacts/ci/smoke.log`

## Local Command Set

คำสั่งที่ใช้ตรวจบนเครื่องนี้:

```bash
npm run lint
npm run test:policy
npm test
npm run doctor
npm run security:check
npm run readiness:prod
npm run smoke:postdeploy
```

ถ้าต้องการรันชุดที่ใกล้ CI ที่สุด ให้ใช้:

```bash
npm run ci:verify
```

## What This File Does Not Prove

เอกสารนี้ไม่ควรถูกใช้เพื่ออ้างว่า:

- live SCUM runtime พร้อมใช้งานทุกกรณี
- agent mode ผ่านบนทุกเครื่อง
- watcher พร้อมใช้งาน แม้ไม่มี `SCUM.log` จริง
- visual evidence มีครบ ถ้ายังไม่มีไฟล์ screenshot หรือ diagram export ใน repo

## Current Reading Rule

- ถ้า claim ผูกกับ code path, test file, และ artifact ได้ ให้ถือว่า `verified`
- ถ้า claim มีแค่ code path แต่ยังไม่มี test หรือ artifact ให้ถือว่า `implemented`
- ถ้า claim ขึ้นกับ SCUM client, Windows session, หรือ infrastructure ภายนอก ให้ถือว่า `runtime-dependent`

## Notes

- ห้าม hardcode จำนวน test ไว้หลายไฟล์
- ถ้าจำนวน test เปลี่ยน ให้ปล่อยให้ `verification-summary` เป็นตัวตอบแทน
- badge ใน `README.md` และ `PROJECT_HQ.md` ต้องชี้ workflow จริงเท่านั้น
