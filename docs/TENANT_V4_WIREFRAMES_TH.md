# Tenant Admin V4 Wireframes

สถานะเอกสาร: draft พร้อมใช้เป็นแบบหน้าใช้งานจริง  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [WEB_SURFACES_V4_BLUEPRINT_TH.md](./WEB_SURFACES_V4_BLUEPRINT_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md)

เอกสารนี้กำหนด wireframe หน้าใช้งานจริงของ Tenant Admin Panel ทั้งชุด โดยยึดหลัก:

- ฟังก์ชันครบ แต่ไม่ยัดทุกอย่างในหน้าเดียว
- ใช้งานแบบ hosting/admin panel ที่คุ้นมือ
- ภาษาคนใช้งานจริง ไม่ใช้คำภายในทีมพัฒนา
- โครงสร้างเหมือนกันทุกหน้า: top bar, sidebar, page header, main content, right rail
- ทุกหน้ามี primary action ชัด และแยก dangerous action ออกจากงานปกติ

## 1. Shared shell

```text
┌ Top bar: tenant switch | search | language | notifications | profile
├ Sidebar: หมวดหลักของ tenant
├ Page header: ชื่อหน้า | คำอธิบายสั้น | primary action
├ Main content
│ ├ KPI / status strip (ถ้าจำเป็น)
│ ├ filter bar / section tabs / workspace
│ └ tables / forms / timelines / cards ตามลักษณะงาน
└ Right rail (optional)
  ├ สถานะล่าสุด
  ├ คำเตือน
  ├ quick help
  └ recent activity
```

## 2. Page templates

### Template T1: Dashboard

ใช้กับหน้าที่ต้อง “เห็นภาพรวมแล้วตัดสินใจเร็ว”

```text
┌ Header: ชื่อ tenant + package + primary action
├ KPI strip: package | server | delivery agent | server bot | last sync | pending orders
├ Quick actions: 6-8 ปุ่มงานหลัก
├ Left: warnings / issues / incidents
├ Center: operational overview
└ Right rail: module summary | support tips | next recommended step
```

### Template T2: List + Table

ใช้กับหน้าที่เป็นรายการ เช่น orders, players, agents, bots

```text
┌ Header: ชื่อหน้า + create/export
├ Filter bar: search | status | date | scope
├ Main table: sortable, readable, sticky header
└ Right rail: selected row summary | quick actions | policy/help
```

### Template T3: Detail + Tabs

ใช้กับหน้ารายละเอียดรายตัว เช่น server detail, player detail, order detail

```text
┌ Header: ชื่อ object + status + primary action
├ Summary strip: key facts 4-6 ช่อง
├ Tab row: overview | history | related | audit
├ Main panel: detail blocks
└ Right rail: current health | next action | recent events
```

### Template T4: Config Editor

ใช้กับหน้าตั้งค่าแบบ schema-driven

```text
┌ Header: section name + save | save and apply | save and restart
├ Section sidebar: รายการ section
├ Main form: typed inputs grouped by subsection
├ Change summary: changed keys | restart-required badges
└ Right rail: backup history | validation notes | raw/advanced entry
```

### Template T5: Dangerous Action Center

ใช้กับ restart, rollback, module dependencies ที่มีผลจริง

```text
┌ Header: งานเสี่ยง + primary action แยกชัด
├ Preflight checklist
├ Safe choices: immediate / delayed / scheduled / safe mode
├ Confirmation drawer
└ History + last known outcome
```

### Template T6: Provisioning Wizard

ใช้กับ create delivery agent / create server bot

```text
┌ Header: ชื่อ runtime + create
├ Step 1: runtime info
├ Step 2: scope / machine notes
├ Step 3: setup token + bootstrap package
└ Right rail: activation rules | single-machine binding | revoke/reset notes
```

## 3. Sidebar grouping

Tenant sidebar ต้องแบ่งเป็น 5 หมวดใหญ่เท่านั้น:

1. เซิร์ฟเวอร์
2. การขายและคำสั่งซื้อ
3. ผู้เล่นและชุมชน
4. ระบบและบอต
5. บัญชีและความช่วยเหลือ

รายการเมนูจริง:

- Dashboard
- Subscription
- Servers
- Server Status
- Server Config
- Restart Control
- Delivery Agents
- Server Bots
- Diagnostics
- Logs & Sync
- Shop
- Orders
- Delivery
- Players
- Discord
- Donations
- Events
- Rewards
- Bot Modules
- Staff
- Settings
- Billing
- Help

## 4. Page-by-page wireframes

### 4.1 `/tenant` Dashboard

- เทมเพลต: T1
- เป้าหมาย: เห็นภาพรวมงานประจำวันและเปิดงานหลักใน 1-2 คลิก
- สิ่งที่ต้องเห็นทันที:
  - package ปัจจุบัน
  - server status
  - delivery agent status
  - server bot status
  - last sync
  - pending orders
- Quick actions:
  - สร้าง Delivery Agent
  - สร้าง Server Bot
  - แก้ค่าเซิร์ฟเวอร์
  - รีสตาร์ตเซิร์ฟเวอร์
  - ผูก Discord
  - สร้างกิจกรรม
  - สร้างแพ็กเกจโดเนต
  - อัปเกรดแพ็กเกจ
- Right rail:
  - modules ที่เปิดอยู่
  - warning ล่าสุด
  - “สิ่งที่ควรทำต่อ” 1 ข้อ
- States:
  - Preview mode: ปุ่มสร้างจริงถูก lock แต่ยังเห็นโครงหน้า
  - Empty: ไม่มี server/runtime ให้ขึ้น onboarding checklist
  - Error: แสดงว่ารายการไหนโหลดไม่สำเร็จ พร้อม retry

### 4.2 `/tenant/subscription`

- เทมเพลต: T3
- เป้าหมาย: ดูแผนปัจจุบัน, limits, การใช้ feature, และเส้นทางอัปเกรด
- Main blocks:
  - package summary
  - feature entitlements
  - limits and usage
  - billing status
  - compare higher plans
- Primary action: อัปเกรดแพ็กเกจ
- Right rail: renewal date, support note, feature locked states

### 4.3 `/tenant/servers`

- เทมเพลต: T2
- เป้าหมาย: ดู server ทั้งหมดของ tenant
- Table columns:
  - server name
  - environment
  - server status
  - sync freshness
  - delivery health
  - last restart
  - alerts
- Primary action: เปิดรายละเอียดเซิร์ฟเวอร์
- Right rail: server ที่เลือก, quick links ไป status/config/restart

### 4.4 `/tenant/servers/:serverId`

- เทมเพลต: T3
- เป้าหมาย: เป็นหน้าศูนย์กลางของ server รายตัว
- Summary strip:
  - uptime
  - sync freshness
  - online players
  - pending deliveries
  - last config apply
  - last restart
- Tabs:
  - Overview
  - Runtime
  - Config
  - Orders
  - Players
  - Audit
- Primary action: เปิด Server Status หรือ Server Config

### 4.5 `/tenant/status`

- เทมเพลต: T3
- เป้าหมาย: ตอบคำถามว่า “เซิร์ฟเวอร์ยังปกติไหม”
- Main blocks:
  - server health
  - process/runtime status
  - sync latency
  - last errors
  - restart timeline
- Right rail:
  - current risks
  - health legend
  - open diagnostics
- Primary action: เปิด diagnostics

### 4.6 `/tenant/config`

- เทมเพลต: T4
- เป้าหมาย: เริ่มต้นจาก section ที่ใช้งานบ่อย
- Main blocks:
  - section categories
  - recently changed keys
  - pending draft changes
  - backup history shortcut
- Primary action: เปิด section แรกที่ใช้บ่อย

### 4.7 `/tenant/config/:sectionKey`

- เทมเพลต: T4
- เป้าหมาย: แก้ค่าเฉพาะ section แบบปลอดภัย
- Main blocks:
  - typed fields grouped by subsection
  - inline validation
  - restart-required badges
  - change summary footer
- Actions:
  - บันทึก
  - บันทึกและใช้ทันที
  - บันทึกและรีสตาร์ต
- Right rail:
  - backup history
  - advanced/raw editor
  - helper notes

### 4.8 `/tenant/config/backups`

- เทมเพลต: T2
- เป้าหมาย: ดูและเลือก backup ที่ปลอดภัย
- Table columns:
  - backup id
  - source file
  - created by
  - created at
  - verification
  - rollback ready
- Primary action: เปิด preview restore

### 4.9 `/tenant/config/rollback`

- เทมเพลต: T5
- เป้าหมาย: rollback config อย่างมี guardrails
- Main blocks:
  - selected backup
  - diff summary
  - verification checklist
  - confirmation zone
- Primary action: ยืนยัน rollback

### 4.10 `/tenant/restart`

- เทมเพลต: T5
- เป้าหมาย: restart server อย่างชัดเจนและไม่พลาด
- Safe choices:
  - Restart now
  - Restart in 1 minute
  - Restart in 5 minutes
  - Safe restart
- Main blocks:
  - current restart method
  - announcement support state
  - last restart
  - warnings before restart
- Primary action: เลือกโหมด restart

### 4.11 `/tenant/restart/schedule`

- เทมเพลต: T5
- เป้าหมาย: ตั้ง restart ล่วงหน้าแบบมองง่าย
- Main blocks:
  - schedule form
  - countdown policy
  - recurrence (ถ้ามี)
  - affected modules
- Primary action: บันทึกตาราง restart

### 4.12 `/tenant/restart/history`

- เทมเพลต: T2
- เป้าหมาย: ดูประวัติ restart และผลลัพธ์
- Table columns:
  - requested at
  - requested by
  - mode
  - announce state
  - execution result
  - duration
- Primary action: เปิด run detail

### 4.13 `/tenant/delivery-agents`

- เทมเพลต: T2
- เป้าหมาย: ดู runtime สำหรับ delivery เท่านั้น
- Table columns:
  - agent name
  - status
  - scope
  - bound machine
  - last heartbeat
  - version
  - credential state
- Primary action: สร้าง Delivery Agent
- Notes:
  - ห้ามใช้คำที่ทำให้สับสนกับ Server Bot

### 4.14 `/tenant/delivery-agents/new`

- เทมเพลต: T6
- เป้าหมาย: สร้าง setup token และ bootstrap package
- Steps:
  - runtime name
  - server binding
  - machine note
  - one-time setup token
  - download bootstrap
- Right rail:
  - activation rules
  - single-machine binding
  - reset/revoke guidance

### 4.15 `/tenant/delivery-agents/:agentId`

- เทมเพลต: T3
- เป้าหมาย: ดูสถานะ runtime และจัดการ binding/credential
- Main blocks:
  - current status
  - heartbeat history
  - device binding
  - setup history
  - revoke / reset actions
- Primary action: reset binding หรือ reissue setup

### 4.16 `/tenant/server-bots`

- เทมเพลต: T2
- เป้าหมาย: ดู runtime สำหรับ sync/config/restart
- Table columns:
  - bot name
  - status
  - sync freshness
  - config apply state
  - last restart job
  - last heartbeat
- Primary action: สร้าง Server Bot

### 4.17 `/tenant/server-bots/new`

- เทมเพลต: T6
- เป้าหมาย: provision runtime สำหรับ server-side control
- Steps:
  - runtime name
  - file/server access mode
  - setup token
  - bootstrap package
- Right rail:
  - requirements
  - file access note
  - restart control scope

### 4.18 `/tenant/server-bots/:botId`

- เทมเพลต: T3
- เป้าหมาย: ดู sync/config/restart capabilities และ device state
- Main blocks:
  - heartbeat
  - file path access summary
  - config apply history
  - restart job history
  - revoke/reset
- Primary action: reset binding

### 4.19 `/tenant/diagnostics`

- เทมเพลต: T3
- เป้าหมาย: รวมสุขภาพระบบและเครื่องมือส่งข้อมูลให้ support
- Main blocks:
  - health summary
  - last failures
  - diagnostics bundle export
  - environment warnings
  - recommended fixes
- Primary action: ส่งออก diagnostics bundle

### 4.20 `/tenant/logs`

- เทมเพลต: T2
- เป้าหมาย: ดู sync health และ freshness
- Table or timeline:
  - source
  - last sync
  - lag
  - error count
  - freshness status
- Primary action: filter by event type or time range

### 4.21 `/tenant/logs/events`

- เทมเพลต: T2
- เป้าหมาย: ดูเหตุการณ์ทั่วไปของ server
- Filters:
  - event type
  - player
  - time range
  - severity
- Right rail: selected event detail

### 4.22 `/tenant/logs/killfeed`

- เทมเพลต: T2
- เป้าหมาย: ดู combat feed แบบสแกนง่าย
- Main view:
  - timeline rows
  - attacker/defender
  - distance
  - weapon
  - location
- Right rail: participant quick summary

### 4.23 `/tenant/logs/config-changes`

- เทมเพลต: T2
- เป้าหมาย: ดูประวัติการเปลี่ยน config และผล apply
- Columns:
  - section
  - changed keys
  - changed by
  - apply mode
  - result
  - restart required
- Primary action: เปิด audit detail

### 4.24 `/tenant/shop`

- เทมเพลต: T1 แบบ lightweight
- เป้าหมาย: ดูภาพรวมร้านค้าและยอดขาย
- Main blocks:
  - sales today
  - active catalog items
  - promos running
  - top items
  - conversion warnings
- Primary action: เปิด Catalog

### 4.25 `/tenant/shop/catalog`

- เทมเพลต: T2
- เป้าหมาย: จัดการสินค้า
- Columns:
  - item name
  - category
  - price
  - availability
  - delivery mapping
  - last changed
- Primary action: สร้างสินค้า

### 4.26 `/tenant/shop/promo`

- เทมเพลต: T2
- เป้าหมาย: จัดการโปรโมชัน
- Main blocks:
  - active promos
  - upcoming promos
  - expired promos
- Primary action: สร้างโปรโมชัน

### 4.27 `/tenant/orders`

- เทมเพลต: T2
- เป้าหมาย: ดูคำสั่งซื้อทั้งหมดแบบทำงานต่อได้
- Columns:
  - order id
  - player
  - amount
  - status
  - delivery state
  - created at
- Right rail:
  - summary ของ order ที่เลือก
  - open delivery
  - support note
- Primary action: เปิด order detail

### 4.28 `/tenant/orders/:orderId`

- เทมเพลต: T3
- เป้าหมาย: รวม order, payment, delivery, audit ไว้ในหน้าเดียว
- Tabs:
  - Overview
  - Items
  - Delivery
  - Audit
  - Support
- Primary action: retry หรือส่งต่อ support ตามสิทธิ์

### 4.29 `/tenant/delivery`

- เทมเพลต: T2
- เป้าหมาย: ดู queue งานส่งของ
- Columns:
  - job id
  - player
  - agent
  - state
  - attempts
  - last update
- Primary action: เปิด failed jobs

### 4.30 `/tenant/delivery/results`

- เทมเพลต: T2
- เป้าหมาย: ดูผลลัพธ์ delivery
- Columns:
  - result id
  - job
  - state
  - proof state
  - completed at
- Primary action: เปิด result detail

### 4.31 `/tenant/delivery/proofs`

- เทมเพลต: T2
- เป้าหมาย: ตรวจ proof/evidence จาก delivery
- Right rail:
  - proof preview
  - related order/job
- Primary action: เปิด proof

### 4.32 `/tenant/players`

- เทมเพลต: T2
- เป้าหมาย: ดูผู้เล่นและเข้าถึงการช่วยเหลือได้เร็ว
- Columns:
  - player
  - linked account status
  - wallet
  - orders
  - last activity
  - flags
- Primary action: เปิด player detail

### 4.33 `/tenant/players/:playerId`

- เทมเพลต: T3
- เป้าหมาย: ดูภาพรวมผู้เล่นรายคน
- Tabs:
  - Overview
  - Wallet
  - Orders
  - Delivery
  - Activity
  - Linked Accounts
- Primary action: support player

### 4.34 `/tenant/players/:playerId/wallet`

- เทมเพลต: T3
- เป้าหมาย: ตรวจธุรกรรมและยอดคงเหลือ
- Main blocks:
  - wallet balance
  - recent transactions
  - adjustments/audit
  - support history
- Dangerous action: adjustment ต้องแยกใน drawer พร้อมเหตุผล

### 4.35 `/tenant/discord`

- เทมเพลต: T3
- เป้าหมาย: ผูก Discord และดูสถานะ integration
- Main blocks:
  - guild link state
  - channel mapping
  - notification templates
  - permission issues
- Primary action: ผูก Discord

### 4.36 `/tenant/donations`

- เทมเพลต: T1 แบบ lightweight
- เป้าหมาย: ดู donation overview และเป้าหมายรายเดือน
- Main blocks:
  - monthly goal progress
  - top supporters
  - recent donations
  - reward automation state
- Primary action: สร้างแพ็กเกจโดเนต

### 4.37 `/tenant/donations/packages`

- เทมเพลต: T2
- เป้าหมาย: จัดการแพ็กเกจโดเนต
- Primary action: สร้างแพ็กเกจ

### 4.38 `/tenant/donations/rewards`

- เทมเพลต: T4
- เป้าหมาย: กำหนด reward จาก donation
- Main blocks:
  - package-to-reward mapping
  - delivery dependency state
  - preview outcome
- Primary action: บันทึก reward rules

### 4.39 `/tenant/donations/history`

- เทมเพลต: T2
- เป้าหมาย: ดูประวัติโดเนตและส่งออก
- Primary action: export

### 4.40 `/tenant/events`

- เทมเพลต: T2
- เป้าหมาย: ดู event ทั้งหมด
- Columns:
  - event name
  - type
  - status
  - start/end
  - participants
  - reward state
- Primary action: สร้าง event

### 4.41 `/tenant/events/new`

- เทมเพลต: T6 แบบ create flow
- เป้าหมาย: สร้าง event ได้ทีละขั้น
- Steps:
  - basic info
  - schedule
  - rewards
  - announcement
  - automation
- Primary action: บันทึก event

### 4.42 `/tenant/events/:eventId`

- เทมเพลต: T3
- เป้าหมาย: ดูรายละเอียด event และจัดการระหว่างรัน
- Tabs:
  - Overview
  - Schedule
  - Rewards
  - Participants
  - Automation
  - Audit
- Primary action: edit / announce

### 4.43 `/tenant/events/:eventId/results`

- เทมเพลต: T2 หรือ T3 ตามขนาดข้อมูล
- เป้าหมาย: ดูผล event และ publish ได้
- Primary action: publish results

### 4.44 `/tenant/rewards`

- เทมเพลต: T4
- เป้าหมาย: รวม reward rules จากหลายโมดูลไว้หน้าเดียว
- Main blocks:
  - shop rewards
  - donation rewards
  - event rewards
  - auto reward rules
- Primary action: บันทึก rules

### 4.45 `/tenant/modules`

- เทมเพลต: T2
- เป้าหมาย: เปิด-ปิดโมดูลแบบเข้าใจ dependency
- Columns:
  - module
  - description
  - status
  - dependency
  - package entitlement
- Primary action: toggle module
- Locked state: แสดงเหตุผลว่าถูก lock เพราะ package หรือ runtime ไม่พร้อม

### 4.46 `/tenant/modules/dependencies`

- เทมเพลต: T3
- เป้าหมาย: อธิบายว่า module ไหนต้องพึ่งอะไร
- Main blocks:
  - delivery agent dependencies
  - server bot dependencies
  - package dependencies
  - missing prerequisites
- Primary action: resolve blockers

### 4.47 `/tenant/modules/locked`

- เทมเพลต: T2
- เป้าหมาย: แสดง feature ที่ยังใช้ไม่ได้แต่เปิดให้ preview ได้
- Primary action: อัปเกรดแพ็กเกจ

### 4.48 `/tenant/staff`

- เทมเพลต: T2
- เป้าหมาย: จัดการ staff/roles แบบเรียบง่าย
- Columns:
  - user
  - role
  - last active
  - 2FA state
  - actions
- Primary action: invite staff

### 4.49 `/tenant/settings`

- เทมเพลต: T4
- เป้าหมาย: ตั้งค่าทั่วไปของ tenant
- Sections:
  - profile
  - branding
  - language
  - default channels
  - policy switches
- Primary action: บันทึกการตั้งค่า

### 4.50 `/tenant/billing`

- เทมเพลต: T3
- เป้าหมาย: ดูใบแจ้งหนี้และประวัติเรียกเก็บเงิน
- Main blocks:
  - current balance
  - next billing date
  - invoices
  - payment history
- Primary action: เปิด invoice ล่าสุด

### 4.51 `/tenant/help`

- เทมเพลต: T1 แบบ help center
- เป้าหมาย: หาคำตอบหรือเปิด ticket ได้ทันที
- Main blocks:
  - quick help topics
  - open tickets
  - diagnostics export
  - recommended next steps
- Primary action: เปิด support ticket

## 5. States มาตรฐานที่ต้องมีทุกหน้า

- Loading state: skeleton เฉพาะส่วนที่รอข้อมูล
- Empty state: อธิบายว่าหน้านี้ใช้ทำอะไร และกดอะไรต่อ
- Error state: บอกว่าพลาดที่ข้อมูลชุดไหน และ retry ได้
- Preview state: เห็นโครงจริง แต่ action จริงถูก lock พร้อมเหตุผล
- Locked feature state: บอกว่า package ไหนหรือ runtime ไหนยังขาด

## 6. สิ่งที่ห้ามกลับมาอีก

- หน้าเดียวรวมเมนูซ้อนหลายชั้น
- hero ใหญ่ในหน้าทำงาน
- กล่องคำอธิบายยาวก่อนถึงเนื้องาน
- เมนูซ้ำบน ซ้าย กลาง พร้อมกัน
- คำเทคนิคภายใน เช่น workbench, lifecycle center, command strip

## 7. ลำดับ implement ที่แนะนำ

1. Dashboard
2. Server Status
3. Server Config
4. Orders
5. Players
6. Delivery Agents
7. Server Bots
8. Restart Control
9. Diagnostics
10. Donations / Events / Modules / Billing / Help
