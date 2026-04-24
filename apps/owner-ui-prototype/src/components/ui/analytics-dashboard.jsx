import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Zap, Users, AlertTriangle } from "lucide-react";
import { calculateMetrics, calculateHealthScore, getRevenueTrend, getPredictedChurn } from "../../lib/analytics";

export function AnalyticsDashboard({ data = {} }) {
  const metrics = calculateMetrics(data);
  const trend = getRevenueTrend(data.invoices || []);
  const churn = getPredictedChurn(data.tenants || []);

  // Ensure we have valid data
  const hasValidMetrics = metrics && Object.keys(metrics).length > 0;

  const kpis = [
    {
      label: "Health Score",
      value: `${hasValidMetrics ? metrics.healthScore : "—"}%`,
      change: hasValidMetrics && metrics.healthScore > 80 ? "+5" : hasValidMetrics ? "-3" : "—",
      positive: hasValidMetrics && metrics.healthScore > 80,
      icon: Activity,
    },
    {
      label: "Uptime",
      value: `${hasValidMetrics ? metrics.uptime : "—"}%`,
      change: hasValidMetrics ? "+2.1" : "—",
      positive: true,
      icon: Zap,
    },
    {
      label: "Active Tenants",
      value: hasValidMetrics ? metrics.tenantActive : "—",
      change: hasValidMetrics ? `+${metrics.tenantActive}` : "—",
      positive: true,
      icon: Users,
    },
    {
      label: "At Risk",
      value: hasValidMetrics ? metrics.tenantAtRisk : "—",
      change: hasValidMetrics && metrics.tenantAtRisk === 0 ? "Good" : hasValidMetrics ? `⚠️ ${metrics.tenantAtRisk}` : "—",
      positive: hasValidMetrics && metrics.tenantAtRisk === 0,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-cyan-400/25"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-30 blur-xl" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.4), transparent)" }} />
              <div className="relative flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{kpi.label}</span>
                <Icon className="h-4 w-4 text-cyan-300 opacity-60" />
              </div>
              <div className="relative mt-3 text-2xl font-black text-white">{kpi.value}</div>
              <div className={`relative mt-1 flex items-center gap-1 text-xs ${kpi.positive ? "text-emerald-300" : "text-red-300"}`}>
                {kpi.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{kpi.change}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4"
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Revenue Trend (Last 30 Days)</h3>
          <p className="mt-1 text-xs text-zinc-500">Daily invoice amounts</p>
        </div>
        <div className="flex h-24 items-end gap-1">
          {trend.length === 0 ? (
            <div className="flex w-full items-center justify-center text-xs text-zinc-500">No data</div>
          ) : (
            trend.map((amount, i) => {
              const max = Math.max(...trend);
              const height = max === 0 ? 0 : (amount / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-400 to-cyan-300 opacity-70 hover:opacity-100 transition"
                  style={{ height: `${height}%`, minHeight: "4px" }}
                  title={`฿${amount.toLocaleString()}`}
                />
              );
            })
          )}
        </div>
      </motion.div>

      {/* Churn Risk */}
      {churn.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <div>
              <h3 className="text-sm font-semibold text-amber-100">{churn.length} tenant(s) at churn risk</h3>
              <p className="mt-0.5 text-xs text-amber-200">Trial or overdue subscriptions detected</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {churn.slice(0, 3).map((t) => (
              <div key={t.id} className="text-xs text-amber-100">
                • <span className="font-medium">{t.name}</span> ({t.subscriptionStatus})
              </div>
            ))}
            {churn.length > 3 && <div className="text-xs text-amber-200">+{churn.length - 3} more</div>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
