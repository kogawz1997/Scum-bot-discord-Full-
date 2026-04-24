export const MOCK_DATA = {
  overview: {
    stats: {
      tenants: 3,
      active: 2,
      preview: 1,
      trial: 0,
      suspended: 0,
      atRisk: 0,
    },
    revenue: {
      total: 45000,
      activeSubs: 2,
      unpaid: 5000,
      failed: 2000,
    },
  },
  tenants: [
    {
      id: "tenant-001",
      name: "Local SCUM Tenant",
      slug: "local-scum",
      status: "active",
      package: "Enterprise",
      subscriptionStatus: "paid",
      deliveryStatus: "online",
      serverBotStatus: "online",
      billingStatus: "paid",
      riskLevel: "low",
      locale: "th",
    },
    {
      id: "tenant-002",
      name: "Tenant Onboarding",
      slug: "tenant-onboarding",
      status: "preview",
      package: "Pro",
      subscriptionStatus: "trial",
      deliveryStatus: "offline",
      serverBotStatus: "offline",
      billingStatus: "pending",
      riskLevel: "medium",
    },
    {
      id: "tenant-003",
      name: "Production Community",
      slug: "prod-community",
      status: "active",
      package: "Enterprise",
      subscriptionStatus: "paid",
      deliveryStatus: "online",
      serverBotStatus: "online",
      billingStatus: "paid",
      riskLevel: "low",
    },
  ],
  packages: [
    {
      id: "pkg-001",
      name: "Starter",
      sku: "starter-001",
      tier: "basic",
      price: 99,
    },
    {
      id: "pkg-002",
      name: "Pro",
      sku: "pro-001",
      tier: "professional",
      price: 499,
    },
    {
      id: "pkg-003",
      name: "Enterprise",
      sku: "ent-001",
      tier: "enterprise",
      price: 9999,
    },
  ],
  subscriptions: [
    {
      id: "sub-001",
      tenantId: "tenant-001",
      tenantName: "Local SCUM Tenant",
      packageId: "pkg-003",
      packageName: "Enterprise",
      status: "active",
      startDate: "2024-01-15",
      renewDate: "2025-01-15",
      amount: 9999,
    },
    {
      id: "sub-002",
      tenantId: "tenant-003",
      tenantName: "Production Community",
      packageId: "pkg-003",
      packageName: "Enterprise",
      status: "active",
      startDate: "2023-06-01",
      renewDate: "2025-06-01",
      amount: 9999,
    },
  ],
  invoices: [
    {
      id: "inv-001",
      tenantId: "tenant-001",
      tenantName: "Local SCUM Tenant",
      amount: 9999,
      status: "paid",
      dueDate: "2025-02-15",
      issuedDate: "2025-01-15",
    },
    {
      id: "inv-002",
      tenantId: "tenant-003",
      tenantName: "Production Community",
      amount: 9999,
      status: "paid",
      dueDate: "2025-06-01",
      issuedDate: "2025-05-01",
    },
  ],
  incidents: [
    {
      id: "incident-001",
      title: "High memory usage on delivery agent",
      severity: "warning",
      status: "resolved",
      tenantId: "tenant-001",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  securityEvents: [
    {
      id: "sec-001",
      type: "login_success",
      actor: "admin@example.com",
      action: "Session established",
      ip: "192.168.1.100",
      at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  auditTrail: [
    {
      id: "audit-001",
      action: "tenant.created",
      actor: "admin@example.com",
      target: "Local SCUM Tenant",
      path: "/platform/tenants",
      ip: "192.168.1.100",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

export function getMockDataForPage(pageName) {
  const mockMap = {
    overview: {
      overview: MOCK_DATA.overview,
      tenants: MOCK_DATA.tenants,
      invoices: MOCK_DATA.invoices,
      incidents: MOCK_DATA.incidents,
      subscriptions: MOCK_DATA.subscriptions,
      securityEvents: MOCK_DATA.securityEvents,
    },
    tenants: {
      tenants: MOCK_DATA.tenants,
      packages: MOCK_DATA.packages,
    },
    billing: {
      invoices: MOCK_DATA.invoices,
      subscriptions: MOCK_DATA.subscriptions,
    },
    subscriptions: {
      subscriptions: MOCK_DATA.subscriptions,
      packages: MOCK_DATA.packages,
    },
    packages: {
      packages: MOCK_DATA.packages,
    },
    incidents: {
      incidents: MOCK_DATA.incidents,
    },
    security: {
      securityEvents: MOCK_DATA.securityEvents,
      auditQuery: { items: MOCK_DATA.auditTrail },
    },
  };
  return mockMap[pageName] || {};
}
