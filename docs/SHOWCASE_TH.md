# Demo Notes

This file is not the source of truth for system status.

Use it only for demos, walkthroughs, or review sessions. For status and verification, use:

- [README.md](../README.md)
- [PROJECT_HQ.md](../PROJECT_HQ.md)
- [VERIFICATION_STATUS_TH.md](./VERIFICATION_STATUS_TH.md)
- [EVIDENCE_MAP_TH.md](./EVIDENCE_MAP_TH.md)

## What Can Be Shown

- Admin runtime overview
- Control panel and raw config split
- Security events and active session management
- Backup / restore preview
- Player portal login, wallet, purchase history, redeem, and Steam link

## Suggested Demo Order

1. Open the admin dashboard and check runtime status first
2. Show security events, sessions, and step-up protected actions
3. Show the control panel and which settings are still env-only
4. Show restore preview and current guardrails
5. Open the player portal and show wallet/history/redeem/profile flows
6. Open CI artifacts or evidence docs next to the UI

## Recommended Supporting Evidence

- `artifacts/ci/verification-summary.md`
- `artifacts/ci/smoke.log`
- `docs/LIMITATIONS_AND_SLA_TH.md`
- `docs/MIGRATION_ROLLBACK_POLICY_TH.md`

## What Not To Overstate

- Do not claim full tenant isolation
- Do not claim every runtime/config setting is editable from the web UI
- Do not claim `agent` execution works without a real Windows session and SCUM client
- Do not describe restore as fully automatic rollback
- Do not describe SQLite as a multi-instance production target
