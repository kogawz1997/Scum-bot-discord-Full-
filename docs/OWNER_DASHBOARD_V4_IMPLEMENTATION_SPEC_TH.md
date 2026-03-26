# Owner Dashboard V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [OWNER_V4_WIREFRAMES_TH.md](./OWNER_V4_WIREFRAMES_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [PRODUCT_READY_GAP_MATRIX.md](./PRODUCT_READY_GAP_MATRIX.md)

เอกสารนี้ใช้สำหรับเริ่มทำหน้า `Owner Dashboard V4` จากโค้ดจริงในโปรเจกต์ โดยย้ายหน้า owner จาก single-surface ที่มีหลาย section ปะปนกัน ไปเป็นหน้า command center ที่ตอบคำถามระดับแพลตฟอร์มได้ในไม่กี่วินาที

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/owner`
- route alias ที่ต้องรักษาไว้: `/owner#overview`
- หน้าใช้งานหลักของบทบาท:
  - `super_admin`
  - `support_admin`
  - `billing_admin`

บทบาทของหน้านี้:

- บอกสุขภาพรวมของแพลตฟอร์ม
- ชี้ tenant หรือเหตุการณ์ที่ควรดูต่อทันที
- พาไป workflow หลักของ owner ได้ใน 1-2 คลิก
- ไม่พยายามทำทุกอย่างในหน้าเดียว

สิ่งที่หน้านี้ต้องไม่ทำ:

- ไม่เป็น mega dashboard ที่รวมตารางทุกชุดไว้พร้อมกัน
- ไม่ใช้ hero หรือคำอธิบายยาวก่อนเนื้อหาจริง
- ไม่ซ่อน action สำคัญไว้ในหลายชั้นของเมนู

## 2. Current repo baseline

ไฟล์ฐานที่เกี่ยวข้อง:

- [C:\new\src\admin\assets\owner-console.js](C:/new/src/admin/assets/owner-console.js)
- [C:\new\src\admin\api\adminGetRoutes.js](C:/new/src/admin/api/adminGetRoutes.js)
- [C:\new\src\services\adminDashboardService.js](C:/new/src/services/adminDashboardService.js)
- [C:\new\src\services\platformMonitoringService.js](C:/new/src/services/platformMonitoringService.js)
- [C:\new\src\services\platformService.js](C:/new/src/services/platformService.js)

state ที่มีอยู่จริงใน owner surface:

- `overview`
- `observability`
- `deliveryLifecycle`
- `reconcile`
- `tenants`
- `subscriptions`
- `licenses`
- `agents`
- `notifications`
- `incidentInbox`
- `securityEvents`
- `runtimeSupervisor`
- `requestLogs`

DOM / section hooks ที่มีอยู่แล้ว:

- `ownerOverviewStats`
- `ownerTenantTable`
- `ownerIncidentStats`
- `ownerIncidentFeed`
- `ownerRuntimeTable`
- `ownerAgentTable`

endpoint ที่ใช้เป็นฐานได้ทันที:

- `/admin/api/platform/overview`
- `/admin/api/platform/tenants`
- `/admin/api/platform/subscriptions`
- `/admin/api/platform/licenses`
- `/admin/api/platform/agents`
- `/admin/api/platform/reconcile`
- `/admin/api/runtime/supervisor`
- `/admin/api/observability`
- `/admin/api/observability/requests`

## 3. Product positioning

`Owner Dashboard` คือหน้า command center ของผู้ให้บริการ

ต้องตอบคำถาม 4 ข้อให้ได้ทันที:

1. ตอนนี้แพลตฟอร์มปกติไหม
2. tenant ไหนต้องดูต่อก่อน
3. runtime ไหนเริ่มเสี่ยง
4. วันนี้มีผลกระทบเชิงธุรกิจหรือความเชื่อถืออะไรหรือไม่

## 4. Visual thesis

`platform command center`

ความรู้สึกที่ต้องได้:

- สุขุม
- ตัดสินใจเร็ว
- มองภาพรวมแล้วรู้ว่าต้องคลิกไปหน้าไหนต่อ
- เห็นลำดับความสำคัญชัด

สิ่งที่ต้องเด่นกว่าหน้า tenant:

- cross-tenant view
- incident pressure
- runtime readiness
- commercial exposure

## 5. Route and information architecture

หน้า `/owner` ต้องมี 5 บล็อกหลักเท่านั้น:

1. page header
2. KPI strip
3. action hub
4. attention center
5. contextual rail

### 5.1 Page header

ประกอบด้วย:

- title: `ภาพรวมแพลตฟอร์ม`
- subtitle: `สุขภาพรวมของ tenant, runtime, รายได้, และเหตุการณ์ที่ต้องจับตา`
- status chips:
  - active tenants
  - ready runtimes
  - open incidents
  - expiring subscriptions
- primary action:
  - `เปิดกล่องเหตุการณ์`

### 5.2 KPI strip

การ์ดสรุป 6 ใบ:

- active tenants
- managed services ready
- online agents
- open incidents
- failed delivery/reconcile attention
- revenue or subscription exposure

หลักการ:

- หนึ่งการ์ดมีหนึ่งค่าเด่น
- มีคำอธิบายไม่เกิน 1 บรรทัด
- มี badge เสริมได้ 1-2 อัน

### 5.3 Action hub

แบ่งเป็น 3 กลุ่ม:

- `ซัพพอร์ตและเหตุการณ์`
- `ความเชื่อถือและหลักฐาน`
- `การเปลี่ยนแปลงระบบ`

quick actions ที่ควรมี:

- เปิด incident inbox
- เปิด tenant support case
- ดู delivery lifecycle
- เปิด wallet audit
- ดู access sessions
- ดู config apply / recovery posture

### 5.4 Attention center

ส่วนนี้คือจุดตัดสินใจหลักของหน้า

แสดง:

- tenants ที่ต้องจับตา
- incidents ล่าสุด
- runtime degraded
- quota hotspots

รูปแบบ:

- ซ้ายเป็น list/table ของ tenants ที่เสี่ยง
- ขวาเป็น feed ของเหตุการณ์และ recommendations

### 5.5 Contextual rail

rail ขวาแสดง:

- next best action
- current support queue
- commercial watch
- active guardrails

## 6. Data mapping from current repo

mapping จาก state/endpoint ปัจจุบัน:

- tenant totals และ subscription signals ใช้จาก `state.overview` และ `state.tenants`
- runtime readiness ใช้จาก `state.runtimeSupervisor`
- agent count ใช้จาก `state.agents`
- incident pressure ใช้จาก `state.incidentInbox`, `state.notifications`, `state.requestLogs`
- reconcile pressure ใช้จาก `state.reconcile`
- business posture ใช้จาก `state.subscriptions`, `state.licenses`, และ `state.overview`

logic เดิมที่ควร reuse ก่อน:

- `renderStats`
- `buildIncidentItems`
- `normalizeRuntimeRows`
- quota pressure helpers
- support-case shortcuts

## 7. Component list

components ที่ต้องมี:

- `OwnerKpiCard`
- `AttentionTenantList`
- `IncidentSummaryFeed`
- `ActionHubGroup`
- `CommercialWatchCard`
- `RuntimeReadinessCard`
- `EmptyStateOwnerOverview`

pattern ที่ควรใช้:

- KPI row อยู่บนสุด
- action hub เป็นการ์ดใหญ่ไม่เกิน 3 กลุ่ม
- list/feed ใช้เป็นแกน ไม่ใช้ card mosaic เต็มหน้า

## 8. DOM hook reuse plan

phase แรกควร wrap ของเดิม ไม่รื้อทันที:

- `ownerOverviewStats`
- `ownerTenantTable`
- `ownerIncidentStats`
- `ownerIncidentFeed`

หลักการ:

- เปลี่ยน layout hierarchy ก่อน
- ใช้ renderer เดิมเป็น data adapter ชั่วคราว
- ค่อยแตก component ใหม่ทีละ block

## 9. Build phases

### Phase A

- ย้ายหน้า overview ให้เหลือ header + KPI + action hub + attention center
- ใช้ endpoint/read model เดิมทั้งหมด
- ลด section ซ้ำจาก shell เก่า

### Phase B

- เพิ่ม recommendation rail
- เชื่อม action hub กับ support case / incidents / observability flows
- ปรับ copy ให้เป็นภาษางานจริง

### Phase C

- เพิ่ม personalization ตาม role owner
- เพิ่ม richer commercial watch และ incident trend
- เชื่อมกับ runtime health page ใหม่

## 10. Acceptance criteria

- owner เปิดหน้าแล้วรู้ทันทีว่าควรไปต่อหน้าไหน
- หน้า overview ไม่กลายเป็นหน้ารวม section เดิมแบบยาว
- tenant risk, runtime health, และ incident pressure อยู่ในหน้าเดียวกันแบบอ่านง่าย
- route เดิมยังคงใช้ได้
- DOM hooks เดิมยังไม่พัง

## 11. Open follow-up

- ถ้ามี dedicated revenue analytics endpoint เพิ่ม ให้ย้าย commercial watch จาก derived snapshot ไปใช้ข้อมูลจริงแบบรายช่วงเวลา
- ถ้ามี incident severity model ชัดขึ้น ให้ KPI และ attention ranking ใช้ severity weighting โดยตรง
