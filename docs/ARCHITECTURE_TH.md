# ภาพรวมสถาปัตยกรรม

Language:

- English: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Thai: `ARCHITECTURE_TH.md`

เอกสารนี้สรุปสถาปัตยกรรมปัจจุบันของระบบจากโค้ดและ runtime model ที่ใช้อยู่จริงใน repo

## สถานะ runtime ปัจจุบัน

- ฐานข้อมูลหลักของ runtime คือ `PostgreSQL`
- ORM และ schema toolchain ใช้ `Prisma`
- `SQLite` ยังมีบทบาทใน local dev, compatibility path, และ offline tooling
- ไฟล์ `prisma/schema.prisma` ถูกเก็บเป็น compatibility template และใช้ `scripts/prisma-with-provider.js` render provider-specific schema

สรุปสำคัญ:

- อย่าอธิบายว่า SQLite คือ production runtime หลักของ repo นี้
- ถ้าจะอ้าง runtime truth ให้ดูจาก data layer ปัจจุบันและ docs กลุ่ม persistence ประกอบกัน

## runtime หลักของระบบ

- `Discord bot`
  - ดู gateway, command routing, และ bootstrap บางส่วน
- `Worker`
  - ดู delivery queue, rent bike, และ background jobs
- `Watcher / Server Bot`
  - ดู `SCUM.log`, event sync, และ health บางส่วน
- `Delivery Agent`
  - รันบนเครื่องที่มี SCUM client เปิดอยู่
  - ใช้สำหรับ in-game delivery และ announce execution
- `Admin web`
  - ดู auth, RBAC, backup/restore, observability, control plane API
- `Player portal`
  - ดู player login, wallet, purchase history, redeem, profile, Steam link

## topology โดยย่อ

- browser ฝั่ง owner และ tenant จะคุยกับ admin/control plane
- browser ฝั่ง player/public จะคุยกับ player/public API
- worker และ runtime อื่น ๆ แชร์ persistence กลางผ่าน PostgreSQL
- `Delivery Agent` กับ `Server Bot` เป็นคนละบทบาทและควร deploy / operate แยกกัน

## เส้นทาง delivery โดยย่อ

1. purchase หรือ admin action สร้าง delivery request
2. request ถูกบันทึกและคิวถูกจัดการโดย worker / delivery layer
3. execution mode ตัดสินว่าจะใช้ RCON หรือ `Delivery Agent`
4. ผลลัพธ์ถูกส่งกลับเข้าระบบและบันทึกเป็น audit / evidence / state updates

## เอกสารที่ควรอ่านคู่กัน

- [VERIFICATION_STATUS_TH.md](./VERIFICATION_STATUS_TH.md)
- [EVIDENCE_MAP_TH.md](./EVIDENCE_MAP_TH.md)
- [assets/README.md](./assets/README.md)
- [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md)
- [RUNTIME_TOPOLOGY_TH.md](./RUNTIME_TOPOLOGY_TH.md)

ไฟล์นี้เป็นสรุปไทยเพื่ออ่านภาพรวมได้เร็วบน GitHub ส่วนข้อความ canonical และรายละเอียดเชิงลึกยังควรอ้างเวอร์ชันอังกฤษใน [ARCHITECTURE.md](./ARCHITECTURE.md) ร่วมด้วย
