import React, { useMemo, useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { DataEmptyState } from "../components/ui/data-empty-state";
import { Button } from "../components/ui/button";
import { Sparkline } from "../components/ui/chart";
import { SearchRail } from "../components/ui/search-rail";
import { formatBackendTime, formatCurrency } from "../lib/ui-helpers";

export function BillingPage({ data, source, live, recordId, onRun, errors }) {
  const invoices = data?.invoices || [];
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const query = search.toLowerCase();
    return invoices.filter((invoice) => {
      return (
        (invoice.tenant || "").toLowerCase().includes(query) ||
        (invoice.invoice || "").toLowerCase().includes(query) ||
        (invoice.status || "").toLowerCase().includes(query)
      );
    });
  }, [invoices, search]);

  const totalRevenue = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + (Number(invoice.amountValue || 0) || 0), 0);
  }, [invoices]);

  const revenueSeries = useMemo(() => {
    const buckets = new Map();

    invoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || invoice.issuedAt || invoice.date || Date.now());
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const amount = Number(invoice.amountValue || 0) || 0;
      buckets.set(key, (buckets.get(key) || 0) + amount);
    });

    return Array.from(buckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-14)
      .map(([, amount]) => amount);
  }, [invoices]);

  const pending = invoices.filter((invoice) => invoice.status === "pending" || invoice.status === "open").length;
  const overdue = invoices.filter((invoice) => invoice.status === "overdue" || invoice.status === "failed").length;

  const statusTone = (status) => {
    if (status === "paid") return "paid";
    if (status === "pending" || status === "open") return "pending";
    if (status === "overdue" || status === "failed") return "critical";
    return "neutral";
  };

  const actions = (
    <Button variant="outline" onClick={() => onRun("exportBillingLedger")}>
      <Download className="mr-2 h-4 w-4" /> Export Ledger
    </Button>
  );

  return (
    <PageLayout
      title="Billing Workspace"
      subtitle="Commercial oversight and revenue tracking"
      icon={CreditCard}
      rightActions={actions}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Total Revenue (Paid)</div>
              <div className="owner-kpi-value mt-2 text-2xl font-bold leading-none text-white">{formatCurrency(totalRevenue)}</div>
              <div className="mt-1.5 text-[11px] leading-5 text-zinc-500">Last 14d trend</div>
            </div>
            {revenueSeries.length > 0 ? (
              <div className="shrink-0 pt-1">
                <Sparkline data={revenueSeries} width={110} height={40} stroke="#10b981" />
              </div>
            ) : null}
          </div>
        </GlassCard>
        <StatCard label="Pending Invoices" value={pending} sub="Awaiting payment" spark="w-[40%] bg-amber-400" compact />
        <StatCard
          label="Overdue / Failed"
          value={overdue}
          sub="Needs attention"
          spark={`w-[${overdue > 0 ? "55" : "5"}%] bg-red-400`}
          compact
        />
      </div>

      <GlassCard>
        <SearchRail
          className="pb-4"
          label="Invoice search"
          summary={
            <>
              Showing <span className="font-semibold text-zinc-100">{filtered.length}</span> of {invoices.length}
            </>
          }
          placeholder="Search tenant, invoice ID, or status..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          activeCount={search ? 1 : 0}
          onClear={() => setSearch("")}
        />

        {filtered.length ? (
          <div className="overflow-auto rounded-xl border border-white/5">
            <div className="grid min-w-[700px] grid-cols-[200px_1fr_140px_120px_120px] bg-white/[0.04] px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <div>Invoice ID</div>
              <div>Tenant</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Status</div>
            </div>
            {filtered.slice(0, 20).map((invoice, index) => (
              <div
                key={invoice.invoice || index}
                className="grid min-w-[700px] grid-cols-[200px_1fr_140px_120px_120px] items-center border-t border-white/5 px-4 py-3 text-sm hover:bg-white/[0.02] cursor-pointer"
                onClick={() => onRun("gotoInvoiceDetail", { recordId: invoice.invoice })}
              >
                <div className="font-mono text-cyan-200">{invoice.invoice || "—"}</div>
                <div className="text-white">{invoice.tenant || "Unknown"}</div>
                <div className="text-zinc-400">{formatBackendTime(invoice.date)}</div>
                <div className="font-semibold text-white">{formatCurrency(invoice.amount)}</div>
                <ToneBadge tone={statusTone(invoice.status)}>{invoice.status || "unknown"}</ToneBadge>
              </div>
            ))}
          </div>
        ) : (
          <DataEmptyState
            title={search ? "No invoices match" : "No invoices yet"}
            body={search ? "Try a different search query." : "Invoices will appear here once billing activity begins."}
          />
        )}
      </GlassCard>
    </PageLayout>
  );
}
