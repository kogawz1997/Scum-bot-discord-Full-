import React from "react";
import { WalletCards, ReceiptText } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function SubscriptionDetailPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const subscriptions = pickRecords(raw.subscriptions);
  const invoices = pickRecords(raw.invoices);
  const selected = pickRecord([subscriptions], recordId);
  const subscriptionId = selected?.id || selected?.subscriptionId || "";
  const tenantId = selected?.tenantId || selected?.tenant || "";
  const relatedInvoices = invoices.filter((invoice) => {
    const candidate = invoice.tenantId || invoice.customerId || invoice.tenant?.id || "";
    return tenantId && String(candidate) === String(tenantId);
  });

  const actions = tenantId ? (
    <Button variant="outline" onClick={() => onRun?.("gotoTenantDossier", { recordId: tenantId })}>
      <ReceiptText className="mr-2 h-4 w-4" /> Open Tenant Dossier
    </Button>
  ) : null;

  return (
    <PageLayout title="Subscription Detail" subtitle="Selected subscription, tenant linkage, and invoice evidence" icon={WalletCards} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Subscription ID" value={subscriptionId || "—"} compact />
        <StatCard label="Tenant" value={tenantId || "—"} compact />
        <StatCard label="Package" value={selected?.packageName || selected?.packageId || selected?.package || "—"} compact />
        <StatCard label="Status" value={selected?.status || "—"} compact tone={statusTone(selected?.status)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Selected Subscription" right={<ToneBadge tone={statusTone(selected?.status)}>{selected?.status || "unknown"}</ToneBadge>}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>

          <SimpleRecordList
            title="Tenant Invoice Evidence"
            items={relatedInvoices.slice(0, 8)}
            emptyTitle="No related invoices"
            emptyBody="No invoice rows matched this subscription's tenant."
            right={<ToneBadge tone={relatedInvoices.length ? "stable" : "locked"}>{relatedInvoices.length} rows</ToneBadge>}
            renderItem={(invoice, index) => (
              <CenteredRecordCard
                key={invoice.id || index}
                title={pickRecordTitle(invoice, "Invoice")}
                badge={<ToneBadge tone={statusTone(invoice.status)}>{invoice.status || "unknown"}</ToneBadge>}
                description={formatBackendTime(invoice.createdAt || invoice.issuedAt || invoice.date)}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <JsonPreviewCard title="Selected Subscription Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}
