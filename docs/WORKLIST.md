# Worklist — SaaS Readiness Master List

อัปเดตล่าสุด: `2026-04-25`

รวมงานที่เหลือทั้งหมดก่อนจะเป็น SaaS เต็มรูปแบบ ทั้ง 3 เว็บ (Owner / Tenant / Player) และระบบหลังบ้าน

---

## สัญลักษณ์

- `✅ done` — เสร็จแล้ว ใช้งานได้จริง
- `🟡 partial` — มีพื้นฐานแล้ว แต่ยังไม่ครบ
- `🔴 missing` — ไม่มีเลย ต้องสร้างใหม่
- `⏳ blocked` — ต้องมี infra / live environment ถึงจะทำได้

---

## P0 — ห้ามข้าม (go-live ไม่ได้ถ้าไม่มี)

| # | งาน | สถานะ | หมายเหตุ |
|---|---|---|---|
| 1 | **Billing cron sweeper** — wire `setInterval` ใน `adminWebServer.js:~347` รัน `sweepExpiredSubscriptions` ทุก 6 ชม. | 🟡 partial | TODO comment ไว้แล้ว รอ wire จริง |
| 2 | **Billing webhook end-to-end test** — ทดสอบ Stripe test mode จริง ยืนยัน idempotency, retry ไม่ duplicate | ⏳ blocked | ต้องใช้ Stripe test key จริง |
| 3 | **Discord SSO role mapping** — ทดสอบ role ใน guild จริง → permission ใน admin console ถูกต้อง | ⏳ blocked | ต้องมี guild ที่มี role ตรงกัน |

---

## P1 — Product-ready foundation (ทำก่อน launch)

| # | งาน | สถานะ | หมายเหตุ |
|---|---|---|---|
| 4 | **Billing flow tests** — failed payment → retry → recover, cancel → grace → expired, entitlement lock/unlock, webhook mock | 🟡 partial | `platform-billing-lifecycle-service.test.js` มีพื้นฐาน ขาด edge case |
| 5 | **Unified identity** — email verify loop, recovery flow, หน้า "account ที่ link ทั้งหมด" (Discord + Steam + email) | 🟡 partial | แต่ละ piece มี แต่ไม่ต่อเป็น journey เดียว |
| 6 | **Party chat UI** — API พร้อมแล้ว (`/player/api/party/chat`) แต่ไม่มีหน้า UI ใน player portal | 🟡 partial | TODO comment ใน `player-v4-app.js:861` |
| 7 | **Audit log coverage** — ยืนยันว่า config apply, restart, package change, billing change, agent revoke ถูก log จริง | 🟡 partial | `admin-audit-presets.integration.test.js` มี แต่ action บางอย่างหลุด |
| 8 | **Release runbook อัปเดต** — อัปเดต `GO_LIVE_CHECKLIST_TH.md`, `STAGING_RUN_SHEET` ให้ตรงกับ state ปัจจุบัน (billing sweep, webhook encryption, portal v5) | 🟡 partial | เอกสารเดิม date 2026-04-03 ล้าสมัยแล้ว |

---

## P2 — Product depth (เปิดได้ก่อน ค่อยเพิ่ม)

| # | งาน | สถานะ | หมายเหตุ |
|---|---|---|---|
| 9 | **Tenant staff permission matrix** — custom role ยังไม่มี, ตอนนี้ fixed roles เท่านั้น (owner/mod/staff/viewer) | 🟡 partial | |
| 10 | **Donation lifecycle** — recurring, supporter tier, history ที่ลึกกว่านี้ | 🟡 partial | รับ donation ได้แล้ว แต่ lifecycle ยังบาง |
| 11 | **Raid system** — request / approve / window / summary แบบ end-to-end ยังไม่มี | 🟡 partial | raid time มี แต่ไม่ครบ loop |
| 12 | **Analytics** — filter/date range, graph จริง (ตอนนี้อ่านได้อย่างเดียว CSV ไม่มี filter) | 🟡 partial | |
| 13 | **Tenant isolation/RLS tests** — cross-tenant data leak scenario, schema-per-tenant mode, owner vs tenant API scope | 🟡 partial | `tenant-db-isolation.test.js` มี แต่ขาด production mode scenario |
| 14 | **Agent resilience tests** — reconnect หลัง TCP drop, duplicate session, expired token, wrong role/scope, offline recovery | 🟡 partial | base tests มี ขาด edge case |
| 15 | **Monitoring/alerting scenarios** — agent offline, delivery fail, restart fail, billing fail, DB fail → alert + recovery path | 🟡 partial | `platform-monitoring-service.test.js` มีพื้นฐาน ขาด scenario จริง |

---

## P3 — Polish (ทำทีหลังได้)

| # | งาน | สถานะ | หมายเหตุ |
|---|---|---|---|
| 16 | **Browser E2E / UX smoke** — เปิดเว็บจริง เช็กหน้า, ปุ่ม, locked state, mobile layout ทั้ง 3 เว็บ | 🔴 missing | ต้องติด Playwright ก่อน ไม่มีเลย |
| 17 | **UI empty / error / loading states** — ทุกหน้าใน Owner / Tenant / Player ต้องมี state ครบ | 🔴 missing | ต้องใช้ browser test ถึงจะเช็กได้จริง |
| 18 | **Hardcoded i18n strings** — Thai/English strings ที่ยังเป็น hardcode ใน `tenant-v4-app.js`, `player-control-v4.js` ยังเยอะ | 🟡 partial | locale files ครบแล้ว แต่ `t()` ยังไม่ครอบทุกที่ |
| 19 | **Rate limiting distributed** — ตอนนี้ in-memory ถ้า deploy หลาย node จะ bypass กันได้ | 🟡 partial | |
| 20 | **Service boundary cleanup** — `adminWebServer.js` ยังใหญ่เกินไป ทำหลายอย่างในที่เดียว | 🟡 partial | |
| 21 | **CI workflow** — โครงสร้างดีแล้ว (secret → quality-matrix → clean-room → artifacts) ไม่มีปัญหา resource ชน | ✅ done | ไม่ต้องแก้ |

---

## สรุปตัวเลข

| ระดับ | จำนวน | ยังเหลือ |
|---|---|---|
| P0 — ห้ามข้าม | 3 | 3 |
| P1 — foundation | 5 | 5 |
| P2 — product depth | 7 | 7 |
| P3 — polish | 6 | 5 (CI เสร็จแล้ว 1) |
| **รวม** | **21** | **20** |
