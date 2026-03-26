# Tenant Delivery Agents V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [TENANT_V4_WIREFRAMES_TH.md](./TENANT_V4_WIREFRAMES_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [PLATFORM_PACKAGE_AND_AGENT_MODEL.md](./PLATFORM_PACKAGE_AND_AGENT_MODEL.md)

เอกสารนี้ใช้สำหรับเริ่มทำหน้า `Tenant Delivery Agents V4` จากโค้ดจริงในโปรเจกต์ โดยแยกบทบาท `Delivery Agent` ออกจาก `Server Bot` ให้ชัดเจนในระดับหน้าใช้งาน, งานประจำวัน, และสิทธิ์การจัดการ

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/tenant/delivery-agents`
- route รอง: `/tenant/delivery-agents/new`
- route รายตัว: `/tenant/delivery-agents/:agentId`
- route เดิมที่ต้อง map ชั่วคราว: `/tenant#plan-integrations`, `/tenant#support-tools`, `/tenant#transactions`

บทบาทของหน้านี้:

- ดูสถานะ `Delivery Agent` ของ tenant
- provision runtime ใหม่
- ออก one-time setup token
- ดู device binding / credential posture
- ดู readiness สำหรับงานส่งของและงานประกาศในเกม

ขอบเขตที่หน้านี้ต้องไม่ทำ:

- ไม่ใช้เป็นหน้าจัดการไฟล์ `.ini`
- ไม่ใช้เป็นหน้าหลักของ restart server
- ไม่ทำให้ผู้ใช้สับสนว่า `Delivery Agent` กับ `Server Bot` เป็น runtime เดียวกัน

## 2. Current repo baseline

ไฟล์ฐานที่มีอยู่จริง:

- [C:\new\src\admin\assets\tenant-console.js](C:/new/src/admin/assets/tenant-console.js)
- [C:\new\src\admin\api\adminGetRoutes.js](C:/new/src/admin/api/adminGetRoutes.js)
- [C:\new\src\admin\api\adminPlatformPostRoutes.js](C:/new/src/admin/api/adminPlatformPostRoutes.js)
- [C:\new\src\domain\agents\agentRegistryService.js](C:/new/src/domain/agents/agentRegistryService.js)
- [C:\new\src\services\platformService.js](C:/new/src/services/platformService.js)

จุดเชื่อมที่มีอยู่แล้วในโค้ด:

- tenant console โหลดรายการ runtime ผ่าน `/admin/api/platform/agents?tenantId=...`
- tenant console มีตาราง `tenantAgentTable` สำหรับ integrations/runtime ที่มองเห็นได้
- control plane รองรับ:
  - สร้าง agent token ผ่าน `/admin/api/platform/agent-token`
  - สร้าง provisioning token ผ่าน `/admin/api/platform/agent-provision`
  - revoke token ผ่าน `/admin/api/platform/agent-token/revoke`
  - rotate token ผ่าน `/admin/api/platform/agent-token/rotate`
- public activation/session/heartbeat มีอยู่แล้วผ่าน `/platform/api/v1/agent/*`

ข้อจำกัดของ baseline ตอนนี้:

- tenant UI ยังรวม `agents` ไว้ในหน้ารวม plan/integrations
- ยังไม่มีหน้ารายละเอียด `Delivery Agent` แบบ task-first
- runtime list ปัจจุบันยังเป็นมุมมองรวมของ agent runtimes มากกว่าหน้าเฉพาะ execution runtime

## 3. Product positioning

`Delivery Agent` คือ runtime สำหรับงานส่งของในเกมเป็นหลัก

งานที่ต้องสื่อให้ชัดใน UI:

- รับ delivery jobs
- ส่งผลการทำงานกลับ
- แสดง online/offline และ last seen
- แสดง machine binding และ version posture
- ถ้า deployment รองรับ อาจใช้ช่วยส่ง `#Announce`

งานที่ต้องกันไม่ให้สับสน:

- ไม่ใช่ตัวอ่าน log เป็นหลัก
- ไม่ใช่ตัวแก้ config server
- ไม่ใช่ตัวหลักสำหรับ restart server

## 4. Visual thesis

`execution runtime desk`

ความรู้สึกที่ต้องได้:

- พร้อมใช้งาน
- ควบคุมได้
- รู้ทันทีว่าตัวไหน online/offline
- แยก runtime ที่พร้อมรับงานจริง ออกจาก runtime ที่มีแต่ token แต่ยังไม่ activate

ภาษาที่ควรใช้:

- ใช้คำว่า `Delivery Agent`
- ใช้คำไทยกำกับเช่น `ตัวส่งของในเกม`
- ไม่ใช้คำกว้างอย่าง `agent runtime` เป็นชื่อหน้า

## 5. Route and information architecture

### 5.1 `/tenant/delivery-agents`

หน้า list/work page สำหรับ operator ใช้งานทุกวัน

ต้องมี 5 ส่วน:

1. page header
2. health summary
3. primary table
4. right rail สำหรับ provision/reissue
5. recent alerts / queue posture

### 5.2 `/tenant/delivery-agents/new`

หน้า wizard สำหรับ provision runtime ใหม่

ขั้นตอน:

1. เลือก server
2. ตั้งชื่อ runtime
3. กำหนด role/scope ที่ถูกต้อง
4. สร้าง setup token
5. แสดง bootstrap package / คำแนะนำติดตั้ง

### 5.3 `/tenant/delivery-agents/:agentId`

หน้ารายละเอียดสำหรับ runtime เดียว

ต้องมี:

- summary
- current binding
- credentials and rotation
- delivery readiness
- recent sessions / heartbeats
- recent failures
- dangerous actions

## 6. Page sections

### 6.1 Header

หัวหน้าต้องตอบคำถาม 3 ข้อทันที:

- ตอนนี้ tenant มี Delivery Agent ใช้งานได้กี่ตัว
- ตัวที่พร้อมรับงานจริงมีกี่ตัว
- ถ้าต้องเพิ่ม runtime ใหม่ ต้องกดตรงไหน

องค์ประกอบ:

- title: `Delivery Agents`
- subtitle: `ตัวส่งของในเกมสำหรับงานส่งของและงานประกาศที่ deployment รองรับ`
- status chips:
  - online count
  - offline count
  - pending activation
  - minimum-version drift
- primary action:
  - `สร้าง Delivery Agent`

### 6.2 Health summary

แสดง 4 cards:

- online runtimes
- pending activation
- jobs waiting for runtime
- token/device issues

### 6.3 Runtime list table

คอลัมน์หลัก:

- display name
- server
- status
- role/scope
- version
- machine binding
- last seen
- current issue
- actions

actions ต่อแถว:

- ดูรายละเอียด
- คัดลอก bootstrap/reissue setup
- rotate credential
- revoke

### 6.4 Provision rail

แสดง guidance สั้น ไม่เกิน 4 ขั้น:

1. สร้าง runtime record
2. ดาวน์โหลด bootstrap
3. activate บนเครื่องจริง
4. ตรวจ heartbeat และ readiness

ต้องมี secondary actions:

- `รีเซ็ตการผูกเครื่อง`
- `ออก setup ใหม่`
- `ดูคำแนะนำติดตั้ง`

### 6.5 Readiness and queue posture

พื้นที่ล่างหน้าหรือ right rail เพิ่ม:

- delivery runtime health
- queue pressure
- dead-letter summary
- last delivery failures

หน้าที่ของส่วนนี้คือช่วยตอบว่า:

- runtime online แต่ใช้งานได้จริงไหม
- มีงานค้างเพราะ runtime หายหรือเปล่า

## 7. Data mapping from current repo

แหล่งข้อมูลที่ใช้ได้ทันที:

- `state.agents` จาก [C:\new\src\admin\assets\tenant-console.js](C:/new/src/admin/assets/tenant-console.js)
- `/admin/api/platform/agents?tenantId=...`
- `/admin/api/delivery/runtime`
- `/admin/api/platform/agent-provision`
- `/admin/api/platform/agent-token`
- `/admin/api/platform/agent-token/revoke`
- `/admin/api/platform/agent-token/rotate`
- `/platform/api/v1/agent/heartbeat`
- `/platform/api/v1/agent/activate`

mapping ขั้นแรก:

- filter รายการ runtime ให้เหลือ execution-oriented entries ก่อน
- ใช้ `role`, `scope`, `runtimeKey`, `agentId`, `serverId`, `guildId`, `minimumVersion`, `lastSeenAt` เป็น field หลักของ UI
- ถ้าข้อมูล token/device ยังไม่ครบใน tenant list view ให้เปิดรายละเอียดผ่าน detail route แทน ไม่ยัดทุกอย่างในตาราง

## 8. Component list

components ที่ต้องมี:

- `RuntimeStatusBadge`
- `RuntimeScopeBadge`
- `MachineBindingCard`
- `ProvisioningChecklist`
- `VersionDriftBanner`
- `DeliveryReadinessPanel`
- `AgentActionMenu`
- `EmptyStateDeliveryAgent`
- `LockedStateDeliveryAgent`

pattern ที่ควรใช้:

- table เป็น main work surface
- drawer หรือ side panel สำหรับ quick inspect
- detail page สำหรับ sensitive actions

## 9. DOM hook reuse plan

เพื่อไม่ให้พังของเดิม:

- ห่อ `tenantAgentTable` เดิมไว้ใน V4 table adapter ก่อน
- ใช้ state load เดิมจาก tenant console ไปก่อน
- ใช้ DOM hooks เดิมเท่าที่มี แล้วค่อยเพิ่ม wrapper ใหม่ เช่น:
  - `tenantAgentTable`
  - `tenantPlanStats`
  - `tenantRestartPresetBtn` สำหรับ link ออกไปหน้า restart control ภายหลัง

สิ่งที่ไม่ควรทำใน phase แรก:

- ไม่ลบ handler เดิมทันที
- ไม่เปลี่ยน shape ของ API response
- ไม่เปลี่ยน auth/session guard

## 10. Build phases

### Phase A

- แยกหน้า list ออกจาก plan/integrations เดิม
- ทำ header + summary + table
- ใช้ data read จาก endpoint เดิมทั้งหมด

### Phase B

- เพิ่ม create/provision page
- เพิ่ม reissue/rotate/revoke flows ในหน้า detail
- แสดง device binding และ session posture ชัดขึ้น

### Phase C

- เพิ่ม delivery readiness panel
- ผูก queue/dead-letter summary เข้าหน้านี้
- เพิ่ม install guide และ diagnostics export

## 11. Acceptance criteria

- tenant แยก `Delivery Agent` ออกจาก `Server Bot` ได้ทันทีจากชื่อหน้าและคำอธิบาย
- operator สร้าง runtime ใหม่ได้โดยไม่ต้องไปค้นในหน้า plan/integrations
- operator รู้ได้ภายในหน้าเดียวว่าตัวไหน online, pending, offline, revoked
- sensitive actions ถูกแยกออกจาก quick actions ชัดเจน
- route เดิมยังไม่พัง และ DOM hooks เดิมยังคงอยู่

## 12. Open follow-up

- ถ้า backend เพิ่ม type field แบบชัดเจน (`delivery_agent`, `server_bot`) ให้เลิกพึ่ง heuristics จาก role/scope/runtimeKey
- ถ้ามี session/device API ที่ tenant-scope ละเอียดขึ้น ให้ย้าย machine binding จาก detail summary ไปเป็น first-class section
