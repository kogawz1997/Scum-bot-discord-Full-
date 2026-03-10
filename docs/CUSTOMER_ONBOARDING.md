# Customer Onboarding (One-Click + Panel-Based)

เอกสารนี้ใช้ส่งให้ลูกค้าติดตั้งและเริ่มใช้งานระบบแบบเร็วที่สุด

## 1) สิ่งที่ต้องเตรียม

1. Windows Server หรือ Windows เครื่องหลักที่รัน Node.js 20+
2. ติดตั้ง PM2:

```bat
npm i -g pm2
```

3. คัดลอกไฟล์ env:

```bat
copy .env.example .env
copy apps\web-portal-standalone\.env.production.example apps\web-portal-standalone\.env
```

4. ใส่ค่าจาก Discord Developer Portal:
- `DISCORD_TOKEN`
- `WEB_PORTAL_DISCORD_CLIENT_ID`
- `WEB_PORTAL_DISCORD_CLIENT_SECRET`
- ถ้าเปิด SSO แอดมิน: `ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET`

## 2) ติดตั้งแบบ One-Click

จากโฟลเดอร์โปรเจกต์:

```bat
npm run deploy:oneclick:win
```

สคริปต์จะทำอัตโนมัติ:
- หมุน internal secrets
- บังคับ `NODE_ENV=production`
- บังคับ `PERSIST_REQUIRE_DB=true`
- รัน `prisma generate` + `prisma migrate deploy`
- สตาร์ต split runtime ด้วย PM2 (`bot/worker/watcher/web`)
- รัน `readiness:prod` และ `smoke:postdeploy`

## 3) ใช้งานแบบ Panel-Based (หลังติดตั้งเสร็จ)

- Admin Panel: `https://admin.<your-domain>/admin`
- Player Portal: `https://player.<your-domain>/player`

งานประจำที่ทำผ่าน panel:
- ปรับ config
- ดู queue/dead-letter
- backup/restore
- ดู metrics และ alerts
- จัดการร้านค้า/เศรษฐกิจ/กิจกรรม

## 4) Health Check

- Bot: `http://127.0.0.1:3210/healthz`
- Worker: `http://127.0.0.1:3211/healthz`
- Watcher: `http://127.0.0.1:3212/healthz`
- Admin: `http://127.0.0.1:3200/healthz`
- Player Portal: `http://127.0.0.1:3300/healthz`

รัน smoke test หลัง deploy ทุกครั้ง:

```bat
npm run smoke:postdeploy
```

## 5) Security Rules ที่ต้องย้ำลูกค้า

1. ห้าม commit หรือแชร์ไฟล์ `.env`
2. ถ้าสงสัย token หลุด ให้หมุนทันที
3. เปิด HTTPS จริงทั้ง admin/player
4. ตรวจ `npm run readiness:prod` ก่อนเปิดให้ผู้เล่นใช้งาน
5. เก็บ backup นอกเครื่อง production เสมอ
