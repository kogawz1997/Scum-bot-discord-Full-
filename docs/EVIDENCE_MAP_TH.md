# Evidence Map

เอกสารนี้ใช้ตอบคำถามว่า claim ไหนใน repo มีหลักฐานรองรับจากอะไรบ้าง

หลักการ:

- อ้างจาก code path จริง
- อ้างจาก test file จริง
- อ้างจาก CI artifact จริง
- แยก `verified`, `implemented`, `runtime-dependent`, `planned` ให้ชัด

## Source of Truth

หลักฐานหลักที่ใช้ยืนยันสถานะ:

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `artifacts/ci/verification-summary.json`
- `artifacts/ci/verification-summary.md`
- `artifacts/ci/verification-contract.json`
- `artifacts/ci/lint.log`
- `artifacts/ci/test.log`
- `artifacts/ci/doctor.log`
- `artifacts/ci/security-check.log`
- `artifacts/ci/readiness.log`
- `artifacts/ci/smoke.log`

visual assets ที่มีใน repo ตอนนี้:

- [assets/architecture-overview.svg](./assets/architecture-overview.svg)
- [assets/runtime-validation-contract.svg](./assets/runtime-validation-contract.svg)
- [assets/admin-login.png](./assets/admin-login.png)
- [assets/admin-dashboard.png](./assets/admin-dashboard.png)
- [assets/player-landing.png](./assets/player-landing.png)
- [assets/player-login.png](./assets/player-login.png)
- [assets/player-showcase.png](./assets/player-showcase.png)
- [assets/platform-demo.gif](./assets/platform-demo.gif)

เอกสารสรุปที่อ้างจาก artifact:

- [VERIFICATION_STATUS_TH.md](./VERIFICATION_STATUS_TH.md)
- [DELIVERY_CAPABILITY_MATRIX_TH.md](./DELIVERY_CAPABILITY_MATRIX_TH.md)
- [LIMITATIONS_AND_SLA_TH.md](./LIMITATIONS_AND_SLA_TH.md)
- [MIGRATION_ROLLBACK_POLICY_TH.md](./MIGRATION_ROLLBACK_POLICY_TH.md)

## Feature -> Code -> Test -> Artifact

| Feature                                              | Code                                                                                                                                                  | Tests                                                                                                                                                             | Artifact                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| delivery queue, retry, dead-letter, timeline         | `src/services/rconDelivery.js`                                                                                                                        | `test/rcon-delivery.integration.test.js`                                                                                                                          | `artifacts/ci/test.log`                                                                                                      |
| execution backend split `rcon` vs `agent`            | `src/services/rconDelivery.js`, `src/services/scumConsoleAgent.js`                                                                                    | `test/rcon-delivery.integration.test.js`                                                                                                                          | `artifacts/ci/test.log`, `docs/DELIVERY_CAPABILITY_MATRIX_TH.md`                                                             |
| admin auth, step-up, session revoke, security events | `src/adminWebServer.js`, `src/admin/auth/adminAuthRuntime.js`, `src/utils/adminPermissionMatrix.js`                                                   | `test/admin-api.integration.test.js`, `test/admin-rbac.integration.test.js`                                                                                       | `artifacts/ci/test.log`                                                                                                      |
| admin tenant boundary helpers                        | `src/admin/adminTenantScope.js`                                                                                                                       | `test/admin-tenant-scope.test.js`, `test/admin-tenant-boundary.integration.test.js`                                                                               | `artifacts/ci/test.log`                                                                                                      |
| admin control-panel env registry and policy metadata | `src/config/adminEditableConfig.js`, `src/admin/runtime/adminControlPanelRuntime.js`                                                                  | `test/admin-editable-config.test.js`, `test/admin-api.integration.test.js`                                                                                        | `artifacts/ci/test.log`                                                                                                      |
| restore preview, compatibility, maintenance gate     | `src/services/adminSnapshotService.js`, `src/store/adminRestoreStateStore.js`                                                                         | `test/admin-snapshot-compatibility.test.js`, `test/admin-api.integration.test.js`                                                                                 | `artifacts/ci/test.log`                                                                                                      |
| runtime topology and readiness                       | `scripts/doctor.js`, `scripts/readiness-gate.js`, `scripts/doctor-topology.js`, `scripts/post-deploy-smoke.js`, `src/utils/runtimeStatus.js`          | `test/doctor.integration.test.js`, `test/readiness-gate.test.js`, `test/topology-doctor.test.js`, `test/post-deploy-smoke.test.js`, `test/runtime-status.test.js` | `artifacts/ci/doctor.log`, `artifacts/ci/readiness.log`, `artifacts/ci/smoke.log`, `artifacts/ci/verification-contract.json` |
| player portal mode                                   | `apps/web-portal-standalone/server.js`, `apps/web-portal-standalone/auth/portalAuthRuntime.js`, `apps/web-portal-standalone/runtime/portalRuntime.js` | `test/web-portal-standalone.player-mode.integration.test.js`, `test/portal-auth-runtime.test.js`, `test/portal-runtime.test.js`                                   | `artifacts/ci/test.log`                                                                                                      |
| secret hygiene and secret scan                       | `scripts/secret-scan.js`, `.githooks/pre-commit`, `.githooks/pre-push`                                                                                | `test/secret-scan.test.js`                                                                                                                                        | `artifacts/ci/security-check.log`                                                                                            |
| visual surface evidence                              | `scripts/capture-doc-evidence.js`, `scripts/build-doc-demo-gif.ps1`                                                                                   | local capture workflow                                                                                                                                            | `docs/assets/*.png`, `docs/assets/platform-demo.gif`                                                                         |

## Evidence Still Missing

ตอนนี้ repo ยังไม่มีหลักฐานชนิดนี้:

- screenshot player portal แบบ authenticated จริง
- live SCUM inventory proof สำหรับทุกกรณีของ delivery
- live `agent mode` evidence บนเครื่องที่มี SCUM window จริง
- watcher `ready` evidence จาก `SCUM.log` จริง

ดังนั้นห้ามอ้างว่ามีหลักฐานเหล่านี้ ถ้าไฟล์ยังไม่ถูก track ใน repo

## Reading Rules

- ถ้า claim ผูกกับ code path + test + artifact ได้ ให้ถือว่า `verified`
- ถ้า claim ผูกกับ code path ได้ แต่ยังไม่มี test หรือ artifact ให้ถือว่า `implemented`
- ถ้า claim ขึ้นกับ infrastructure ภายนอก ให้ถือว่า `runtime-dependent`
- ถ้าไม่มี code, test, หรือ artifact รองรับ ให้ถือว่า `planned`
