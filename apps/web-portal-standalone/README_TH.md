# พอร์ทัลผู้เล่น SCUM แบบแยกโปรเซส

Language:

- English: [README.md](./README.md)
- Thai: `README_TH.md`

แอปนี้รัน `Player Portal` เป็นโปรเซสแยกของตัวเอง เพื่อให้เส้นทางฝั่งผู้เล่นแยกออกจาก admin control plane อย่างชัดเจน

แนวคิดหลัก:

- หน้า player/public ไม่คุยกับเครื่องเกมโดยตรง
- การอ่านและเขียนข้อมูลของผู้เล่นยังต้องวิ่งผ่าน control-plane และ persistence boundary กลางของระบบ
- แอปนี้มีไว้สำหรับประสบการณ์ผู้เล่นและหน้า public เท่านั้น ไม่ใช่ที่สำหรับ owner/admin operations

## เส้นทางหลักของแอป

- `/player`
  - หน้า player portal หลัก
- `/player/login`
  - หน้า sign-in ผ่าน Discord
- `/landing`
  - หน้า public สำหรับเลือกเส้นทางการเข้าใช้งาน
- `/showcase`
  - หน้าแสดงภาพรวมเชิงผลิตภัณฑ์
- `/trial`
  - หน้า public สำหรับเส้นทางทดลองใช้งาน

เส้นทาง admin จะไม่ถูกเสิร์ฟจากแอปนี้:

- `/admin*`
  - redirect ไปยัง admin origin ที่กำหนดผ่าน `WEB_PORTAL_LEGACY_ADMIN_URL`

## การแบ่งบทบาทปัจจุบัน

- `Owner`
  - ดูแลภาพรวมระดับแพลตฟอร์ม
  - fleet ของ tenant, runtime, security, recovery
- `Admin`
  - ดูแลเซิร์ฟเวอร์ของ tenant
  - commerce, delivery, support, config
- `Player`
  - wallet, orders, redeem, profile, Steam link

หน้า public ที่เสิร์ฟจากแอปนี้ในตอนนี้:

- `/landing`
- `/showcase`
- `/trial`

แนวทางสำคัญคือให้ flow ของผู้เล่นแยกจาก owner/admin operations เพื่อรักษา role boundary ให้ชัด

## ความสามารถฝั่งผู้เล่น

- Discord OAuth login
- player dashboard และ account summary
- wallet และประวัติรายการ
- shop, cart, checkout และประวัติการซื้อ
- redeem flow และประวัติการ redeem
- Steam link flow
- missions, wheel, party, bounty และ notification views

## Environment ที่ต้องมี

อย่างน้อยควรกำหนดค่าเหล่านี้:

- `WEB_PORTAL_MODE=player`
- `WEB_PORTAL_BASE_URL=http://127.0.0.1:3300`
- `WEB_PORTAL_LEGACY_ADMIN_URL=http://127.0.0.1:3200/admin`
- `WEB_PORTAL_DISCORD_CLIENT_ID=...`
- `WEB_PORTAL_DISCORD_CLIENT_SECRET=...`

ค่าที่แนะนำเพิ่ม:

- `WEB_PORTAL_SECURE_COOKIE=true`
  - ใช้เมื่อ deploy ผ่าน HTTPS
- `WEB_PORTAL_ENFORCE_ORIGIN_CHECK=true`
- `WEB_PORTAL_MAP_EMBED_ENABLED=true`

ถ้าต้องการดู env catalog ที่กว้างกว่าเดิม ให้ดู [../../docs/ENV_REFERENCE_TH.md](../../docs/ENV_REFERENCE_TH.md)

## Discord OAuth

ค่า redirect URI ใน Discord Developer Portal:

- Local:
  - `http://127.0.0.1:3300/auth/discord/callback`
- Production:
  - `https://player.genz.noah-dns.online/auth/discord/callback`

## การเริ่มต้นใช้งาน

จาก root ของ repository:

```bash
npm run start:web-standalone
```

ตรวจ health:

```bash
curl http://127.0.0.1:3300/healthz
```

## การตรวจสอบก่อน deploy หรือก่อน reopen

คำสั่งที่แนะนำ:

```bash
npm run doctor:web-standalone
npm run doctor:web-standalone:prod
npm run readiness:prod
npm run smoke:postdeploy
```

## หมายเหตุด้าน production

- player portal เป็นเส้นทางหลักของระบบ ไม่ใช่ legacy view
- งานของ owner และ tenant admin ควรอยู่ใน admin web surfaces ตามเดิม
- แอปนี้ต้องไม่เข้าไปแทน security flows ของ owner/admin
- Discord OAuth, session, และ route behavior ต้องสอดคล้องกับเอกสาร platform หลักเสมอ

## เอกสารที่ควรอ่านต่อ

- [../../README.md](../../README.md)
- [../../README_TH.md](../../README_TH.md)
- [../../docs/OPERATOR_QUICKSTART.md](../../docs/OPERATOR_QUICKSTART.md)
- [../../docs/PRODUCT_READY_GAP_MATRIX.md](../../docs/PRODUCT_READY_GAP_MATRIX.md)

ไฟล์นี้ตั้งใจเป็นสรุปภาษาไทยสำหรับคนที่เปิดดูจาก GitHub ก่อน ถ้าต้องการข้อความ canonical หรือรายละเอียดเชิงปฏิบัติการ ให้เทียบกับเวอร์ชันอังกฤษและเอกสาร operator เพิ่มเติม
