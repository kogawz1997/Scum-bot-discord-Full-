import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  Truck,
  Server,
  Shield,
  LifeBuoy,
  Plus,
  RefreshCcw,
  Activity,
  Radio,
} from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { SectionTitle } from "../components/ui/section-title";
import { Button } from "../components/ui/button";
import { Sparkline, BarChart, DonutChart } from "../components/ui/chart";
import { generateRecommendations, getRecommendationColor } from "../lib/recommendations";
import { AnalyticsDashboard } from "../components/ui/analytics-dashboard";

function MetricTile({ label, value, sub, tone = "default", onClick }) {
  const toneBg = {
    default: "border-white/5 bg-white/[0.02]",
    ok: "border-emerald-500/20 bg-emerald-500/[0.05]",
    warn: "border-amber-500/25 bg-amber-500/[0.05]",
    danger: "border-red-500/25 bg-red-500/[0.06]",
    info: "border-sky-500/25 bg-sky-500/[0.05]",
  }[tone];
  const valueColor = {
    default: "text-white",
    ok: "text-emerald-300",
    warn: "text-amber-300",
    danger: "text-red-300",
    info: "text-sky-300",
  }[tone];
  return (
    <motion.div
      whileHover={onClick ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`rounded-xl border px-4 py-3.5 transition-colors ${toneBg} ${onClick ? "cursor-pointer hover:border-white/15" : ""}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className={`owner-kpi-value mt-2 text-2xl font-bold leading-none ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] leading-5 text-zinc-500">{sub}</div>}
    </motion.div>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
      {children}
    </div>
  );
}

const fmtTHB = (n) => "฿" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

export function OverviewPage({ data, source, live, onRun, errors }) {
  const overview = data?.overview || {};
  const stats = overview.stats || {};
  const stream = overview.tacticalStream || [];
  const tenants = data?.tenants || [];
  const invoices = data?.invoices || [];
  const incidents = data?.incidents || [];
  const securityEvents = data?.securityEvents || [];
  const subscriptions = data?.subscriptions || [];

  const tenantCounts = useMemo(() => {
    const counts = { total: tenants.length, active: 0, preview: 0, trial: 0, suspended: 0, atRisk: 0 };
    tenants.forEach((t) => {
      const s = String(t.status || t.state || "").toLowerCase();
      if (s.includes("active")) counts.active++;
      else if (s.includes("preview")) counts.preview++;
      else if (s.includes("trial")) counts.trial++;
      else if (s.includes("suspend")) counts.suspended++;
      const risk = String(t.riskLevel || t.risk || "").toLowerCase();
      if (risk === "high" || risk === "critical") counts.atRisk++;
    });
    return counts;
  }, [tenants]);

  const revenue = useMemo(() => {
    const total = invoices.reduce((sum, inv) => {
      const v = Number(inv.amountValue || inv.total || inv.amountDue || 0);
      return Number.isFinite(v) ? sum + v : sum;
    }, 0);
    const unpaid = invoices.filter((inv) => /unpaid|failed|past_due|pending/i.test(String(inv.status || ""))).length;
    const failed = invoices.filter((inv) => /failed/i.test(String(inv.status || ""))).length;
    const activeSubs = subscriptions.filter((s) => /active|trial/i.test(String(s.status || ""))).length;
    return { total, unpaid, failed, activeSubs };
  }, [invoices, subscriptions]);

  const deliveryAgents = stats.deliveryAgents || { total: 0, online: 0, latent: 0 };
  const serverBots = stats.serverBots || { total: 0, active: 0, stale: 0 };

  const atRisk = useMemo(() => {
    return tenants
      .filter((t) => {
        const risk = String(t.riskLevel || t.risk || "").toLowerCase();
        return risk === "high" || risk === "critical";
      })
      .slice(0, 6);
  }, [tenants]);

  const platformDegraded = deliveryAgents.latent > 0 || serverBots.stale > 0 || revenue.unpaid > 0 || stream.some((e) => e[3] === "degraded" || e[3] === "failed");

  const revenueSeries = useMemo(() => {
    const buckets = new Map();
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt || inv.issuedAt || inv.date || Date.now());
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const amount = Number(inv.amountValue || inv.total || inv.amountDue || 0) || 0;
      buckets.set(key, (buckets.get(key) || 0) + amount);
    });
    const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    if (sorted.length === 0) {
      return Array.from({ length: 14 }, () => 0);
    }
    return sorted.map(([, v]) => v);
  }, [invoices]);

  const runtimeBars = useMemo(() => [
    { label: "DA on", value: deliveryAgents.online || 0 },
    { label: "DA off", value: deliveryAgents.latent || 0 },
    { label: "SB on", value: serverBots.active || 0 },
    { label: "SB off", value: serverBots.stale || 0 },
  ], [deliveryAgents, serverBots]);

  const tenantSegments = useMemo(() => [
    { label: "Active", value: tenantCounts.active, color: "#10b981" },
    { label: "Preview", value: tenantCounts.preview, color: "#38bdf8" },
    { label: "Trial", value: tenantCounts.trial, color: "#a78bfa" },
    { label: "Suspended", value: tenantCounts.suspended, color: "#64748b" },
  ], [tenantCounts]);

  const riskReasons = [];
  if (deliveryAgents.latent > 0) riskReasons.push(`${deliveryAgents.latent} Delivery agent offline`);
  if (serverBots.stale > 0) riskReasons.push(`${serverBots.stale} Server Bot offline`);
  if (revenue.unpaid > 0) riskReasons.push(`${revenue.unpaid} unpaid invoice(s)`);
  if (securityEvents.length > 0) riskReasons.push(`${securityEvents.length} security event(s)`);

  const actions = (
    <>
      <Button variant="outline" onClick={() => onRun("refresh")}>
        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refresh
      </Button>
      <Button primary onClick={() => onRun("gotoTenants")}>
        <Users className="mr-1.5 h-3.5 w-3.5" /> Manage Tenants
      </Button>
    </>
  );

  return (
    <PageLayout title="Owner Command Center" subtitle="Global supervision, risk posture, and platform movement" icon={LayoutDashboard} rightActions={actions}>
      {/* Risk Banner */}
      {platformDegraded && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-transparent p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white">
              Platform is <span className="text-amber-300">Degraded</span>
              {riskReasons.length ? ` — ${riskReasons.length} issue(s) need attention` : ""}
            </div>
            <div className="mt-0.5 text-xs text-zinc-400">
              {riskReasons.length ? riskReasons.join(" · ") : "Owner API slices show transient issues."}
            </div>
          </div>
          <Button variant="outline" onClick={() => onRun("gotoFleet")}>
            Runtime Health
          </Button>
          <Button primary onClick={() => onRun("gotoIncidents")}>
            Incidents <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}

      {/* Analytics Dashboard */}
      <AnalyticsDashboard data={data} />

      {/* Tenant Health */}
      <div>
        <SectionHeader>Tenant Health</SectionHeader>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <MetricTile label="Total" value={tenantCounts.total} onClick={() => onRun("gotoTenants")} />
          <MetricTile label="Active" value={tenantCounts.active} tone="ok" />
          <MetricTile label="Preview" value={tenantCounts.preview} tone="info" />
          <MetricTile label="Trial" value={tenantCounts.trial} tone="info" />
          <MetricTile label="Suspended" value={tenantCounts.suspended} />
          <MetricTile label="At risk" value={tenantCounts.atRisk} tone="danger" onClick={() => onRun("gotoTenants")} />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard
          title={<span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-cyan-300" /> Revenue trend</span>}
          description="Last 14 days · THB"
        >
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <div className="owner-kpi-value text-2xl font-bold text-white">{fmtTHB(revenue.total)}</div>
              <div className="mt-1 text-[11px] text-zinc-500">{revenue.activeSubs} active subscriptions</div>
            </div>
            <div className="flex-1 max-w-[200px]">
              <Sparkline data={revenueSeries} width={200} height={48} stroke="#22d3ee" />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          title={<span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-cyan-300" /> Tenant mix</span>}
          description={`${tenantCounts.total} total communities`}
        >
          <div className="flex items-center gap-4">
            <DonutChart
              segments={tenantSegments}
              size={104}
              thickness={12}
              centerLabel="Total"
              centerValue={tenantCounts.total}
            />
            <div className="flex-1 space-y-1.5">
              {tenantSegments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-zinc-400">{s.label}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-zinc-200">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard
          title={<span className="flex items-center gap-2"><Server className="h-3.5 w-3.5 text-cyan-300" /> Runtime fleet</span>}
          description="Delivery agents · Server bots"
        >
          <BarChart data={runtimeBars} height={120} color="#38bdf8" />
        </GlassCard>
      </div>

      {/* Revenue + Runtime */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <SectionHeader>Revenue Health</SectionHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile label="Revenue" value={fmtTHB(revenue.total)} sub={`${revenue.activeSubs} active subs`} />
            <MetricTile label="Unpaid" value={revenue.unpaid} tone="warn" onClick={() => onRun("gotoBilling")} />
            <MetricTile label="Failed" value={revenue.failed} tone="danger" />
          </div>
        </div>
        <div>
          <SectionHeader>Runtime Health</SectionHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile
              label="Delivery"
              value={`${deliveryAgents.online}/${deliveryAgents.total || 0}`}
              tone={deliveryAgents.latent > 0 ? "warn" : "ok"}
              sub="execute_only"
            />
            <MetricTile
              label="Server Bots"
              value={`${serverBots.active}/${serverBots.total || 0}`}
              tone={serverBots.stale > 0 ? "danger" : "ok"}
              sub="sync_only"
              onClick={() => onRun("gotoFleet")}
            />
            <MetricTile label="Security" value={stats.securityScore ?? "—"} tone={stats.securityScore < 80 ? "warn" : "ok"} sub="score" />
          </div>
        </div>
      </div>

      {/* At-risk tenants + Tactical stream */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <GlassCard
          title="At-risk tenants"
          right={
            <button onClick={() => onRun("gotoTenants")} className="text-[11px] text-cyan-300 hover:text-cyan-200">
              View all →
            </button>
          }
        >
          {atRisk.length === 0 ? (
            <div className="py-8 text-sm text-zinc-500">No tenants flagged as at-risk.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {atRisk.map((t, i) => (
                <div
                  key={t.id || i}
                  onClick={() => onRun("gotoTenantDossier", { recordId: t.id || t.tenantId })}
                  className="owner-table-row flex cursor-pointer items-center gap-3 py-2.5"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{t.name || t.tenantName || t.id}</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{t.slug || t.id}</div>
                  </div>
                  <ToneBadge tone="critical">{String(t.riskLevel || t.risk || "high").toUpperCase()}</ToneBadge>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard title="Operations Risk Queue">
          {stream.length === 0 ? (
            <div className="py-8 text-sm text-zinc-500">All systems nominal.</div>
          ) : (
            <div className="space-y-2.5">
              {stream.slice(0, 6).map((event, idx) => {
                const [category, src, msg, tone] = event;
                const toneMap = { degraded: "warning", failed: "failed", flagged: "warning", success: "healthy" };
                return (
                  <div key={idx} className="flex items-start gap-2.5">
                    <ToneBadge tone={toneMap[tone] || "neutral"} dot>
                      {category}
                    </ToneBadge>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-zinc-200">{msg}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-600">{src}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recommendations */}
      <GlassCard title="🤖 Recommendations" description="Suggested actions based on your data">
        {(() => {
          const recs = generateRecommendations(data);
          return recs.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">All systems healthy — no actions needed!</div>
          ) : (
            <div className="space-y-2.5">
              {recs.slice(0, 5).map((rec) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-lg border p-3 transition-colors ${getRecommendationColor(rec.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{rec.title}</div>
                      <div className="mt-1 text-xs leading-5 opacity-85">{rec.description}</div>
                      {rec.action && (
                        <button
                          onClick={() => onRun("gotoPage", rec.action)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        >
                          {rec.action.label} <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {recs.length > 5 && (
                <div className="pt-2 text-center text-xs text-zinc-500">+{recs.length - 5} more recommendations</div>
              )}
            </div>
          );
        })()}
      </GlassCard>

      {/* Security + Support + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard title={<span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-cyan-300" /> Security snapshot</span>}>
          {securityEvents.length === 0 ? (
            <div className="py-4 text-xs text-zinc-500">No recent events.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {securityEvents.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.severity === "high" ? "bg-red-400" : "bg-amber-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-zinc-200">{s.type || s.event || "Security event"}</div>
                    <div className="truncate text-[10px] text-zinc-500">{s.tenantId || s.ip || "platform"}</div>
                  </div>
                  <ToneBadge tone={s.severity === "high" ? "critical" : "warning"}>{(s.severity || "low").toUpperCase()}</ToneBadge>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard title={<span className="flex items-center gap-2"><LifeBuoy className="h-3.5 w-3.5 text-cyan-300" /> Support snapshot</span>}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Open incidents</span>
              <span className="text-lg font-bold tabular-nums text-white">{incidents.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">High priority</span>
              <ToneBadge tone="critical">
                {incidents.filter((i) => /high|critical/i.test(String(i.severity || ""))).length}
              </ToneBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Active tactical events</span>
              <ToneBadge tone="warning">{stream.length}</ToneBadge>
            </div>
            {incidents.slice(0, 2).map((i, idx) => (
              <div key={idx} className="border-t border-white/5 pt-2 text-[11px]">
                <div className="truncate text-zinc-200">{i.title || i.summary || "Incident"}</div>
                <div className="mt-0.5 text-zinc-600">{i.startedAt || i.createdAt || ""}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title={<span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-cyan-300" /> Quick actions</span>}>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start" onClick={() => onRun("gotoCreateTenant")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Tenant
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onRun("gotoPackages")}>
              <Package className="mr-1.5 h-3.5 w-3.5" /> Package
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onRun("gotoFleet")}>
              <Truck className="mr-1.5 h-3.5 w-3.5" /> Delivery
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onRun("gotoFleet")}>
              <Server className="mr-1.5 h-3.5 w-3.5" /> Server Bot
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onRun("gotoSupport")}>
              <LifeBuoy className="mr-1.5 h-3.5 w-3.5" /> Support
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onRun("gotoObservability")}>
              <Radio className="mr-1.5 h-3.5 w-3.5" /> Diagnostics
            </Button>
          </div>
        </GlassCard>
      </div>

      <div className="pt-2 text-right text-[11px] text-zinc-600">
        Source: <span className="font-mono text-zinc-500">{source || "—"}</span>
        {live === false && <span className="ml-2 text-amber-400">· offline fallback</span>}
      </div>
    </PageLayout>
  );
}
