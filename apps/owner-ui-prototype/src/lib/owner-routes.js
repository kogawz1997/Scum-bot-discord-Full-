export const OWNER_BASE_PATH = "/owner";
export const OWNER_LOGIN_PATH = `${OWNER_BASE_PATH}/login`;
export const OWNER_DASHBOARD_PATH = OWNER_BASE_PATH;
export const OWNER_DEFAULT_PAGE = "overview";

export const OWNER_PAGE_KEYS = [
  "overview",
  "tenants",
  "create-tenant",
  "tenant-dossier",
  "packages",
  "package-detail",
  "billing",
  "invoice-detail",
  "payment-attempt-detail",
  "subscriptions",
  "subscription-detail",
  "fleet",
  "fleet-diagnostics",
  "runtime-detail",
  "observability",
  "diagnostics-evidence",
  "incidents",
  "support",
  "support-context",
  "recovery",
  "backup-detail",
  "security",
  "access-posture",
  "settings",
  "platform-controls",
  "automation",
  "profile",
];

const OWNER_ROOT_PAGE_PATHS = Object.freeze({
  overview: "/overview",
  tenants: "/tenants",
  "create-tenant": "/create-tenant",
  "tenant-dossier": "/tenant-dossier",
  packages: "/packages",
  "package-detail": "/package-detail",
  billing: "/billing",
  "invoice-detail": "/billing/invoices",
  "payment-attempt-detail": "/billing/payment-attempts",
  subscriptions: "/subscriptions",
  "subscription-detail": "/billing/subscriptions",
  fleet: "/fleet",
  "fleet-diagnostics": "/fleet-diagnostics",
  "runtime-detail": "/fleet/runtime",
  observability: "/observability",
  "diagnostics-evidence": "/observability/evidence",
  incidents: "/incidents",
  support: "/support",
  "support-context": "/support/cases",
  recovery: "/recovery",
  "backup-detail": "/recovery/backups",
  security: "/security",
  "access-posture": "/security/access",
  settings: "/settings",
  "platform-controls": "/platform-controls",
  automation: "/automation",
  profile: "/profile",
});

export const OWNER_PAGE_PATHS = Object.freeze({
  overview: OWNER_BASE_PATH,
  tenants: `${OWNER_BASE_PATH}/tenants`,
  "create-tenant": `${OWNER_BASE_PATH}/tenants/new`,
  "tenant-dossier": `${OWNER_BASE_PATH}/tenants/context`,
  packages: `${OWNER_BASE_PATH}/packages`,
  "package-detail": `${OWNER_BASE_PATH}/packages/detail`,
  billing: `${OWNER_BASE_PATH}/billing`,
  "invoice-detail": `${OWNER_BASE_PATH}/billing/invoice`,
  "payment-attempt-detail": `${OWNER_BASE_PATH}/billing/attempt`,
  subscriptions: `${OWNER_BASE_PATH}/subscriptions`,
  "subscription-detail": `${OWNER_BASE_PATH}/subscriptions/detail`,
  fleet: `${OWNER_BASE_PATH}/runtime`,
  "fleet-diagnostics": `${OWNER_BASE_PATH}/runtime/fleet-diagnostics`,
  "runtime-detail": `${OWNER_BASE_PATH}/runtime/agents-bots`,
  observability: `${OWNER_BASE_PATH}/observability`,
  "diagnostics-evidence": `${OWNER_BASE_PATH}/diagnostics`,
  incidents: `${OWNER_BASE_PATH}/incidents`,
  support: `${OWNER_BASE_PATH}/support`,
  "support-context": `${OWNER_BASE_PATH}/support/context`,
  recovery: `${OWNER_BASE_PATH}/recovery`,
  "backup-detail": `${OWNER_BASE_PATH}/recovery/tenant-backup`,
  security: `${OWNER_BASE_PATH}/security`,
  "access-posture": `${OWNER_BASE_PATH}/access`,
  settings: `${OWNER_BASE_PATH}/settings`,
  "platform-controls": `${OWNER_BASE_PATH}/control`,
  automation: `${OWNER_BASE_PATH}/automation`,
  profile: `${OWNER_BASE_PATH}/profile`,
});

export const OWNER_DETAIL_PAGE_PATHS = Object.freeze({
  "tenant-dossier": `${OWNER_BASE_PATH}/tenants`,
  "package-detail": `${OWNER_BASE_PATH}/packages`,
  "invoice-detail": `${OWNER_BASE_PATH}/billing/invoice`,
  "payment-attempt-detail": `${OWNER_BASE_PATH}/billing/attempt`,
  "subscription-detail": `${OWNER_BASE_PATH}/subscriptions`,
  "runtime-detail": `${OWNER_BASE_PATH}/runtime/agents-bots`,
  "diagnostics-evidence": `${OWNER_BASE_PATH}/diagnostics`,
  "support-context": `${OWNER_BASE_PATH}/support`,
  "backup-detail": `${OWNER_BASE_PATH}/recovery/tenant-backup`,
  "access-posture": `${OWNER_BASE_PATH}/access`,
});

export const OWNER_LEGACY_PAGE_ALIASES = Object.freeze({
  "/": "overview",
  "/owner": "overview",
  "/owner/dashboard": "overview",
  "/tenants": "tenants",
  "/owner/tenants": "tenants",
  "/create-tenant": "create-tenant",
  "/owner/tenants/new": "create-tenant",
  "/tenant-dossier": "tenant-dossier",
  "/owner/tenants/context": "tenant-dossier",
  "/packages": "packages",
  "/owner/packages": "packages",
  "/owner/packages/create": "packages",
  "/owner/packages/entitlements": "packages",
  "/billing": "billing",
  "/owner/billing": "billing",
  "/owner/billing/recovery": "billing",
  "/owner/billing/attempts": "billing",
  "/subscriptions": "subscriptions",
  "/owner/subscriptions": "subscriptions",
  "/owner/subscriptions/registry": "subscriptions",
  "/fleet": "fleet",
  "/owner/runtime": "fleet",
  "/owner/runtime/overview": "fleet",
  "/owner/runtime/create-server": "fleet",
  "/owner/runtime/provision-runtime": "fleet",
  "/fleet-diagnostics": "fleet-diagnostics",
  "/owner/runtime/fleet-diagnostics": "fleet-diagnostics",
  "/runtime-detail": "runtime-detail",
  "/owner/runtime/agents-bots": "runtime-detail",
  "/observability": "observability",
  "/owner/analytics": "observability",
  "/owner/analytics/overview": "observability",
  "/owner/analytics/risk": "observability",
  "/owner/analytics/packages": "observability",
  "/owner/observability": "observability",
  "/owner/jobs": "observability",
  "/incidents": "incidents",
  "/owner/incidents": "incidents",
  "/support": "support",
  "/owner/support": "support",
  "/support-context": "support-context",
  "/owner/support/context": "support-context",
  "/recovery": "recovery",
  "/owner/recovery": "recovery",
  "/owner/recovery/overview": "recovery",
  "/owner/recovery/create": "recovery",
  "/owner/recovery/preview": "recovery",
  "/owner/recovery/restore": "recovery",
  "/owner/recovery/history": "recovery",
  "/backup-detail": "backup-detail",
  "/owner/recovery/tenant-backup": "backup-detail",
  "/security": "security",
  "/owner/audit": "security",
  "/owner/security": "security",
  "/owner/security/overview": "security",
  "/access-posture": "access-posture",
  "/owner/access": "access-posture",
  "/diagnostics-evidence": "diagnostics-evidence",
  "/owner/diagnostics": "diagnostics-evidence",
  "/platform-controls": "platform-controls",
  "/owner/control": "platform-controls",
  "/settings": "settings",
  "/owner/settings": "settings",
  "/owner/settings/overview": "settings",
  "/owner/settings/admin-users": "settings",
  "/owner/settings/services": "settings",
  "/owner/settings/access-policy": "settings",
  "/owner/settings/portal-policy": "settings",
  "/owner/settings/billing-policy": "settings",
  "/owner/settings/runtime-policy": "settings",
  "/automation": "automation",
  "/owner/automation": "automation",
  "/profile": "profile",
  "/owner/profile": "profile",
});

export const OWNER_LEGACY_DETAIL_PREFIXES = Object.freeze({
  "/tenant-dossier": "tenant-dossier",
  "/owner/tenants": "tenant-dossier",
  "/package-detail": "package-detail",
  "/owner/packages": "package-detail",
  "/billing/invoices": "invoice-detail",
  "/owner/billing/invoice": "invoice-detail",
  "/billing/payment-attempts": "payment-attempt-detail",
  "/owner/billing/attempt": "payment-attempt-detail",
  "/billing/subscriptions": "subscription-detail",
  "/owner/subscriptions": "subscription-detail",
  "/fleet/runtime": "runtime-detail",
  "/owner/runtime/agents-bots": "runtime-detail",
  "/support/cases": "support-context",
  "/owner/support": "support-context",
  "/recovery/backups": "backup-detail",
  "/owner/recovery/tenant-backup": "backup-detail",
});

function normalizePath(pathname = OWNER_DASHBOARD_PATH) {
  return String(pathname || OWNER_DASHBOARD_PATH).replace(/\/+$/, "") || OWNER_DASHBOARD_PATH;
}

export function resolveOwnerPrototypeRoute(pathname = OWNER_DASHBOARD_PATH) {
  const normalized = normalizePath(pathname);
  if (normalized === "/login" || normalized === OWNER_LOGIN_PATH) return "login";
  return "dashboard";
}

export function resolveOwnerPageFromPath(pathname = OWNER_DASHBOARD_PATH) {
  return resolveOwnerRouteFromPath(pathname).page;
}

export function resolveOwnerRouteFromPath(pathname = OWNER_DASHBOARD_PATH) {
  const normalized = normalizePath(pathname);
  const legacyExactPage = OWNER_LEGACY_PAGE_ALIASES[normalized];
  if (legacyExactPage) return { page: legacyExactPage, recordId: "" };

  const legacyDetailMatch = Object.entries(OWNER_LEGACY_DETAIL_PREFIXES)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([path]) => normalized.startsWith(`${path}/`));
  if (legacyDetailMatch) {
    const [path, page] = legacyDetailMatch;
    const recordId = decodeURIComponent(normalized.slice(path.length).replace(/^\/+/, ""));
    return { page, recordId: recordId || "" };
  }

  const detailMatch = Object.entries(OWNER_DETAIL_PAGE_PATHS)
    .find(([, path]) => normalized === path || normalized.startsWith(`${path}/`));
  if (detailMatch) {
    const [page, path] = detailMatch;
    const recordId = decodeURIComponent(normalized.slice(path.length).replace(/^\/+/, ""));
    return { page, recordId: recordId || "" };
  }

  const canonicalMatch = Object.entries(OWNER_PAGE_PATHS).find(([, path]) => path === normalized);
  if (canonicalMatch) {
    return { page: canonicalMatch[0], recordId: "" };
  }

  const rootMatch = Object.entries(OWNER_ROOT_PAGE_PATHS).find(([, path]) => path === normalized);
  return { page: rootMatch?.[0] || OWNER_DEFAULT_PAGE, recordId: "" };
}

export function buildOwnerPagePath(page = OWNER_DEFAULT_PAGE, recordId = "") {
  if (!recordId) return OWNER_PAGE_PATHS[page] || OWNER_PAGE_PATHS[OWNER_DEFAULT_PAGE];
  const basePath = OWNER_DETAIL_PAGE_PATHS[page] || OWNER_PAGE_PATHS[page];
  if (!basePath) return OWNER_PAGE_PATHS[OWNER_DEFAULT_PAGE];
  return `${basePath}/${encodeURIComponent(recordId)}`;
}
