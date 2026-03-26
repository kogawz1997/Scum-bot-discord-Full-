# Owner Runtime Health and Incidents V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [OWNER_V4_WIREFRAMES_TH.md](./OWNER_V4_WIREFRAMES_TH.md), [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md), [VERIFICATION_STATUS_TH.md](./VERIFICATION_STATUS_TH.md)

เอกสารนี้ใช้สำหรับแยกงาน `runtime health`, `incident inbox`, และ `observability` ของ owner ออกจาก overview เดิมให้เป็นหน้า operational suite ที่อ่านง่าย, ตัดสินใจเร็ว, และเชื่อมกับ support/commercial workflow ได้ชัด

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/owner/runtime-health`
- route เป้าหมาย: `/owner/incidents`
- route เป้าหมาย: `/owner/observability`

route/hash เดิมที่ต้อง map ชั่วคราว:

- `/owner#runtime`
- `/owner#incidents`
- `/owner#observability`
- `/owner#security` บางส่วนที่เป็น signal เชิงปฏิบัติการ

บทบาทของหน้าชุดนี้:

- ติดตามสุขภาพ runtime และ agent ทั้งแพลตฟอร์ม
- ติดตาม incident inbox และ recommendation/runbook
- ติดตาม request pressure, anomalies, และ trend ระดับ owner

## 2. Current repo baseline

ไฟล์ฐานที่เกี่ยวข้อง:

- [C:\new\src\admin\assets\owner-console.js](C:/new/src/admin/assets/owner-console.js)
- [C:\new\src\admin\api\adminGetRoutes.js](C:/new/src/admin/api/adminGetRoutes.js)
- [C:\new\src\services\platformMonitoringService.js](C:/new/src/services/platformMonitoringService.js)
- [C:\new\src\services\runtimeSupervisorService.js](C:/new/src/services/runtimeSupervisorService.js)

state ที่มีอยู่จริง:

- `runtimeSupervisor`
- `agents`
- `incidentInbox`
- `notifications`
- `securityEvents`
- `requestLogs`
- `observability`
- `deliveryLifecycle`
- `reconcile`

DOM / hooks ที่มีอยู่จริง:

- `ownerRuntimeTable`
- `ownerAgentTable`
- `ownerIncidentStats`
- `ownerIncidentFeed`
- `ownerIncidentRunbooks`
- `ownerDeliveryLifecycleStats`
- `ownerDeliveryLifecycleActions`

endpoint ที่ใช้ได้ทันที:

- `/admin/api/runtime/supervisor`
- `/admin/api/platform/agents`
- `/admin/api/platform/reconcile`
- `/admin/api/observability`
- `/admin/api/observability/requests`
- `/admin/api/observability/export`
- `/admin/api/security/rotation-check`

## 3. Product positioning

หน้าชุดนี้ต้องทำหน้าที่เหมือน operations desk ของ owner

ต้องตอบคำถาม:

- service ไหน degraded
- incident ไหนควร acknowledge หรือส่งต่อ
- anomaly ไหนเป็น runtime problem, delivery problem, หรือ commercial/support problem

## 4. Visual thesis

`ops and incident desk`

ความรู้สึกที่ต้องได้:

- ดิบพอให้รู้ว่าเป็น operations tool
- แต่สะอาดและเป็นมืออาชีพ
- อ่านเร็ว
- ไม่มีเนื้อหาซ้ำจากหน้า overview

สิ่งที่ต้องเน้น:

- severity hierarchy
- signal freshness
- runbook recommendation
- export evidence paths

## 5. Route and information architecture

### 5.1 `/owner/runtime-health`

หน้าติดตาม runtime/agent readiness

มีส่วนหลัก:

1. header
2. health summary strip
3. managed services table
4. agent runtimes table
5. right rail สำหรับ drift and posture

### 5.2 `/owner/incidents`

หน้าติดตาม incident inbox และ runbooks

มีส่วนหลัก:

1. header + filters
2. incident KPI strip
3. incident list/feed
4. runbook recommendations
5. export/ack rail

### 5.3 `/owner/observability`

หน้าดู request pressure / lifecycle / anomalies

มีส่วนหลัก:

1. header
2. metric strip
3. time-series summary
4. request hotspots
5. delivery lifecycle attention

## 6. Page sections

### 6.1 Runtime health

header:

- title: `Runtime Health`
- subtitle: `ติดตาม bot, worker, watcher, admin web, และ agent runtimes ของแพลตฟอร์ม`
- primary action:
  - `เปิด incidents`

sections:

- summary cards:
  - ready services
  - degraded services
  - stale agents
  - version drift
- managed services table
- agent runtimes table
- rail:
  - drift summary
  - next recommended actions

### 6.2 Incidents

header:

- title: `Incidents`
- subtitle: `กล่องเหตุการณ์ที่เจ้าของระบบต้องเห็นก่อน พร้อมคำแนะนำการตอบสนอง`
- primary action:
  - `ส่งออกหลักฐาน`

filters:

- severity
- acknowledged
- kind
- time window

sections:

- KPI strip
- incident feed
- runbook cards
- quick actions:
  - open support case
  - export diagnostics
  - open observability

### 6.3 Observability

header:

- title: `Observability`
- subtitle: `ดูความสดของข้อมูล คำขอช้า และแนวโน้มความผิดปกติระดับแพลตฟอร์ม`
- primary action:
  - `ส่งออก observability`

sections:

- metric strip
- request latency and hotspot summary
- anomaly trend cards
- delivery lifecycle watch
- contextual rail with top errors and actions

## 7. Data mapping from current repo

runtime health:

- ใช้ `normalizeRuntimeRows(state.runtimeSupervisor)`
- ใช้ `state.agents` สำหรับ agent runtime posture

incidents:

- ใช้ `state.incidentInbox`
- ใช้ `state.notifications`
- ใช้ `state.securityEvents`
- ใช้ `state.requestLogs.items`

observability:

- ใช้ `state.observability`
- ใช้ `state.requestLogs.metrics`
- ใช้ `state.deliveryLifecycle`
- ใช้ `state.reconcile`

logic เดิมที่ควร reuse:

- `renderRuntimeTables`
- `renderIncidentCenter`
- observability series helpers
- delivery lifecycle action presenters

## 8. Component list

components ที่ต้องมี:

- `RuntimeStatusMatrix`
- `AgentRuntimeRegistry`
- `IncidentFeedList`
- `IncidentRunbookCard`
- `ObservabilityMetricCard`
- `RequestHotspotTable`
- `LifecycleActionPanel`
- `SeverityFilterBar`

pattern ที่ควรใช้:

- ตารางสำหรับ runtime registry
- feed/timeline สำหรับ incidents
- metric cards + compact tables สำหรับ observability

## 9. DOM hook reuse plan

phase แรกควร wrap ของเดิม:

- `ownerRuntimeTable`
- `ownerAgentTable`
- `ownerIncidentStats`
- `ownerIncidentFeed`
- `ownerIncidentRunbooks`
- `ownerDeliveryLifecycleStats`
- `ownerDeliveryLifecycleActions`

หลักการ:

- แยกหน้าออกก่อน
- คง renderer และ state loader เดิมในระยะเปลี่ยนผ่าน
- ค่อยแตก component ใหม่เมื่อ route page-based พร้อม

## 10. Build phases

### Phase A

- แยก `/owner/runtime-health`, `/owner/incidents`, `/owner/observability`
- ย้าย sections เดิมไปอยู่หน้าที่ถูกต้อง
- ทำ page header และ filter layout ใหม่

### Phase B

- เพิ่ม richer right rail and next-step actions
- ปรับ copy/runbook ให้สั้นและเป็นงานจริง
- แยก incident feed จาก generic notifications ให้ชัดขึ้น

### Phase C

- เพิ่ม timeline correlation ระหว่าง incident, runtime, และ delivery lifecycle
- เพิ่ม tenant context jump จาก incident item ไป tenant detail/support flow
- เพิ่ม export presets ตาม use case

## 11. Acceptance criteria

- owner ไม่ต้องไถ overview ยาว ๆ เพื่อดู runtime หรือ incidents
- runtime, incidents, และ observability มีหน้าเฉพาะของตัวเอง
- incident feed อ่านง่ายและมี runbook ข้าง ๆ
- observability ชี้ request hotspot และ lifecycle attention ได้ชัด
- route/hash เดิมยังใช้ได้ในช่วงเปลี่ยนผ่าน

## 12. Open follow-up

- ถ้ามี dedicated incident entity ที่ละเอียดขึ้น ให้ย้ายจาก aggregated inbox ไปใช้ incident model โดยตรง
- ถ้ามี richer analytics source ให้เพิ่ม correlation view ระหว่าง revenue, incident load, และ tenant churn risk
