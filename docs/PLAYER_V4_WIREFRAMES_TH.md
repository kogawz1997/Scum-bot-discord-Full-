# Player Portal V4 Wireframes

สถานะเอกสาร: draft พร้อมใช้เป็นแบบหน้าใช้งานจริง  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [WEB_SURFACES_V4_BLUEPRINT_TH.md](./WEB_SURFACES_V4_BLUEPRINT_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md)

เอกสารนี้กำหนด wireframe หน้าใช้งานจริงของ Player Portal โดยยึดแนวคิด `community portal with trust`:

- ไม่ใช่แค่ shop
- ใช้ภาษาที่ผู้เล่นเข้าใจทันที
- ให้กลับมาใช้งานซ้ำได้เพราะมีข้อมูลสด, กิจกรรม, และสถานะที่เชื่อถือได้
- ฟังก์ชันครบ แต่หน้าแรกต้องอ่านจบในไม่กี่วินาที

## 1. Shared shell

```text
┌ Top bar: logo/community | language | notifications | profile
├ Sidebar: เมนูหลักของผู้เล่น
├ Page header: ชื่อหน้า | สถานะสำคัญ | primary action
├ Main content
└ Right rail (optional): linked account status | event highlights | support shortcuts
```

## 2. Page templates

### Template P1: Home / Community Dashboard

```text
┌ Header: greeting + community status + primary action
├ Status strip: wallet | pending orders | delivery status | linked accounts | active event
├ Main: activity feed + featured modules
└ Right rail: trust signals | quick actions | support
```

### Template P2: Shop / Listing

```text
┌ Header: page title + category filters
├ Filter bar: search | category | availability | promo
├ Product grid/list
└ Right rail: cart summary | wallet | current promo
```

### Template P3: Orders / Delivery / History

```text
┌ Header: title + status filter
├ Table/list of records
├ Detail preview area
└ Right rail: help text | delivery explanations | next steps
```

### Template P4: Stats / Community

```text
┌ Header: page title + time range
├ Highlight strip
├ Main rankings/feed blocks
└ Right rail: my position | event highlight | profile trust state
```

### Template P5: Profile / Support

```text
┌ Header: page title + primary action
├ Main sections: identity, linked accounts, preferences, tickets
└ Right rail: verification status | latest support update
```

## 3. Sidebar grouping

Player sidebar แบ่งเป็น 4 หมวด:

1. ใช้บ่อย
2. คำสั่งซื้อและการส่งของ
3. สถิติและชุมชน
4. บัญชีและการช่วยเหลือ

รายการเมนูจริง:

- Home
- Shop
- Wallet
- Orders
- Delivery
- My Stats
- Leaderboards
- Activity Feed
- Donations
- Events
- Profile
- Support

## 4. Page-by-page wireframes

### 4.1 `/player` Home

- เทมเพลต: P1
- เป้าหมาย: เข้ามาแล้วรู้ทันทีว่ามีอะไรค้าง มีอะไรน่าสนใจ และควรทำอะไรต่อ
- สิ่งที่ต้องเห็นทันที:
  - wallet balance
  - latest order status
  - delivery status
  - linked account status
  - active event
- Quick actions:
  - ไปที่ร้านค้า
  - ดูคำสั่งซื้อ
  - ดูการส่งของ
  - ผูกบัญชี
  - เปิดซัพพอร์ต
- Main blocks:
  - activity feed
  - featured event
  - supporter highlights
  - community notices
- Right rail:
  - trust signals
  - verification state
  - support shortcut

### 4.2 `/player/shop`

- เทมเพลต: P2
- เป้าหมาย: ซื้อของได้ง่ายและรู้ว่าของชิ้นนั้นจะไปที่ไหน/เมื่อไร
- Main blocks:
  - categories
  - featured items
  - promo section
  - item list/grid
- Right rail:
  - cart summary
  - wallet balance
  - delivery note
- Primary action: ซื้อสินค้า

### 4.3 `/player/wallet`

- เทมเพลต: P3
- เป้าหมาย: ดูยอดคงเหลือและธุรกรรมแบบเข้าใจง่าย
- Main blocks:
  - current balance
  - recent transactions
  - top-up history
  - pending credits
- Primary action: เติมเงิน หรือดูรายการล่าสุด

### 4.4 `/player/orders`

- เทมเพลต: P3
- เป้าหมาย: ดูออเดอร์ทั้งหมดและเข้าใจสถานะได้ทันที
- Filters:
  - all / pending / processing / completed / failed
  - date range
- Detail preview:
  - items
  - amount
  - payment state
  - delivery state
- Primary action: เปิด order detail

### 4.5 `/player/delivery`

- เทมเพลต: P3
- เป้าหมาย: ดูสถานะการส่งของจากมุมผู้เล่น
- Main blocks:
  - latest delivery
  - delivery history
  - failed delivery notes
  - proof/evidence status
- Right rail:
  - what each status means
  - when to contact support
- Primary action: เปิด delivery detail

### 4.6 `/player/stats`

- เทมเพลต: P4
- เป้าหมาย: ดูสถิติตัวเองและความคืบหน้า
- Highlight strip:
  - kills
  - longest shot
  - playtime
  - streak
  - wallet rank
- Main blocks:
  - personal stats cards
  - trend chart placeholders
  - recent achievements
- Primary action: เปลี่ยนช่วงเวลา หรือเปิด leaderboards

### 4.7 `/player/leaderboards`

- เทมเพลต: P4
- เป้าหมาย: ดูอันดับแบบสแกนง่าย
- Categories:
  - most kills
  - headshots
  - longest shot
  - playtime
  - top donor
  - richest wallet
- Right rail:
  - my current rank
  - featured event
- Primary action: เปลี่ยนหมวดอันดับ

### 4.8 `/player/activity`

- เทมเพลต: P4
- เป้าหมาย: ดู killfeed และ community activity
- Feed types:
  - killfeed
  - donation events
  - delivery events
  - event announcements
  - restart announcements
- Primary action: filter feed

### 4.9 `/player/donations`

- เทมเพลต: P4
- เป้าหมาย: ดูผู้สนับสนุน, เป้าหมายรายเดือน, และรางวัลชุมชน
- Main blocks:
  - monthly goal progress
  - top supporters
  - recent supporters
  - supporter perks
- Primary action: ไปดูแพ็กเกจสนับสนุน

### 4.10 `/player/events`

- เทมเพลต: P4
- เป้าหมาย: ดูกิจกรรมที่กำลังเปิดและกำลังจะมา
- Main blocks:
  - active events
  - upcoming events
  - event rewards
  - event leaderboard
  - event history
- Primary action: เปิด event detail

### 4.11 `/player/profile`

- เทมเพลต: P5
- เป้าหมาย: จัดการบัญชีและ linked identities
- Sections:
  - account info
  - Discord link
  - Steam link
  - in-game match status
  - language/preferences
- Verification states:
  - discord_linked
  - discord_verified
  - steam_linked
  - player_matched
  - fully_verified
- Primary action: ผูกบัญชี

### 4.12 `/player/support`

- เทมเพลต: P5
- เป้าหมาย: เปิด ticket หรือดูเรื่องที่ค้างได้ง่าย
- Main blocks:
  - create ticket
  - my open tickets
  - common help topics
  - diagnostics/support info ที่แชร์ได้
- Primary action: เปิด ticket

## 5. States มาตรฐาน

- Empty:
  - Home: ยังไม่มีออเดอร์หรือกิจกรรม ให้พาไป Shop หรือ Events
  - Wallet: ยังไม่มีธุรกรรม
  - Orders: ยังไม่มีคำสั่งซื้อ
- Preview:
  - ถ้าอยู่ในโหมด preview ให้เห็นหน้าได้ แต่กดซื้อหรือส่งข้อมูลจริงไม่ได้
- Error:
  - บอกว่าพลาดที่ส่วนไหน เช่น order history โหลดไม่ได้ แต่ wallet ยังโหลดได้
- Trust state:
  - ทุกหน้าสำคัญควรมีสัญญาณว่าบัญชีผูกครบหรือยัง

## 6. สิ่งที่ห้ามกลับมาอีก

- หน้า shop-only ที่ไม่มี community value
- ภาษาขายของเกินเหตุในหน้าการใช้งาน
- card เยอะจนแยกงานหลักไม่ออก
- ภาพแน่นหรือเน้น game UI มากเกินไป

## 7. ลำดับ implement ที่แนะนำ

1. Home
2. Shop
3. Orders
4. Delivery
5. Wallet
6. Profile
7. Leaderboards
8. Activity Feed
9. Events
10. Support / Donations
