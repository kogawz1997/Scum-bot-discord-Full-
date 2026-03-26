# Owner Panel V4 Wireframes

สถานะเอกสาร: draft พร้อมใช้เป็นแบบหน้าใช้งานจริง  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [WEB_SURFACES_V4_BLUEPRINT_TH.md](./WEB_SURFACES_V4_BLUEPRINT_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [TENANT_V4_WIREFRAMES_TH.md](./TENANT_V4_WIREFRAMES_TH.md)

เอกสารนี้กำหนด wireframe หน้าใช้งานจริงของ Owner Panel โดยยึดแนวคิด `platform command center`:

- สุขุม ชัดเจน ตัดสินใจเร็ว
- ไม่ทำหน้าตาเหมือน tenant panel แต่ใช้ design system เดียวกัน
- Owner ดูทั้งระบบ, tenant, package, revenue, security, support
- ข้อมูลมากได้ แต่ต้องจัดตาม “สิ่งที่ต้องตัดสินใจก่อน”

## 1. Shared shell

```text
┌ Top bar: scope = platform | search | language | notifications | profile
├ Sidebar: หมวด owner เท่านั้น
├ Page header: ชื่อหน้า | สถานะรวม | primary action
├ Main content: KPI, tables, timelines, diagnostics, detail panels
└ Right rail: risk summary | queue summary | quick investigations
```

## 2. Page templates

### Template O1: Command Dashboard

```text
┌ KPI strip: active tenants | online runtimes | failed jobs | revenue | expiring subscriptions | incidents
├ Left: tenants ที่ต้องจับตา
├ Center: incidents + failed jobs + security warnings
└ Right rail: quick actions + support queue + revenue watch
```

### Template O2: Registry / Index

ใช้กับ tenants, packages, subscriptions, servers, runtimes, jobs

```text
┌ Header: page title + create/export
├ Filter bar: search | status | package | tenant | date
├ Main table
└ Right rail: selected row summary + next action + notes
```

### Template O3: Detail / Inspection

ใช้กับ tenant detail, package detail, runtime detail, ticket detail

```text
┌ Summary strip
├ Tab row
├ Main detail blocks
└ Right rail: risk state | latest incidents | recommended action
```

### Template O4: Security / Audit

```text
┌ Header: scope + export
├ Filter bar: severity | event type | actor | time range
├ Timeline / table
└ Right rail: event detail + response actions + related objects
```

### Template O5: Settings / Recovery

```text
┌ Header: category + primary action
├ Main panels: setting groups / maintenance tools / recovery actions
├ Change summary / warnings
└ Right rail: validation status + last run + guardrails
```

## 3. Sidebar grouping

Owner sidebar แบ่งเป็น 6 หมวดใหญ่:

1. ภาพรวมแพลตฟอร์ม
2. ลูกค้าและแพ็กเกจ
3. รันไทม์และงานระบบ
4. การเงินและรายได้
5. ซัพพอร์ตและความปลอดภัย
6. ตั้งค่าระดับแพลตฟอร์ม

รายการเมนูจริง:

- Overview
- Tenants
- Packages
- Subscriptions
- Servers
- Delivery Agents
- Server Bots
- Jobs
- Logs & Audit
- Billing
- Support
- Security
- Feature Flags
- Settings

## 4. Page-by-page wireframes

### 4.1 `/owner` Overview

- เทมเพลต: O1
- เป้าหมาย: ตอบคำถามว่า “ตอนนี้แพลตฟอร์มต้องดูอะไร”
- สิ่งที่ต้องเห็นทันที:
  - active tenants
  - online delivery agents
  - online server bots
  - failed jobs
  - revenue วันนี้
  - subscriptions ใกล้หมดอายุ
  - incidents ค้าง
- Main blocks:
  - tenants ที่ต้องดูตอนนี้
  - incidents ล่าสุด
  - failed jobs queue
  - security warnings
  - support queue
- Primary action: เปิด tenant/problem ที่ต้องจัดการ

### 4.2 `/owner/tenants`

- เทมเพลต: O2
- เป้าหมาย: ดู tenant ทั้งหมดและหาปัญหา/โอกาสได้เร็ว
- Columns:
  - tenant
  - package
  - subscription state
  - server count
  - delivery/server-bot health
  - last activity
  - alerts
- Primary action: สร้าง tenant

### 4.3 `/owner/tenants/:tenantId`

- เทมเพลต: O3
- เป้าหมาย: เป็นหน้าเจ้าของระบบสำหรับ tenant รายตัว
- Summary strip:
  - package
  - subscription state
  - active servers
  - runtime health
  - monthly usage
  - open tickets
- Tabs:
  - Overview
  - Health
  - Usage
  - Security
  - Support
  - Billing
- Primary action: เปิดใช้งาน / แก้ tenant

### 4.4 `/owner/tenants/:tenantId/health`

- เทมเพลต: O3
- เป้าหมาย: ดู health เชิงระบบของ tenant
- Main blocks:
  - sync health
  - delivery health
  - server bot health
  - failed jobs
  - recent incidents
- Primary action: เปิด diagnostics หรือ support case

### 4.5 `/owner/packages`

- เทมเพลต: O2
- เป้าหมาย: จัดการ package catalog
- Columns:
  - package
  - target customer
  - feature count
  - active subscriptions
  - preview/trial rules
  - status
- Primary action: สร้าง package

### 4.6 `/owner/packages/:packageId`

- เทมเพลต: O3
- เป้าหมาย: ดูรายละเอียด package รายตัว
- Main blocks:
  - package summary
  - feature bundle
  - preview/trial rules
  - upgrade path
  - dependent tenants
- Primary action: บันทึก package

### 4.7 `/owner/packages/features`

- เทมเพลต: O2
- เป้าหมาย: ดู mapping package-feature แบบอ่านง่าย
- Main blocks:
  - feature matrix
  - dependency notes
  - locked preview states
- Primary action: แก้ feature bundle

### 4.8 `/owner/subscriptions`

- เทมเพลต: O2
- เป้าหมาย: ดู subscriptions ทั้งระบบ
- Columns:
  - tenant
  - package
  - state
  - renewal
  - balance
  - risk
- Primary action: เปิด subscription detail

### 4.9 `/owner/subscriptions/:subscriptionId`

- เทมเพลต: O3
- เป้าหมาย: ดู plan, billing, usage, history
- Primary action: ต่ออายุ / ระงับ

### 4.10 `/owner/subscriptions/expiring`

- เทมเพลต: O2
- เป้าหมาย: โฟกัสรายการใกล้หมดอายุหรือถูกระงับ
- Primary action: เปิด tenant ที่เกี่ยวข้อง

### 4.11 `/owner/servers`

- เทมเพลต: O2
- เป้าหมาย: ดู registry ของ server ทั้งระบบ
- Columns:
  - server
  - tenant
  - environment
  - status
  - sync freshness
  - delivery health
  - mapping health
- Primary action: เปิด server detail

### 4.12 `/owner/servers/:serverId`

- เทมเพลต: O3
- เป้าหมาย: ตรวจ server mapping และ health ระดับ owner
- Tabs:
  - Overview
  - Mapping
  - Runtime
  - Jobs
  - Audit

### 4.13 `/owner/servers/:serverId/mapping`

- เทมเพลต: O3
- เป้าหมาย: ดู tenant, guild, agent, package relationship ในหน้าเดียว
- Main blocks:
  - tenant/server/guild mapping
  - delivery agent binding
  - server bot binding
  - package dependencies
- Primary action: แก้ mapping

### 4.14 `/owner/delivery-agents`

- เทมเพลต: O2
- เป้าหมาย: ดู delivery agent ทั้งแพลตฟอร์ม
- Columns:
  - runtime
  - tenant
  - server
  - status
  - last heartbeat
  - version
  - binding state
- Primary action: provision delivery agent

### 4.15 `/owner/delivery-agents/new`

- เทมเพลต: O3 แบบ create/provision
- เป้าหมาย: สร้าง runtime ระดับ platform ให้ tenant
- Steps:
  - tenant and server scope
  - runtime metadata
  - setup token
  - bootstrap download
- Right rail: activation rules, revoke/reset, support note

### 4.16 `/owner/delivery-agents/:agentId`

- เทมเพลต: O3
- เป้าหมาย: ดูสถานะ, binding, credential, incidents
- Primary action: reset binding / revoke credential

### 4.17 `/owner/server-bots`

- เทมเพลต: O2
- เป้าหมาย: ดู server bot ทั้งแพลตฟอร์ม
- Columns:
  - runtime
  - tenant
  - server
  - sync health
  - config apply state
  - last restart job
  - binding
- Primary action: provision server bot

### 4.18 `/owner/server-bots/new`

- เทมเพลต: O3 แบบ create/provision
- เป้าหมาย: สร้าง server bot ระดับ platform ให้ tenant
- Primary action: สร้าง runtime

### 4.19 `/owner/server-bots/:botId`

- เทมเพลต: O3
- เป้าหมาย: ดู sync/config/restart history และ binding
- Primary action: reset binding / revoke

### 4.20 `/owner/jobs`

- เทมเพลต: O2
- เป้าหมาย: ดูงานทั้งระบบโดยแยกประเภทชัด
- Columns:
  - job
  - type
  - tenant
  - server
  - runtime
  - state
  - started/updated
- Primary action: inspect job

### 4.21 `/owner/jobs/failed`

- เทมเพลต: O2
- เป้าหมาย: ดูเฉพาะงานล้มเหลวและจัดลำดับความสำคัญ
- Right rail:
  - likely cause
  - related runtime
  - retry policy
- Primary action: investigate / retry

### 4.22 `/owner/jobs/:jobId`

- เทมเพลต: O3
- เป้าหมาย: ดูรายละเอียดงาน, attempts, proof, related logs
- Primary action: inspect evidence

### 4.23 `/owner/logs`

- เทมเพลต: O4
- เป้าหมาย: ดู platform logs
- Filters:
  - source
  - severity
  - tenant
  - runtime
  - time range
- Primary action: search/filter

### 4.24 `/owner/audit`

- เทมเพลต: O4
- เป้าหมาย: ดู sensitive/admin actions ทั้งระบบ
- Columns:
  - actor
  - action
  - target
  - tenant
  - outcome
  - timestamp
- Primary action: export audit

### 4.25 `/owner/incidents`

- เทมเพลต: O4
- เป้าหมาย: รวม incident timeline และสถานะ response
- Main blocks:
  - open incidents
  - assigned incidents
  - resolved recently
  - related tickets/jobs
- Primary action: เปิด incident ล่าสุด

### 4.26 `/owner/billing`

- เทมเพลต: O3
- เป้าหมาย: ดู revenue overview
- Main blocks:
  - revenue today / month
  - subscription trends
  - overdue tenants
  - refunds/credits
- Primary action: เปิด billing history

### 4.27 `/owner/billing/history`

- เทมเพลต: O2
- เป้าหมาย: ดูประวัติเรียกเก็บเงิน
- Primary action: export

### 4.28 `/owner/billing/usage`

- เทมเพลต: O3
- เป้าหมาย: ดู usage trends ของ tenant และ feature
- Main blocks:
  - usage by package
  - runtime consumption
  - feature adoption
- Primary action: compare periods

### 4.29 `/owner/support`

- เทมเพลต: O2
- เป้าหมาย: ดู support queue ทั้งระบบ
- Columns:
  - ticket
  - tenant
  - severity
  - topic
  - assigned
  - updated
  - status
- Primary action: เปิด ticket

### 4.30 `/owner/support/:ticketId`

- เทมเพลต: O3
- เป้าหมาย: จัดการ support case พร้อม context ครบ
- Tabs:
  - Conversation
  - Diagnostics
  - Related incidents
  - Audit
- Primary action: ตอบกลับ / ปิดเคส

### 4.31 `/owner/support/diagnostics`

- เทมเพลต: O2
- เป้าหมาย: ดู diagnostics bundles จาก tenant ต่าง ๆ
- Primary action: ดาวน์โหลด bundle

### 4.32 `/owner/security`

- เทมเพลต: O4
- เป้าหมาย: ดู security posture รวม
- Main blocks:
  - current posture
  - open risks
  - unusual access
  - token/device issues
- Primary action: เปิด security events

### 4.33 `/owner/security/events`

- เทมเพลต: O4
- เป้าหมาย: ดูเหตุการณ์ความปลอดภัยแบบ filter ได้
- Primary action: export / investigate

### 4.34 `/owner/security/access`

- เทมเพลต: O4
- เป้าหมาย: ดู sessions และปัญหา access
- Columns:
  - actor
  - role
  - method
  - device/ip
  - status
  - last seen
- Primary action: revoke session

### 4.35 `/owner/feature-flags`

- เทมเพลต: O2
- เป้าหมาย: ดู feature catalog ทั้งระบบ
- Columns:
  - feature
  - description
  - dependent modules
  - package availability
  - status
- Primary action: เปิด overrides

### 4.36 `/owner/feature-flags/overrides`

- เทมเพลต: O5
- เป้าหมาย: จัดการ global overrides แบบมี guardrails
- Main blocks:
  - override list
  - impacted tenants
  - validation status
  - audit preview
- Primary action: save override

### 4.37 `/owner/settings`

- เทมเพลต: O5
- เป้าหมาย: รวม platform settings ที่ผู้ดูแลระบบใช้จริง
- Sections:
  - general
  - integrations
  - alerts
  - maintenance
- Primary action: save settings

### 4.38 `/owner/settings/runtime`

- เทมเพลต: O5
- เป้าหมาย: ดู runtime control ที่ระดับ owner ทำได้
- Main blocks:
  - service health
  - controlled actions
  - recent apply/restart runs
  - warnings
- Primary action: apply / restart ตามสิทธิ์

### 4.39 `/owner/settings/maintenance`

- เทมเพลต: O5
- เป้าหมาย: รวม restore/recovery/rollback ระดับแพลตฟอร์ม
- Main blocks:
  - restore entry point
  - rollback history
  - last verification
  - pending maintenance windows
- Dangerous action: start restore

## 5. States มาตรฐาน

- Loading: KPI และตาราง skeleton แยกส่วน
- Empty: อธิบายว่าไม่มีข้อมูลชุดใด และควรเปิดดูหน้าไหนต่อ
- Error: แสดงว่า data source ไหนพัง
- Critical alert: แถบเตือนด้านบนเมื่อมี incident หรือ security state สำคัญ

## 6. สิ่งที่ห้ามกลับมาอีก

- owner ที่ดูเหมือน tenant admin
- เมนูที่พูดด้วยคำเทคนิคภายใน
- dashboard card mosaic ที่ไม่บอกว่าควรทำอะไรก่อน
- hero ใหญ่และข้อความเกริ่นยาว

## 7. ลำดับ implement ที่แนะนำ

1. Overview
2. Tenants
3. Delivery Agents
4. Server Bots
5. Jobs
6. Support
7. Security
8. Billing
9. Feature Flags
10. Settings
