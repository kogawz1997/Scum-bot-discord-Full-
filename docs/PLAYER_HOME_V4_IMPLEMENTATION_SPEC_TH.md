# Player Home V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [PLAYER_V4_WIREFRAMES_TH.md](./PLAYER_V4_WIREFRAMES_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [PLATFORM_PACKAGE_AND_AGENT_MODEL.md](./PLATFORM_PACKAGE_AND_AGENT_MODEL.md)

เอกสารนี้ใช้สำหรับเริ่มทำหน้า `Player Home V4` จากโค้ดจริงในโปรเจกต์ โดยรักษาความเป็น `community portal with trust` ไม่ให้หน้าแรกกลายเป็นแค่ทางผ่านไปร้านค้า

## 1. Scope

หน้าเป้าหมาย:

- route เป้าหมาย: `/player`
- route alias ชั่วคราว: `/player#home`

บทบาทของหน้านี้:

- ให้ผู้เล่นเข้าแล้วรู้ทันทีว่าบัญชีพร้อมใช้งานแค่ไหน
- บอกสถานะ order ล่าสุด, wallet, Steam link, และกิจกรรมสำคัญ
- พาไปงานหลักได้ใน 1-2 คลิก

สิ่งที่หน้านี้ต้องไม่ทำ:

- ไม่ยัดรายละเอียดเชิงลึกของทุกระบบลงหน้าเดียว
- ไม่กลายเป็นหน้า shop อย่างเดียว
- ไม่ใช้คำเทคนิคภายในระบบแทนภาษาที่ผู้เล่นเข้าใจ

## 2. Current repo baseline

ไฟล์ฐานที่มีอยู่จริง:

- [C:\new\apps\web-portal-standalone\public\assets\player-core.js](C:/new/apps/web-portal-standalone/public/assets/player-core.js)
- [C:\new\apps\web-portal-standalone\api\playerGeneralRoutes.js](C:/new/apps/web-portal-standalone/api/playerGeneralRoutes.js)
- [C:\new\apps\web-portal-standalone\runtime\portalPageRoutes.js](C:/new/apps/web-portal-standalone/runtime/portalPageRoutes.js)

state ที่มีอยู่จริง:

- `me`
- `dashboard`
- `serverInfo`
- `walletLedger`
- `orders`
- `profile`
- `steamLink`
- `notifications`

endpoint ที่ใช้ได้ทันที:

- `/player/api/me`
- `/player/api/dashboard`
- `/player/api/server/info`
- `/player/api/wallet/ledger`
- `/player/api/purchase/list`
- `/player/api/profile`
- `/player/api/linksteam/me`
- `/player/api/notifications`

สิ่งที่ dashboard ปัจจุบันมีฐานอยู่แล้ว:

- latest order
- missions summary
- rent / reward posture
- announcements จาก server info / raid times

## 3. Product positioning

`Player Home` ต้องเป็นหน้า “รู้สถานะตัวเองและรู้ว่าควรทำอะไรต่อ”

คำถามที่ต้องตอบให้ผู้เล่นทันที:

1. บัญชีนี้พร้อมซื้อและรับของหรือยัง
2. มี order ล่าสุดค้างอยู่หรือไม่
3. มีประกาศหรือกิจกรรมอะไรที่ควรรู้ตอนนี้
4. ถ้าจะไปต่อ ควรกดตรงไหน

## 4. Visual thesis

`trusted community dashboard`

ความรู้สึกที่ต้องได้:

- เชื่อถือได้
- อ่านง่าย
- กลับมาเช็กซ้ำได้
- มีชีวิตพอให้รู้ว่าเป็น community portal แต่ไม่รก

## 5. Route and information architecture

หน้า `/player` ต้องมี 5 ส่วนหลัก:

1. page header
2. trust and status strip
3. task hub
4. activity and notifications
5. contextual rail

### 5.1 Page header

องค์ประกอบ:

- title: `หน้าหลักผู้เล่น`
- subtitle: `สถานะบัญชี กระเป๋าเงิน คำสั่งซื้อ และประกาศสำคัญของชุมชน`
- status chips:
  - steam linked / not linked
  - latest sync
  - pending orders
  - active community status
- primary action:
  - ถ้ามี order ค้าง: `ดูคำสั่งซื้อล่าสุด`
  - ถ้าไม่มี order ค้าง: `เปิดร้านค้า`

### 5.2 Trust and status strip

การ์ดสรุป 5 ใบ:

- wallet balance
- latest order status
- Steam link status
- reward claim state
- community/server snapshot

### 5.3 Task hub

แบ่งเป็น 3 กลุ่ม:

- `ซื้อและเติม`
- `ติดตามคำสั่งซื้อ`
- `เตรียมบัญชีให้พร้อม`

quick actions ที่ควรมี:

- เปิด wallet
- เปิด shop
- เปิด latest order
- เปิด orders history
- เปิด profile
- เปิด redeem

### 5.4 Activity and notifications

ใช้ของจริงจากระบบปัจจุบัน:

- notifications จาก wallet/order/Steam/rental activity
- announcement snapshot จาก dashboard / server info

ต้องแสดง:

- recent player notifications
- order-related updates
- account/wallet reminders
- community announcements แบบสั้น

### 5.5 Contextual rail

rail ขวาแสดง:

- account trust state
- Steam link guidance
- support / contact guidance
- featured event or community highlight ถ้ามี

## 6. Data mapping from current repo

mapping ที่ใช้ได้ทันที:

- `state.me` สำหรับ identity เบื้องต้น
- `state.dashboard` สำหรับ latest order, missions summary, rent posture, announcements
- `state.walletLedger.wallet.balance` สำหรับยอดเงิน
- `state.orders` สำหรับ pending/latest order summary
- `state.steamLink` สำหรับ account readiness
- `state.notifications` สำหรับ activity/inbox
- `state.serverInfo` สำหรับ community/server snapshot

logic เดิมที่ควร reuse:

- `renderHome`
- `renderHomeTaskHub`
- notification categorization helpers
- player page context helpers

## 7. Component list

components ที่ต้องมี:

- `PlayerTrustStrip`
- `PlayerTaskHub`
- `LatestOrderCard`
- `WalletStatusCard`
- `SteamReadinessCard`
- `PlayerNotificationFeed`
- `CommunitySnapshotCard`
- `EmptyStatePlayerHome`

## 8. DOM hook reuse plan

phase แรกควร wrap ของเดิม:

- `homeOverviewStats`
- `homeServerStats`
- `homeTaskHub`
- `homeNotifications`
- `homeNotificationStats`

หลักการ:

- เปลี่ยน hierarchy ของหน้า แต่ยังใช้ data renderers เดิมเป็น adapter
- ไม่เปลี่ยน session/auth flow
- ไม่เปลี่ยน endpoint shape

## 9. Build phases

### Phase A

- ย้าย home ให้เหลือ status strip + task hub + notifications + contextual rail
- ใช้ endpoint เดิมทั้งหมด
- ลดข้อความอธิบายที่ซ้ำ

### Phase B

- เพิ่ม community snapshot และ event highlight ใน rail
- เพิ่ม support shortcut ที่เหมาะกับผู้เล่น
- ทำ copy ให้เป็นภาษามนุษย์มากขึ้น

### Phase C

- เชื่อมกับ stats/events pages ใหม่
- เพิ่ม trust score หรือ readiness summary ที่ชัดขึ้น
- เพิ่ม personalized highlights ตามข้อมูลจริงของผู้เล่น

## 10. Acceptance criteria

- ผู้เล่นเปิดหน้าแล้วรู้ได้ทันทีว่าบัญชีพร้อมใช้งานแค่ไหน
- งานหลัก 3 แบบคือ ซื้อของ, ดู order, จัดการบัญชี เข้าถึงได้ชัด
- หน้าแรกไม่กลายเป็น list ยาวของทุกระบบ
- route และ hooks เดิมยังไม่พัง

## 11. Open follow-up

- ถ้ามี dedicated community/event feed ใน backend เพิ่ม ให้แยก announcements ออกจาก generic notifications
- ถ้ามี support ticket model ฝั่ง player เพิ่ม ให้ contextual rail เปลี่ยนจาก guidance เป็น support center จริง
