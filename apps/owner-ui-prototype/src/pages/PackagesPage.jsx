import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Check } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { DataEmptyState } from "../components/ui/data-empty-state";
import { Button } from "../components/ui/button";
import { SearchRail } from "../components/ui/search-rail";

function formatPrice(pkg) {
  const price = pkg.price || pkg.priceMonthly || pkg.amount;
  if (price == null) return "-";
  const currency = pkg.currency || "THB";
  const n = Number(price);
  if (!Number.isFinite(n)) return String(price);
  const prefix = currency === "THB" ? "฿" : currency === "USD" ? "$" : `${currency} `;
  return `${prefix}${n.toLocaleString()}`;
}

function tierTone(tier) {
  const t = String(tier || "").toLowerCase();
  if (t.includes("enterprise")) return "active";
  if (t.includes("pro")) return "healthy";
  if (t.includes("starter") || t.includes("basic") || t.includes("standard")) return "neutral";
  return "locked";
}

export function PackagesPage({ data, onRun }) {
  const packages = data?.packages || [];
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return packages;
    const q = search.toLowerCase();
    return packages.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q),
    );
  }, [packages, search]);

  const actions = (
    <Button primary onClick={() => onRun("createPackage")}>
      <Plus className="mr-1.5 h-3.5 w-3.5" /> New Package
    </Button>
  );

  return (
    <PageLayout
      title="Package Catalog"
      subtitle={`${packages.length} packages - commercial tier configuration`}
      icon={Package}
      rightActions={actions}
    >
      <GlassCard>
        <SearchRail
          label="Package search"
          summary={
            <>
              Showing <span className="font-semibold text-zinc-100">{filtered.length}</span> of {packages.length}
            </>
          }
          placeholder="Search name, SKU, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          activeCount={search ? 1 : 0}
          onClear={() => setSearch("")}
        />
      </GlassCard>

      {filtered.length === 0 ? (
        <DataEmptyState
          title={search ? "No packages match" : "No packages yet"}
          body={search ? "Try a different search term." : "Create a package to begin offering tiers."}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pkg, idx) => {
            const features = pkg.features || pkg.tags || pkg.entitlements || [];
            const tenantCount = pkg.tenantCount ?? pkg.tenants?.length ?? 0;
            const tier = pkg.tier || pkg.type || pkg.name || "-";
            return (
              <motion.div
                key={pkg.sku || pkg.id || idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.2) }}
              >
                <GlassCard
                  title={pkg.name || pkg.sku || "Package"}
                  description={pkg.sku || pkg.id}
                  right={<ToneBadge tone={tierTone(tier)}>{tier}</ToneBadge>}
                  className="h-full"
                  onClick={() => onRun("gotoPackageDetail", { recordId: pkg.sku || pkg.id })}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="owner-kpi-value text-2xl font-bold text-white">{formatPrice(pkg)}</span>
                    {(pkg.billingCycle || pkg.interval) && (
                      <span className="text-xs text-zinc-500">/ {pkg.billingCycle || pkg.interval}</span>
                    )}
                  </div>

                  {pkg.description && (
                    <p className="mt-3 max-w-[34ch] text-xs leading-relaxed text-zinc-400">{pkg.description}</p>
                  )}

                  {features.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {features.slice(0, 5).map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-xs text-zinc-300">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-300" />
                          <span className="max-w-[28ch]">{typeof feature === "string" ? feature : feature.label || feature.name}</span>
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li className="text-[11px] text-zinc-500">+{features.length - 5} more</li>
                      )}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-3">
                    <ToneBadge tone={tenantCount > 0 ? "active" : "neutral"}>
                      {tenantCount} tenants
                    </ToneBadge>
                    <span className="text-[11px] text-zinc-500">Details -&gt;</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
