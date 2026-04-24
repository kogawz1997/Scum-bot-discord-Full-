export function generateRecommendations(data = {}) {
  const recommendations = [];
  const tenants = data.tenants || [];
  const invoices = data.invoices || [];
  const subscriptions = data.subscriptions || [];

  // Tenant health recommendations
  tenants.forEach((tenant) => {
    if (tenant.status === "offline" || tenant.deliveryStatus === "offline") {
      recommendations.push({
        id: `offline-${tenant.id}`,
        type: "alert",
        severity: "critical",
        title: `${tenant.name} is offline`,
        description: "Delivery agent or server bot is not responding. Check runtime status.",
        action: { label: "View Details", page: "tenant-dossier", recordId: tenant.id },
      });
    }

    if (tenant.riskLevel === "high" || tenant.riskLevel === "critical") {
      recommendations.push({
        id: `risk-${tenant.id}`,
        type: "warning",
        severity: "high",
        title: `${tenant.name} has high risk`,
        description: "Security or performance issues detected. Review diagnostics.",
        action: { label: "Run Diagnostics", page: "diagnostics-evidence", recordId: tenant.id },
      });
    }

    if (tenant.subscriptionStatus === "past_due" || tenant.subscriptionStatus === "canceled") {
      recommendations.push({
        id: `sub-${tenant.id}`,
        type: "error",
        severity: "high",
        title: `${tenant.name} subscription needs attention`,
        description: "Subscription is past due or cancelled. Renew to maintain service.",
        action: { label: "Renew", page: "subscriptions", recordId: tenant.id },
      });
    }
  });

  // Billing recommendations
  const overdueInvoices = invoices.filter((inv) => inv.status === "past_due" || inv.status === "overdue");
  if (overdueInvoices.length > 0) {
    recommendations.push({
      id: "overdue-invoices",
      type: "error",
      severity: "high",
      title: `${overdueInvoices.length} invoice(s) overdue`,
      description: `Total ${overdueInvoices.length} invoice(s) need payment. Follow up with tenants.`,
      action: { label: "View Invoices", page: "billing" },
    });
  }

  // Package upgrade recommendations
  const basicTenants = tenants.filter((t) => (t.package || "").toLowerCase() === "starter");
  if (basicTenants.length > 0) {
    recommendations.push({
      id: "upgrade-packages",
      type: "opportunity",
      severity: "low",
      title: `${basicTenants.length} tenant(s) on basic plan`,
      description: "Consider offering upgrades to tenants with high usage.",
      action: { label: "View Packages", page: "packages" },
    });
  }

  // Runtime capacity recommendations
  const onlineAgents = tenants.filter((t) => t.deliveryStatus === "online").length;
  const offlineAgents = tenants.filter((t) => t.deliveryStatus === "offline").length;
  const offlineRatio = offlineAgents / (onlineAgents + offlineAgents) || 0;

  if (offlineRatio > 0.2) {
    recommendations.push({
      id: "runtime-capacity",
      type: "warning",
      severity: "high",
      title: "Runtime capacity issue",
      description: `${Math.round(offlineRatio * 100)}% of delivery agents are offline. Scale up or investigate.`,
      action: { label: "Fleet Status", page: "fleet" },
    });
  }

  // Security recommendations
  if (tenants.some((t) => t.riskLevel === "critical")) {
    recommendations.push({
      id: "security-review",
      type: "alert",
      severity: "critical",
      title: "Security review needed",
      description: "Critical risk tenants detected. Review access and audit logs.",
      action: { label: "Security", page: "security" },
    });
  }

  return recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, warning: 2, low: 3 };
    return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
  });
}

export function getRecommendationColor(severity) {
  const colors = {
    critical: "border-red-500/30 bg-red-500/[0.08] text-red-300",
    high: "border-amber-500/30 bg-amber-500/[0.08] text-amber-300",
    warning: "border-yellow-500/30 bg-yellow-500/[0.08] text-yellow-300",
    low: "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300",
  };
  return colors[severity] || colors.low;
}

export function getRecommendationIcon(type) {
  const icons = {
    alert: "AlertTriangle",
    warning: "AlertCircle",
    error: "XCircle",
    opportunity: "Lightbulb",
  };
  return icons[type] || "Info";
}
