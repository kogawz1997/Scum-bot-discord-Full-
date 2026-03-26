# Tenant Restart Control V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [TENANT_V4_WIREFRAMES_TH.md](./TENANT_V4_WIREFRAMES_TH.md), [RESTART_ANNOUNCEMENT_PRESET.md](./RESTART_ANNOUNCEMENT_PRESET.md), [OPERATIONS_MANUAL_TH.md](./OPERATIONS_MANUAL_TH.md)

เอกสารนี้ใช้สำหรับย้าย flow `restart preset` ที่กระจายอยู่ใน tenant console ไปเป็นหน้า `Restart Control` แบบชัดเจน, ปลอดภัย, และใช้งานได้จริง โดยคง business logic และ route/API เดิมไว้ก่อน

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/tenant/restart`
- route รอง: `/tenant/restart/schedule`
- route รอง: `/tenant/restart/history`
- route เดิมที่ต้อง map ชั่วคราว: `/tenant#support-tools`, `/tenant#control`, `/tenant#incidents`

บทบาทของหน้านี้:

- เริ่ม restart flow จาก web
- แยก `restart now`, `restart in 1 minute`, `restart in 5 minutes`, `safe restart`, `schedule restart`
- แสดง countdown/announcement posture
- แสดง recent restart history
- แยก dangerous actions ออกจากงานประจำวัน

สิ่งที่หน้านี้ต้องไม่ทำ:

- ไม่ restart server ตรงจาก browser แบบไม่มี control plane
- ไม่ทำให้ผู้ใช้ข้าม readiness checks
- ไม่เอา config editing มาปะปนกับปุ่ม restart ในหน้าเดียว

## 2. Current repo baseline

ไฟล์และ flow ที่มีอยู่จริง:

- [C:\new\src\admin\assets\tenant-console.js](C:/new/src/admin/assets/tenant-console.js)
- [C:\new\src\services\adminServiceControl.js](C:/new/src/services/adminServiceControl.js)
- [C:\new\src\services\restartScheduler.js](C:/new/src/services/restartScheduler.js)
- [C:\new\src\domain\servers\serverControlJobService.js](C:/new/src/domain/servers/serverControlJobService.js)
- [C:\new\src\services\platformAutomationService.js](C:/new/src/services/platformAutomationService.js)
- [C:\new\src\services\scumConsoleAgent.js](C:/new/src/services/scumConsoleAgent.js)

จุดเชื่อมฝั่ง tenant UI ตอนนี้:

- `tenantRestartPresetChecklist`
- `tenantRestartPresetBtn`
- support toolkit action `restart`
- link จาก quick actions ไป `support-tools`

ข้อเท็จจริงสำคัญ:

- ตอนนี้ restart guidance อยู่ในรูป `preset/checklist` มากกว่าเป็นหน้าควบคุมเต็ม
- ระบบมีฐาน scheduler/automation และ managed restart telemetry อยู่แล้ว
- phase แรกของ V4 ควรย้ายของเดิมมาเป็นหน้าใช้งานจริงก่อน แล้วค่อยทำ schedule/history เต็ม

## 3. Product positioning

`Restart Control` คือหน้าควบคุมการหยุด-เริ่ม-รีสตาร์ทเซิร์ฟเวอร์อย่างปลอดภัย

ผู้ใช้ควรเข้าใจทันทีว่า:

- ถ้าจะ restart แบบเร่งด่วน ใช้ตรงไหน
- ถ้าจะประกาศก่อนหยุด ใช้ flow ไหน
- ถ้าระบบยังไม่พร้อม restart เพราะ queue/delivery มีปัญหา จะเห็นคำเตือนตรงไหน

หน้าตานี้ต้องสื่อว่าเป็น:

- control room
- มี guardrails
- ใช้ได้จริงในงาน production

## 4. Visual thesis

`maintenance control page`

ความรู้สึกที่ต้องได้:

- มั่นใจ
- อันตรายแต่ควบคุมได้
- ไม่รก
- แยก safe actions ออกจาก dangerous actions ชัดเจน

สีและ hierarchy:

- neutral สำหรับข้อมูลทั่วไป
- warning สำหรับ countdown / maintenance mode
- danger สำหรับ immediate restart / forceful flows

## 5. Route and information architecture

### 5.1 `/tenant/restart`

หน้า work page หลัก

ต้องมี 6 ส่วน:

1. page header
2. current restart posture
3. restart mode cards
4. announcement and checklist
5. current queue/runtime blockers
6. recent restart activity

### 5.2 `/tenant/restart/schedule`

หน้า schedule / delayed restart

ต้องมี:

- schedule form
- countdown presets
- communication preview
- impacted modules summary

### 5.3 `/tenant/restart/history`

หน้า history / audit

ต้องมี:

- recent restarts
- requested by
- mode
- countdown used
- result
- post-restart verification

## 6. Page sections

### 6.1 Header

header ต้องตอบคำถาม:

- ตอนนี้ restart ได้เลยไหม
- มี countdown/maintenance ค้างอยู่ไหม
- ถ้าจะ restart ควรใช้ preset ไหน

องค์ประกอบ:

- title: `Restart Control`
- subtitle: `ควบคุมการรีสตาร์ทและการประกาศหยุดปรับปรุงของเซิร์ฟเวอร์`
- status chips:
  - server status
  - delivery posture
  - queue pressure
  - maintenance state
- primary action:
  - `เปิด flow รีสตาร์ท`

### 6.2 Current posture

การ์ดสรุป 4 ใบ:

- server control readiness
- delivery/announce readiness
- queue/dead-letter posture
- last restart result

### 6.3 Restart modes

cards หลัก 5 ใบ:

- Restart Now
- Restart in 1 minute
- Restart in 5 minutes
- Safe Restart
- Schedule Restart

แต่ละ card ต้องมี:

- ใช้เมื่อไร
- จะประกาศหรือไม่
- ต้องมี runtime อะไรพร้อม
- ระดับความเสี่ยง

### 6.4 Announcement and checklist

ใช้ข้อมูลจาก flow เดิมของ `restart preset`

checklist ขั้นต่ำ:

1. ตรวจ queue และ delivery posture
2. เลือก preset การประกาศ
3. ยืนยันเวลาที่ผู้เล่นจะได้รับข้อความ
4. ยืนยัน post-restart checks

ถ้า deployment รองรับ announcement ผ่าน `Delivery Agent` ต้องแสดงชัดว่า:

- จะส่งประกาศผ่าน runtime ใด
- runtime นั้น online อยู่หรือไม่

### 6.5 Blockers and warnings

ส่วนนี้ต้องเด่นและอยู่เหนือปุ่มอันตราย

ตัวอย่าง blockers:

- no delivery runtime online for announce flow
- queue pressure สูง
- dead letters ค้างเยอะ
- server bot offline
- managed restart pending อยู่แล้ว

### 6.6 Recent activity

แสดง:

- last restart
- restart mode
- result
- verification summary
- next scheduled restart ถ้ามี

## 7. Data mapping from current repo

แหล่งข้อมูลที่ใช้ได้ทันที:

- restart guidance จาก [C:\new\src\admin\assets\tenant-console.js](C:/new/src/admin/assets/tenant-console.js)
- service control จาก [C:\new\src\services\adminServiceControl.js](C:/new/src/services/adminServiceControl.js)
- scheduler baseline จาก [C:\new\src\services\restartScheduler.js](C:/new/src/services/restartScheduler.js)
- server control job posture จาก [C:\new\src\domain\servers\serverControlJobService.js](C:/new/src/domain/servers/serverControlJobService.js)
- automation / managed restart telemetry จาก [C:\new\src\services\platformAutomationService.js](C:/new/src/services/platformAutomationService.js) และ [C:\new\src\services\scumConsoleAgent.js](C:/new/src/services/scumConsoleAgent.js)
- delivery/runtime state จาก tenant console loaders ปัจจุบัน

mapping phase แรก:

- ใช้ checklist และ quick actions เดิมเป็นฐานของหน้าใหม่
- ดึง queue/dead-letter/runtime posture จาก state เดิมของ tenant console
- ใช้ service telemetry ที่มีอยู่เพื่อแสดง readiness และ warning ก่อน

## 8. Component list

components ที่ต้องมี:

- `RestartModeCard`
- `RestartReadinessStrip`
- `AnnouncementChecklist`
- `RestartBlockerBanner`
- `ScheduleRestartForm`
- `RestartHistoryTable`
- `DangerZoneRestart`
- `PostRestartVerificationCard`

pattern ที่ควรใช้:

- mode cards สำหรับการตัดสินใจ
- right rail สำหรับ context และผลกระทบ
- confirm modal สำหรับ destructive actions

## 9. DOM hook reuse plan

สิ่งที่ต้อง reuse ก่อน:

- `tenantRestartPresetChecklist`
- `tenantRestartPresetBtn`
- handler ของ support toolkit action `restart`

หลักการย้าย:

- phase แรก wrap flow เดิมมาไว้ในหน้าใหม่
- แยก checklist ออกเป็น section ถาวร
- แยกปุ่ม restart modes ออกมาจาก support toolkit

## 10. Build phases

### Phase A

- สร้างหน้า `/tenant/restart`
- ย้าย restart preset/checklist เดิมมาอยู่เป็น first-class section
- ทำ mode cards และ blocker strip

### Phase B

- เพิ่ม `/tenant/restart/schedule`
- ทำ delayed restart flow และ communication preview
- แสดง countdown presets เป็นระบบเดียวกัน

### Phase C

- เพิ่ม `/tenant/restart/history`
- ผูก restart results และ verification summary
- แสดง schedule/history/audit ในหน้าเดียวกันแบบอ่านง่าย

## 11. Acceptance criteria

- tenant รู้ว่าควรกด restart แบบไหนจากหน้าเดียว
- dangerous actions ถูกแยกจาก informational actions ชัดเจน
- checklist เดิมไม่หาย แต่ถูกย้ายไปที่ที่ถูกต้อง
- restart flow แสดงความพร้อมของ announce/runtime ก่อนกดยืนยัน
- route และ DOM hooks เดิมยังไม่พัง

## 12. Open follow-up

- ถ้า backend มี dedicated restart history entity ชัดขึ้น ให้ย้าย recent activity จาก derived data ไปใช้ history จริง
- ถ้า schedule API แยกชัดขึ้น ให้ลดการพึ่ง preset/checklist และทำ schedule page ให้เต็มรูปแบบ
