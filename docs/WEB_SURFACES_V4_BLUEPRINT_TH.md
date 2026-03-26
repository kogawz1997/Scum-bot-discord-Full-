# Web Surfaces V4 Blueprint

สถานะเอกสาร: draft พร้อมใช้เป็นฐานออกแบบรอบถัดไป  
อัปเดตล่าสุด: 2026-03-26  
สถานะ runtime ปัจจุบัน: `Discord-only` บนเครื่องนี้

เอกสารนี้กำหนดดีไซน์ใหม่สำหรับ 3 เว็บหลักของ SCUM TH Platform โดยตั้งใจให้:

- ใช้งานง่ายใน 5-10 วินาทีแรก
- แยกบทบาท `Owner / Tenant / Player` ชัดเจน
- ใช้ภาษาคนใช้งาน ไม่ใช่ภาษาทีมพัฒนา
- คง logic และ security model เดิมเมื่อกลับมาเปิดเว็บอีกครั้ง
- ไม่ย้อนกลับไปใช้ composition แบบหน้าเดียวสลับ section ด้วย hash เป็นแกนหลัก

## ภาพรวมผลิตภัณฑ์

### 1. Owner Panel

หน้าควบคุมของผู้ให้บริการระบบ  
เป้าหมายคือ "มองทั้งแพลตฟอร์มและตัดสินใจเร็ว"

งานหลัก:

- ดูสุขภาพรวมของระบบ
- ดู tenant ที่มีปัญหา
- ดู runtime สำคัญ
- จัดการแพ็กเกจ, subscription, billing
- ตรวจ incident, audit, security
- ทำงานช่วยเหลือและ recovery ระดับแพลตฟอร์ม

### 2. Tenant Admin Panel

หน้าควบคุมของแอดมินเซิร์ฟเวอร์ลูกค้า  
เป้าหมายคือ "ทำงานประจำวันให้จบเร็ว"

งานหลัก:

- ดูสถานะเซิร์ฟเวอร์
- ดู sync / log / bot health
- จัดการของขาย, orders, delivery
- ดูและช่วยเหลือผู้เล่น
- ตั้งค่าเซิร์ฟเวอร์
- รีสตาร์ท / apply config
- เปิด-ปิด module ตาม package

### 3. Player Portal

พอร์ทัลผู้เล่นของชุมชน  
เป้าหมายคือ "เข้าแล้วรู้ทันทีว่ามีอะไรให้ทำ"

งานหลัก:

- ดู wallet
- ซื้อของ / ติดตามคำสั่งซื้อ
- ดู delivery status
- ดูกิจกรรมชุมชน
- ดูสถิติ / leaderboards / event
- จัดการ linked accounts

## Shared Design System

### Visual thesis

`dark operational premium`  
พื้นเข้ม, ตัวหนังสือคม, accent ทองหม่น/olive, texture บาง ๆ, โครงใช้งานจริงแบบ hosting/admin panel ไม่ใช่ game HUD

### Content plan

- top bar: บทบาท + ภาษา + account menu
- left sidebar: เมนูหลักเฉพาะ surface นั้น
- page header: ชื่อหน้า, คำอธิบายสั้น, primary action
- main content: งานหลักของหน้า
- right rail: context, alerts, timeline, tips เฉพาะหน้า

### Interaction thesis

- hover ยกระดับเล็กน้อยเฉพาะเมนูและ action card
- page transition เบา ๆ ระหว่างเปลี่ยนหน้า
- live state pulse เฉพาะ status badges สำคัญ เช่น online, syncing, failed

### Layout rules

- ใช้ 8px spacing system
- top bar สูงคงที่
- sidebar กว้างคงที่ อ่าน label เต็ม
- main content กว้างพอให้ table/filter ใช้งานจริง
- card ใช้เฉพาะเมื่อ card นั้นเป็นหน่วยข้อมูลหรือการกระทำ
- หลีกเลี่ยง hero ใหญ่ในหน้าทำงาน

### Shared components

- top bar
- sidebar group
- page header
- KPI strip
- action card
- data card
- table shell
- filter bar
- right rail panel
- empty state
- preview locked state
- incident banner
- confirm modal
- dangerous action drawer

## Owner Panel V4

### Visual thesis

`platform command center`  
สุขุม, professional, ชัดเจน, เน้น decision making มากกว่า decoration

### Information architecture

Sidebar:

1. Overview
2. Tenants
3. Packages
4. Subscriptions
5. Servers
6. Delivery Agents
7. Server Bots
8. Jobs
9. Logs & Audit
10. Billing
11. Support
12. Security
13. Feature Flags
14. Settings

### หน้า Overview

เหนือสุด:

- active tenants
- online delivery agents
- online server bots
- failed jobs
- revenue วันนี้
- subscriptions ใกล้หมดอายุ

กลางหน้า:

- tenant attention list
- incidents timeline
- failed jobs queue
- security alerts

ขวา:

- quick actions:
  - สร้าง tenant
  - provision delivery agent
  - provision server bot
  - เปิด incident ล่าสุด
  - ตรวจ security events

### หลักการเขียนหน้า Owner

- ใช้คำว่า `ผู้เช่า`, `การสมัครใช้`, `งานล้มเหลว`, `บันทึกระบบ`, `ความปลอดภัย`
- หลีกเลี่ยงคำภายในทีม เช่น workbench, lifecycle center, command strip
- ทุกหน้าต้องมี action หลักชัด 1 อย่าง

## Tenant Admin Panel V4

### Visual thesis

`hosting panel for daily operations`  
เหมือนแผงควบคุมโฮสติ้งทั่วไปที่คุ้นเคย แต่มี character แบบ SCUM เบา ๆ

### Information architecture

Sidebar:

1. Dashboard
2. Subscription
3. Servers
4. Server Status
5. Server Config
6. Restart Control
7. Delivery Agents
8. Server Bots
9. Diagnostics
10. Logs & Sync
11. Shop
12. Orders
13. Delivery
14. Players
15. Discord
16. Donations
17. Events
18. Rewards
19. Bot Modules
20. Staff
21. Settings
22. Billing
23. Help

### หน้า Dashboard

เหนือสุด:

- package ปัจจุบัน
- server status
- delivery agent status
- server bot status
- last sync
- pending orders

กลางหน้า:

- quick actions:
  - สร้าง delivery agent
  - สร้าง server bot
  - แก้ config
  - รีสตาร์ทเซิร์ฟเวอร์
  - ผูก Discord
  - สร้าง event
  - เพิ่ม donation package

ล่างหน้า:

- warnings / errors
- active modules
- donation summary
- recent player issues

### Tenant page patterns

- ถ้าเป็นหน้าตาราง ต้องมี `filter bar + table + right rail`
- ถ้าเป็นหน้าตั้งค่า ต้องมี `section sidebar + form + change summary`
- ถ้าเป็นหน้าดำเนินการเสี่ยง เช่น restart หรือ rollback ต้องมี danger area แยกชัด

## Player Portal V4

### Visual thesis

`community portal with trust`  
รู้สึกเหมือน community hub ที่เชื่อถือได้ ไม่ใช่ร้านค้าอย่างเดียว

### Information architecture

Sidebar:

1. Home
2. Shop
3. Wallet
4. Orders
5. Delivery
6. My Stats
7. Leaderboards
8. Activity Feed
9. Donations
10. Events
11. Profile
12. Support

### หน้า Home

เหนือสุด:

- wallet balance
- latest order
- delivery status ล่าสุด
- linked account status

กลางหน้า:

- community highlights
- active events
- top supporters
- latest activity

ล่างหน้า:

- quick tasks:
  - เติมเงิน
  - ซื้อของ
  - ดูออเดอร์
  - ผูกบัญชี Discord/Steam

### Trust states

ต้องมีทุกหน้า:

- linked status badges
- order status wording ที่อ่านง่าย
- empty state ที่บอกว่าควรทำอะไรต่อ
- support link ชัด

## ภาษาและ copy

### หลักการ

- ใช้ไทยจริงแบบคนใช้งาน
- หลีกเลี่ยงคำอังกฤษถ้ามีคำไทยที่เข้าใจง่ายกว่า
- คำเทคนิคให้ใช้เมื่อจำเป็นเท่านั้น

### ตัวอย่างคำที่ควรใช้

- Server Status -> สถานะเซิร์ฟเวอร์
- Delivery Agent -> เอเจนต์ส่งของ
- Server Bot -> บอตเซิร์ฟเวอร์
- Logs & Sync -> บันทึกและการซิงก์
- Billing -> การเงิน
- Feature Flags -> สิทธิ์ฟีเจอร์
- Support -> ช่วยเหลือ
- Retry -> ลองใหม่
- Save and Restart -> บันทึกและรีสตาร์ท

### คำที่ควรหลีกเลี่ยง

- workbench
- lifecycle
- command strip
- toolkit
- presets center
- commercial lane

## Route strategy เมื่อกลับมาเปิดเว็บ

Owner:

- `/owner`
- `/owner/tenants`
- `/owner/packages`
- `/owner/subscriptions`
- `/owner/servers`
- `/owner/delivery-agents`
- `/owner/server-bots`
- `/owner/jobs`
- `/owner/logs`
- `/owner/billing`
- `/owner/support`
- `/owner/security`
- `/owner/settings`

Tenant:

- `/tenant`
- `/tenant/subscription`
- `/tenant/servers`
- `/tenant/status`
- `/tenant/config`
- `/tenant/restart`
- `/tenant/delivery-agents`
- `/tenant/server-bots`
- `/tenant/logs`
- `/tenant/shop`
- `/tenant/orders`
- `/tenant/delivery`
- `/tenant/players`
- `/tenant/discord`
- `/tenant/donations`
- `/tenant/events`
- `/tenant/modules`
- `/tenant/staff`
- `/tenant/settings`
- `/tenant/help`

Player:

- `/player`
- `/player/shop`
- `/player/wallet`
- `/player/orders`
- `/player/delivery`
- `/player/stats`
- `/player/leaderboards`
- `/player/activity`
- `/player/donations`
- `/player/events`
- `/player/profile`
- `/player/support`

## Preview mode design

ถ้ากลับมาเปิดเว็บเชิง SaaS อีกครั้ง:

- page เปิดได้
- action จริงกดไม่ได้
- มี `locked state` ที่อธิบายว่าต้อง upgrade หรือ activate ก่อน
- sidebar ยังเห็นเมนูครบเพื่อให้เข้าใจระบบ

## What should not come back

- หน้าเดียวที่ยัดทุก section ไว้แล้วสลับด้วย hash เป็นหลัก
- hero ขนาดใหญ่ในหน้าทำงาน
- rail ซ้ายที่เต็มไปด้วยการ์ดอธิบายซ้ำ
- copy ที่ดูเหมือน prompt หรือภาษาภายในทีม
- navigation ที่ต้องตีความว่าเมนูไหนทำอะไร

## Definition of done for the future rebuild

- ทั้ง 3 เว็บใช้ shell pattern เดียวกัน
- แต่ละเว็บมีบุคลิกและคำศัพท์ตามบทบาทของตัวเอง
- ผู้ใช้ใหม่เข้าแล้วเข้าใจในไม่กี่วินาที
- หน้า config, restart, logs, orders, players, support ใช้งานง่ายจริง
- ไม่มี old composition หลุดกลับมาเป็น baseline
