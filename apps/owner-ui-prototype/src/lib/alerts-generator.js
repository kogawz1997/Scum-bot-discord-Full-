import { generateRecommendations } from "./recommendations";

/**
 * Convert recommendations to alerts
 * Only critical and high severity recommendations become alerts
 */
export function generateAlertsFromRecommendations(data = {}) {
  const recommendations = generateRecommendations(data);

  return recommendations
    .filter((rec) => rec.severity === "critical" || rec.severity === "high")
    .map((rec) => ({
      id: rec.id,
      type: rec.severity === "critical" ? "error" : "warning",
      title: rec.title,
      message: rec.description,
    }));
}

/**
 * Generate alerts from system health metrics
 */
export function generateAlertsFromMetrics(data = {}) {
  const alerts = [];
  const tenants = data.tenants || [];
  const invoices = data.invoices || [];

  // Check for offline agents
  const offlineCount = tenants.filter((t) => t.deliveryStatus === "offline").length;
  if (offlineCount > 0) {
    alerts.push({
      id: `metric-offline-agents`,
      type: "warning",
      title: `${offlineCount} agent(s) offline`,
      message: "Some delivery agents are not responding",
    });
  }

  // Check for failed payments
  const failedPayments = invoices.filter((i) => i.status === "failed").length;
  if (failedPayments > 0) {
    alerts.push({
      id: `metric-failed-payments`,
      type: "error",
      title: `${failedPayments} failed payment(s)`,
      message: "Payment processing failed. Check payment methods.",
    });
  }

  // Check for overdue invoices
  const overdueCount = invoices.filter((i) => i.status === "past_due" || i.status === "overdue").length;
  if (overdueCount > 0) {
    alerts.push({
      id: `metric-overdue`,
      type: "warning",
      title: `${overdueCount} overdue invoice(s)`,
      message: "Some invoices are past due. Payment required.",
    });
  }

  return alerts;
}

/**
 * Combine all alerts from different sources
 */
export function generateAllAlerts(data = {}) {
  const recAlerts = generateAlertsFromRecommendations(data);
  const metricAlerts = generateAlertsFromMetrics(data);

  // Combine and deduplicate by ID
  const allAlerts = [...recAlerts, ...metricAlerts];
  const seen = new Set();

  return allAlerts.filter((alert) => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  });
}
