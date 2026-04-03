# แผนภาพระบบสำหรับดูบน GitHub

Language:

- English: [SYSTEM_MAP_GITHUB_EN.md](./SYSTEM_MAP_GITHUB_EN.md)
- Thai: `SYSTEM_MAP_GITHUB_TH.md`

อัปเดตล่าสุด: **2026-03-27**

เอกสารนี้ทำไว้สำหรับการอ่านบน GitHub โดยตรง และใช้ Mermaid ที่ GitHub render ได้จริง

เป้าหมายคือ:

- ให้เห็นภาพรวมระบบในหน้าเดียว
- แยก web surface, control plane, และ game-side runtime ให้ชัด
- ใช้เป็นแผนที่นำทางก่อนลงไปอ่านไฟล์เชิงลึกใน `src/`, `apps/`, และ `docs/`

## 1. ภาพรวมทั้งแพลตฟอร์ม

```mermaid
flowchart LR
  subgraph Users["Users"]
    OWNER["Owner"]
    TENANT["Tenant Admin"]
    PLAYER["Player"]
    DISCORDUSER["Discord User"]
  end

  subgraph Web["Web Surfaces"]
    OWNERWEB["Owner Panel"]
    TENANTWEB["Tenant Admin Panel"]
    PUBLICWEB["Public / Auth"]
    PLAYERWEB["Player Portal"]
  end

  subgraph Core["Control Plane"]
    BOT["Discord Bot"]
    ADMINAPI["Admin API"]
    PLAYERAPI["Player / Public API"]
    WORKER["Worker"]
    MONITOR["Monitoring / Audit / Notifications"]
    DB[("PostgreSQL + Prisma")]
  end

  subgraph Game["Game-side Runtime"]
    WATCHER["Server Bot / Watcher"]
    AGENT["Delivery Agent"]
    LOG["SCUM.log"]
    CLIENT["SCUM Client"]
  end

  subgraph External["External Services"]
    DISCORD["Discord Gateway / OAuth"]
  end

  OWNER --> OWNERWEB
  TENANT --> TENANTWEB
  PLAYER --> PUBLICWEB
  PLAYER --> PLAYERWEB
  DISCORDUSER --> DISCORD

  OWNERWEB --> ADMINAPI
  TENANTWEB --> ADMINAPI
  PUBLICWEB --> PLAYERAPI
  PLAYERWEB --> PLAYERAPI

  DISCORD --> BOT
  BOT --> DB
  ADMINAPI --> DB
  PLAYERAPI --> DB
  WORKER --> DB
  MONITOR --> DB

  LOG --> WATCHER
  WATCHER --> ADMINAPI
  WATCHER --> DB

  WORKER --> AGENT
  AGENT --> CLIENT
  AGENT --> ADMINAPI
  AGENT --> DB

  BOT --> MONITOR
  ADMINAPI --> MONITOR
  PLAYERAPI --> MONITOR
  WORKER --> MONITOR
```

สรุปสั้น:

- ฝั่ง web มี 3 surface หลักคือ Owner, Tenant Admin, และ Player/Public
- control plane กลางพึ่ง `PostgreSQL + Prisma`
- game-side runtime ถูกแยกเป็น `Server Bot / Watcher` กับ `Delivery Agent`
- `Delivery Agent` กับ `Server Bot` ไม่ควรถูกอธิบายว่าเป็น runtime เดียวกัน

## 2. การแยกบทบาทของเว็บทั้ง 3 ฝั่ง

```mermaid
flowchart TB
  subgraph Owner["Owner Panel"]
    O1["ภาพรวมแพลตฟอร์ม"]
    O2["Tenants / Packages / Quotas"]
    O3["Runtime Health / Incidents"]
    O4["Audit / Security / Restore"]
  end

  subgraph Tenant["Tenant Admin Panel"]
    T1["Dashboard งานประจำวัน"]
    T2["Server Status / Server Config"]
    T3["Orders / Delivery / Players"]
    T4["Delivery Agent / Server Bot"]
    T5["Diagnostics / Audit / Restart"]
  end

  subgraph Player["Player Portal"]
    P1["Home / Trust State"]
    P2["Shop / Wallet / Orders"]
    P3["Delivery / Redeem / Profile"]
    P4["Stats / Leaderboards / Activity"]
  end
```

สรุปสั้น:

- `Owner Panel` เน้นการคุมแพลตฟอร์มและ tenant fleet
- `Tenant Admin Panel` เน้นการดูแลเซิร์ฟเวอร์, order, runtime, และ diagnostics ของ tenant
- `Player Portal` เน้นประสบการณ์ผู้เล่น เช่น wallet, shop, orders, delivery, และ profile

## 3. เส้นแบ่งระหว่าง Delivery Agent และ Server Bot

```mermaid
flowchart LR
  subgraph DeliveryAgent["Delivery Agent"]
    D1["รับ delivery job"]
    D2["execute ในเกม"]
    D3["รายงานผลการส่งของ"]
    D4["อาจส่ง announce ในเกม"]
  end

  subgraph ServerBot["Server Bot / Watcher"]
    S1["อ่าน SCUM.log"]
    S2["sync event / state"]
    S3["ดู config / backup / apply"]
    S4["ช่วยเรื่อง restart / health"]
  end
```

ข้อสำคัญ:

- `Delivery Agent` ต้องอยู่บนเครื่องที่เปิด SCUM client
- `Server Bot` อยู่ฝั่งเครื่องเซิร์ฟเวอร์และดูเรื่อง log/config/control
- ถ้าระบบอธิบายสองตัวนี้ปนกัน จะทำให้ deployment และ troubleshooting ผิดทิศได้ง่าย

## 4. ควรอ่านอะไรต่อ

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ARCHITECTURE_TH.md](./ARCHITECTURE_TH.md)
- [RUNTIME_TOPOLOGY.md](./RUNTIME_TOPOLOGY.md)
- [RUNTIME_TOPOLOGY_TH.md](./RUNTIME_TOPOLOGY_TH.md)
- [PRODUCT_READY_GAP_MATRIX.md](./PRODUCT_READY_GAP_MATRIX.md)
- [PRODUCT_READY_GAP_MATRIX_TH.md](./PRODUCT_READY_GAP_MATRIX_TH.md)

ถ้าต้องการข้อความ canonical ให้ยึดเวอร์ชันอังกฤษประกอบด้วย และใช้ไฟล์นี้เป็นแผนที่ภาษาไทยสำหรับคนที่เปิดอ่านจาก GitHub ก่อน
