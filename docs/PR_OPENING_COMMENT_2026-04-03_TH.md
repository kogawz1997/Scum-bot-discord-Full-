# PR Opening Comment 2026-04-03

ใช้ข้อความนี้เป็น comment แรกตอนเปิด PR หรือใช้เป็นโน้ตประกอบ reviewer

## Opening Comment

รอบนี้เป็นการปิดงานฝั่ง repo-local และเตรียม handoff สำหรับ staging/release ต่อ

สิ่งที่รวมอยู่ใน PR นี้:

- core data และ identity consistency
- billing และ runtime productization
- owner / tenant / player surface polish
- security + readiness sweep
- delivery audit restore hardening
- release / staging / rollout handoff docs

สถานะที่ปิดแล้วในเครื่องนี้:

- `npm test` ผ่าน
- `npm run lint:text` ผ่าน
- docs handoff อัปเดตครบ

สิ่งที่ reviewer ควรโฟกัส:

1. identity summary และ preview-account state ว่าตรงกับ product model ปัจจุบันหรือไม่
2. billing webhook replay safety และผลกระทบกับ event history
3. product-facing wording ของ `Delivery Agent` เทียบกับ compatibility runtime key `console-agent`
4. cross-tenant security signal และผลกระทบกับ admin access/runtime logs
5. delivery audit replace/restore behavior ว่าปลอดภัยและไม่สร้าง duplicate drift

สิ่งที่ PR นี้ยังไม่อ้างว่า proof แล้ว:

- SCUM client proof จริงบนเครื่อง `Delivery Agent`
- SCUM server machine proof จริงบน `Server Bot`
- live billing provider behavior
- Discord OAuth / guild role mapping proof
- multi-environment proof นอก workstation นี้

เอกสารประกอบ:

- [C:\new\docs\PR_DESCRIPTION_2026-04-03_TH.md](/C:/new/docs/PR_DESCRIPTION_2026-04-03_TH.md)
- [C:\new\docs\RELEASE_HANDOFF_2026-04-03_TH.md](/C:/new/docs/RELEASE_HANDOFF_2026-04-03_TH.md)
- [C:\new\docs\PRODUCTION_ROLLOUT_PLAN_2026-04-03_TH.md](/C:/new/docs/PRODUCTION_ROLLOUT_PLAN_2026-04-03_TH.md)

## Reviewer Checklist

- [ ] owner / tenant / player wording เปลี่ยนไปในทางเดียวกัน
- [ ] `Delivery Agent` wording ไม่ทำให้ internal compatibility key พัง
- [ ] identity summary paths ไม่หลุดกับ legacy link paths
- [ ] billing replay safety ไม่ทำให้ event/state update หาย
- [ ] security event เพิ่มแล้วไม่ spam notifications เกินจำเป็น
- [ ] delivery audit restore path ไม่สร้าง row ซ้ำ
- [ ] handoff docs พอสำหรับ staging / rollout จริง
