# Restart Announcement Preset

This runbook turns a common tenant workflow into one predictable path:

- review delivery posture
- announce downtime once
- run the deeper maintenance flow only when needed
- verify delivery again before saying the platform is back

Use it when the operator question is:

- "We need to restart soon. What is the safe communication order?"
- "How do we avoid mixing restart messages and delivery recovery at the same time?"

## Where To Start

- Tenant console: `Support Tools` -> `Support Toolkit`
- Tenant console: `Support Tools` -> `Restart + Maintenance Preset`
- Owner console: `Tenant Fleet` -> `Support Toolkit` when helping a tenant operator remotely

The preset intentionally stays shallow. The actual maintenance workflow still falls back to the existing delivery workbench.

## Recommended Order

1. Review delivery lifecycle first

   - Open `Commerce + Delivery`
   - Check queue depth, dead-letter count, overdue work, and poison candidates
   - If delivery is already unhealthy, gather a delivery case before announcing downtime

2. Use one communication path

   - Open the restart preset or legacy delivery workbench
   - Avoid mixing ad hoc restart messages across multiple operator tools

3. Enter maintenance or restart mode

   - Use the existing restart / maintenance flow in the legacy delivery workbench
   - Keep one operator responsible for the announcement and follow-up

4. Recheck delivery after maintenance

   - Return to `Delivery Lifecycle`
   - Open `Delivery Case` for any reported purchase code
   - Use `Delivery Lab` only if runtime review suggests it is needed

5. Reopen with evidence
   - Confirm queue pressure is under control
   - Confirm dead-letter count is not growing
   - Only then communicate that the service is back

## What Not To Do

- Do not announce restart timing before checking delivery posture
- Do not bulk-retry queue or dead-letter work blindly during maintenance
- Do not say the tenant is healthy again without a post-maintenance delivery check

## Related Docs

- [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md)
- [DELIVERY_CAPABILITY_MATRIX_TH.md](./DELIVERY_CAPABILITY_MATRIX_TH.md)
- [LIMITATIONS_AND_SLA_TH.md](./LIMITATIONS_AND_SLA_TH.md)
