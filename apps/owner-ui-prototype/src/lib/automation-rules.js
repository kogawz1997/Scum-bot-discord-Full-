export const AUTOMATION_RULES = [
  {
    id: "auto-renew-subs",
    name: "Auto-renew subscriptions",
    description: "Automatically renew subscriptions 7 days before expiry",
    help: "Prevents service interruption by renewing subscriptions automatically",
    enabled: true,
    trigger: "subscription_expiring_soon",
    action: "renew_subscription",
    conditions: { daysBeforeExpiry: 7 },
    conditionLabels: { daysBeforeExpiry: "Days before expiry to trigger renewal" },
  },
  {
    id: "alert-offline-agent",
    name: "Alert on agent offline",
    description: "Send notification when delivery agent goes offline",
    help: "Get notified when a delivery agent stops responding",
    enabled: true,
    trigger: "agent_offline",
    action: "send_notification",
    conditions: { offlineMinutes: 5 },
    conditionLabels: { offlineMinutes: "Minutes of inactivity before alerting" },
  },
  {
    id: "scale-on-load",
    name: "Scale runtime on high load",
    description: "Auto-scale delivery agents when CPU/memory exceeds 80%",
    help: "Automatically provision more agents when system is under heavy load",
    enabled: true,
    trigger: "runtime_high_load",
    action: "scale_runtime",
    conditions: { cpuThreshold: 80, memoryThreshold: 80 },
    conditionLabels: {
      cpuThreshold: "CPU usage threshold (%)",
      memoryThreshold: "Memory usage threshold (%)"
    },
  },
  {
    id: "invoice-reminder",
    name: "Invoice payment reminder",
    description: "Send reminder email 3 days before invoice due date",
    help: "Proactively remind tenants to pay before invoice deadline",
    enabled: true,
    trigger: "invoice_due_soon",
    action: "send_email",
    conditions: { daysBeforeDue: 3 },
    conditionLabels: { daysBeforeDue: "Days before due date to send reminder" },
  },
  {
    id: "flag-high-risk",
    name: "Flag high-risk tenants",
    description: "Automatically flag tenants with security issues",
    help: "Instantly identify and flag tenants that pose a security risk",
    enabled: true,
    trigger: "security_issue_detected",
    action: "flag_tenant",
    conditions: { riskLevel: "critical" },
    conditionLabels: { riskLevel: "Minimum risk level to flag (critical)" },
  },
  {
    id: "backup-nightly",
    name: "Nightly backup",
    description: "Backup all tenant data every night at 2 AM UTC",
    help: "Ensures all tenant data is safely backed up daily",
    enabled: true,
    trigger: "scheduled",
    action: "backup",
    conditions: { scheduleTime: "02:00 UTC" },
    conditionLabels: { scheduleTime: "Time to run backup (UTC)" },
  },
];

export function checkRuleConditions(rule, data = {}) {
  const trigger = rule.trigger;
  const conditions = rule.conditions || {};

  switch (trigger) {
    case "subscription_expiring_soon":
      return data.subscriptions?.some((s) => {
        const daysUntil = Math.floor((new Date(s.renewDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntil <= (conditions.daysBeforeExpiry || 7) && daysUntil > 0;
      });

    case "agent_offline":
      return data.tenants?.some((t) => t.deliveryStatus === "offline");

    case "runtime_high_load":
      return data.tenants?.some((t) => t.runtimeLoad > (conditions.cpuThreshold || 80));

    case "invoice_due_soon":
      return data.invoices?.some((i) => {
        const daysUntil = Math.floor((new Date(i.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntil <= (conditions.daysBeforeDue || 3) && daysUntil > 0;
      });

    case "security_issue_detected":
      return data.tenants?.some((t) => t.riskLevel === (conditions.riskLevel || "critical"));

    case "scheduled":
      return true;

    default:
      return false;
  }
}

export function getTriggeredRules(rules = AUTOMATION_RULES, data = {}) {
  return rules.filter((rule) => rule.enabled && checkRuleConditions(rule, data));
}
