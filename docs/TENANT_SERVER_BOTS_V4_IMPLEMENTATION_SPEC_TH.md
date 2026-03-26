# Tenant Server Bots V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [TENANT_V4_WIREFRAMES_TH.md](./TENANT_V4_WIREFRAMES_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md)

เอกสารนี้ใช้สำหรับเริ่มทำหน้า `Tenant Server Bots V4` จากโค้ดจริงในโปรเจกต์ โดยดึงงาน `sync / config / restart` ออกมาจากหน้ารวมและทำให้เป็น runtime ประจำเซิร์ฟเวอร์ที่ผู้ใช้เข้าใจได้ในครั้งแรก

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/tenant/server-bots`
- route รอง: `/tenant/server-bots/new`
- route รายตัว: `/tenant/server-bots/:botId`
- route เดิมที่ต้อง map ชั่วคราว: `/tenant#plan-integrations`, `/tenant#logs`, `/tenant#config`, `/tenant#support-tools`

บทบาทของหน้านี้:

- ดู runtime ที่อ่าน log และ sync state
- ดู runtime ที่ใช้จัดการ config และ restart
- provision server-side runtime ใหม่
- ตรวจ sync freshness และ operational readiness

สิ่งที่หน้านี้ต้องไม่ทำให้สับสน:

- ไม่เรียก runtime นี้ว่า `Delivery Agent`
- ไม่ย้ายงานส่งของในเกมมาไว้หน้านี้
- ไม่แสดงคำอธิบายที่ทำให้คนใช้คิดว่า runtime ทั้งสองชนิดแทนกันได้

## 2. Current repo baseline

ไฟล์ฐานที่เกี่ยวข้อง:

- [C:\new\src\admin\assets\tenant-console.js](C:/new/src/admin/assets/tenant-console.js)
- [C:\new\src\admin\api\adminGetRoutes.js](C:/new/src/admin/api/adminGetRoutes.js)
- [C:\new\src\admin\api\adminPlatformPostRoutes.js](C:/new/src/admin/api/adminPlatformPostRoutes.js)
- [C:\new\src\services\runtimeSupervisorService.js](C:/new/src/services/runtimeSupervisorService.js)
- [C:\new\src\domain\sync\syncIngestionService.js](C:/new/src/domain/sync/syncIngestionService.js)

จุดเชื่อมที่มีอยู่จริง:

- tenant console โหลดรายการ agent runtimes ผ่าน `/admin/api/platform/agents`
- มี health/runtime summary ในระบบผ่าน `/admin/api/runtime/supervisor`
- sync/log/config/restart มีฐานอยู่ในระบบ แต่ยังไม่ได้จัดหน้าให้เป็น `Server Bot` แบบชัดเจน
- provisioning/token APIs ชุดเดียวกับ agent runtime ถูกใช้ต่อได้ใน phase แรก

ข้อเท็จจริงสำคัญ:

- phase แรกของ UI อาจยังต้องอ่าน runtime จากชุดข้อมูลเดียวกับ `platform agents`
- การแยก `Server Bot` ต้องทำในชั้น information architecture และ filter logic ก่อน
- เมื่อ data model มี type ชัดขึ้นภายหลัง ค่อยตัด heuristic ออก

## 3. Product positioning

`Server Bot` คือ runtime ประจำเซิร์ฟเวอร์ที่รับผิดชอบ:

- อ่าน `SCUM.log`
- sync logs/events/state
- อ่านและแก้ `.ini`
- backup config
- verify config changes
- start/stop/restart server

ภาษาที่ควรใช้ในหน้า:

- ใช้คำว่า `Server Bot`
- ภาษาไทยกำกับ: `ตัวดูแลเซิร์ฟเวอร์`
- หลีกเลี่ยงคำกว้างอย่าง `runtime integration`

## 4. Visual thesis

`server operations desk`

ความรู้สึกที่ต้องได้:

- เห็นชัดว่าตัวไหนดูแลเซิร์ฟเวอร์ไหน
- รู้ได้ทันทีว่ามี sync ล่าสุดเมื่อไร
- แยกชัดระหว่าง `พร้อมแก้ config` กับ `พร้อม restart`

สิ่งที่ต้องเด่น:

- sync freshness
- server reachability
- config apply posture
- restart capability

## 5. Route and information architecture

### 5.1 `/tenant/server-bots`

หน้า list/work page

ต้องมี:

1. page header
2. health strip
3. server-bot table
4. sync and config posture
5. quick diagnostics rail

### 5.2 `/tenant/server-bots/new`

wizard สำหรับ provision runtime ฝั่งเซิร์ฟเวอร์

ขั้นตอน:

1. เลือก server
2. เลือก topology หรือโหมดติดตั้ง
3. สร้าง setup token
4. ดาวน์โหลด bootstrap package
5. ตรวจ activation checklist

### 5.3 `/tenant/server-bots/:botId`

หน้ารายละเอียด

ต้องมี:

- bot summary
- sync freshness
- config capability
- restart capability
- machine binding / credential
- recent sessions / logs
- dangerous actions

## 6. Page sections

### 6.1 Header

ต้องตอบคำถามหลัก:

- tenant มี Server Bot ใช้งานได้กี่ตัว
- เซิร์ฟเวอร์ใดไม่มี bot ประจำ
- sync ล่าสุดปกติหรือเริ่ม stale แล้ว

header ประกอบด้วย:

- title: `Server Bots`
- subtitle: `ตัวดูแลเซิร์ฟเวอร์สำหรับ log sync, config, และ restart`
- status chips:
  - online bots
  - stale sync
  - config pending
  - restart attention
- primary action:
  - `สร้าง Server Bot`

### 6.2 Health strip

cards หลัก:

- online bots
- servers missing bot
- last sync stale
- restart/config issues

### 6.3 Server bot table

คอลัมน์หลัก:

- display name
- server
- status
- sync freshness
- config capability
- restart capability
- last seen
- issue
- actions

actions:

- ดูรายละเอียด
- เปิด sync/logs
- เปิด config
- เปิด restart control
- reset binding / reissue setup

### 6.4 Sync and config posture

section นี้อยู่ใต้ table หรือ rail ขวา

แสดง:

- latest sync event time
- source path / source posture ถ้ามี
- config write readiness
- backup/rollback posture

### 6.5 Diagnostics rail

แสดง checklist สั้น:

1. runtime online
2. sync สดพอ
3. config path พร้อม
4. restart method พร้อม

secondary actions:

- `ดูการวินิจฉัย`
- `เปิดบันทึกการ sync`
- `เปิดประวัติการเปลี่ยน config`

## 7. Data mapping from current repo

แหล่งข้อมูลที่ใช้ได้ทันที:

- `state.agents` จาก [C:\new\src\admin\assets\tenant-console.js](C:/new/src/admin/assets/tenant-console.js)
- `/admin/api/platform/agents?tenantId=...`
- `/admin/api/runtime/supervisor`
- ข้อมูล sync/log/config จาก sections เดิมของ tenant console

mapping ขั้นแรก:

- ใช้ filter/label เพื่อแยกรายการที่เป็น sync/config/restart runtime
- ใช้ `role`, `scope`, `runtimeKey`, `serverId`, `lastSeenAt`, `version`, `metadata` เป็นฐาน
- ผูก quick action ไปยังหน้า `Logs & Sync`, `Server Config`, `Restart Control` ใหม่ แทนการกองไว้ในหน้าเดียว

## 8. Component list

components ที่ต้องมี:

- `SyncFreshnessBadge`
- `ConfigCapabilityBadge`
- `RestartCapabilityBadge`
- `ServerCoverageCard`
- `BotProvisioningChecklist`
- `RuntimeDiagnosticsPanel`
- `EmptyStateServerBot`
- `LockedStateServerBot`

pattern ที่ควรใช้:

- table สำหรับภาพรวม
- detail split view สำหรับการตรวจสอบ
- diagnostics เป็น right rail ไม่ใช่ modal หลัก

## 9. DOM hook reuse plan

phase แรกควร reuse:

- `tenantAgentTable`
- state loaders เดิมจาก tenant console
- quick link logic จาก sections `logs`, `config`, `support-tools`

หลักการ:

- wrap ของเดิมก่อน
- ค่อยแตกเป็น component/page-based structure
- ไม่เปลี่ยน route contract เดิมทันที

## 10. Build phases

### Phase A

- สร้างหน้า list และ filter server-bot view จากข้อมูล runtime เดิม
- ทำ health strip และ table
- แยก quick actions ไปหน้า logs/config/restart

### Phase B

- เพิ่ม create/provision wizard
- เพิ่ม detail page พร้อม diagnostics checklist
- เพิ่ม stale sync และ config posture warnings

### Phase C

- ผูก restart history / config history / sync anomalies เข้าหน้านี้
- เพิ่ม export diagnostics และ install guide

## 11. Acceptance criteria

- ผู้ใช้แยก `Server Bot` ออกจาก `Delivery Agent` ได้จากชื่อหน้าและงานหลักทันที
- operator รู้ว่า server ไหนไม่มี bot ประจำ
- operator เห็น sync freshness ได้โดยไม่ต้องเปิดหลายหน้า
- operator เข้าไป config หรือ restart ต่อได้จากหน้าเดียวโดยเส้นทางชัดเจน
- route เดิมและ DOM hooks เดิมยังอยู่สำหรับ staged migration

## 12. Open follow-up

- เพิ่ม type field ระดับ persistence ให้แยก `server_bot` จาก `delivery_agent` โดยไม่พึ่ง heuristic
- ถ้ามี dedicated sync/config history endpoints เพิ่ม ให้ย้าย section diagnostics จาก derived snapshot ไปใช้ dedicated data โดยตรง
