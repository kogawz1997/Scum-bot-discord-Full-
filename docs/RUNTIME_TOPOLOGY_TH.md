# โครงสร้าง Runtime ของระบบ

Language:

- English: [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md)
- Thai: `RUNTIME_TOPOLOGY_TH.md`

เอกสารนี้อธิบาย runtime split ที่ repo รองรับในตอนนี้ และบอกว่า boundary หลักของแต่ละ role อยู่ที่ไฟล์ไหน

## runtime roles ที่ใช้อยู่

- `Bot`
  - Discord gateway, command dispatch, และ bootstrap บางส่วน
- `Worker`
  - queue ownership, delivery worker, และ background execution
- `Watcher`
  - ดู `SCUM.log` และส่ง sync ไป control plane
- `Admin Web`
  - auth, config, audit, observability, backup/restore
- `Player Portal`
  - player login, wallet, shop, profile, redeem
- `Console Agent / Delivery Agent`
  - agent-side command execution bridge
- `API shim`
  - compatibility bootstrap สำหรับ centralized control-plane surface

## boundary สำคัญ

- staged runtime wrappers อยู่ใต้ `apps/`
- bootstrap helpers อยู่ใต้ `src/bootstrap/`
- runtime flag parsing อยู่ใต้ `src/config/`
- env assertions กลางอยู่ที่ `src/utils/env.js`
- runtime supervisor อยู่ที่ `src/services/runtimeSupervisorService.js`
- agent contract และ scope normalization อยู่ใต้ `src/contracts/agent/`

## control plane routes สำคัญ

ฝั่ง agent/control plane มี route หลักเช่น:

- `POST /platform/api/v1/agent/register`
- `POST /platform/api/v1/agent/activate`
- `POST /platform/api/v1/agent/session`
- `POST /platform/api/v1/agent/sync`

ฝั่ง admin มี route สำคัญเช่น:

- provision / rotate / revoke token ของ agent
- list agent registry / provisioning / devices / credentials / sessions
- list sync runs / sync events
- list package / feature / tenant access

## topology ที่รองรับ

- split runtime
  - bot, worker, watcher, delivery agent แยกบทบาทกัน
- player portal แยก deploy ได้
- admin web เป็นอีก surface หนึ่ง

ข้อที่ควรย้ำ:

- `Delivery Agent` ไม่ควรถูกผสมกับ `Server Bot`
- `Server Bot` ดู log/config/control ฝั่งเครื่องเซิร์ฟเวอร์
- `Delivery Agent` ใช้กับเครื่องที่เปิด SCUM client สำหรับ execute in-game actions

## ใช้เอกสารนี้เมื่อไร

- ตอนอธิบายภาพรวม deployment
- ตอนแยกปัญหาว่า incident อยู่ฝั่งไหน
- ตอนตรวจว่า runtime role ถูก deploy ถูกเครื่องหรือไม่

ถ้าต้องการรายละเอียด canonical และ route list เต็ม ให้ดู [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md) ร่วมด้วย
