import React from "react";
import { ReceiptText, CreditCard } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, formatCurrency, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function InvoiceDetailPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const invoices = pickRecords(raw.invoices);
  const paymentAttempts = pickRecords(raw.paymentAttempts);
  const selected = pickRecord([invoices], recordId);
  const selectedInvoiceId = selected?.invoiceId || selected?.invoice || selected?.id || "";
  const relatedAttempts = paymentAttempts.filter((attempt) => {
    const invoiceId = attempt.invoiceId || attempt.invoice || attempt.targetId || "";
    return selectedInvoiceId && String(invoiceId) === String(selectedInvoiceId);
  });

  const actions = selectedInvoiceId ? (
    <Button variant="outline" onClick={() => onRun?.("createCheckoutSession", { invoiceId: selectedInvoiceId })}>
      <CreditCard className="mr-2 h-4 w-4" /> Open Checkout Session
    </Button>
  ) : null;

  return (
    <PageLayout title="Invoice Detail" subtitle="Selected invoice, linked payment attempts, and raw billing evidence" icon={ReceiptText} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Invoice ID" value={selectedInvoiceId || "—"} compact />
        <StatCard label="Amount" value={selected ? formatCurrency(selected.amountValue || selected.amount, selected.currency || "THB") : "—"} compact />
        <StatCard label="Attempts" value={relatedAttempts.length} compact />
        <StatCard label="Status" value={selected?.status || "—"} compact tone={statusTone(selected?.status)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Selected Invoice" right={<ToneBadge tone={statusTone(selected?.status)}>{selected?.status || "unknown"}</ToneBadge>}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>

          <SimpleRecordList
            title="Linked Payment Attempts"
            items={relatedAttempts}
            emptyTitle="No payment attempts"
            emptyBody="No payment-attempt rows matched the selected invoice."
            right={<ToneBadge tone={relatedAttempts.length ? "warning" : "locked"}>{relatedAttempts.length} rows</ToneBadge>}
            renderItem={(attempt, index) => (
              <CenteredRecordCard
                key={attempt.id || index}
                title={pickRecordTitle(attempt, "Payment attempt")}
                badge={<ToneBadge tone={statusTone(attempt.status || attempt.state)}>{attempt.status || attempt.state || "unknown"}</ToneBadge>}
                description={formatBackendTime(attempt.createdAt || attempt.updatedAt || attempt.startedAt)}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <JsonPreviewCard title="Selected Invoice Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}
