import React from "react";
import { LifeBuoy, Download } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function SupportContextPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const deliveryRows = pickRecords(raw.deliveryLifecycle);
  const requestErrors = pickRecords(raw.observabilityErrors);
  const notifications = pickRecords(raw.notifications);
  const purchases = pickRecords(raw.purchaseList);
  const selected = pickRecord([deliveryRows, purchases, notifications, requestErrors], recordId);
  const tenantId = selected?.tenantId || selected?.tenant || selected?.tenantSlug || "";

  const actions = tenantId ? (
    <Button variant="outline" onClick={() => onRun?.("exportSupportCase", { tenantId })}>
      <Download className="mr-2 h-4 w-4" /> Export Support Case
    </Button>
  ) : null;

  return (
    <PageLayout title="Support Context" subtitle="Selected tenant support evidence across delivery, billing, and notifications" icon={LifeBuoy} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Delivery Rows" value={deliveryRows.length} compact />
        <StatCard label="Request Errors" value={requestErrors.length} compact tone={requestErrors.length ? "warning" : "healthy"} />
        <StatCard label="Notifications" value={notifications.length} compact />
        <StatCard label="Purchases" value={purchases.length} compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Selected Support Record" right={<ToneBadge tone={statusTone(selected?.status || selected?.state || selected?.severity)}>{selected?.status || selected?.state || selected?.severity || "record"}</ToneBadge>}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>

          <SimpleRecordList
            title="Related Notifications"
            items={notifications.filter((row) => !tenantId || String(row.tenantId || row.tenant || "") === String(tenantId)).slice(0, 8)}
            emptyTitle="No related notifications"
            emptyBody="No notification rows matched the selected tenant context."
            right={<ToneBadge tone={notifications.length ? "warning" : "healthy"}>{notifications.length} rows</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Notification")}
                badge={<ToneBadge tone={statusTone(item.status || item.severity)}>{item.status || item.severity || "signal"}</ToneBadge>}
                description={formatBackendTime(item.createdAt || item.updatedAt || item.at)}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <JsonPreviewCard title="Selected Support Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}
