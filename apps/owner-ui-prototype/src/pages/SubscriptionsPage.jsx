import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, ChevronRight, RefreshCcw } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { DataEmptyState } from "../components/ui/data-empty-state";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { SearchRail } from "../components/ui/search-rail";
import { formatBackendTime } from "../lib/ui-helpers";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "active";
  if (s === "trial") return "pending";
  if (s === "past_due") return "warning";
  if (s === "expired" || s === "cancelled" || s === "canceled") return "critical";
  return "neutral";
}

export function SubscriptionsPage({ data, source, live, onRun, errors }) {
  const raw = data?.raw || {};
  const rawSubs = raw.subscriptions?.items || raw.subscriptions?.rows || raw.subscriptions || data?.subscriptions || [];
  const subs = Array.isArray(rawSubs) ? rawSubs : [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return subs.filter((sub) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const haystack = `${sub.tenantId || ""} ${sub.tenant || ""} ${sub.packageId || ""} ${sub.package || ""} ${sub.status || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (statusFilter !== "all") {
        if (!String(sub.status || "").toLowerCase().includes(statusFilter)) return false;
      }

      return true;
    });
  }, [subs, search, statusFilter]);

  const counts = useMemo(() => {
    const next = { active: 0, trial: 0, pastDue: 0, cancelled: 0 };
    subs.forEach((sub) => {
      const status = String(sub.status || "").toLowerCase();
      if (status === "active") next.active += 1;
      else if (status === "trial") next.trial += 1;
      else if (status === "past_due") next.pastDue += 1;
      else if (status === "cancelled" || status === "canceled" || status === "expired") next.cancelled += 1;
    });
    return next;
  }, [subs]);

  const mrr = useMemo(() => {
    return subs
      .filter((sub) => String(sub.status || "").toLowerCase() === "active")
      .reduce((sum, sub) => sum + (Number(sub.mrr || sub.amount || 0) || 0), 0);
  }, [subs]);

  const actions = (
    <>
      <Button variant="outline" onClick={() => onRun("refresh")}>
        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refresh
      </Button>
      <Button primary onClick={() => onRun("createSubscription")}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> New Subscription
      </Button>
    </>
  );

  return (
    <PageLayout
      title="Subscription Registry"
      subtitle={`${subs.length} subscriptions - MRR tracking`}
      icon={Wallet}
      rightActions={actions}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Active" value={counts.active} icon={Wallet} tone="healthy" spark="w-[82%] bg-emerald-400" compact />
        <StatCard label="Trial" value={counts.trial} sub="Evaluation period" spark="w-[42%] bg-sky-400" compact />
        <StatCard
          label="Past Due"
          value={counts.pastDue}
          tone="warning"
          sub="Payment overdue"
          spark={`w-[${Math.min(counts.pastDue * 20, 90)}%] bg-amber-400`}
          compact
        />
        <StatCard
          label="MRR (THB)"
          value={`฿${mrr.toLocaleString()}`}
          sub="Monthly recurring"
          spark="w-[70%] bg-cyan-400"
          compact
        />
      </div>

      <GlassCard>
        <SearchRail
          label="Subscription search"
          summary={
            <>
              Showing <span className="font-semibold text-zinc-100">{filtered.length}</span> of {subs.length}
            </>
          }
          placeholder="Search tenant, package, status..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          activeCount={(search ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}
          onClear={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          controls={
            <label className="flex min-w-[148px] flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Status</span>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="h-10 rounded-xl px-3 text-[12px]"
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "trial", label: "Trial" },
                  { value: "past_due", label: "Past due" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </label>
          }
        />
      </GlassCard>

      {filtered.length === 0 ? (
        <DataEmptyState
          title={search || statusFilter !== "all" ? "No subscriptions match" : "No subscriptions"}
          body="Subscriptions appear here once customers subscribe."
        />
      ) : (
        <GlassCard className="p-0">
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold">Renews</th>
                  <th className="px-4 py-3 font-semibold">MRR</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((sub, index) => (
                  <motion.tr
                    key={sub.id || index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.25) }}
                    onClick={() => onRun("gotoSubscriptionDetail", { recordId: sub.id })}
                    className="owner-table-row cursor-pointer border-b border-white/[0.04] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-white">{sub.tenantName || sub.tenantId || sub.tenant || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{sub.packageName || sub.packageId || sub.package || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{formatBackendTime(sub.startedAt || sub.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{formatBackendTime(sub.renewsAt || sub.expiresAt)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-white">
                      {sub.mrr ? `฿${Number(sub.mrr).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ToneBadge tone={statusTone(sub.status)}>{sub.status || "—"}</ToneBadge>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </PageLayout>
  );
}
