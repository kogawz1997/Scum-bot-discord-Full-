# Owner Tenants V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [OWNER_V4_WIREFRAMES_TH.md](./OWNER_V4_WIREFRAMES_TH.md), [TENANT_V4_WIREFRAMES_TH.md](./TENANT_V4_WIREFRAMES_TH.md), [PLATFORM_PACKAGE_AND_AGENT_MODEL.md](./PLATFORM_PACKAGE_AND_AGENT_MODEL.md)

เอกสารนี้ใช้สำหรับออกแบบหน้า `Owner > Tenants` ให้เป็น registry และ inspection surface ที่ใช้งานจริงง่าย เหมาะกับ owner ที่ต้องดูทั้งสถานะลูกค้า, package, support, runtime readiness, และ commercial risk ในที่เดียว

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/owner/tenants`
- route detail: `/owner/tenants/:tenantId`
- route detail ย่อย:
  - `/owner/tenants/:tenantId/health`
  - `/owner/tenants/:tenantId/support`
  - `/owner/tenants/:tenantId/billing`

route/hash เดิมที่ต้อง map ชั่วคราว:

- `/owner#fleet`
- `/owner#fleet-assets`
- `/owner#commercial`

บทบาทของหน้านี้:

- ดู tenant ทั้งหมดแบบ operator-friendly
- หา tenant ที่มีปัญหาได้เร็ว
- เปิด detail ของ tenant รายตัว
- เริ่ม support / diagnostics / commercial review จาก tenant context เดียว

## 2. Current repo baseline

ไฟล์ฐานที่เกี่ยวข้อง:

- [C:\new\src\admin\assets\owner-console.js](C:/new/src/admin/assets/owner-console.js)
- [C:\new\src\admin\api\adminGetRoutes.js](C:/new/src/admin/api/adminGetRoutes.js)
- [C:\new\src\services\platformService.js](C:/new/src/services/platformService.js)

DOM / state ที่มีอยู่จริง:

- `state.tenants`
- `state.subscriptions`
- `state.licenses`
- `state.tenantQuotaSnapshots`
- `state.supportCase`
- `ownerTenantTable`
- `ownerSupportTenantSelect`

endpoint ที่ใช้ได้ทันที:

- `/admin/api/platform/tenants`
- `/admin/api/platform/subscriptions`
- `/admin/api/platform/licenses`
- `/admin/api/platform/quota`
- `/admin/api/platform/tenant-support-case`
- `/admin/api/platform/tenant-support-case/export`
- `/admin/api/platform/tenant-diagnostics`
- `/admin/api/platform/tenant-diagnostics/export`
- `/admin/api/platform/tenant-config`

## 3. Product positioning

`Owner > Tenants` ต้องเป็นทั้ง:

- customer registry
- support starting point
- commercial inspection page

คำถามที่หน้านี้ต้องตอบ:

- ลูกค้าคนไหนมีปัญหา
- ลูกค้าคนไหนกำลังใกล้ limit หรือ renewal
- ถ้าจะช่วย tenant รายหนึ่ง ต้องกดไปไหนต่อ

## 4. Visual thesis

`customer operations registry`

ความรู้สึกที่ต้องได้:

- คล้าย modern SaaS admin
- อ่านรายชื่อเร็ว
- detail ชัด
- ไม่ต้องสลับไปหลายหน้าก่อนเข้าใจลูกค้ารายหนึ่ง

## 5. Route and information architecture

### 5.1 `/owner/tenants`

หน้า index/work page

มี 5 ส่วน:

1. page header
2. health/commercial filter strip
3. tenant table
4. right rail summary
5. support quick actions

### 5.2 `/owner/tenants/:tenantId`

หน้า detail

ต้องมี:

- tenant summary strip
- tabs:
  - Overview
  - Health
  - Support
  - Billing
  - Access & Security
- contextual rail สำหรับ next action

### 5.3 `/owner/tenants/:tenantId/health`

เน้น:

- runtime posture
- sync/delivery posture
- quota pressure
- reconcile notes

### 5.4 `/owner/tenants/:tenantId/support`

เน้น:

- support case summary
- diagnostics export
- current signals
- recommended next steps

### 5.5 `/owner/tenants/:tenantId/billing`

เน้น:

- package
- subscription state
- renewal
- license
- seat / quota pressure

## 6. Page sections

### 6.1 Header

หน้า list:

- title: `Tenants`
- subtitle: `ลูกค้า แพ็กเกจ สถานะการใช้งาน และจุดเริ่มงานซัพพอร์ต`
- primary action:
  - `สร้าง tenant`

filters ที่ต้องมี:

- search
- package
- subscription state
- risk level
- has incidents

### 6.2 Tenant table

คอลัมน์หลัก:

- tenant
- package
- subscription
- server/runtime posture
- last activity
- current alerts
- actions

actions ต่อแถว:

- เปิดรายละเอียด
- เปิด support case
- export diagnostics

### 6.3 Detail summary strip

cards หลัก:

- current package
- subscription state
- server count
- delivery/server bot health
- monthly usage or pressure
- open support signals

### 6.4 Support block

ต้อง reuse ของเดิมที่มีให้ใช้งานง่ายขึ้น:

- tenant support case
- diagnostics export
- support signals
- next step guidance

### 6.5 Billing block

ต้องแสดง:

- subscription status
- renews at
- license state
- quota hotspots
- related offers or upsell notes

## 7. Data mapping from current repo

mapping ที่ใช้ได้ทันที:

- tenant registry ใช้จาก `state.tenants`
- commercial posture ใช้จาก `state.subscriptions` และ `state.licenses`
- quota pressure ใช้จาก `state.tenantQuotaSnapshots`
- support context ใช้จาก `state.supportCase`
- diagnostics/support case exports ใช้ endpoint export เดิม

logic เดิมที่ควร reuse:

- `renderTenantTable`
- tenant select population
- support case summary renderers
- quota pressure helper rows

## 8. Component list

components ที่ต้องมี:

- `TenantRegistryTable`
- `TenantRiskBadge`
- `TenantCommercialSummary`
- `TenantSupportSummary`
- `TenantQuotaPressureCard`
- `TenantNextActionRail`
- `EmptyStateOwnerTenants`

pattern ที่ควรใช้:

- list page ใช้ table เป็นหลัก
- detail page ใช้ summary strip + tabs
- export actions อยู่ใน rail หรือ action group ไม่ยัดในคอลัมน์เยอะเกิน

## 9. DOM hook reuse plan

phase แรกควรห่อของเดิมก่อน:

- `ownerTenantTable`
- `ownerSupportTenantSelect`
- support export buttons เดิม

หลักการ:

- table เดิมยังเป็น data source adapter ได้
- support case เดิมให้ย้ายไป tab `Support`
- commercial rows เดิมให้ย้ายไป tab `Billing`

## 10. Build phases

### Phase A

- สร้าง `/owner/tenants` ใหม่แบบ table-first
- ทำ search/filter/risk summaries
- เชื่อม support case และ diagnostics export

### Phase B

- สร้าง `/owner/tenants/:tenantId`
- แยก tabs `Health / Support / Billing`
- ย้าย support summary เดิมเข้าหน้า detail

### Phase C

- เพิ่ม richer tenant health scoring
- เพิ่ม usage and upsell hints
- เพิ่ม link ไป owner runtime/incidents page ตาม tenant context

## 11. Acceptance criteria

- owner หา tenant ที่มีปัญหาได้ในไม่กี่คลิก
- support case และ diagnostics export เริ่มจาก tenant detail ได้เลย
- package/subscription/license/quota อยู่ในมุมมองเดียวกันแบบไม่รก
- route เดิมยังไม่พัง และ DOM hooks เดิมยังอยู่สำหรับ staged migration

## 12. Open follow-up

- ถ้ามี dedicated tenant health score ใน backend ให้แทน risk heuristic จาก alerts/quota/runtime แบบชั่วคราว
- ถ้ามี billing history page จริง ให้ tab `Billing` แตกออกเป็น detail page ย่อยได้
