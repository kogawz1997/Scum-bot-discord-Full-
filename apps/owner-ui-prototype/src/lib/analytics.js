export function calculateMetrics(data = {}) {
  const tenants = data.tenants || [];
  const invoices = data.invoices || [];
  const subscriptions = data.subscriptions || [];

  return {
    // Tenant metrics
    tenantTotal: tenants.length,
    tenantActive: tenants.filter((t) => t.status === "active").length,
    tenantOffline: tenants.filter((t) => t.deliveryStatus === "offline").length,
    tenantAtRisk: tenants.filter((t) => t.riskLevel === "high" || t.riskLevel === "critical").length,

    // Revenue metrics
    totalRevenue: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount || 0), 0),
    activeSubscriptions: subscriptions.filter((s) => s.status === "active").length,
    overdueInvoices: invoices.filter((i) => i.status === "past_due").length,
    failedPayments: invoices.filter((i) => i.status === "failed").length,

    // Health metrics
    uptime: tenants.length > 0 ? ((tenants.filter((t) => t.deliveryStatus === "online").length / tenants.length) * 100).toFixed(1) : 0,
    healthScore: calculateHealthScore(tenants, invoices),
  };
}

export function calculateHealthScore(tenants = [], invoices = []) {
  let score = 100;

  const offlineRatio = tenants.filter((t) => t.deliveryStatus === "offline").length / (tenants.length || 1);
  score -= offlineRatio * 30;

  const atRiskRatio = tenants.filter((t) => t.riskLevel === "high" || t.riskLevel === "critical").length / (tenants.length || 1);
  score -= atRiskRatio * 25;

  const overdueRatio = invoices.filter((i) => i.status === "past_due").length / (invoices.length || 1);
  score -= overdueRatio * 20;

  return Math.max(0, Math.round(score));
}

export function getRevenueTrend(invoices = []) {
  const last30days = new Date();
  last30days.setDate(last30days.getDate() - 30);

  const byDate = {};
  invoices
    .filter((i) => new Date(i.issuedDate || i.createdAt) > last30days)
    .forEach((i) => {
      const date = new Date(i.issuedDate || i.createdAt).toISOString().split("T")[0];
      byDate[date] = (byDate[date] || 0) + (i.amount || 0);
    });

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, amount]) => amount);
}

export function getPredictedChurn(tenants = []) {
  return tenants.filter((t) => {
    const s = String(t.subscriptionStatus || "").toLowerCase();
    return s.includes("trial") || s.includes("past_due") || s.includes("warning");
  });
}
