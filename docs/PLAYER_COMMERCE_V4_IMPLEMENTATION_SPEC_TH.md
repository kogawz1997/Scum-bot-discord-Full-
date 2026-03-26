# Player Commerce V4 Implementation Spec

สถานะเอกสาร: implementation-ready draft  
อัปเดตล่าสุด: 2026-03-26  
อ้างอิงร่วม: [PLAYER_V4_WIREFRAMES_TH.md](./PLAYER_V4_WIREFRAMES_TH.md), [WEB_SURFACES_V4_SITEMAP_TH.md](./WEB_SURFACES_V4_SITEMAP_TH.md), [TENANT_ORDERS_V4_IMPLEMENTATION_SPEC_TH.md](./TENANT_ORDERS_V4_IMPLEMENTATION_SPEC_TH.md)

เอกสารนี้ใช้สำหรับรวมหน้า `Shop / Wallet / Orders / Delivery` ให้กลายเป็นกลุ่ม commerce surface ที่ครบ ใช้ง่าย และไม่ทำให้ผู้เล่นหลงระหว่าง “ซื้อ”, “จ่าย”, “รอ”, และ “ได้รับของแล้ว”

## 1. Scope

หน้าเป้าหมาย:

- `/player/shop`
- `/player/wallet`
- `/player/orders`
- `/player/delivery`

route/tab เดิมที่ต้อง map ชั่วคราว:

- `/player#shop`
- `/player#wallet`
- `/player#orders`

บทบาทของหน้านี้:

- ซื้อสินค้า
- ดูยอดและประวัติกระเป๋าเงิน
- ดูสถานะคำสั่งซื้อ
- ดูสถานะการส่งของ

สิ่งที่ต้องกันความสับสน:

- ไม่ให้ผู้เล่นต้องเดาเองว่า order กับ delivery ต่างกันอย่างไร
- ไม่ให้ Steam link errors โผล่แบบงง ๆ ตอนปลายทาง
- ไม่ซ่อนข้อมูลสำคัญไว้หลังหลายคลิก

## 2. Current repo baseline

ไฟล์ฐานที่เกี่ยวข้อง:

- [C:\new\apps\web-portal-standalone\public\assets\player-core.js](C:/new/apps/web-portal-standalone/public/assets/player-core.js)
- [C:\new\apps\web-portal-standalone\api\playerCommerceRoutes.js](C:/new/apps/web-portal-standalone/api/playerCommerceRoutes.js)
- [C:\new\apps\web-portal-standalone\api\playerGeneralRoutes.js](C:/new/apps/web-portal-standalone/api/playerGeneralRoutes.js)

endpoint ที่ใช้ได้จริง:

- `/player/api/shop/list`
- `/player/api/shop/buy`
- `/player/api/cart`
- `/player/api/cart/add`
- `/player/api/cart/remove`
- `/player/api/cart/clear`
- `/player/api/cart/checkout`
- `/player/api/purchase/list`
- `/player/api/wallet/ledger`
- `/player/api/redeem`
- `/player/api/redeem/history`

state ที่มีอยู่จริง:

- `walletLedger`
- `shopItems`
- `cart`
- `orders`
- `redeemHistory`
- `steamLink`

ข้อเท็จจริงสำคัญ:

- backend ตอนนี้รองรับ purchase, cart, checkout, wallet ledger, redeem, และ order timeline แล้ว
- shop/cart มี guard เรื่อง Steam link สำหรับ game items แล้ว
- UI ปัจจุบันยังอยู่ใน tab เดียว แต่ flow ธุรกิจหลักใช้ได้จริง

## 3. Product positioning

`Player Commerce` ต้องทำให้ผู้เล่นรู้เส้นทางนี้ชัด:

1. เช็กกระเป๋าเงิน
2. เลือกของ
3. ชำระ
4. ดู order
5. ดู delivery

## 4. Visual thesis

`trusted commerce workflow`

ความรู้สึกที่ต้องได้:

- ปลอดภัย
- ชัดเจน
- รู้ว่าเงินไปไหน ของไปถึงไหน
- ไม่ต้องเข้าใจระบบ queue ภายใน

## 5. Information architecture

### 5.1 `/player/shop`

หน้าหลักสำหรับ browse และเริ่มการซื้อ

ต้องมี:

- page header
- filter/search bar
- product grid/list
- cart rail
- wallet reminder

### 5.2 `/player/wallet`

หน้าดูยอดและประวัติธุรกรรม

ต้องมี:

- balance summary
- daily/weekly rewards
- ledger table
- wallet guidance

### 5.3 `/player/orders`

หน้าติดตามคำสั่งซื้อ

ต้องมี:

- order summary strip
- trust strip
- orders list
- order detail drawer หรือ detail route

### 5.4 `/player/delivery`

หน้าติดตามการส่งของในมุมผู้เล่น

phase แรก:

- reuse ข้อมูลจาก purchase list + status history
- แยก presentation ออกมาจาก orders ให้ผู้เล่นเข้าใจคำว่า “กำลังส่งของ”, “สำเร็จ”, “ต้องติดต่อแอดมิน”

## 6. Page sections

### 6.1 Shop

header:

- title: `ร้านค้า`
- subtitle: `เลือกซื้อสินค้า บริการ หรือสิทธิพิเศษของชุมชน`
- primary action:
  - `ไปที่ตะกร้า`

sections:

- search + kind filters
- featured / promoted items
- product list
- cart summary rail
- Steam requirement hints

### 6.2 Wallet

header:

- title: `กระเป๋าเงิน`
- subtitle: `ยอดคงเหลือ รายการล่าสุด และรอบรับรางวัล`
- primary action:
  - `เปิดร้านค้า`

sections:

- balance cards
- reward claim cards
- ledger table
- guidance cards

### 6.3 Orders

header:

- title: `คำสั่งซื้อ`
- subtitle: `ติดตามสถานะคำสั่งซื้อและสิ่งที่ควรทำต่อ`
- primary action:
  - `ดูคำสั่งซื้อล่าสุด`

sections:

- summary stats
- trust stats
- explanation feed
- orders list
- detail drawer

### 6.4 Delivery

header:

- title: `การส่งของ`
- subtitle: `ดูว่าของที่ซื้อกำลังรอ, กำลังส่ง, หรือเสร็จแล้ว`
- primary action:
  - `เปิด order ที่ต้องติดตาม`

sections:

- delivery status legend
- recent delivery cards
- failed / needs-attention list
- support guidance rail

## 7. Data mapping from current repo

shop:

- `state.shopItems`
- `state.cart`
- `/player/api/shop/list`
- `/player/api/cart*`
- `/player/api/shop/buy`

wallet:

- `state.walletLedger`
- `/player/api/wallet/ledger`
- `/player/api/daily/claim`
- `/player/api/weekly/claim`

orders/delivery:

- `state.orders`
- `/player/api/purchase/list?includeHistory=1`
- order status helpers และ timeline renderers ใน `player-core.js`

redeem:

- `state.redeemHistory`
- `/player/api/redeem`
- `/player/api/redeem/history`

guardrails ที่มีอยู่แล้ว:

- Steam link required checks สำหรับ game items
- insufficient balance handling
- human-readable order status labels

## 8. Component list

components ที่ต้องมี:

- `WalletSummaryStrip`
- `RewardClaimCard`
- `ShopFilterBar`
- `ProductGrid`
- `CartSummaryRail`
- `OrderStatusBadge`
- `OrderTimelineCard`
- `DeliveryStateLegend`
- `CommerceEmptyState`

## 9. DOM hook reuse plan

phase แรกควร wrap ของเดิม:

- `walletSummaryStats`
- `walletLedgerTable`
- `shopGrid`
- `cartSummary`
- `cartItems`
- `ordersSummaryStats`
- `ordersTrustStats`
- `ordersFeed`
- `orderDetailBackdrop`

หลักการ:

- ใช้ order status and cart logic เดิมต่อก่อน
- แยก page architecture และ copy ก่อน
- ไม่เปลี่ยน API contract หรือ auth/session

## 10. Build phases

### Phase A

- แยก Shop, Wallet, Orders, Delivery เป็น page-based IA
- reuse state loaders และ actions เดิมทั้งหมด
- ทำ delivery page จาก purchase/delivery status เดิมก่อน

### Phase B

- เพิ่ม richer cart / checkout trust messaging
- เพิ่ม filters ของ orders และ delivery
- ปรับคำอธิบายสถานะให้คนทั่วไปอ่านแล้วเข้าใจ

### Phase C

- เพิ่ม promo / donation package presentation
- เพิ่ม delivery proof snippets ถ้ามีข้อมูลพร้อม
- เพิ่ม split detail routes สำหรับ mobile usability

## 11. Acceptance criteria

- ผู้เล่นเข้าใจได้ว่า wallet, order, และ delivery ต่างกันอย่างไร
- ซื้อของได้โดยไม่หลง flow
- ข้อผิดพลาดเรื่อง Steam link หรือ balance แสดงในจุดที่เหมาะ
- route/tab เดิมยังไม่พังในช่วงเปลี่ยนผ่าน

## 12. Open follow-up

- ถ้ามี dedicated payment history / donation history ใน backend ให้แยกจาก wallet ledger
- ถ้ามี delivery proof model ฝั่ง player ที่เปิดเผยได้ ให้ทำ delivery detail page เต็มรูปแบบ
