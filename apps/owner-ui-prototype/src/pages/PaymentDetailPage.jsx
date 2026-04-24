import React from "react";
import { HandCoins, ReceiptText } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function PaymentDetailPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const paymentAttempts = pickRecords(raw.paymentAttempts);
  const invoices = pickRecords(raw.invoices);
  const selected = pickRecord([paymentAttempts], recordId);
  const linkedInvoice = invoices.find((invoice) => {
    const invoiceId = invoice.invoiceId || invoice.invoice || invoice.id || "";
    const candidate = selected?.invoiceId || selected?.invoice || selected?.targetId || "";
    return candidate && String(invoiceId) === String(candidate);
  });

  const actions = linkedInvoice ? (
    <Button variant="outline" onClick={() => onRun?.("gotoInvoiceDetail", { recordId: linkedInvoice.invoiceId || linkedInvoice.invoice || linkedInvoice.id })}>
      <ReceiptText className="mr-2 h-4 w-4" /> Open Invoice
    </Button>
  ) : null;

  return (
    <PageLayout title="Payment Attempt Detail" subtitle="Selected payment-attempt payload and linked invoice evidence" icon={HandCoins} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Attempt ID" value={selected?.paymentAttemptId || selected?.id || "—"} compact />
        <StatCard label="Invoice" value={selected?.invoiceId || selected?.invoice || "—"} compact />
        <StatCard label="Status" value={selected?.status || "—"} compact tone={statusTone(selected?.status)} />
        <StatCard label="Linked Invoice" value={linkedInvoice ? "yes" : "no"} compact tone={linkedInvoice ? "healthy" : "warning"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Selected Payment Attempt" right={<ToneBadge tone={statusTone(selected?.status)}>{selected?.status || "unknown"}</ToneBadge>}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>

          <SimpleRecordList
            title="Linked Invoice Evidence"
            items={linkedInvoice ? [linkedInvoice] : []}
            emptyTitle="No linked invoice"
            emptyBody="No invoice row matched the selected payment attempt."
            right={<ToneBadge tone={linkedInvoice ? "stable" : "locked"}>{linkedInvoice ? 1 : 0} row</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Invoice")}
                badge={<ToneBadge tone={statusTone(item.status)}>{item.status || "unknown"}</ToneBadge>}
                description={item.tenantName || item.tenantId || item.customerName || "No tenant info"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <JsonPreviewCard title="Selected Payment Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}
