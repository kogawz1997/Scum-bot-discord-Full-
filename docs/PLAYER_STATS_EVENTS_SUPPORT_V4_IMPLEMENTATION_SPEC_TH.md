# Player Stats Events and Support V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [PLAYER_V4_WIREFRAMES_TH.md](./PLAYER_V4_WIREFRAMES_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [PRODUCT_READY_GAP_MATRIX.md](./PRODUCT_READY_GAP_MATRIX.md)

เอกสารนี้ใช้สำหรับต่อยอด Player Portal จาก “พอร์ทัลซื้อขาย” ไปเป็น “community portal” ที่มี `stats`, `leaderboards`, `events`, และ `support guidance` โดยเริ่มจาก data จริงที่มีใน repo ก่อน แล้วระบุส่วนที่ยังเป็นช่องว่างอย่างตรงไปตรงมา

## 1. Scope

หน้าเป้าหมาย:

- `/player/stats`
- `/player/leaderboards`
- `/player/activity`
- `/player/events`
- `/player/support`

route/tab เดิมที่ต้อง map ชั่วคราว:

- ใช้ `/player` เดิมเป็น shell และเพิ่ม page-based IA ใหม่ทีละหน้า

บทบาทของหน้าชุดนี้:

- ให้ผู้เล่นเห็นสถิติและอันดับของตัวเอง
- ให้ community มีเหตุผลกลับมาเปิดพอร์ทัลซ้ำ
- ให้ผู้เล่นรู้ว่าควรติดต่อ support เมื่อไร และต้องเตรียมข้อมูลอะไร

## 2. Current repo baseline

ไฟล์ฐานที่เกี่ยวข้อง:

- [C:\new\apps\web-portal-standalone\api\playerGeneralRoutes.js](C:/new/apps/web-portal-standalone/api/playerGeneralRoutes.js)
- [C:\new\apps\web-portal-standalone\runtime\portalHelperRuntime.js](C:/new/apps/web-portal-standalone/runtime/portalHelperRuntime.js)
- [C:\new\apps\web-portal-standalone\public\assets\player-core.js](C:/new/apps/web-portal-standalone/public/assets/player-core.js)

endpoint ที่มีอยู่จริงและใช้ได้ทันที:

- `/player/api/leaderboard`
- `/player/api/stats/me`
- `/player/api/notifications`
- `/player/api/server/info`
- `/player/api/party`
- `/player/api/bounty/list`
- `/player/api/missions`
- `/player/api/wheel/state`
- `/player/api/rentbike/status`

ข้อเท็จจริงสำคัญ:

- `stats` และ `leaderboards` มีฐานจริงแล้ว
- `notifications` และ `server info` ใช้เป็น activity/community snapshot ได้
- `events` และ `support` ยังไม่มี dedicated page API เต็มรูปแบบใน player portal ตอนนี้
- phase แรกจึงควรทำ strongest safe version โดยใช้:
  - community activity จาก notifications + announcements
  - event highlights จาก missions / wheel / bounty / server announcements
  - support guidance จาก order states + Steam link trust + account/contact instructions

## 3. Product positioning

หน้าชุดนี้ต้องทำให้ผู้เล่นรู้สึกว่า:

- พอร์ทัลนี้ไม่ได้มีไว้ซื้อของอย่างเดียว
- กลับมาเช็กอันดับ กิจกรรม และสถานะของตัวเองได้
- ถ้าเกิดปัญหา มีเส้นทางช่วยเหลือที่ชัดเจน

## 4. Visual thesis

`living community portal`

ความรู้สึกที่ต้องได้:

- เป็นมิตร
- มีชีวิต
- อ่านง่าย
- ไม่กลายเป็น social feed รก ๆ

สิ่งที่ต้องเน้น:

- my stats
- leaderboard context
- event highlights
- clear support next steps

## 5. Information architecture

### 5.1 `/player/stats`

หน้าสถิติส่วนตัว

ต้องมี:

- personal stats strip
- trend / highlight cards
- my squad / party snapshot
- trust rail

### 5.2 `/player/leaderboards`

หน้าจัดอันดับ

ต้องมี:

- leaderboard category switch
- ranking table
- my rank card
- event/community highlight rail

### 5.3 `/player/activity`

หน้ากิจกรรมชุมชน

phase แรกใช้:

- notifications
- announcements
- wallet/order/rental signals ที่แสดงได้กับผู้เล่น

### 5.4 `/player/events`

หน้า event center

phase แรกใช้:

- missions summary
- lucky wheel state
- bounty list
- server announcements

### 5.5 `/player/support`

หน้าช่วยเหลือ

phase แรกใช้:

- account trust summary
- Steam link guidance
- order support checklist
- what to prepare before contacting admin

## 6. Page sections

### 6.1 Stats

header:

- title: `สถิติของฉัน`
- subtitle: `ดูผลงาน ความคืบหน้า และภาพรวมการเล่นของบัญชีนี้`
- primary action:
  - `เปิดอันดับ`

sections:

- kills / deaths / KD / playtime strip
- personal highlights
- party/squad context
- current readiness rail

### 6.2 Leaderboards

header:

- title: `อันดับผู้เล่น`
- subtitle: `ดูอันดับของคุณและภาพรวมของผู้เล่นคนอื่นในชุมชน`
- primary action:
  - `ดูสถิติของฉัน`

sections:

- category switch:
  - economy
  - kills
  - kd
  - playtime
- leaderboard table
- my rank card
- community highlight rail

### 6.3 Activity

header:

- title: `กิจกรรมล่าสุด`
- subtitle: `อัปเดตเกี่ยวกับคำสั่งซื้อ กระเป๋าเงิน และประกาศของชุมชนในที่เดียว`
- primary action:
  - `เปิดคำสั่งซื้อ`

sections:

- feed filters
- activity feed
- highlighted announcements
- account attention rail

### 6.4 Events

header:

- title: `กิจกรรม`
- subtitle: `ดูสิ่งที่เล่นได้ตอนนี้ รางวัลที่มี และกิจกรรมที่ควรกลับมาเช็ก`
- primary action:
  - `ดูภารกิจ`

sections:

- active opportunities strip
- missions summary
- wheel summary
- bounty summary
- upcoming/community notes

### 6.5 Support

header:

- title: `การช่วยเหลือ`
- subtitle: `ถ้ามีปัญหาเรื่องบัญชี การส่งของ หรือการผูก Steam ให้เริ่มจากหน้านี้`
- primary action:
  - `เปิด order ล่าสุด`

sections:

- trust checklist
- common issue cards
- what to prepare before contacting admin
- latest account/order risk rail

## 7. Data mapping from current repo

stats:

- `/player/api/stats/me`
- `/player/api/party`

leaderboards:

- `/player/api/leaderboard?type=economy|kills|kd|playtime`

activity:

- `/player/api/notifications`
- `/player/api/server/info`

events:

- `/player/api/missions`
- `/player/api/wheel/state`
- `/player/api/bounty/list`
- `/player/api/server/info`

support:

- `state.orders`
- `state.steamLink`
- `state.notifications`
- order status helpers จาก `player-core.js`

## 8. Component list

components ที่ต้องมี:

- `PlayerStatsStrip`
- `LeaderboardCategoryTabs`
- `LeaderboardTable`
- `MyRankCard`
- `ActivityFeed`
- `EventOpportunityCard`
- `SupportChecklistCard`
- `TrustStateRail`

## 9. DOM hook reuse plan

ตอนนี้ player UI ยังไม่มี dedicated DOM sections สำหรับ stats/events/support

ดังนั้น phase แรกควร:

- reuse state loaders เดิม
- เพิ่ม wrappers ใหม่สำหรับ page-based IA
- ใช้ helper เดิมจาก `portalHelperRuntime.js` และ `player-core.js`

สิ่งที่นำกลับมาใช้ได้:

- notification categorization
- order status labels
- server snapshot summaries
- player identity and Steam link state

## 10. Build phases

### Phase A

- ทำ `/player/stats` และ `/player/leaderboards`
- ใช้ endpoint stats/leaderboard ที่มีอยู่จริง
- ทำ `/player/support` จาก trust/account/order guidance ที่มีอยู่แล้ว

### Phase B

- ทำ `/player/activity` จาก notifications + announcements
- ทำ `/player/events` จาก missions/wheel/bounties/server info
- ปรับ copy ให้เป็น community-first มากขึ้น

### Phase C

- ถ้ามี event model และ support ticket model จริง ค่อยย้ายจาก derived views ไปใช้ dedicated data
- เพิ่ม richer community highlights และ player-specific event history

## 11. Acceptance criteria

- ผู้เล่นมี reason to return นอกเหนือจากการซื้อของ
- stats กับ leaderboards ใช้งานได้จาก endpoint เดิม
- events/support มี strongest safe version ที่ไม่หลอกว่าระบบครบเกินจริง
- route เดิมยังไม่พังและ shell เดิมยัง reuse ได้ในช่วงเปลี่ยนผ่าน

## 12. Open follow-up

- เพิ่ม dedicated event APIs สำหรับ active/upcoming/history
- เพิ่ม support ticket model หรือ player support case flow จริง
- เพิ่ม activity feed ที่รวม killfeed/community events แบบอ่านง่ายและปลอดภัยต่อข้อมูลส่วนตัว
