# Repo Presentation Checklist

ใช้เช็กลิสต์นี้ก่อนเผยแพร่ repo ให้ลูกค้าหรือผู้ร่วมพัฒนา

## 1) GitHub First Impression (10 วินาทีแรก)

- Description ชัดเจน:
  - `SCUM Discord operations platform (economy, shop, delivery, admin + player portal)`
- Topics แนะนำ:
  - `discord-bot`
  - `scum`
  - `rcon`
  - `prisma`
  - `admin-dashboard`
  - `player-portal`
  - `observability`

## 2) README ต้องมี

- What this project solves
- Core features
- Architecture
- Quick start
- Production deploy
- Testing / readiness / smoke
- Security baseline
- Troubleshooting

## 3) Media ที่ควรเพิ่ม

- architecture image
- screenshot admin panel
- screenshot player portal
- purchase -> queue -> delivery flow
- quick demo gif/video

## 4) Suggested Asset Paths

- `docs/assets/architecture.png`
- `docs/assets/admin-dashboard.png`
- `docs/assets/player-portal.png`
- `docs/assets/purchase-delivery-flow.png`
- `docs/assets/quick-demo.gif`

## 5) Demo Script (สำหรับอัดวิดีโอ)

1. login admin -> ตั้งค่าร้านค้า
2. ผู้เล่นซื้อสินค้า (Discord หรือเว็บ)
3. งานเข้า queue
4. worker ส่งของสำเร็จ + บันทึก audit
5. dashboard แสดง metrics/alerts
6. backup export + restore dry-run
