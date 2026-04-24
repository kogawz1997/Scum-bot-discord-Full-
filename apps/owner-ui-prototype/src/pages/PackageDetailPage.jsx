import React from "react";
import { Boxes, PackageCheck } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatCurrency, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function PackageDetailPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const packageCatalog = pickRecords(raw.packageCatalog);
  const licenses = pickRecords(raw.licenses);
  const subscriptions = pickRecords(raw.subscriptions);
  const selected = pickRecord([packageCatalog, licenses], recordId);
  const packageKey = selected?.sku || selected?.packageId || selected?.id || selected?.name || "";
  const relatedSubscriptions = subscriptions.filter((item) => {
    const candidate = item.packageId || item.packageName || item.package || "";
    return packageKey && String(candidate) === String(packageKey);
  });

  const actions = packageKey ? (
    <Button variant="outline" onClick={() => onRun?.("updatePackage", { packageId: packageKey })}>
      <PackageCheck className="mr-2 h-4 w-4" /> Update Package
    </Button>
  ) : null;

  return (
    <PageLayout title="Package Detail" subtitle="Selected package, licenses, and linked subscription evidence" icon={Boxes} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Package Key" value={packageKey || "—"} compact />
        <StatCard label="Price" value={selected ? formatCurrency(selected.price || selected.amount, selected.currency || "THB") : "—"} compact />
        <StatCard label="Features" value={Array.isArray(selected?.features) ? selected.features.length : Array.isArray(selected?.tags) ? selected.tags.length : 0} compact />
        <StatCard label="Subscriptions" value={relatedSubscriptions.length} compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Selected Package" right={<ToneBadge tone={statusTone(selected?.status || selected?.tier)}>{selected?.status || selected?.tier || "package"}</ToneBadge>}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>

          <SimpleRecordList
            title="Linked Subscriptions"
            items={relatedSubscriptions.slice(0, 8)}
            emptyTitle="No linked subscriptions"
            emptyBody="No subscription rows matched the selected package."
            right={<ToneBadge tone={relatedSubscriptions.length ? "stable" : "locked"}>{relatedSubscriptions.length} rows</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Subscription")}
                badge={<ToneBadge tone={statusTone(item.status)}>{item.status || "unknown"}</ToneBadge>}
                description={item.tenantId || item.tenantName || item.tenant || "No tenant link"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <JsonPreviewCard title="Selected Package Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}
