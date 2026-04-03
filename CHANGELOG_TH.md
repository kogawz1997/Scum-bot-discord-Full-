# บันทึกการเปลี่ยนแปลง

Language:

- English: [CHANGELOG.md](./CHANGELOG.md)
- Thai: `CHANGELOG_TH.md`

ไฟล์นี้ใช้สรุปการเปลี่ยนแปลงสำคัญของโปรเจกต์ในระดับ repository โดยรวม

หมายเหตุ:

- release notes สำหรับ operator จะอยู่แยกในโฟลเดอร์ [`docs/releases/`](./docs/releases/)
- กระบวนการออก release ใช้ GitHub Actions และ release tagging เป็นตัวจริงของระบบ
- ถ้าต้องการดู workflow ต้นทาง ให้ดูที่ [`.github/workflows/release.yml`](./.github/workflows/release.yml)

## [Unreleased]

- ระบบ `ci:verify` เปลี่ยนไปใช้ status artifacts จาก workflow แทนการอ้างจำนวน test แบบ hardcoded ในเอกสาร
- `ci:verify` รันด้วย env overlay ที่ deterministic และปลอดภัยต่อ test มากขึ้น ทำให้การ verify ในเครื่องไม่ต้องพึ่ง `.env` ปัจจุบันโดยตรง
- เพิ่มสคริปต์เตรียม env profile สำหรับ `development`, `test`, และ `production`
- ปรับ test env overlay ให้ใช้ค่า topology แบบ split-runtime และ token สำหรับ admin ที่ไม่ใช่ placeholder
- เพิ่ม local smoke stack automation สำหรับ clean-room CI installs
- เพิ่มเอกสาร delivery capability matrix, migration path ของฐานข้อมูล, ADR, และ support สำหรับ evidence bundle ต่อ order
- ปรับ secret scanning ให้ยอมรับไฟล์ env example ที่ติดตามใน repo ได้ แต่ยังบล็อก split env ที่ generate ขึ้นและไฟล์ backup
- เพิ่มความเข้มของ git hooks โดย `pre-push` จะสแกนทั้ง repo แทนที่จะดูเฉพาะไฟล์ที่ staged

ถ้าต้องการข้อความ canonical ให้ยึดเวอร์ชันอังกฤษเป็นหลัก และใช้ไฟล์นี้เป็นคู่มืออ่านภาษาไทย
