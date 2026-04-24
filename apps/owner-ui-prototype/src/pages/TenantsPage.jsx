import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, ChevronRight, RefreshCcw, Wifi, WifiOff } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { DataEmptyState } from "../components/ui/data-empty-state";
import { SearchRail } from "../components/ui/search-rail";

function StatusDot({ status }) {
  const color = {
    online: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]",
    active: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]",
    offline: "bg-red-400",
    suspended: "bg-zinc-500",
    preview: "bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.15)]",
    trial: "bg-sky-400",
    degraded: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]",
  }[String(status || "").toLowerCase()] || "bg-zinc-600";

  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("active") || normalized === "online" || normalized === "paid") return "active";
  if (normalized.includes("suspend") || normalized === "offline" || normalized.includes("fail")) return "critical";
  if (normalized.includes("preview") || normalized.includes("trial")) return "pending";
  if (normalized.includes("past") || normalized.includes("degrad") || normalized.includes("warn")) return "warning";
  return "neutral";
}

function riskTone(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "failed";
  if (normalized === "medium") return "warning";
  if (normalized === "low") return "locked";
  return "neutral";
}

function packageTone(pkg) {
  const normalized = String(pkg || "").toLowerCase();
  if (normalized.includes("enterprise")) return "active";
  if (normalized.includes("pro")) return "healthy";
  return "locked";
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[148px] flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <Select value={value} onValueChange={onChange} className="h-10 rounded-xl px-3 text-[12px]" options={options} />
    </label>
  );
}

export function TenantsPage({ data, source, live, onRun }) {
  const tenants = data?.tenants || [];
  const packages = data?.packages || [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (query) {
        const haystack = `${tenant.name || ""} ${tenant.slug || ""} ${tenant.id || ""} ${tenant.code || ""} ${tenant.ownerEmail || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (statusFilter !== "all") {
        const normalizedStatus = String(tenant.status || "").toLowerCase();
        if (!normalizedStatus.includes(statusFilter)) return false;
      }

      if (packageFilter !== "all") {
        const normalizedPackage = String(tenant.package || tenant.pkg || tenant.tier || "").toLowerCase();
        if (!normalizedPackage.includes(packageFilter.toLowerCase())) return false;
      }

      if (riskFilter !== "all") {
        const normalizedRisk = String(tenant.riskLevel || tenant.risk || "").toLowerCase();
        if (normalizedRisk !== riskFilter) return false;
      }

      return true;
    });
  }, [tenants, search, statusFilter, packageFilter, riskFilter]);

  const activeFilters = [statusFilter, packageFilter, riskFilter].filter((value) => value !== "all").length + (search ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    setStatusFilter("all");
    setPackageFilter("all");
    setRiskFilter("all");
  };

  const actions = (
    <>
      <Button variant="outline" onClick={() => onRun("refresh")}>
        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refresh
      </Button>
      <Button primary onClick={() => onRun("gotoCreateTenant")}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Tenant
      </Button>
    </>
  );

  const packageOptions = useMemo(() => {
    const next = new Set();
    tenants.forEach((tenant) => {
      const pkg = tenant.package || tenant.pkg || tenant.tier;
      if (pkg) next.add(String(pkg));
    });
    packages.forEach((pkg) => {
      if (pkg.name) next.add(String(pkg.name));
    });
    return Array.from(next);
  }, [tenants, packages]);

  return (
    <PageLayout
      title="Tenants"
      subtitle={`${tenants.length} communities - click any row to open the dossier`}
      icon={Users}
      rightActions={actions}
    >
      <GlassCard>
        <SearchRail
          label="Tenant search"
          summary={
            <>
              Showing <span className="font-semibold text-zinc-100">{filtered.length}</span> of {tenants.length}
            </>
          }
          placeholder="Search name, slug, email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          activeCount={activeFilters}
          onClear={clearAll}
          controls={
            <>
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "preview", label: "Preview" },
                  { value: "trial", label: "Trial" },
                  { value: "suspend", label: "Suspended" },
                ]}
              />
              <FilterSelect
                label="Package"
                value={packageFilter}
                onChange={setPackageFilter}
                options={[
                  { value: "all", label: "All packages" },
                  ...packageOptions.map((pkg) => ({ value: pkg, label: pkg })),
                ]}
              />
              <FilterSelect
                label="Risk"
                value={riskFilter}
                onChange={setRiskFilter}
                options={[
                  { value: "all", label: "Any risk" },
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" },
                ]}
              />
            </>
          }
        />
      </GlassCard>

      {filtered.length === 0 ? (
        <DataEmptyState
          title={activeFilters ? "No tenants match filters" : "No tenants yet"}
          body={activeFilters ? "Try clearing filters to see more results." : "Create a tenant to get started."}
        />
      ) : (
        <GlassCard className="p-0">
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th className="px-4 py-3 font-semibold">Runtime</th>
                  <th className="px-4 py-3 font-semibold">Billing</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant, index) => {
                  const tenantId = tenant.id || tenant.tenantId || tenant.slug || index;
                  const pkg = tenant.package || tenant.pkg || tenant.tier || "-";
                  const delivery = String(tenant.deliveryStatus || tenant.delivery?.status || "-").toLowerCase();
                  const bot = String(tenant.serverBotStatus || tenant.serverBot?.status || "-").toLowerCase();

                  return (
                    <motion.tr
                      key={tenantId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.25) }}
                      onClick={() => onRun("gotoTenantDossier", { recordId: tenantId })}
                      className="owner-table-row cursor-pointer border-b border-white/[0.04] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <StatusDot status={tenant.status} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">{tenant.name || tenant.tenantName || "Tenant"}</div>
                            <div className="truncate font-mono text-[10px] text-zinc-500">
                              {tenant.slug || tenant.id || "-"}
                              {tenant.locale ? ` - ${String(tenant.locale).toUpperCase()}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ToneBadge tone={statusTone(tenant.status)}>{String(tenant.status || "unknown").toLowerCase()}</ToneBadge>
                      </td>
                      <td className="px-4 py-3">
                        <ToneBadge tone={packageTone(pkg)}>{pkg}</ToneBadge>
                      </td>
                      <td className="px-4 py-3">
                        <ToneBadge tone={statusTone(tenant.subscriptionStatus || tenant.sub?.status)}>
                          {tenant.subscriptionStatus || tenant.sub?.status || "-"}
                        </ToneBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1">
                            {delivery === "online" ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-zinc-500" />}
                            <span className="text-zinc-300">DA</span>
                          </span>
                          <span className="flex items-center gap-1">
                            {bot === "online" ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-zinc-500" />}
                            <span className="text-zinc-300">SB</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ToneBadge tone={statusTone(tenant.billingStatus || tenant.billing?.status)}>
                          {tenant.billingStatus || tenant.billing?.status || "-"}
                        </ToneBadge>
                      </td>
                      <td className="px-4 py-3">
                        <ToneBadge tone={riskTone(tenant.riskLevel || tenant.risk)}>
                          {String(tenant.riskLevel || tenant.risk || "-").toUpperCase()}
                        </ToneBadge>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <div className="pt-1 text-right text-[11px] text-zinc-600">
        Source: <span className="font-mono text-zinc-500">{source || "-"}</span>
        {live === false ? <span className="ml-2 text-amber-400">- offline fallback</span> : null}
      </div>
    </PageLayout>
  );
}
