const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { URL } = require('node:url');

const config = require('./config');
const { prisma } = require('./prisma');
const {
  getAdminSsoRoleMappingSummary,
  resolveMappedMemberRole,
} = require('./utils/adminSsoRoleMapping');
const {
  getRequiredCommandAccessRole,
} = require('./utils/discordCommandAccess');
const {
  buildRoleMatrix,
  getAdminPermissionForPath,
  getAdminPermissionMatrixSummary,
  hasRoleAtLeast,
  listAdminPermissionMatrix,
  normalizeRole,
} = require('./utils/adminPermissionMatrix');
const {
  listShopItems,
  listUserPurchases,
  listKnownPurchaseStatuses,
} = require('./store/memoryStore');
const {
  normalizePurchaseStatus,
  listAllowedPurchaseTransitions,
} = require('./services/purchaseStateMachine');
const { listEvents, getParticipants } = require('./store/eventStore');
const {
  createServerEvent,
  joinServerEvent,
  startServerEvent,
  finishServerEvent,
} = require('./services/eventService');
const { getStatus } = require('./store/scumStore');
const {
  upsertPlayerAccount,
  bindPlayerSteamId,
  unbindPlayerSteamId,
  getPlayerDashboard,
  listPlayerAccounts,
} = require('./store/playerAccountStore');
const {
  getRentBikeRuntime,
  runRentBikeMidnightReset,
} = require('./services/rentBikeService');
const {
  listManagedRuntimeServices,
  restartManagedRuntimeServices,
} = require('./services/adminServiceControl');
const {
  enqueuePurchaseDeliveryByCode,
  listDeliveryQueue,
  listFilteredDeliveryQueue,
  listFilteredDeliveryDeadLetters,
  retryDeliveryNow,
  retryDeliveryNowMany,
  retryDeliveryDeadLetter,
  retryDeliveryDeadLetterMany,
  removeDeliveryDeadLetter,
  cancelDeliveryJob,
  getDeliveryMetricsSnapshot,
  getDeliveryRuntimeSnapshotSync,
  getDeliveryRuntimeStatus,
  getDeliveryPreflightReport,
  previewDeliveryCommands,
  simulateDeliveryPlan,
  sendTestDeliveryCommand,
  listScumAdminCommandCapabilities,
  testScumAdminCommandCapability,
  getDeliveryCommandOverride,
  setDeliveryCommandOverride,
  getDeliveryDetailsByPurchaseCode,
} = require('./services/rconDelivery');
const {
  queueLeaderboardRefreshForAllGuilds,
} = require('./services/leaderboardPanels');
const {
  adminLiveBus,
  publishAdminLiveUpdate,
} = require('./services/adminLiveBus');
const {
  listAdminNotifications,
  acknowledgeAdminNotifications,
  clearAdminNotifications,
  addAdminNotification,
} = require('./store/adminNotificationStore');
const {
  listAdminSecurityEvents,
  recordAdminSecurityEvent,
} = require('./store/adminSecurityEventStore');
const {
  getAdminRequestLogMetrics,
  listAdminRequestLogs,
  recordAdminRequestLog,
} = require('./store/adminRequestLogStore');
const {
  listAdminCommandCapabilityPresets,
  getAdminCommandCapabilityPresetById,
  saveAdminCommandCapabilityPreset,
  deleteAdminCommandCapabilityPreset,
} = require('./store/adminCommandCapabilityPresetStore');
const {
  listItemIconCatalog,
  resolveItemIconUrl,
} = require('./services/itemIconService');
const {
  listWikiWeaponCatalog,
  getWikiWeaponCatalogMeta,
} = require('./services/wikiWeaponCatalog');
const {
  listManifestItemCatalog,
  getManifestItemCatalogMeta,
} = require('./services/wikiItemManifestCatalog');
const {
  redeemCodeForUser,
  requestRentBikeForUser,
  createBountyForUser,
  listActiveBountiesForUser,
  cancelBountyForUser,
  createRedeemCodeForAdmin,
  deleteRedeemCodeForAdmin,
  resetRedeemCodeUsageForAdmin,
} = require('./services/playerOpsService');
const {
  updatePurchaseStatusForActor,
} = require('./services/purchaseService');
const {
  addShopItemForAdmin,
  setShopItemPriceForAdmin,
  deleteShopItemForAdmin,
} = require('./services/shopService');
const {
  creditCoins,
  debitCoins,
  setCoinsExact,
} = require('./services/coinService');
const {
  grantVipForUser,
  revokeVipForUser,
} = require('./services/vipService');
const {
  buildAdminSnapshot,
  createAdminBackup,
  listAdminBackupFiles,
  previewAdminBackupRestore,
  restoreAdminBackup,
  getAdminRestoreState,
} = require('./services/adminSnapshotService');
const {
  buildAuditDataset: buildAuditDatasetService,
  buildAuditExportPayload: buildAuditExportPayloadService,
  buildAuditCsv: buildAuditCsvService,
  listAuditPresets: listAuditPresetsService,
  saveAuditPreset: saveAuditPresetService,
  deleteAuditPreset: deleteAuditPresetService,
} = require('./services/adminAuditService');
const {
  createObservabilitySeriesState,
  clampObservabilityWindowMs,
  parseObservabilitySeriesKeys,
  captureObservabilitySeries,
  listObservabilitySeries,
  buildAdminObservabilitySnapshot,
  buildObservabilityExportPayload,
  buildObservabilityCsv,
} = require('./services/adminObservabilityService');
const {
  buildAdminDashboardCards,
} = require('./services/adminDashboardService');
const {
  getCachedRuntimeSupervisorSnapshot,
  getRuntimeSupervisorSnapshot,
  startRuntimeSupervisorMonitor,
  stopRuntimeSupervisorMonitor,
} = require('./services/runtimeSupervisorService');
const {
  acceptPlatformLicenseLegal,
  createMarketplaceOffer,
  createPlatformApiKey,
  createPlatformWebhookEndpoint,
  createSubscription,
  createTenant,
  dispatchPlatformWebhookEvent,
  getPlanCatalog,
  getPlatformAnalyticsOverview,
  getPlatformPermissionCatalog,
  getPlatformPublicOverview,
  getPlatformTenantById,
  getTenantQuotaSnapshot,
  issuePlatformLicense,
  listMarketplaceOffers,
  listPlatformAgentRuntimes,
  listPlatformApiKeys,
  listPlatformLicenses,
  listPlatformSubscriptions,
  listPlatformTenants,
  listPlatformWebhookEndpoints,
  recordPlatformAgentHeartbeat,
  reconcileDeliveryState,
  verifyPlatformApiKey,
} = require('./services/platformService');
const {
  runPlatformMonitoringCycle,
  startPlatformMonitoring,
  stopPlatformMonitoring,
} = require('./services/platformMonitoringService');
const { getPlatformOpsState } = require('./store/platformOpsStateStore');
const {
  revokeWelcomePackClaimForAdmin,
  clearWelcomePackClaimsForAdmin,
} = require('./services/welcomePackService');
const {
  claimSupportTicket,
  closeSupportTicket,
} = require('./services/ticketService');
const {
  bindSteamLinkForUser,
  removeSteamLink,
} = require('./services/linkService');
const { createPunishmentEntry } = require('./services/moderationService');
const {
  addKillsForUser,
  addDeathsForUser,
  addPlaytimeForUser,
} = require('./services/statsService');
const { updateScumStatusForAdmin } = require('./services/scumStatusService');
const { getPersistenceStatus } = require('./store/_persist');
const {
  isAdminRestoreMaintenanceActive,
} = require('./store/adminRestoreStateStore');
const { getWebhookMetricsSnapshot } = require('./scumWebhookServer');
const { updateEnvFile } = require('./utils/envFileEditor');
const { resolveDatabaseRuntime } = require('./utils/dbEngine');
const {
  buildControlPanelEnvPatch: buildAdminEditableEnvPatch,
  buildControlPanelEnvSection: buildAdminEditableEnvSection,
  getControlPanelEnvFileValues: getAdminEditableEnvFileValues,
  getPortalEnvFilePath: resolveAdminEditablePortalEnvFilePath,
  getRootEnvFilePath: resolveAdminEditableRootEnvFilePath,
} = require('./config/adminEditableConfig');
const {
  getPlatformTenantConfig,
  listPlatformTenantConfigs,
  upsertPlatformTenantConfig,
} = require('./services/platformTenantConfigService');
const { createAdminAuthRuntime } = require('./admin/auth/adminAuthRuntime');
const {
  createAdminConfigPostRoutes,
} = require('./admin/api/adminConfigPostRoutes');
const {
  createAdminGetRoutes,
} = require('./admin/api/adminGetRoutes');
const {
  createAdminAuthPostRoutes,
} = require('./admin/api/adminAuthPostRoutes');
const {
  createAdminEntityPostRoutes,
} = require('./admin/api/adminEntityPostRoutes');
const {
  createAdminCommerceDeliveryPostRoutes,
} = require('./admin/api/adminCommerceDeliveryPostRoutes');
const {
  createAdminPortalPostRoutes,
} = require('./admin/api/adminPortalPostRoutes');
const {
  createAdminPlatformPostRoutes,
} = require('./admin/api/adminPlatformPostRoutes');
const {
  createAdminAuditRoutes,
} = require('./admin/audit/adminAuditRoutes');
const {
  filterRowsByTenantScope,
  getAuthTenantId,
  resolveTenantScope,
} = require('./admin/adminTenantScope');

const dashboardHtmlPath = path.join(__dirname, 'admin', 'dashboard.html');
const loginHtmlPath = path.join(__dirname, 'admin', 'login.html');
function getRootEnvFilePath() {
  return resolveAdminEditableRootEnvFilePath();
}

function getPortalEnvFilePath() {
  return resolveAdminEditablePortalEnvFilePath();
}
const defaultScumItemsDirPath = path.resolve(process.cwd(), 'scum_items-main');
const scumItemsDirPath = path.resolve(
  String(process.env.SCUM_ITEMS_DIR_PATH || defaultScumItemsDirPath).trim()
    || defaultScumItemsDirPath,
);
let adminServer = null;
let cachedDashboardHtml = null;
let cachedLoginHtml = null;
let resolvedToken = null;
const sessions = new Map();
let adminUsersReadyPromise = null;

const SESSION_COOKIE_NAME =
  String(process.env.ADMIN_WEB_SESSION_COOKIE_NAME || 'scum_admin_session').trim()
    || 'scum_admin_session';
const SESSION_TTL_MS = Math.max(
  10 * 60 * 1000,
  Number(process.env.ADMIN_WEB_SESSION_TTL_HOURS || 12) * 60 * 60 * 1000,
);
const SESSION_IDLE_TIMEOUT_MS = Math.max(
  5 * 60 * 1000,
  Number(process.env.ADMIN_WEB_SESSION_IDLE_MINUTES || 120) * 60 * 1000,
);
const SESSION_MAX_PER_USER = Math.max(
  1,
  Number(process.env.ADMIN_WEB_SESSION_MAX_PER_USER || 5),
);
const SESSION_BIND_USER_AGENT = envBool('ADMIN_WEB_SESSION_BIND_USER_AGENT', true);
const SESSION_COOKIE_PATH = normalizeCookiePath(
  process.env.ADMIN_WEB_SESSION_COOKIE_PATH || '/admin',
  '/admin',
);
const SESSION_COOKIE_SAMESITE = normalizeSameSite(
  process.env.ADMIN_WEB_SESSION_COOKIE_SAMESITE || 'strict',
  'Strict',
);
const SESSION_COOKIE_DOMAIN = normalizeCookieDomain(
  process.env.ADMIN_WEB_SESSION_COOKIE_DOMAIN || '',
);
const ADMIN_WEB_MAX_BODY_BYTES = Math.max(
  8 * 1024,
  Number(process.env.ADMIN_WEB_MAX_BODY_BYTES || 1024 * 1024),
);
const LIVE_HEARTBEAT_MS = Math.max(
  10000,
  Number(process.env.ADMIN_WEB_LIVE_HEARTBEAT_MS || 20000),
);
const SESSION_SECURE_COOKIE = envBool('ADMIN_WEB_SECURE_COOKIE', false);
const ADMIN_WEB_HSTS_ENABLED = envBool(
  'ADMIN_WEB_HSTS_ENABLED',
  SESSION_SECURE_COOKIE,
);
const ADMIN_WEB_HSTS_MAX_AGE_SEC = Math.max(
  300,
  Number(process.env.ADMIN_WEB_HSTS_MAX_AGE_SEC || 31536000),
);
const ADMIN_WEB_TRUST_PROXY = envBool('ADMIN_WEB_TRUST_PROXY', false);
const ADMIN_WEB_ALLOW_TOKEN_QUERY = envBool('ADMIN_WEB_ALLOW_TOKEN_QUERY', false);
const ADMIN_WEB_ENFORCE_ORIGIN_CHECK = envBool(
  'ADMIN_WEB_ENFORCE_ORIGIN_CHECK',
  true,
);
const ADMIN_WEB_ALLOWED_ORIGINS = String(
  process.env.ADMIN_WEB_ALLOWED_ORIGINS || '',
).trim();
const ADMIN_WEB_CSP = String(
  process.env.ADMIN_WEB_CSP ||
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
).trim();
const ADMIN_WEB_USER =
  String(process.env.ADMIN_WEB_USER || 'admin').trim() || 'admin';
const LOGIN_RATE_LIMIT_WINDOW_MS = Math.max(
  10_000,
  Number(process.env.ADMIN_WEB_LOGIN_WINDOW_MS || 60_000),
);
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Math.max(
  3,
  Number(process.env.ADMIN_WEB_LOGIN_MAX_ATTEMPTS || 8),
);
let resolvedLoginPassword = null;
const liveClients = new Set();
let liveHeartbeatTimer = null;
let liveBusBound = false;
let metricsSeriesTimer = null;
const metricsSeries = createObservabilitySeriesState();
const METRICS_SERIES_KEYS = Object.freeze(Object.keys(metricsSeries));
const loginAttemptsByIp = new Map();
const loginFailureEvents = [];
const discordOauthStates = new Map();
let lastLoginSpikeAlertAt = 0;
const LOGIN_SPIKE_WINDOW_MS = Math.max(
  60 * 1000,
  Number(process.env.ADMIN_WEB_LOGIN_SPIKE_WINDOW_MS || 5 * 60 * 1000),
);
const LOGIN_SPIKE_THRESHOLD = Math.max(
  3,
  Number(process.env.ADMIN_WEB_LOGIN_SPIKE_THRESHOLD || 10),
);
const LOGIN_SPIKE_IP_THRESHOLD = Math.max(
  3,
  Number(process.env.ADMIN_WEB_LOGIN_SPIKE_IP_THRESHOLD || 5),
);
const LOGIN_SPIKE_ALERT_COOLDOWN_MS = Math.max(
  15 * 1000,
  Number(process.env.ADMIN_WEB_LOGIN_SPIKE_ALERT_COOLDOWN_MS || 60 * 1000),
);
const ADMIN_WEB_USER_ROLE = normalizeRole(
  process.env.ADMIN_WEB_USER_ROLE || 'owner',
);

function shouldBypassRestoreMaintenance(pathname) {
  const pathValue = String(pathname || '').trim();
  return (
    pathValue === '/admin/api/login'
    || pathValue === '/admin/api/logout'
    || pathValue === '/admin/api/backup/restore'
  );
}

function sendRestoreMaintenanceUnavailable(res) {
  return sendJson(res, 503, {
    ok: false,
    error: 'Backup restore is in progress',
    data: {
      restore: getAdminRestoreState(),
    },
  });
}
const ADMIN_WEB_TOKEN_ROLE = normalizeRole(
  process.env.ADMIN_WEB_TOKEN_ROLE || 'owner',
);
const ADMIN_WEB_USERS_JSON = String(process.env.ADMIN_WEB_USERS_JSON || '').trim();
const ADMIN_WEB_2FA_ENABLED = envBool('ADMIN_WEB_2FA_ENABLED', false);
const ADMIN_WEB_2FA_SECRET = String(process.env.ADMIN_WEB_2FA_SECRET || '').trim();
const ADMIN_WEB_2FA_ACTIVE = ADMIN_WEB_2FA_ENABLED && ADMIN_WEB_2FA_SECRET.length > 0;
const ADMIN_WEB_2FA_WINDOW_STEPS = Math.max(
  0,
  Number(process.env.ADMIN_WEB_2FA_WINDOW_STEPS || 1),
);
const ADMIN_WEB_STEP_UP_ENABLED = envBool(
  'ADMIN_WEB_STEP_UP_ENABLED',
  ADMIN_WEB_2FA_ACTIVE,
);
const ADMIN_WEB_STEP_UP_TTL_MS = Math.max(
  60 * 1000,
  Number(process.env.ADMIN_WEB_STEP_UP_TTL_MINUTES || 15) * 60 * 1000,
);
const ADMIN_WEB_ALLOW_TOKEN_SENSITIVE_MUTATIONS = envBool(
  'ADMIN_WEB_ALLOW_TOKEN_SENSITIVE_MUTATIONS',
  false,
);
const SSO_DISCORD_ENABLED = envBool('ADMIN_WEB_SSO_DISCORD_ENABLED', false);
const SSO_DISCORD_CLIENT_ID = String(
  process.env.ADMIN_WEB_SSO_DISCORD_CLIENT_ID || '',
).trim();
const SSO_DISCORD_CLIENT_SECRET = String(
  process.env.ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET || '',
).trim();
const SSO_DISCORD_ACTIVE =
  SSO_DISCORD_ENABLED &&
  SSO_DISCORD_CLIENT_ID.length > 0 &&
  SSO_DISCORD_CLIENT_SECRET.length > 0;
const SSO_DISCORD_REDIRECT_URI = String(
  process.env.ADMIN_WEB_SSO_DISCORD_REDIRECT_URI || '',
).trim();
const SSO_DISCORD_GUILD_ID = String(
  process.env.ADMIN_WEB_SSO_DISCORD_GUILD_ID || '',
).trim();
const SSO_DISCORD_DEFAULT_ROLE = normalizeRole(
  process.env.ADMIN_WEB_SSO_DEFAULT_ROLE || 'mod',
);
const SSO_STATE_TTL_MS = Math.max(
  60 * 1000,
  Number(process.env.ADMIN_WEB_SSO_STATE_TTL_MS || 10 * 60 * 1000),
);
const METRICS_SERIES_INTERVAL_MS = Math.max(
  2_000,
  Number(process.env.ADMIN_WEB_METRICS_SERIES_INTERVAL_MS || 15_000),
);
const METRICS_SERIES_RETENTION_MS = Math.max(
  10 * 60 * 1000,
  Number(process.env.ADMIN_WEB_METRICS_SERIES_RETENTION_MS || 24 * 60 * 60 * 1000),
);
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const STATIC_ICON_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg']);

const adminAuthRuntime = createAdminAuthRuntime({
  sessions,
  defaultUser: ADMIN_WEB_USER,
  sessionCookieName: SESSION_COOKIE_NAME,
  sessionTtlMs: SESSION_TTL_MS,
  sessionIdleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
  sessionMaxPerUser: SESSION_MAX_PER_USER,
  sessionBindUserAgent: SESSION_BIND_USER_AGENT,
  sessionCookiePath: SESSION_COOKIE_PATH,
  sessionCookieSameSite: SESSION_COOKIE_SAMESITE,
  sessionCookieDomain: SESSION_COOKIE_DOMAIN,
  sessionSecureCookie: SESSION_SECURE_COOKIE,
  adminWebAllowTokenQuery: ADMIN_WEB_ALLOW_TOKEN_QUERY,
  adminWebTokenRole: ADMIN_WEB_TOKEN_ROLE,
  adminWebStepUpEnabled: ADMIN_WEB_STEP_UP_ENABLED,
  adminWeb2faActive: ADMIN_WEB_2FA_ACTIVE,
  adminWeb2faSecret: ADMIN_WEB_2FA_SECRET,
  adminWeb2faWindowSteps: ADMIN_WEB_2FA_WINDOW_STEPS,
  adminWebStepUpTtlMs: ADMIN_WEB_STEP_UP_TTL_MS,
  adminWebAllowTokenSensitiveMutations: ADMIN_WEB_ALLOW_TOKEN_SENSITIVE_MUTATIONS,
  secureEqual,
  normalizeRole,
  getClientIp,
  getAdminToken,
  sendJson,
  requiredString,
  verifyTotpCode,
  recordAdminSecuritySignal,
  setRequestMeta,
});

const {
  buildClearSessionCookie,
  buildSessionCookie,
  createSession,
  ensureStepUpAuth,
  getAuthContext,
  getSessionId,
  hasFreshStepUp,
  hasValidSession,
  invalidateSession,
  isAuthorized,
  listAdminSessions,
  revokeSessionsForUser,
} = adminAuthRuntime;

function envBool(name, fallback = false) {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function normalizeCookiePath(value, fallback = '/') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (!text.startsWith('/')) return fallback;
  return text;
}

function normalizeSameSite(value, fallback = 'Lax') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'strict') return 'Strict';
  if (raw === 'none') return 'None';
  if (raw === 'lax') return 'Lax';
  return fallback;
}

function normalizeCookieDomain(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/[;\s]/.test(text)) return '';
  return text;
}

function parseCsvSet(value) {
  const out = new Set();
  for (const item of String(value || '').split(',')) {
    const text = item.trim();
    if (text) out.add(text);
  }
  return out;
}

function decodeBase32(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  if (!clean) return Buffer.alloc(0);
  let bits = '';
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeTotp(secretBuffer, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

function verifyTotpCode(secretText, otpInput, windowSteps = 1) {
  const secret = decodeBase32(secretText);
  if (!secret.length) return false;
  const otp = String(otpInput || '').trim();
  if (!/^\d{6}$/.test(otp)) return false;
  const nowCounter = Math.floor(Date.now() / 1000 / 30);
  const drift = Math.max(0, Math.trunc(Number(windowSteps || 0)));
  for (let i = -drift; i <= drift; i += 1) {
    const code = computeTotp(secret, nowCounter + i);
    if (secureEqual(code, otp)) return true;
  }
  return false;
}

function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

// Keep HTTP hardening in one place so HTML, JSON, downloads, and SSE all inherit the
// same baseline protections without each handler reimplementing headers.
function buildSecurityHeaders(extraHeaders = {}, options = {}) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  if (ADMIN_WEB_HSTS_ENABLED) {
    headers['Strict-Transport-Security'] = `max-age=${ADMIN_WEB_HSTS_MAX_AGE_SEC}; includeSubDomains`;
  }
  if (options.isHtml && ADMIN_WEB_CSP) {
    headers['Content-Security-Policy'] = ADMIN_WEB_CSP;
  }
  return { ...headers, ...extraHeaders };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload, jsonReplacer);
  res.writeHead(
    statusCode,
    buildSecurityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
    }),
  );
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(
    statusCode,
    buildSecurityHeaders(
      {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
      },
      { isHtml: true },
    ),
  );
  res.end(html);
}

function sendText(res, statusCode, text) {
  res.writeHead(
    statusCode,
    buildSecurityHeaders({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    }),
  );
  res.end(text);
}

function sendDownload(res, statusCode, body, options = {}) {
  const filename = String(options.filename || 'download.txt').trim() || 'download.txt';
  const contentType = String(options.contentType || 'application/octet-stream').trim()
    || 'application/octet-stream';
  const cacheControl = String(options.cacheControl || 'no-store').trim() || 'no-store';
  res.writeHead(
    statusCode,
    buildSecurityHeaders({
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Content-Disposition': `attachment; filename=\"${filename.replace(/"/g, '')}\"`,
    }),
  );
  res.end(body);
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function isAdminSecurityAnomaly(event = {}) {
  const severity = String(event.severity || '').trim().toLowerCase();
  if (severity === 'warn' || severity === 'error') return true;
  const type = String(event.type || '').trim().toLowerCase();
  return /fail|anomaly|mismatch|revoked|denied|blocked|expired/.test(type);
}

function matchesAdminSecurityEventQuery(event = {}, query = '') {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return true;
  return Object.values(event).some((value) => {
    if (value == null) return false;
    try {
      return String(typeof value === 'object' ? JSON.stringify(value) : value)
        .toLowerCase()
        .includes(normalized);
    } catch {
      return String(value).toLowerCase().includes(normalized);
    }
  });
}

function buildAdminSecurityEventExportRows(urlObj) {
  const q = requiredString(urlObj.searchParams.get('q'));
  const anomalyOnly = String(urlObj.searchParams.get('anomalyOnly') || '').trim().toLowerCase() === 'true';
  return listAdminSecurityEvents({
    limit: asInt(urlObj.searchParams.get('limit'), 2000) || 2000,
    type: requiredString(urlObj.searchParams.get('type')),
    severity: requiredString(urlObj.searchParams.get('severity')),
    actor: requiredString(urlObj.searchParams.get('actor')),
    targetUser: requiredString(urlObj.searchParams.get('targetUser')),
    sessionId: requiredString(urlObj.searchParams.get('sessionId')),
  }).filter((row) => {
    if (anomalyOnly && !isAdminSecurityAnomaly(row)) return false;
    return matchesAdminSecurityEventQuery(row, q);
  });
}

function buildAdminSecurityEventCsv(rows = []) {
  const headers = [
    'id',
    'at',
    'type',
    'severity',
    'actor',
    'targetUser',
    'role',
    'authMethod',
    'sessionId',
    'ip',
    'path',
    'reason',
    'detail',
  ];
  const body = (Array.isArray(rows) ? rows : [])
    .map((row) => headers.map((key) => escapeCsvCell(row?.[key])).join(','))
    .join('\n');
  return `${headers.join(',')}\n${body}${body ? '\n' : ''}`;
}

function getIconContentType(ext) {
  const normalized = String(ext || '').toLowerCase();
  if (normalized === '.png') return 'image/png';
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg';
  return 'image/webp';
}

function resolveStaticScumIconPath(pathname) {
  const prefixes = ['/assets/scum-items/', '/admin/assets/scum-items/'];
  let matchedPrefix = null;
  for (const prefix of prefixes) {
    if (String(pathname || '').startsWith(prefix)) {
      matchedPrefix = prefix;
      break;
    }
  }
  if (!matchedPrefix) return null;
  let relativeName = '';
  try {
    relativeName = decodeURIComponent(
      String(pathname || '').slice(matchedPrefix.length),
    );
  } catch {
    return null;
  }
  if (!relativeName || relativeName.includes('/') || relativeName.includes('\\')) {
    return null;
  }
  if (relativeName.includes('..')) {
    return null;
  }
  const ext = path.extname(relativeName).toLowerCase();
  if (!STATIC_ICON_EXT.has(ext)) {
    return null;
  }
  const absPath = path.resolve(scumItemsDirPath, relativeName);
  if (!absPath.startsWith(scumItemsDirPath)) {
    return null;
  }
  return {
    absPath,
    ext,
  };
}

async function tryServeStaticScumIcon(req, res, pathname) {
  if (req.method !== 'GET') return false;
  const resolved = resolveStaticScumIconPath(pathname);
  if (!resolved) return false;
  try {
    const stat = await fs.promises.stat(resolved.absPath);
    if (!stat.isFile()) {
      sendText(res, 404, 'Not found');
      return true;
    }
    res.writeHead(200, {
      ...buildSecurityHeaders({
        'Content-Type': getIconContentType(resolved.ext),
        'Cache-Control': 'public, max-age=86400',
      }),
    });
    await pipeline(fs.createReadStream(resolved.absPath), res);
    return true;
  } catch {
    sendText(res, 404, 'Not found');
    return true;
  }
}

function writeLiveEvent(res, eventType, payload) {
  if (!res || res.writableEnded) return;
  const body = JSON.stringify(
    {
      type: String(eventType || 'update'),
      payload: payload && typeof payload === 'object' ? payload : {},
      at: new Date().toISOString(),
    },
    jsonReplacer,
  );
  res.write(`event: ${String(eventType || 'update')}\n`);
  res.write(`data: ${body}\n\n`);
}

function stopLiveHeartbeatIfIdle() {
  if (liveClients.size > 0) return;
  if (!liveHeartbeatTimer) return;
  clearInterval(liveHeartbeatTimer);
  liveHeartbeatTimer = null;
}

function ensureLiveHeartbeat() {
  if (liveHeartbeatTimer) return;
  liveHeartbeatTimer = setInterval(() => {
    for (const res of liveClients) {
      writeLiveEvent(res, 'heartbeat', { now: Date.now() });
    }
  }, LIVE_HEARTBEAT_MS);
  if (typeof liveHeartbeatTimer.unref === 'function') {
    liveHeartbeatTimer.unref();
  }
}

function broadcastLiveUpdate(eventType, payload = {}) {
  if (liveClients.size === 0) return;
  for (const res of liveClients) {
    writeLiveEvent(res, eventType, payload);
  }
}

function openLiveStream(req, res) {
  res.writeHead(200, buildSecurityHeaders({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }));
  res.write(': connected\n\n');
  liveClients.add(res);
  ensureLiveHeartbeat();
  writeLiveEvent(res, 'connected', {
    clients: liveClients.size,
  });

  const cleanup = () => {
    liveClients.delete(res);
    stopLiveHeartbeatIfIdle();
  };
  // Keep SSE subscribers alive until the response/socket closes. On Node's server-side
  // request object, `close` can fire once the request payload is fully read, which would
  // unregister an otherwise healthy live stream too early.
  res.on('close', cleanup);
  res.on('error', cleanup);
  req.on('aborted', cleanup);
}

function captureMetricsSeries(now = Date.now()) {
  captureObservabilitySeries({
    seriesState: metricsSeries,
    retentionMs: METRICS_SERIES_RETENTION_MS,
    now,
    getDeliveryMetricsSnapshot,
    getDeliveryRuntimeStatus: getDeliveryRuntimeSnapshotSync,
    getLoginFailureMetrics,
    getWebhookMetricsSnapshot,
    getAdminRequestLogMetrics,
    getRuntimeSupervisorSnapshot: getCachedRuntimeSupervisorSnapshot,
  });
}

function clampMetricsWindowMs(value) {
  return clampObservabilityWindowMs(value, METRICS_SERIES_RETENTION_MS);
}

function parseMetricsSeriesKeys(value) {
  return parseObservabilitySeriesKeys(value, METRICS_SERIES_KEYS);
}

function listMetricsSeries(options = {}) {
  return listObservabilitySeries({
    seriesState: metricsSeries,
    retentionMs: METRICS_SERIES_RETENTION_MS,
    keys: Array.isArray(options.keys) ? options.keys : [],
    windowMs: options.windowMs,
  });
}

function ensureMetricsSeriesTimer() {
  if (metricsSeriesTimer) return;
  captureMetricsSeries();
  metricsSeriesTimer = setInterval(() => {
    captureMetricsSeries();
  }, METRICS_SERIES_INTERVAL_MS);
  if (typeof metricsSeriesTimer.unref === 'function') {
    metricsSeriesTimer.unref();
  }
}

function stopMetricsSeriesTimer() {
  if (!metricsSeriesTimer) return;
  clearInterval(metricsSeriesTimer);
  metricsSeriesTimer = null;
}

function closeAllLiveStreams() {
  if (liveClients.size === 0) {
    stopLiveHeartbeatIfIdle();
    return;
  }
  for (const res of liveClients) {
    try {
      if (!res.writableEnded) {
        res.end();
      }
      if (typeof res.destroy === 'function') {
        res.destroy();
      }
    } catch {}
  }
  liveClients.clear();
  stopLiveHeartbeatIfIdle();
}

function getDashboardHtml() {
  if (!cachedDashboardHtml) {
    cachedDashboardHtml = fs.readFileSync(dashboardHtmlPath, 'utf8');
  }
  return cachedDashboardHtml;
}

function getLoginHtml() {
  if (!cachedLoginHtml) {
    cachedLoginHtml = fs.readFileSync(loginHtmlPath, 'utf8');
  }
  return cachedLoginHtml;
}

function getAdminToken() {
  if (resolvedToken) return resolvedToken;
  const fromEnv = String(process.env.ADMIN_WEB_TOKEN || '').trim();
  if (fromEnv) {
    resolvedToken = fromEnv;
    return resolvedToken;
  }
  resolvedToken = crypto.randomBytes(18).toString('hex');
  console.warn('[admin-web] ยังไม่ได้ตั้งค่า ADMIN_WEB_TOKEN จึงสร้างโทเค็นเซสชันชั่วคราว:');
  console.warn(`[admin-web] ${resolvedToken}`);
  return resolvedToken;
}

function getAdminLoginPassword() {
  if (resolvedLoginPassword) return resolvedLoginPassword;

  const fromEnv = String(process.env.ADMIN_WEB_PASSWORD || '').trim();
  if (fromEnv) {
    resolvedLoginPassword = fromEnv;
    return resolvedLoginPassword;
  }

  // Backward compatibility: use token as password when explicit password is not set.
  resolvedLoginPassword = getAdminToken();
  return resolvedLoginPassword;
}

function parseAdminUsersFromEnv() {
  let users = [];
  if (ADMIN_WEB_USERS_JSON) {
    try {
      const parsed = JSON.parse(ADMIN_WEB_USERS_JSON);
      if (Array.isArray(parsed)) {
        users = parsed
          .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const username = String(row.username || '').trim();
            const password = String(row.password || '').trim();
            if (!username || !password) return null;
            return {
              username,
              password,
              role: normalizeRole(row.role || 'mod'),
              tenantId: String(row.tenantId || '').trim() || null,
            };
          })
          .filter(Boolean);
      }
    } catch (error) {
      console.warn('[admin-web] ADMIN_WEB_USERS_JSON parse failed:', error.message);
    }
  }

  if (users.length === 0) {
    users.push({
      username: ADMIN_WEB_USER,
      password: getAdminLoginPassword(),
      role: ADMIN_WEB_USER_ROLE,
      tenantId: null,
    });
  }

  return users;
}

function getAdminUsersDatabaseEngine() {
  const runtime = resolveDatabaseRuntime();
  return runtime.engine === 'unsupported' ? 'sqlite' : runtime.engine;
}

function isIgnorableAddColumnError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('duplicate column')
    || message.includes('already exists');
}

function createAdminPasswordHash(password) {
  const pass = String(password || '');
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(pass, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function verifyAdminPassword(password, passwordHash) {
  const pass = String(password || '');
  const stored = String(passwordHash || '').trim();
  if (!stored) return false;

  // Backward compatibility with legacy plain-text passwords.
  if (!stored.startsWith('scrypt$')) {
    return secureEqual(pass, stored);
  }

  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const saltHex = parts[1];
  const hashHex = parts[2];
  if (!saltHex || !hashHex) return false;

  let salt;
  let expected;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;

  const actual = crypto.scryptSync(pass, salt, expected.length);
  return secureEqual(actual.toString('hex'), expected.toString('hex'));
}

async function ensureAdminUsersTable() {
  const engine = getAdminUsersDatabaseEngine();
  if (engine === 'postgresql') {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_web_users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'mod',
        tenant_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_web_users (
        username TEXT PRIMARY KEY COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'mod',
        tenant_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE admin_web_users
      ADD COLUMN tenant_id TEXT;
    `);
  } catch (error) {
    if (!isIgnorableAddColumnError(error)) {
      throw error;
    }
  }
}

async function seedAdminUsersFromEnv() {
  const users = parseAdminUsersFromEnv();
  for (const user of users) {
    await prisma.$executeRaw`
      INSERT INTO admin_web_users (
        username,
        password_hash,
        role,
        tenant_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        ${String(user.username || '').trim()},
        ${createAdminPasswordHash(user.password)},
        ${normalizeRole(user.role)},
        ${String(user.tenantId || '').trim() || null},
        ${true},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (username) DO NOTHING
    `;
  }
}

async function listAdminUsersFromDb(limit = 100, options = {}) {
  const { activeOnly = true } = options;
  const normalizedLimit = Math.max(1, Math.trunc(Number(limit || 100)));
  const rows = activeOnly
    ? await prisma.$queryRaw`
      SELECT
        username,
        role,
        tenant_id AS "tenantId",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM admin_web_users
      WHERE is_active = ${true}
      ORDER BY username ASC
      LIMIT ${normalizedLimit}
    `
    : await prisma.$queryRaw`
      SELECT
        username,
        role,
        tenant_id AS "tenantId",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM admin_web_users
      ORDER BY username ASC
      LIMIT ${normalizedLimit}
    `;

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    username: String(row?.username || '').trim(),
    role: normalizeRole(row?.role || 'mod'),
    tenantId: String(row?.tenantId || '').trim() || null,
    isActive: row?.isActive === true || Number(row?.isActive || 0) === 1,
    createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  }));
}

async function getAdminUserByUsername(username) {
  const name = String(username || '').trim();
  if (!name) return null;
  const rows = await prisma.$queryRaw`
    SELECT
      username,
      password_hash AS "passwordHash",
      role,
      tenant_id AS "tenantId",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM admin_web_users
    WHERE username = ${name}
    LIMIT 1
  `;
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) return null;
  return {
    username: String(row.username || '').trim(),
    passwordHash: String(row.passwordHash || '').trim(),
    role: normalizeRole(row.role || 'mod'),
    tenantId: String(row.tenantId || '').trim() || null,
    isActive: row.isActive === true || Number(row.isActive || 0) === 1,
    createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

async function countActiveOwnerUsers() {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM admin_web_users
    WHERE is_active = ${true}
      AND lower(role) = 'owner'
  `;
  const total = Array.isArray(rows) && rows.length > 0
    ? Number(rows[0]?.total || 0)
    : 0;
  return Number.isFinite(total) ? total : 0;
}

function normalizeAdminUsername(value) {
  const username = String(value || '').trim();
  if (!username) return '';
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) return '';
  return username;
}

async function upsertAdminUserInDb(input = {}) {
  const username = normalizeAdminUsername(input.username);
  const role = normalizeRole(input.role || 'mod');
  const isActive = input.isActive !== false;
  const password = String(input.password || '').trim();
  const tenantId = String(input.tenantId || '').trim() || null;
  if (!username) {
    throw new Error('Invalid username');
  }

  await ensureAdminUsersReady();
  const existing = await getAdminUserByUsername(username);
  if (!existing && !password) {
    throw new Error('Password is required for a new admin user');
  }

  const willRemainOwner = role === 'owner' && isActive;
  if (
    existing
    && existing.role === 'owner'
    && existing.isActive
    && !willRemainOwner
  ) {
    const ownerCount = await countActiveOwnerUsers();
    if (ownerCount <= 1) {
      throw new Error('Cannot remove the last active owner');
    }
  }

  if (!existing) {
    await prisma.$executeRaw`
      INSERT INTO admin_web_users (
        username,
        password_hash,
        role,
        tenant_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        ${username},
        ${createAdminPasswordHash(password)},
        ${role},
        ${tenantId},
        ${isActive},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
  } else if (password) {
    await prisma.$executeRaw`
      UPDATE admin_web_users
      SET password_hash = ${createAdminPasswordHash(password)},
          role = ${role},
          tenant_id = ${tenantId},
          is_active = ${isActive},
          updated_at = CURRENT_TIMESTAMP
      WHERE username = ${username}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE admin_web_users
      SET role = ${role},
          tenant_id = ${tenantId},
          is_active = ${isActive},
          updated_at = CURRENT_TIMESTAMP
      WHERE username = ${username}
    `;
  }

  return getAdminUserByUsername(username);
}

async function ensureAdminUsersReady() {
  if (adminUsersReadyPromise) return adminUsersReadyPromise;

  adminUsersReadyPromise = (async () => {
    await ensureAdminUsersTable();
    await seedAdminUsersFromEnv();
    const users = await listAdminUsersFromDb(1);
    if (!users.length) {
      throw new Error('No active admin users in database');
    }
  })().catch((error) => {
    adminUsersReadyPromise = null;
    throw error;
  });

  return adminUsersReadyPromise;
}

async function getUserByCredentials(username, password) {
  const name = String(username || '').trim();
  const pass = String(password || '');
  if (!name || !pass) return null;

  await ensureAdminUsersReady();
  const rows = await prisma.$queryRaw`
    SELECT
      username,
      password_hash AS "passwordHash",
      role,
      tenant_id AS "tenantId",
      is_active AS "isActive"
    FROM admin_web_users
    WHERE username = ${name}
    LIMIT 1
  `;
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row || !(row.isActive === true || Number(row.isActive || 0) === 1)) return null;
  if (!verifyAdminPassword(pass, row.passwordHash)) return null;

  return {
    username: String(row.username || '').trim(),
    role: normalizeRole(row.role || 'mod'),
    tenantId: String(row.tenantId || '').trim() || null,
    authMethod: 'password-db',
  };
}

function getSsoDiscordRole(roleIds = []) {
  const mappingSummary = getAdminSsoRoleMappingSummary(process.env);
  return resolveMappedMemberRole(roleIds, [], mappingSummary);
}

function getControlPanelEnvFileValues() {
  return getAdminEditableEnvFileValues();
}

function buildControlPanelEnvSection(fileKey, values = {}) {
  return buildAdminEditableEnvSection(fileKey, values);
}

function buildCommandRegistry(client) {
  const disabled = Array.isArray(config.commands?.disabled)
    ? new Set(
      config.commands.disabled
        .map((entry) => String(entry || '').trim())
        .filter(Boolean),
    )
    : new Set();
  const commandEntries = client?.commands instanceof Map
    ? Array.from(client.commands.values())
    : Array.isArray(client?.commands)
      ? client.commands
      : [];

  return commandEntries
    .map((entry) => {
      const json = typeof entry?.data?.toJSON === 'function'
        ? entry.data.toJSON()
        : null;
      const name = String(
        json?.name || entry?.data?.name || entry?.name || '',
      ).trim();
      if (!name) return null;
      return {
        name,
        description: String(
          json?.description || entry?.description || '',
        ).trim(),
        disabled: disabled.has(name),
        requiredRole: getRequiredCommandAccessRole(name, config.commands),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function buildControlPanelSettings(client, auth = null, options = {}) {
  const envValues = getControlPanelEnvFileValues();
  const authTenantId = String(auth?.tenantId || '').trim() || null;
  const scopedTenantId = String(options.tenantId || auth?.tenantId || '').trim() || null;
  return {
    env: {
      root: authTenantId ? {} : buildControlPanelEnvSection('root', envValues.root),
      portal: authTenantId ? {} : buildControlPanelEnvSection('portal', envValues.portal),
    },
    commands: buildCommandRegistry(client),
    adminUsers: auth && hasRoleAtLeast(auth.role, 'owner')
      ? await listAdminUsersFromDb(250, { activeOnly: false })
      : [],
    commandConfig: {
      disabled: Array.isArray(config.commands?.disabled)
        ? config.commands.disabled.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [],
      permissions:
        config.commands && typeof config.commands.permissions === 'object' && config.commands.permissions
          ? { ...config.commands.permissions }
          : {},
    },
    managedServices: listManagedRuntimeServices(),
    files: {
      root: getRootEnvFilePath(),
      portal: getPortalEnvFilePath(),
    },
    tenantScope: {
      tenantId: authTenantId,
      requestedTenantId: scopedTenantId,
      tenantConfig: scopedTenantId ? await getPlatformTenantConfig(scopedTenantId) : null,
    },
    reloadRequired: true,
  };
}

function buildControlPanelEnvPatch(body = {}) {
  return buildAdminEditableEnvPatch(body);
}

function getDiscordRedirectUri(host, port) {
  if (SSO_DISCORD_REDIRECT_URI) return SSO_DISCORD_REDIRECT_URI;
  return `http://${host}:${port}/admin/auth/discord/callback`;
}

function cleanupDiscordOauthStates() {
  const now = Date.now();
  for (const [state, payload] of discordOauthStates.entries()) {
    if (!payload || now - payload.createdAt > SSO_STATE_TTL_MS) {
      discordOauthStates.delete(state);
    }
  }
}

function getClientIp(req) {
  if (ADMIN_WEB_TRUST_PROXY) {
    const forwarded = String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    if (forwarded) return forwarded;
  }
  return String(req.socket?.remoteAddress || '').trim() || 'unknown';
}

function cleanupLoginAttempts(now = Date.now()) {
  for (const [ip, entry] of loginAttemptsByIp.entries()) {
    if (!entry || now - entry.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
      loginAttemptsByIp.delete(ip);
    }
  }
}

function cleanupLoginFailureEvents(now = Date.now()) {
  const cutoff = now - LOGIN_SPIKE_WINDOW_MS;
  while (loginFailureEvents.length > 0 && loginFailureEvents[0].at < cutoff) {
    loginFailureEvents.shift();
  }
}

function getLoginFailureMetrics(now = Date.now()) {
  cleanupLoginFailureEvents(now);
  const byIp = new Map();
  for (const event of loginFailureEvents) {
    const ip = event?.ip || 'unknown';
    byIp.set(ip, (byIp.get(ip) || 0) + 1);
  }
  const hotIps = Array.from(byIp.entries())
    .filter(([, count]) => count >= LOGIN_SPIKE_IP_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([ip, count]) => ({ ip, count }));
  return {
    windowMs: LOGIN_SPIKE_WINDOW_MS,
    failures: loginFailureEvents.length,
    threshold: LOGIN_SPIKE_THRESHOLD,
    perIpThreshold: LOGIN_SPIKE_IP_THRESHOLD,
    hotIps,
  };
}

function maybeAlertLoginFailureSpike(now = Date.now()) {
  const metrics = getLoginFailureMetrics(now);
  const hasGlobalSpike = metrics.failures >= LOGIN_SPIKE_THRESHOLD;
  const hasIpSpike = metrics.hotIps.length > 0;
  if (!hasGlobalSpike && !hasIpSpike) return;
  if (now - lastLoginSpikeAlertAt < LOGIN_SPIKE_ALERT_COOLDOWN_MS) return;
  lastLoginSpikeAlertAt = now;

  const payload = {
    source: 'admin-login',
    kind: hasGlobalSpike ? 'global-spike' : 'ip-spike',
    windowMs: metrics.windowMs,
    failures: metrics.failures,
    threshold: metrics.threshold,
    hotIps: metrics.hotIps.slice(0, 5),
  };
  console.warn(
    `[admin-web][alert] login failure spike: failures=${metrics.failures} windowMs=${metrics.windowMs}`,
  );
  publishAdminLiveUpdate('ops-alert', payload);
}

function getLoginRateLimitState(req) {
  const now = Date.now();
  cleanupLoginAttempts(now);
  const ip = getClientIp(req);
  const entry = loginAttemptsByIp.get(ip);
  if (!entry) {
    return { limited: false, ip, retryAfterMs: 0 };
  }

  if (entry.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterMs = Math.max(
      0,
      LOGIN_RATE_LIMIT_WINDOW_MS - (now - entry.firstAt),
    );
    return { limited: retryAfterMs > 0, ip, retryAfterMs };
  }

  return { limited: false, ip, retryAfterMs: 0 };
}

function recordLoginAttempt(req, success) {
  const now = Date.now();
  cleanupLoginAttempts(now);
  cleanupLoginFailureEvents(now);
  const ip = getClientIp(req);

  if (success) {
    loginAttemptsByIp.delete(ip);
    recordAdminSecuritySignal('login-succeeded', {
      actor: String(req?.__pendingAdminUser || '').trim() || 'unknown',
      targetUser: String(req?.__pendingAdminUser || '').trim() || 'unknown',
      authMethod: String(req?.__pendingAdminAuthMethod || 'password'),
      ip,
      path: '/admin/api/login',
      detail: 'Admin login succeeded',
    });
    return;
  }

  loginFailureEvents.push({ at: now, ip });
  recordAdminSecuritySignal('login-failed', {
    severity: 'warn',
    actor: String(req?.__pendingAdminUser || '').trim() || 'unknown',
    targetUser: String(req?.__pendingAdminUser || '').trim() || 'unknown',
    authMethod: String(req?.__pendingAdminAuthMethod || 'password'),
    ip,
    path: '/admin/api/login',
    reason: String(req?.__pendingAdminFailureReason || 'invalid-credentials'),
    detail: 'Admin login failed',
    notify: true,
  });
  maybeAlertLoginFailureSpike(now);

  const existing = loginAttemptsByIp.get(ip);
  if (!existing || now - existing.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginAttemptsByIp.set(ip, { count: 1, firstAt: now });
    return;
  }

  loginAttemptsByIp.set(ip, { count: existing.count + 1, firstAt: existing.firstAt });
}

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function setRequestMeta(req, patch = {}) {
  if (!req || typeof req !== 'object') return {};
  const current = req.__adminRequestMeta && typeof req.__adminRequestMeta === 'object'
    ? req.__adminRequestMeta
    : {};
  req.__adminRequestMeta = {
    ...current,
    ...(patch && typeof patch === 'object' ? patch : {}),
  };
  return req.__adminRequestMeta;
}

function buildSecurityNotificationMessage(event = {}) {
  const parts = [
    event.detail || event.type || 'security-event',
    event.actor ? `actor=${event.actor}` : '',
    event.targetUser ? `target=${event.targetUser}` : '',
    event.ip ? `ip=${event.ip}` : '',
    event.reason ? `reason=${event.reason}` : '',
  ].filter(Boolean);
  return parts.join(' • ');
}

function recordAdminSecuritySignal(type, options = {}) {
  const normalizedType = String(type || 'security-event').trim() || 'security-event';
  const severity = String(options.severity || (options.notify ? 'warn' : 'info')).trim() || 'info';
  const event = recordAdminSecurityEvent({
    type: normalizedType,
    severity,
    actor: options.actor || null,
    targetUser: options.targetUser || null,
    role: options.role || null,
    authMethod: options.authMethod || null,
    sessionId: options.sessionId || null,
    ip: options.ip || null,
    path: options.path || null,
    reason: options.reason || null,
    detail: options.detail || null,
    data: options.data || null,
  });
  publishAdminLiveUpdate('admin-security', event);
  if (options.notify === true || severity === 'warn' || severity === 'error') {
    addAdminNotification({
      type: 'security',
      source: 'admin-auth',
      kind: normalizedType,
      severity,
      title: options.title || 'Admin Security Event',
      message: buildSecurityNotificationMessage(event),
      entityKey: event.sessionId || event.targetUser || null,
      data: event,
    });
  }
  return event;
}

function ensureRole(req, urlObj, minRole, res) {
  const auth = getAuthContext(req, urlObj);
  if (!auth) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return null;
  }
  if (!hasRoleAtLeast(auth.role, minRole)) {
    sendJson(res, 403, {
      ok: false,
      error: `Forbidden: ${minRole} role required`,
      role: auth.role,
    });
    return null;
  }
  return auth;
}

function resolveScopedTenantId(req, res, auth, requestedTenantId = '', options = {}) {
  const result = resolveTenantScope({
    auth,
    requestedTenantId,
    required: options.required === true,
  });
  if (!result.ok) {
    sendJson(res, result.statusCode || 400, {
      ok: false,
      error: result.error || 'Invalid tenant scope',
      ...(result.tenantId ? { tenantId: result.tenantId } : {}),
    });
    return null;
  }
  return result.tenantId;
}

function getForwardedDiscordId(req) {
  const value = String(req.headers['x-forwarded-discord-id'] || '').trim();
  if (!/^\d{15,25}$/.test(value)) return '';
  return value;
}

function ensurePortalTokenAuth(req, urlObj, res) {
  const auth = getAuthContext(req, urlObj);
  if (!auth) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return null;
  }
  if (auth.mode !== 'token') {
    sendJson(res, 403, {
      ok: false,
      error: 'Portal endpoint requires token auth',
    });
    return null;
  }
  const discordId = getForwardedDiscordId(req);
  if (!discordId) {
    sendJson(res, 400, {
      ok: false,
      error: 'Missing x-forwarded-discord-id header',
    });
    return null;
  }
  return {
    auth,
    discordId,
    forwardedUser: String(req.headers['x-forwarded-user'] || '').trim() || 'portal',
  };
}

function getPlatformApiKeyFromRequest(req) {
  const headerKey = String(req.headers['x-platform-api-key'] || '').trim();
  if (headerKey) return headerKey;
  const authHeader = String(req.headers.authorization || '').trim();
  if (/^bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^bearer\s+/i, '').trim();
  }
  return '';
}

async function ensurePlatformApiKey(req, res, requiredScopes = []) {
  const rawKey = getPlatformApiKeyFromRequest(req);
  const auth = await verifyPlatformApiKey(rawKey, requiredScopes);
  if (!auth?.ok) {
    const status = [
      'insufficient-scope',
      'tenant-access-suspended',
      'tenant-subscription-inactive',
      'tenant-license-inactive',
    ].includes(String(auth?.reason || '').trim())
      ? 403
      : 401;
    sendJson(res, status, {
      ok: false,
      error: auth?.reason || 'invalid-platform-api-key',
      missingScopes: Array.isArray(auth?.missingScopes) ? auth.missingScopes : [],
    });
    return null;
  }
  setRequestMeta(req, {
    authMode: 'platform-api-key',
    user: auth.apiKey?.name || 'platform-api-key',
    role: 'tenant',
    tenantId: auth.tenant?.id || null,
  });
  return auth;
}

function filterShopItems(rows, options = {}) {
  const kindFilter = String(options.kind || '').trim().toLowerCase();
  const query = String(options.q || '').trim().toLowerCase();
  const limit = Math.max(
    1,
    Math.min(1000, Number(options.limit || 200)),
  );
  const out = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const kind = String(row?.kind || 'item').trim().toLowerCase() === 'vip'
      ? 'vip'
      : 'item';
    if (kindFilter && kindFilter !== 'all' && kind !== kindFilter) continue;

    const haystack = [
      row?.id,
      row?.name,
      row?.description,
      row?.gameItemId,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    if (query && !haystack.includes(query)) continue;

    out.push({
      ...row,
      kind,
      iconUrl: row?.iconUrl || resolveItemIconUrl(row),
    });
    if (out.length >= limit) break;
  }

  return out;
}

function requiredRoleForPostPath(pathname) {
  return getAdminPermissionForPath(pathname, 'POST')?.minRole || 'admin';
}

function normalizeOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return '';
  }
}

function buildAllowedOrigins(host, port) {
  const out = new Set();
  const add = (value) => {
    const normalized = normalizeOrigin(value);
    if (normalized) out.add(normalized);
  };

  add(`http://127.0.0.1:${port}`);
  add(`http://localhost:${port}`);
  if (host && host !== '0.0.0.0' && host !== '::') {
    add(`http://${host}:${port}`);
  }

  for (const item of ADMIN_WEB_ALLOWED_ORIGINS.split(',')) {
    add(item);
  }

  return out;
}

function getRequestOrigin(req) {
  const fromOrigin = normalizeOrigin(req.headers.origin);
  if (fromOrigin) return fromOrigin;
  const referrer = String(req.headers.referer || '').trim();
  if (!referrer) return '';
  try {
    return new URL(referrer).origin.toLowerCase();
  } catch {
    return '';
  }
}

function isSafeHttpMethod(method) {
  const text = String(method || '').toUpperCase();
  return text === 'GET' || text === 'HEAD' || text === 'OPTIONS';
}

function violatesBrowserOriginPolicy(req, allowedOrigins) {
  if (!ADMIN_WEB_ENFORCE_ORIGIN_CHECK) return false;
  const fetchSite = String(req.headers['sec-fetch-site'] || '')
    .trim()
    .toLowerCase();
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return true;
  }

  const origin = getRequestOrigin(req);
  if (!origin) return false;
  return !allowedOrigins.has(origin);
}

function asInt(value, fallback = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function requiredString(body, key) {
  const source = typeof key === 'undefined' ? body : body?.[key];
  const value = String(source || '').trim();
  return value || null;
}

function parseStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed)
        ? parsed.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }
  return text
    .split(/[\r\n,]+/)
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function createHttpError(statusCode, message) {
  const error = new Error(String(message || 'Request error'));
  error.statusCode = Number(statusCode) || 500;
  return error;
}

function parseDeliveryItemsBody(input) {
  let candidate = input;
  if (typeof candidate === 'string') {
    const raw = candidate.trim();
    if (!raw) return [];
    try {
      candidate = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate)) return [];

  const out = [];
  for (const row of candidate) {
    if (!row || typeof row !== 'object') continue;
    const gameItemId = String(row.gameItemId || row.id || '').trim();
    if (!gameItemId) continue;
    const quantity = Math.max(1, asInt(row.quantity, 1) || 1);
    const iconUrl = String(row.iconUrl || '').trim() || null;
    out.push({ gameItemId, quantity, iconUrl });
  }
  return out;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      body += chunk;
      bytes += Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(String(chunk));
      if (bytes > ADMIN_WEB_MAX_BODY_BYTES) {
        done = true;
        reject(createHttpError(413, 'เนื้อหาคำขอใหญ่เกินกำหนด'));
        req.resume();
      }
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(createHttpError(400, 'รูปแบบ JSON ไม่ถูกต้อง'));
      }
    });
    req.on('error', (error) => {
      if (done) return;
      done = true;
      reject(error);
    });
  });
}

async function getCurrentObservabilitySnapshot(options = {}) {
  const snapshot = buildAdminObservabilitySnapshot({
    windowMs: options.windowMs,
    seriesKeys: Array.isArray(options.seriesKeys) ? options.seriesKeys : [],
    retentionMs: METRICS_SERIES_RETENTION_MS,
    captureSeries: () => captureMetricsSeries(),
    getDeliveryMetricsSnapshot,
    getLoginFailureMetrics,
    getWebhookMetricsSnapshot,
    getAdminRequestLogMetrics,
    listAdminRequestLogs,
    listDeliveryQueue,
    listSeries: ({ windowMs, keys }) => listMetricsSeries({ windowMs, keys }),
  });
  snapshot.deliveryRuntime = await getDeliveryRuntimeStatus();
  snapshot.runtimeSupervisor = getCachedRuntimeSupervisorSnapshot();
  snapshot.platformOps = getPlatformOpsState();
  return snapshot;
}

async function tryNotifyTicket(client, ticket, action, staffId) {
  try {
    if (!ticket?.channelId) return;
    const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel) return;
    if (action === 'claim') {
      if (!channel.isTextBased || !channel.isTextBased()) return;
      await channel.send(`รับเรื่อง ticket จากเว็บแอดมินโดย <@${staffId}>`).catch(() => null);
      return;
    }
    if (action === 'close') {
      if (channel.isTextBased && channel.isTextBased()) {
        await channel.send('ปิด ticket จากเว็บแอดมิน (กำลังลบห้อง)').catch(() => null);
      }

      try {
        const reason = ticket?.id
          ? `Ticket #${ticket.id} closed from admin web`
          : 'Ticket closed from admin web';
        await channel.delete(reason);
        return;
      } catch (error) {
        if (ticket.userId && channel.permissionOverwrites?.edit) {
          await channel.permissionOverwrites
            .edit(ticket.userId, { SendMessages: false })
            .catch(() => null);
        }
        if (channel.isTextBased && channel.isTextBased()) {
          await channel
            .send('ปิด ticket แล้ว (แต่ลบห้องไม่สำเร็จ)')
            .catch(() => null);
        }
      }
    }
  } catch {
    // Best effort only.
  }
}

const handleAdminEntityPostRoute = createAdminEntityPostRoutes({
  sendJson,
  requiredString,
  asInt,
  claimSupportTicket,
  closeSupportTicket,
  tryNotifyTicket,
  createBountyForUser,
  cancelBountyForUser,
  createServerEvent,
  startServerEvent,
  finishServerEvent,
  joinServerEvent,
  bindSteamLinkForUser,
  removeSteamLink,
  upsertPlayerAccount,
  bindPlayerSteamId,
  unbindPlayerSteamId,
  grantVipForUser,
  revokeVipForUser,
  createRedeemCodeForAdmin,
  deleteRedeemCodeForAdmin,
  resetRedeemCodeUsageForAdmin,
  createPunishmentEntry,
  revokeWelcomePackClaimForAdmin,
  clearWelcomePackClaimsForAdmin,
  addKillsForUser,
  addDeathsForUser,
  addPlaytimeForUser,
  queueLeaderboardRefreshForAllGuilds,
});

const handleAdminConfigPostRoute = createAdminConfigPostRoutes({
  sendJson,
  requiredString,
  parseStringArray,
  getAuthTenantId,
  buildControlPanelEnvPatch,
  updateEnvFile,
  getRootEnvFilePath,
  getPortalEnvFilePath,
  recordAdminSecuritySignal,
  getClientIp,
  upsertAdminUserInDb,
  restartManagedRuntimeServices,
  config,
  resolveScopedTenantId,
  getPlatformTenantById,
  upsertPlatformTenantConfig,
});

const handleAdminGetRoute = createAdminGetRoutes({
  prisma,
  sendJson,
  sendDownload,
  ensureRole,
  ensurePortalTokenAuth,
  getAuthContext,
  getAuthTenantId,
  getSessionId,
  hasFreshStepUp,
  hasValidSession,
  resolveScopedTenantId,
  filterRowsByTenantScope,
  requiredString,
  asInt,
  jsonReplacer,
  getAdminSsoRoleMappingSummary,
  getAdminPermissionMatrixSummary,
  buildRoleMatrix,
  listAdminPermissionMatrix,
  listAdminSecurityEvents,
  buildAdminSecurityEventExportRows,
  buildAdminSecurityEventCsv,
  listAdminSessions,
  listAdminUsersFromDb,
  buildControlPanelSettings,
  buildCommandRegistry,
  getRuntimeSupervisorSnapshot,
  getAdminRestoreState,
  getPlatformAnalyticsOverview,
  getPlatformPublicOverview,
  getPlatformPermissionCatalog,
  getPlanCatalog,
  getPlatformOpsState,
  getPlatformTenantConfig,
  getTenantQuotaSnapshot,
  listPlatformTenants,
  listPlatformTenantConfigs,
  listPlatformSubscriptions,
  listPlatformLicenses,
  listPlatformApiKeys,
  listPlatformWebhookEndpoints,
  listPlatformAgentRuntimes,
  listMarketplaceOffers,
  reconcileDeliveryState,
  clampMetricsWindowMs,
  parseMetricsSeriesKeys,
  getCurrentObservabilitySnapshot,
  getAdminRequestLogMetrics,
  listAdminRequestLogs,
  buildObservabilityCsv,
  buildObservabilityExportPayload,
  openLiveStream,
  listItemIconCatalog,
  listWikiWeaponCatalog,
  getWikiWeaponCatalogMeta,
  listManifestItemCatalog,
  getManifestItemCatalogMeta,
  listShopItems,
  filterShopItems,
  listUserPurchases,
  normalizePurchaseStatus,
  getPlayerDashboard,
  listActiveBountiesForUser,
  listFilteredDeliveryQueue,
  listFilteredDeliveryDeadLetters,
  getDeliveryRuntimeStatus,
  listScumAdminCommandCapabilities,
  listAdminCommandCapabilityPresets,
  getDeliveryCommandOverride,
  getDeliveryDetailsByPurchaseCode,
  listAdminNotifications,
  listKnownPurchaseStatuses,
  listAllowedPurchaseTransitions,
  buildAdminDashboardCards,
  listPlayerAccounts,
  buildAdminSnapshot,
  listAdminBackupFiles,
  SSO_DISCORD_ACTIVE,
  ADMIN_WEB_2FA_ACTIVE,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  SESSION_COOKIE_SAMESITE,
  SESSION_SECURE_COOKIE,
  SESSION_COOKIE_DOMAIN,
  SESSION_TTL_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_PER_USER,
  SESSION_BIND_USER_AGENT,
  ADMIN_WEB_STEP_UP_ENABLED,
  ADMIN_WEB_STEP_UP_TTL_MS,
  ADMIN_WEB_ALLOW_TOKEN_SENSITIVE_MUTATIONS,
});

const handleAdminAuthPostRoute = createAdminAuthPostRoutes({
  sendJson,
  requiredString,
  invalidateSession,
  revokeSessionsForUser,
  buildClearSessionCookie,
});

const handleAdminCommerceDeliveryPostRoute = createAdminCommerceDeliveryPostRoutes({
  sendJson,
  requiredString,
  asInt,
  parseStringArray,
  listKnownPurchaseStatuses,
  setCoinsExact,
  creditCoins,
  debitCoins,
  addShopItemForAdmin,
  setShopItemPriceForAdmin,
  deleteShopItemForAdmin,
  updatePurchaseStatusForActor,
  queueLeaderboardRefreshForAllGuilds,
  parseDeliveryItemsBody,
  enqueuePurchaseDeliveryByCode,
  retryDeliveryNow,
  retryDeliveryNowMany,
  retryDeliveryDeadLetter,
  retryDeliveryDeadLetterMany,
  removeDeliveryDeadLetter,
  cancelDeliveryJob,
  previewDeliveryCommands,
  getDeliveryPreflightReport,
  simulateDeliveryPlan,
  setDeliveryCommandOverride,
  sendTestDeliveryCommand,
  saveAdminCommandCapabilityPreset,
  getAdminCommandCapabilityPresetById,
  deleteAdminCommandCapabilityPreset,
  testScumAdminCommandCapability,
  runRentBikeMidnightReset,
  getRentBikeRuntime,
  updateScumStatusForAdmin,
  getStatus,
});

const handleAdminPortalPostRoute = createAdminPortalPostRoutes({
  sendJson,
  ensurePortalTokenAuth,
  readJsonBody,
  requiredString,
  redeemCodeForUser,
  requestRentBikeForUser,
  createBountyForUser,
});

const handleAdminPlatformPostRoute = createAdminPlatformPostRoutes({
  sendJson,
  requiredString,
  parseStringArray,
  getAuthTenantId,
  resolveScopedTenantId,
  createAdminBackup,
  previewAdminBackupRestore,
  restoreAdminBackup,
  getCurrentObservabilitySnapshot,
  publishAdminLiveUpdate,
  createTenant,
  createSubscription,
  issuePlatformLicense,
  listPlatformLicenses,
  acceptPlatformLicenseLegal,
  createPlatformApiKey,
  createPlatformWebhookEndpoint,
  dispatchPlatformWebhookEvent,
  createMarketplaceOffer,
  reconcileDeliveryState,
  runPlatformMonitoringCycle,
  acknowledgeAdminNotifications,
  clearAdminNotifications,
});

const handleAdminAuditRoute = createAdminAuditRoutes({
  ensureRole,
  sendJson,
  sendDownload,
  requiredString,
  readJsonBody,
  buildAuditDatasetService,
  buildAuditExportPayloadService,
  buildAuditCsvService,
  listAuditPresetsService,
  saveAuditPresetService,
  deleteAuditPresetService,
  prisma,
  listEvents,
  getParticipants,
  jsonReplacer,
});

// POST actions are centralized here so restore-maintenance gating, RBAC, validation,
// and audit/live-update hooks stay consistent across the admin surface.
async function handlePostAction(client, req, urlObj, pathname, body, res, auth) {
  if (await handleAdminAuthPostRoute({ pathname, body, res, auth })) {
    return;
  }

  if (await handleAdminEntityPostRoute({ client, req, pathname, body, res, auth })) {
    return;
  }

  if (await handleAdminConfigPostRoute({ req, pathname, body, res, auth })) {
    return;
  }

  if (await handleAdminCommerceDeliveryPostRoute({ client, pathname, body, res, auth })) {
    return;
  }

  if (await handleAdminPortalPostRoute({ req, res, urlObj, pathname })) {
    return;
  }

  if (await handleAdminPlatformPostRoute({ client, req, pathname, body, res, auth })) {
    return;
  }


  return sendJson(res, 404, { ok: false, error: 'Resource not found' });
}

async function exchangeDiscordOauthCode(code, redirectUri) {
  const body = new URLSearchParams({
    client_id: SSO_DISCORD_CLIENT_ID,
    client_secret: SSO_DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Discord token exchange failed (${res.status})`);
  }
  if (!data.access_token) {
    throw new Error('Discord token response missing access_token');
  }
  return data;
}

async function fetchDiscordProfile(accessToken) {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    throw new Error('Discord profile fetch failed');
  }
  return data;
}

async function fetchDiscordGuildMember(accessToken, guildId) {
  if (!guildId) return null;
  const res = await fetch(
    `${DISCORD_API_BASE}/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error('Discord guild member fetch failed');
  }
  return res.json().catch(() => null);
}

async function listDiscordGuildRolesFromClient(client, guildId) {
  if (!client || !guildId) return [];
  try {
    const cachedGuild =
      client.guilds?.cache?.get?.(guildId)
      || (typeof client.guilds?.fetch === 'function' ? await client.guilds.fetch(guildId) : null);
    if (!cachedGuild) return [];
    const roleCollection =
      cachedGuild.roles?.cache?.size > 0
        ? cachedGuild.roles.cache
        : (typeof cachedGuild.roles?.fetch === 'function' ? await cachedGuild.roles.fetch() : null);
    if (!roleCollection) return [];
    return [...roleCollection.values()]
      .filter(Boolean)
      .map((role) => ({
        id: String(role.id || '').trim(),
        name: String(role.name || '').trim(),
      }))
      .filter((role) => role.id && role.name);
  } catch {
    return [];
  }
}

function buildDiscordAuthorizeUrl({ host, port, state }) {
  const redirectUri = getDiscordRedirectUri(host, port);
  const scopes = SSO_DISCORD_GUILD_ID
    ? 'identify guilds.members.read'
    : 'identify';
  const url = new URL(`${DISCORD_API_BASE}/oauth2/authorize`);
  url.searchParams.set('client_id', SSO_DISCORD_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  return url.toString();
}

function deriveRouteGroup(pathname) {
  const pathValue = String(pathname || '').trim();
  if (pathValue.startsWith('/platform/api/')) return 'platform-api';
  if (pathValue.startsWith('/admin/api/')) return 'admin-api';
  if (pathValue.startsWith('/admin/auth/')) return 'admin-auth';
  if (pathValue.startsWith('/assets/') || pathValue.startsWith('/admin/assets/')) return 'static-asset';
  if (pathValue.startsWith('/admin')) return 'admin-page';
  return 'other';
}

// The admin web server bundles static UI, JSON APIs, SSE live updates, and auth flows
// because operators need one coherent control plane during incidents.
function startAdminWebServer(client) {
  if (adminServer) return adminServer;

  const host = String(process.env.ADMIN_WEB_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const port = asInt(process.env.ADMIN_WEB_PORT, 3200) || 3200;
  const allowedOrigins = buildAllowedOrigins(host, port);
  const token = getAdminToken();
  ensureMetricsSeriesTimer();
  startPlatformMonitoring({ client });
  if (!liveBusBound) {
    adminLiveBus.on('update', (evt) => {
      broadcastLiveUpdate(evt?.type || 'update', evt?.payload || {});
    });
    liveBusBound = true;
  }

  adminServer = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url || '/', `http://${host}:${port}`);
    const { pathname } = urlObj;
    const requestStartedAt = Date.now();
    const requestId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(12).toString('hex');
    res.setHeader('X-Request-ID', requestId);
    setRequestMeta(req, {
      requestId,
      method: String(req.method || 'GET').toUpperCase(),
      path: pathname,
      routeGroup: deriveRouteGroup(pathname),
      ip: getClientIp(req),
      origin: getRequestOrigin(req) || null,
      userAgent: String(req.headers['user-agent'] || '').trim() || null,
      source: pathname.startsWith('/platform/api/') ? 'platform-api' : 'admin-web',
    });
    res.once('finish', () => {
      const meta = req.__adminRequestMeta && typeof req.__adminRequestMeta === 'object'
        ? req.__adminRequestMeta
        : {};
      recordAdminRequestLog({
        id: meta.requestId || requestId,
        at: new Date().toISOString(),
        method: meta.method || req.method,
        path: meta.path || pathname,
        routeGroup: meta.routeGroup || deriveRouteGroup(pathname),
        statusCode: res.statusCode,
        latencyMs: Date.now() - requestStartedAt,
        authMode: meta.authMode || null,
        user: meta.user || null,
        role: meta.role || null,
        tenantId: meta.tenantId || null,
        ip: meta.ip || null,
        origin: meta.origin || null,
        userAgent: meta.userAgent || null,
        source: meta.source || null,
        note: meta.note || null,
        error: meta.error || null,
      });
    });

    if (await tryServeStaticScumIcon(req, res, pathname)) {
      return;
    }

    if (req.method === 'GET' && pathname === '/favicon.ico') {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(302, { Location: '/admin' });
      return res.end();
    }

    if (req.method === 'GET' && pathname === '/healthz') {
      return sendJson(res, 200, {
        ok: true,
        data: {
          now: new Date().toISOString(),
          service: 'admin-web',
          uptimeSec: Math.round(process.uptime()),
          persistence: getPersistenceStatus(),
          delivery: typeof getDeliveryMetricsSnapshot === 'function'
            ? getDeliveryMetricsSnapshot()
            : null,
        },
      });
    }

    if (req.method === 'GET' && (pathname === '/admin/login' || pathname === '/admin/login/')) {
      if (isAuthorized(req, urlObj)) {
        res.writeHead(302, { Location: '/admin' });
        return res.end();
      }
      return sendHtml(res, 200, getLoginHtml());
    }

    if (req.method === 'GET' && (pathname === '/admin' || pathname === '/admin/')) {
      if (!isAuthorized(req, urlObj)) {
        res.writeHead(302, { Location: '/admin/login' });
        return res.end();
      }
      return sendHtml(res, 200, getDashboardHtml());
    }

    if (req.method === 'GET' && pathname === '/platform/api/v1/public/overview') {
      return sendJson(res, 200, {
        ok: true,
        data: await getPlatformPublicOverview(),
      });
    }

    if (pathname.startsWith('/platform/api/v1/')) {
      try {
        if (req.method === 'GET' && pathname === '/platform/api/v1/tenant/self') {
          const platformAuth = await ensurePlatformApiKey(req, res, ['tenant:read']);
          if (!platformAuth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: {
              tenant: platformAuth.tenant,
              apiKey: platformAuth.apiKey,
              scopes: platformAuth.scopes,
              quota: await getTenantQuotaSnapshot(platformAuth.tenant?.id),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/platform/api/v1/quota/self') {
          const platformAuth = await ensurePlatformApiKey(req, res, ['tenant:read']);
          if (!platformAuth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: await getTenantQuotaSnapshot(platformAuth.tenant?.id),
          });
        }

        if (req.method === 'GET' && pathname === '/platform/api/v1/analytics/overview') {
          const platformAuth = await ensurePlatformApiKey(req, res, ['analytics:read']);
          if (!platformAuth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: await getPlatformAnalyticsOverview({
              tenantId: platformAuth.tenant?.id,
            }),
          });
        }

        if (req.method === 'POST' && pathname === '/platform/api/v1/agent/heartbeat') {
          const platformAuth = await ensurePlatformApiKey(req, res, ['agent:write']);
          if (!platformAuth) return undefined;
          const body = await readJsonBody(req);
          const result = await recordPlatformAgentHeartbeat({
            tenantId: platformAuth.tenant?.id,
            runtimeKey: requiredString(body, 'runtimeKey'),
            version: requiredString(body, 'version'),
            channel: requiredString(body, 'channel'),
            status: requiredString(body, 'status'),
            minRequiredVersion: requiredString(body, 'minRequiredVersion'),
            meta: body.meta,
          }, 'platform-api');
          if (!result.ok) {
            return sendJson(res, 400, { ok: false, error: result.reason || 'platform-agent-heartbeat-failed' });
          }
          return sendJson(res, 200, { ok: true, data: result.runtime });
        }

        if (req.method === 'POST' && pathname === '/platform/api/v1/delivery/reconcile') {
          const platformAuth = await ensurePlatformApiKey(req, res, ['delivery:reconcile']);
          if (!platformAuth) return undefined;
          const body = await readJsonBody(req);
          return sendJson(res, 200, {
            ok: true,
            data: await reconcileDeliveryState({
              tenantId: platformAuth.tenant?.id,
              windowMs: body.windowMs,
              pendingOverdueMs: body.pendingOverdueMs,
            }),
          });
        }

        if (req.method === 'POST' && pathname === '/platform/api/v1/webhooks/test') {
          const platformAuth = await ensurePlatformApiKey(req, res, ['webhook:write']);
          if (!platformAuth) return undefined;
          const body = await readJsonBody(req);
          return sendJson(res, 200, {
            ok: true,
            data: {
              tenantId: platformAuth.tenant?.id || null,
              eventType: requiredString(body.eventType) || 'platform.admin.test',
              results: await dispatchPlatformWebhookEvent(
                requiredString(body.eventType) || 'platform.admin.test',
                body.payload && typeof body.payload === 'object'
                  ? body.payload
                  : {
                    source: 'platform-api',
                    triggeredAt: new Date().toISOString(),
                  },
                { tenantId: platformAuth.tenant?.id || null },
              ),
            },
          });
        }

        return sendJson(res, 404, { ok: false, error: 'Resource not found' });
      } catch (error) {
        return sendJson(res, Number(error?.statusCode || 500), {
          ok: false,
          error:
            Number(error?.statusCode || 500) >= 500
              ? 'Internal platform API error'
              : String(error?.message || 'Bad request'),
        });
      }
    }

    if (req.method === 'GET' && pathname === '/admin/auth/discord/start') {
      if (!SSO_DISCORD_ACTIVE) {
        return sendText(res, 404, 'SSO is disabled');
      }
      cleanupDiscordOauthStates();
      const state = crypto.randomBytes(18).toString('hex');
      discordOauthStates.set(state, {
        createdAt: Date.now(),
      });
      const authorizeUrl = buildDiscordAuthorizeUrl({
        host,
        port,
        state,
      });
      res.writeHead(302, { Location: authorizeUrl });
      return res.end();
    }

        if (req.method === 'GET' && pathname === '/admin/auth/discord/callback') {
      if (!SSO_DISCORD_ACTIVE) {
        return sendText(res, 404, 'SSO is disabled');
      }
      try {
        cleanupDiscordOauthStates();
        const code = String(urlObj.searchParams.get('code') || '').trim();
        const state = String(urlObj.searchParams.get('state') || '').trim();
        const errorText = String(urlObj.searchParams.get('error') || '').trim();
        if (errorText) {
          recordAdminSecuritySignal('sso-failed', {
            severity: 'warn',
            actor: 'discord-sso',
            authMethod: 'discord-sso',
            ip: getClientIp(req),
            path: pathname,
            reason: 'discord-authorization-denied',
            detail: 'Discord SSO authorization was denied',
            notify: true,
          });
          res.writeHead(302, {
            Location: `/admin/login?error=${encodeURIComponent('Discord authorization denied')}`,
          });
          return res.end();
        }
        if (!code || !state || !discordOauthStates.has(state)) {
          recordAdminSecuritySignal('sso-failed', {
            severity: 'warn',
            actor: 'discord-sso',
            authMethod: 'discord-sso',
            ip: getClientIp(req),
            path: pathname,
            reason: 'invalid-sso-state',
            detail: 'Discord SSO callback failed validation',
            notify: true,
          });
          res.writeHead(302, {
            Location: `/admin/login?error=${encodeURIComponent('Invalid SSO state')}`,
          });
          return res.end();
        }
        discordOauthStates.delete(state);

        const redirectUri = getDiscordRedirectUri(host, port);
        const tokenResult = await exchangeDiscordOauthCode(code, redirectUri);
        const profile = await fetchDiscordProfile(tokenResult.access_token);
        let resolvedRole = SSO_DISCORD_DEFAULT_ROLE;
        if (SSO_DISCORD_GUILD_ID) {
          const member = await fetchDiscordGuildMember(
            tokenResult.access_token,
            SSO_DISCORD_GUILD_ID,
          );
          const guildRoles = await listDiscordGuildRolesFromClient(client, SSO_DISCORD_GUILD_ID);
          resolvedRole = resolveMappedMemberRole(
            member?.roles || [],
            guildRoles,
            getAdminSsoRoleMappingSummary(process.env),
          );
        }

        const username = profile.username && profile.discriminator
          ? `${profile.username}#${profile.discriminator}`
          : String(profile.username || profile.id);
        req.__pendingAdminTenantId = null;
        const sessionId = createSession(username, resolvedRole, 'discord-sso', req);
        recordAdminSecuritySignal('sso-succeeded', {
          actor: username,
          targetUser: username,
          role: resolvedRole,
          authMethod: 'discord-sso',
          sessionId,
          ip: getClientIp(req),
          path: pathname,
          detail: 'Discord SSO login succeeded',
        });
        res.writeHead(302, {
          Location: '/admin',
          'Set-Cookie': buildSessionCookie(sessionId),
        });
        return res.end();
      } catch (error) {
        console.error('[admin-web] discord sso callback failed', error);
        recordAdminSecuritySignal('sso-failed', {
          severity: 'warn',
          actor: 'discord-sso',
          authMethod: 'discord-sso',
          ip: getClientIp(req),
          path: pathname,
          reason: String(error?.message || 'discord-sso-failed'),
          detail: 'Discord SSO callback failed unexpectedly',
          notify: true,
        });
        res.writeHead(302, {
          Location: `/admin/login?error=${encodeURIComponent('Discord SSO failed')}`,
        });
        return res.end();
      }
    }

    if (pathname.startsWith('/admin/api/')) {
      try {
        if (
          hasValidSession(req) &&
          !isSafeHttpMethod(req.method) &&
          violatesBrowserOriginPolicy(req, allowedOrigins)
        ) {
          return sendJson(res, 403, {
            ok: false,
            error: 'Cross-site request denied',
          });
        }

        if (req.method === 'POST' && pathname === '/admin/api/login') {
          const rateLimit = getLoginRateLimitState(req);
          if (rateLimit.limited) {
            recordAdminSecuritySignal('login-rate-limited', {
              severity: 'warn',
              actor: String(req?.__pendingAdminUser || '').trim() || 'unknown',
              targetUser: String(req?.__pendingAdminUser || '').trim() || 'unknown',
              authMethod: 'password',
              ip: rateLimit.ip,
              path: pathname,
              reason: 'too-many-attempts',
              detail: 'Admin login was rate limited',
              notify: true,
            });
            const retryAfterSec = Math.max(
              1,
              Math.ceil(rateLimit.retryAfterMs / 1000),
            );
            return sendJson(
              res,
              429,
              {
                ok: false,
                error: `Too many login attempts. Please wait ${retryAfterSec}s and try again.`,
              },
              {
                'Retry-After': String(retryAfterSec),
              },
            );
          }

          const body = await readJsonBody(req);
          const username = requiredString(body, 'username');
          const password = requiredString(body, 'password');
          req.__pendingAdminUser = username || 'unknown';
          req.__pendingAdminAuthMethod = 'password';
          req.__pendingAdminTenantId = null;
          if (!username || !password) {
            req.__pendingAdminFailureReason = 'invalid-payload';
            return sendJson(res, 400, { ok: false, error: 'Invalid request payload' });
          }

          const user = await getUserByCredentials(username, password);
          if (!user) {
            req.__pendingAdminFailureReason = 'invalid-credentials';
            recordLoginAttempt(req, false);
            return sendJson(res, 401, { ok: false, error: 'Invalid username or password' });
          }

          if (ADMIN_WEB_2FA_ACTIVE) {
            const otp = requiredString(body, 'otp');
            if (!otp) {
              req.__pendingAdminFailureReason = 'otp-required';
              recordLoginAttempt(req, false);
              return sendJson(res, 401, {
                ok: false,
                error: 'OTP required',
                requiresOtp: true,
              });
            }
            if (!verifyTotpCode(ADMIN_WEB_2FA_SECRET, otp, ADMIN_WEB_2FA_WINDOW_STEPS)) {
              req.__pendingAdminFailureReason = 'invalid-2fa-code';
              recordLoginAttempt(req, false);
              return sendJson(res, 401, { ok: false, error: 'Invalid 2FA code' });
            }
          }

          req.__pendingAdminUser = user.username;
          req.__pendingAdminAuthMethod = user.authMethod;
          req.__pendingAdminTenantId = user.tenantId || null;
          recordLoginAttempt(req, true);
          const sessionId = createSession(user.username, user.role, user.authMethod, req);
          return sendJson(
            res,
            200,
            {
              ok: true,
              data: {
                user: user.username,
                role: user.role,
                tenantId: user.tenantId || null,
                sessionTtlHours: Math.round(SESSION_TTL_MS / (60 * 60 * 1000)),
              },
            },
            {
              'Set-Cookie': buildSessionCookie(sessionId),
            },
          );
        }

        if (req.method === 'POST' && pathname === '/admin/api/logout') {
          const auth = getAuthContext(req, urlObj);
          const sessionId = getSessionId(req);
          invalidateSession(sessionId, {
            actor: auth?.user || 'unknown',
            reason: 'logout',
          });
          return sendJson(
            res,
            200,
            { ok: true, data: { loggedOut: true } },
            { 'Set-Cookie': buildClearSessionCookie() },
          );
        }

        if (
          req.method === 'POST'
          && !shouldBypassRestoreMaintenance(pathname)
          && isAdminRestoreMaintenanceActive()
        ) {
          return sendRestoreMaintenanceUnavailable(res);
        }

        if (await handleAdminAuditRoute({ req, res, urlObj, pathname })) {
          return undefined;
        }

        if (
          req.method === 'GET'
          && await handleAdminGetRoute({ client, req, res, urlObj, pathname })
        ) {
          return undefined;
        }

        if (req.method === 'GET' && pathname === '/admin/api/auth/providers') {
          const ssoRoleMapping = getAdminSsoRoleMappingSummary(process.env);
          return sendJson(res, 200, {
            ok: true,
            data: {
              loginSource: 'database',
              password: true,
              discordSso: SSO_DISCORD_ACTIVE,
              discordSsoRoleMapping: {
                enabled: ssoRoleMapping.enabled,
                defaultRole: ssoRoleMapping.defaultRole,
                hasExplicitMappings: ssoRoleMapping.hasExplicitMappings,
                hasElevatedMappings: ssoRoleMapping.hasElevatedMappings,
                ownerRoleCount: ssoRoleMapping.ownerRoleIds.length,
                adminRoleCount: ssoRoleMapping.adminRoleIds.length,
                modRoleCount: ssoRoleMapping.modRoleIds.length,
                ownerRoleNameCount: ssoRoleMapping.ownerRoleNames.length,
                adminRoleNameCount: ssoRoleMapping.adminRoleNames.length,
                modRoleNameCount: ssoRoleMapping.modRoleNames.length,
              },
              twoFactor: ADMIN_WEB_2FA_ACTIVE,
              sessionCookie: {
                name: SESSION_COOKIE_NAME,
                path: SESSION_COOKIE_PATH,
                sameSite: SESSION_COOKIE_SAMESITE,
                secure: SESSION_SECURE_COOKIE,
                domain: SESSION_COOKIE_DOMAIN || null,
              },
              sessionPolicy: {
                ttlHours: Math.round(SESSION_TTL_MS / (60 * 60 * 1000)),
                idleMinutes: Math.round(SESSION_IDLE_TIMEOUT_MS / (60 * 1000)),
                maxSessionsPerUser: SESSION_MAX_PER_USER,
                bindUserAgent: SESSION_BIND_USER_AGENT,
              },
              stepUp: {
                enabled: ADMIN_WEB_STEP_UP_ENABLED && ADMIN_WEB_2FA_ACTIVE,
                ttlMinutes: Math.round(ADMIN_WEB_STEP_UP_TTL_MS / (60 * 1000)),
                tokenSensitiveMutationsAllowed: ADMIN_WEB_ALLOW_TOKEN_SENSITIVE_MUTATIONS,
              },
              roleMatrix: getAdminPermissionMatrixSummary(),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/auth/role-matrix') {
          const auth = ensureRole(req, urlObj, 'admin', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: {
              summary: getAdminPermissionMatrixSummary(),
              roles: buildRoleMatrix(),
              permissions: listAdminPermissionMatrix(),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/auth/security-events') {
          const auth = ensureRole(req, urlObj, 'admin', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: listAdminSecurityEvents({
              limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
              type: requiredString(urlObj.searchParams.get('type')),
              severity: requiredString(urlObj.searchParams.get('severity')),
              actor: requiredString(urlObj.searchParams.get('actor')),
              targetUser: requiredString(urlObj.searchParams.get('targetUser')),
              sessionId: requiredString(urlObj.searchParams.get('sessionId')),
            }),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/auth/security-events/export') {
          const auth = ensureRole(req, urlObj, 'admin', res);
          if (!auth) return undefined;
          const format = String(urlObj.searchParams.get('format') || 'json').trim().toLowerCase();
          const rows = buildAdminSecurityEventExportRows(urlObj);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          if (format === 'csv') {
            return sendDownload(
              res,
              200,
              buildAdminSecurityEventCsv(rows),
              {
                filename: `admin-security-events-${timestamp}.csv`,
                contentType: 'text/csv; charset=utf-8',
              },
            );
          }
          return sendDownload(
            res,
            200,
            `${JSON.stringify({ ok: true, data: rows }, jsonReplacer, 2)}\n`,
            {
              filename: `admin-security-events-${timestamp}.json`,
              contentType: 'application/json; charset=utf-8',
            },
          );
        }

        if (req.method === 'GET' && pathname === '/admin/api/auth/sessions') {
          const auth = ensureRole(req, urlObj, 'owner', res);
          if (!auth) return undefined;
          const authTenantId = getAuthTenantId(auth);
          return sendJson(res, 200, {
            ok: true,
            data: listAdminSessions({
              currentSessionId: getSessionId(req),
            }).filter((row) => !authTenantId || row.tenantId === authTenantId),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/auth/users') {
          const auth = ensureRole(req, urlObj, 'owner', res);
          if (!auth) return undefined;
          const authTenantId = getAuthTenantId(auth);
          const users = await listAdminUsersFromDb(250, { activeOnly: false });
          return sendJson(res, 200, {
            ok: true,
            data: authTenantId
              ? users.filter((row) => row.tenantId === authTenantId)
              : users,
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/control-panel/settings') {
          const auth = ensureRole(req, urlObj, 'admin', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: await buildControlPanelSettings(client, auth, { tenantId }),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/control-panel/commands') {
          const auth = ensureRole(req, urlObj, 'admin', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: buildCommandRegistry(client),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/me') {
          const auth = getAuthContext(req, urlObj);
          if (!auth) {
            return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
          }
          return sendJson(res, 200, {
            ok: true,
            data: {
              user: auth.user,
              role: auth.role,
              tenantId: auth.tenantId || null,
              authMethod: auth.authMethod,
              session: hasValidSession(req),
              stepUpRequired: ADMIN_WEB_STEP_UP_ENABLED && ADMIN_WEB_2FA_ACTIVE,
              stepUpActive: hasFreshStepUp(auth),
              tenantConfig: auth.tenantId ? await getPlatformTenantConfig(auth.tenantId) : null,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/health') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const runtimeSupervisor = await getRuntimeSupervisorSnapshot().catch(() => null);
          return sendJson(res, 200, {
            ok: true,
            data: {
              now: new Date().toISOString(),
              guilds: client.guilds.cache.size,
              role: auth.role,
              runtimeSupervisor,
              backupRestore: getAdminRestoreState(),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/backup/restore/status') {
          const auth = ensureRole(req, urlObj, 'owner', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: getAdminRestoreState(),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/overview') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: {
              analytics: await getPlatformAnalyticsOverview(tenantId ? { tenantId } : {}),
              publicOverview: await getPlatformPublicOverview(),
              permissionCatalog: getPlatformPermissionCatalog(),
              plans: getPlanCatalog(),
              opsState: getPlatformOpsState(),
              tenantConfig: tenantId ? await getPlatformTenantConfig(tenantId) : null,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/quota') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: true },
          );
          if (!tenantId) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: await getTenantQuotaSnapshot(tenantId),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/ops-state') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: getPlatformOpsState(),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/tenants') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          let data = await listPlatformTenants({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            status: requiredString(urlObj.searchParams.get('status')),
            type: requiredString(urlObj.searchParams.get('type')),
          });
          data = filterRowsByTenantScope(data, auth);
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/tenant-config') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: true },
          );
          if (!tenantId) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: await getPlatformTenantConfig(tenantId),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/tenant-configs') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: await listPlatformTenantConfigs({
              tenantId,
              limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            }),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/subscriptions') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await listPlatformSubscriptions({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            tenantId,
            status: requiredString(urlObj.searchParams.get('status')),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/licenses') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await listPlatformLicenses({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            tenantId,
            status: requiredString(urlObj.searchParams.get('status')),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/apikeys') {
          const auth = ensureRole(req, urlObj, 'owner', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await listPlatformApiKeys({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            tenantId,
            status: requiredString(urlObj.searchParams.get('status')),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/webhooks') {
          const auth = ensureRole(req, urlObj, 'owner', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await listPlatformWebhookEndpoints({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            tenantId,
            eventType: requiredString(urlObj.searchParams.get('eventType')),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/agents') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await listPlatformAgentRuntimes({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            tenantId,
            status: requiredString(urlObj.searchParams.get('status')),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/marketplace') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await listMarketplaceOffers({
            limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
            tenantId,
            status: requiredString(urlObj.searchParams.get('status')),
            locale: requiredString(urlObj.searchParams.get('locale')),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/platform/reconcile') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const tenantId = resolveScopedTenantId(
            req,
            res,
            auth,
            requiredString(urlObj.searchParams.get('tenantId')),
            { required: false },
          );
          if (requiredString(urlObj.searchParams.get('tenantId')) && !tenantId) return undefined;
          const data = await reconcileDeliveryState({
            tenantId,
            windowMs: asInt(urlObj.searchParams.get('windowMs'), null),
            pendingOverdueMs: asInt(urlObj.searchParams.get('pendingOverdueMs'), null),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/runtime/supervisor') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const forceRefresh =
            String(urlObj.searchParams.get('refresh') || '').trim() === '1'
            || String(urlObj.searchParams.get('refresh') || '').trim().toLowerCase() === 'true';
          const data = await getRuntimeSupervisorSnapshot({ forceRefresh });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/observability') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const windowMs = clampMetricsWindowMs(
            urlObj.searchParams.get('windowMs'),
          );
          const seriesKeys = parseMetricsSeriesKeys(
            urlObj.searchParams.get('series'),
          );
          return sendJson(res, 200, {
            ok: true,
            data: await getCurrentObservabilitySnapshot({
              windowMs,
              seriesKeys,
            }),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/observability/requests') {
          const auth = ensureRole(req, urlObj, 'admin', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: {
              metrics: getAdminRequestLogMetrics({
                windowMs: asInt(urlObj.searchParams.get('windowMs'), null),
              }),
              items: listAdminRequestLogs({
                limit: asInt(urlObj.searchParams.get('limit'), 200) || 200,
                statusClass: requiredString(urlObj.searchParams.get('statusClass')),
                routeGroup: requiredString(urlObj.searchParams.get('routeGroup')),
                authMode: requiredString(urlObj.searchParams.get('authMode')),
                requestId: requiredString(urlObj.searchParams.get('requestId')),
                tenantId: requiredString(urlObj.searchParams.get('tenantId')),
                pathContains: requiredString(urlObj.searchParams.get('path')),
                onlyErrors:
                  String(urlObj.searchParams.get('onlyErrors') || '').trim().toLowerCase() === 'true',
              }),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/observability/export') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const windowMs = clampMetricsWindowMs(
            urlObj.searchParams.get('windowMs'),
          );
          const seriesKeys = parseMetricsSeriesKeys(
            urlObj.searchParams.get('series'),
          );
          const format = String(urlObj.searchParams.get('format') || 'json').trim().toLowerCase();
          const data = await getCurrentObservabilitySnapshot({
            windowMs,
            seriesKeys,
          });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          if (format === 'csv') {
            return sendDownload(
              res,
              200,
              buildObservabilityCsv(data),
              {
                filename: `observability-${timestamp}.csv`,
                contentType: 'text/csv; charset=utf-8',
              },
            );
          }
          return sendDownload(
            res,
            200,
            `${JSON.stringify(buildObservabilityExportPayload(data), jsonReplacer, 2)}\n`,
            {
              filename: `observability-${timestamp}.json`,
              contentType: 'application/json; charset=utf-8',
            },
          );
        }

        if (req.method === 'GET' && pathname === '/admin/api/live') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          openLiveStream(req, res);
          return undefined;
        }

        if (req.method === 'GET' && pathname === '/admin/api/items/catalog') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const query = String(urlObj.searchParams.get('q') || '').trim();
          const limit = asInt(urlObj.searchParams.get('limit'), 120);
          const items = listItemIconCatalog(query, limit || 120);
          return sendJson(res, 200, {
            ok: true,
            data: {
              total: items.length,
              query,
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/items/weapons-catalog') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const query = String(urlObj.searchParams.get('q') || '').trim();
          const limit = asInt(urlObj.searchParams.get('limit'), 200);
          const items = listWikiWeaponCatalog(query, limit || 200);
          return sendJson(res, 200, {
            ok: true,
            data: {
              query,
              total: items.length,
              meta: getWikiWeaponCatalogMeta(),
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/items/manifest-catalog') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const query = String(urlObj.searchParams.get('q') || '').trim();
          const category = String(urlObj.searchParams.get('category') || '').trim();
          const limit = asInt(urlObj.searchParams.get('limit'), 300);
          const items = listManifestItemCatalog({
            query,
            category,
            limit: limit || 300,
          });
          return sendJson(res, 200, {
            ok: true,
            data: {
              query,
              category,
              total: items.length,
              meta: getManifestItemCatalogMeta(),
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/shop/list') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const q = String(urlObj.searchParams.get('q') || '').trim();
          const kind = String(urlObj.searchParams.get('kind') || 'all').trim();
          const limit = asInt(urlObj.searchParams.get('limit'), 200) || 200;
          const rows = await listShopItems();
          const items = filterShopItems(rows, { q, kind, limit });
          return sendJson(res, 200, {
            ok: true,
            data: {
              query: q,
              kind,
              total: items.length,
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/purchase/list') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const userId = requiredString(urlObj.searchParams.get('userId'));
          if (!userId) {
            return sendJson(res, 400, {
              ok: false,
              error: 'Invalid request payload',
            });
          }
          const limit = Math.max(
            1,
            Math.min(1000, asInt(urlObj.searchParams.get('limit'), 100) || 100),
          );
          const statusFilter = normalizePurchaseStatus(
            String(urlObj.searchParams.get('status') || ''),
          );
          const rows = await listUserPurchases(userId);
          const items = rows
            .filter((row) => !statusFilter || normalizePurchaseStatus(row.status) === statusFilter)
            .slice(0, limit);
          return sendJson(res, 200, {
            ok: true,
            data: {
              userId,
              total: items.length,
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/portal/player/dashboard') {
          const portal = ensurePortalTokenAuth(req, urlObj, res);
          if (!portal) return undefined;
          const dashboard = await getPlayerDashboard(portal.discordId);
          if (!dashboard.ok) {
            return sendJson(res, 400, {
              ok: false,
              error: dashboard.reason || 'Cannot build player dashboard',
            });
          }
          return sendJson(res, 200, {
            ok: true,
            data: dashboard.data,
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/portal/shop/list') {
          const portal = ensurePortalTokenAuth(req, urlObj, res);
          if (!portal) return undefined;
          const q = String(urlObj.searchParams.get('q') || '').trim();
          const kind = String(urlObj.searchParams.get('kind') || 'all').trim();
          const limit = asInt(urlObj.searchParams.get('limit'), 120) || 120;
          const rows = await listShopItems();
          const items = filterShopItems(rows, { q, kind, limit });
          return sendJson(res, 200, {
            ok: true,
            data: {
              query: q,
              kind,
              total: items.length,
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/portal/purchase/list') {
          const portal = ensurePortalTokenAuth(req, urlObj, res);
          if (!portal) return undefined;
          const limit = Math.max(
            1,
            Math.min(200, asInt(urlObj.searchParams.get('limit'), 40) || 40),
          );
          const statusFilter = normalizePurchaseStatus(
            String(urlObj.searchParams.get('status') || ''),
          );
          const rows = await listUserPurchases(portal.discordId);
          const items = rows
            .filter((row) => !statusFilter || normalizePurchaseStatus(row.status) === statusFilter)
            .slice(0, limit);
          return sendJson(res, 200, {
            ok: true,
            data: {
              userId: portal.discordId,
              total: items.length,
              items,
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/portal/bounty/list') {
          const portal = ensurePortalTokenAuth(req, urlObj, res);
          if (!portal) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: {
              total: listActiveBountiesForUser().length,
              items: listActiveBountiesForUser(),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/delivery/queue') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const limit = asInt(urlObj.searchParams.get('limit'), 500) || 500;
          const errorCode = String(urlObj.searchParams.get('errorCode') || '').trim();
          const q = String(urlObj.searchParams.get('q') || '').trim();
          return sendJson(res, 200, {
            ok: true,
            data: listFilteredDeliveryQueue({
              limit,
              errorCode,
              q,
            }),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/delivery/dead-letter') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const limit = asInt(urlObj.searchParams.get('limit'), 500) || 500;
          return sendJson(res, 200, {
            ok: true,
            data: listFilteredDeliveryDeadLetters({
              limit,
              errorCode: String(urlObj.searchParams.get('errorCode') || '').trim(),
              q: String(urlObj.searchParams.get('q') || '').trim(),
            }),
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/delivery/runtime') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const data = await getDeliveryRuntimeStatus();
          return sendJson(res, 200, {
            ok: true,
            data,
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/delivery/capabilities') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: {
              builtin: listScumAdminCommandCapabilities(),
              presets: listAdminCommandCapabilityPresets(200),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/delivery/command-template') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          try {
            const data = getDeliveryCommandOverride({
              lookupKey: String(urlObj.searchParams.get('lookupKey') || '').trim() || undefined,
              itemId: String(urlObj.searchParams.get('itemId') || '').trim() || undefined,
              gameItemId: String(urlObj.searchParams.get('gameItemId') || '').trim() || undefined,
            });
            return sendJson(res, 200, {
              ok: true,
              data,
            });
          } catch (error) {
            return sendJson(res, 400, {
              ok: false,
              error: String(error?.message || 'ไม่สามารถโหลด command template ได้'),
            });
          }
        }

        if (req.method === 'GET' && pathname === '/admin/api/delivery/detail') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const purchaseCode = String(urlObj.searchParams.get('code') || '').trim();
          if (!purchaseCode) {
            return sendJson(res, 400, {
              ok: false,
              error: 'code is required',
            });
          }
          try {
            const data = await getDeliveryDetailsByPurchaseCode(
              purchaseCode,
              asInt(urlObj.searchParams.get('limit'), 50) || 50,
            );
            const hasData = Boolean(
              data?.purchase
                || data?.queueJob
                || data?.deadLetter
                || (Array.isArray(data?.auditRows) && data.auditRows.length > 0),
            );
            if (!hasData) {
              return sendJson(res, 404, {
                ok: false,
                error: 'Resource not found',
              });
            }
            return sendJson(res, 200, {
              ok: true,
              data,
            });
          } catch (error) {
            return sendJson(res, 400, {
              ok: false,
              error: String(error?.message || 'ไม่สามารถโหลดรายละเอียด delivery ได้'),
            });
          }
        }

        if (req.method === 'GET' && pathname === '/admin/api/notifications') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const acknowledgedRaw = String(urlObj.searchParams.get('acknowledged') || '').trim().toLowerCase();
          const acknowledged =
            acknowledgedRaw === 'true'
              ? true
              : acknowledgedRaw === 'false'
                ? false
                : null;
          return sendJson(res, 200, {
            ok: true,
            data: {
              items: listAdminNotifications({
                limit: asInt(urlObj.searchParams.get('limit'), 100) || 100,
                type: String(urlObj.searchParams.get('type') || '').trim(),
                kind: String(urlObj.searchParams.get('kind') || '').trim(),
                severity: String(urlObj.searchParams.get('severity') || '').trim(),
                entityKey: String(urlObj.searchParams.get('entityKey') || '').trim(),
                acknowledged,
              }),
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/purchase/statuses') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const current = normalizePurchaseStatus(
            String(urlObj.searchParams.get('current') || ''),
          );
          return sendJson(res, 200, {
            ok: true,
            data: {
              knownStatuses: listKnownPurchaseStatuses(),
              currentStatus: current || null,
              allowedTransitions: current
                ? listAllowedPurchaseTransitions(current)
                : [],
            },
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/dashboard/cards') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const data = await buildAdminDashboardCards({
            prisma,
            client,
            forceRefresh:
              String(urlObj.searchParams.get('refresh') || '').trim() === '1'
              || String(urlObj.searchParams.get('refresh') || '').trim().toLowerCase() === 'true',
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/player/accounts') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const limit = asInt(urlObj.searchParams.get('limit'), 200) || 200;
          const rows = await listPlayerAccounts(limit);
          return sendJson(res, 200, {
            ok: true,
            data: rows,
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/player/dashboard') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const userId = requiredString(urlObj.searchParams.get('userId'));
          if (!userId) {
            return sendJson(res, 400, {
              ok: false,
              error: 'Invalid request payload',
            });
          }
          const dashboard = await getPlayerDashboard(userId);
          if (!dashboard.ok) {
            return sendJson(res, 400, {
              ok: false,
              error: dashboard.reason || 'Cannot build player dashboard',
            });
          }
          return sendJson(res, 200, {
            ok: true,
            data: dashboard.data,
          });
        }

        if (req.method === 'GET' && pathname === '/admin/api/snapshot') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const data = await buildAdminSnapshot({
            client,
            observabilitySnapshot: await getCurrentObservabilitySnapshot(),
          });
          return sendJson(res, 200, { ok: true, data });
        }

        if (req.method === 'GET' && pathname === '/admin/api/snapshot/export') {
          const auth = ensureRole(req, urlObj, 'mod', res);
          if (!auth) return undefined;
          const data = await buildAdminSnapshot({
            client,
            observabilitySnapshot: await getCurrentObservabilitySnapshot(),
          });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          return sendDownload(
            res,
            200,
            `${JSON.stringify({ ok: true, data }, jsonReplacer, 2)}\n`,
            {
              filename: `snapshot-${timestamp}.json`,
              contentType: 'application/json; charset=utf-8',
            },
          );
        }

        if (req.method === 'GET' && pathname === '/admin/api/backup/list') {
          const auth = ensureRole(req, urlObj, 'owner', res);
          if (!auth) return undefined;
          return sendJson(res, 200, {
            ok: true,
            data: listAdminBackupFiles(),
          });
        }

        if (
          req.method === 'POST'
          && await handleAdminPortalPostRoute({ req, res, urlObj, pathname })
        ) {
          return undefined;
        }

        if (req.method === 'POST') {
          const permission = getAdminPermissionForPath(pathname, 'POST');
          const requiredRole = permission?.minRole || requiredRoleForPostPath(pathname);
          const auth = ensureRole(req, urlObj, requiredRole, res);
          if (!auth) return undefined;
          const body = await readJsonBody(req);
          const elevatedAuth = ensureStepUpAuth(req, res, auth, body, permission);
          if (!elevatedAuth) return undefined;
          const out = await handlePostAction(client, req, urlObj, pathname, body, res, auth);
          if (
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            res.writableEnded &&
            pathname !== '/admin/api/login' &&
            pathname !== '/admin/api/logout'
          ) {
            publishAdminLiveUpdate('admin-action', {
              path: pathname,
              user: auth.user,
              role: auth.role,
            });
          }
          return out;
        }

        return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      } catch (error) {
        const statusCode = Number(error?.statusCode || 500);
        setRequestMeta(req, {
          error: String(error?.message || error),
        });
        if (statusCode >= 500) {
          console.error('[admin-web] คำขอผิดพลาด', error);
        } else {
          console.warn('[admin-web] invalid request', error?.message || error);
        }
        return sendJson(res, statusCode, {
          ok: false,
          error:
            statusCode >= 500
              ? 'เซิร์ฟเวอร์ภายในผิดพลาด'
              : String(error?.message || 'คำขอไม่ถูกต้อง'),
        });
      }
    }

    return sendText(res, 404, 'ไม่พบหน้า');
  });

  adminServer.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`[admin-web] port ${port} is already in use`);
      return;
    }
    console.error('[admin-web] เซิร์ฟเวอร์ผิดพลาด', err);
  });

  adminServer.on('close', () => {
    closeAllLiveStreams();
    stopMetricsSeriesTimer();
    stopPlatformMonitoring();
    stopRuntimeSupervisorMonitor();
    adminServer = null;
  });

  adminServer.listen(port, host, () => {
    console.log(`[admin-web] เปิดใช้งานที่ http://${host}:${port}/admin`);
    startRuntimeSupervisorMonitor();
    ensureAdminUsersReady()
      .then(async () => {
        const users = await listAdminUsersFromDb(50);
        if (String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'test') {
          const preview = users
            .slice(0, 5)
            .map((user) => `${user.username}(${user.role})`)
            .join(', ');
          console.log(
            `[admin-web] login users ready: count=${users.length}${preview ? ` sample=${preview}` : ''}${users.length > 5 ? ', ...' : ''}`,
          );
        }
      })
      .catch((error) => {
        console.error('[admin-web] failed to initialize admin users from db', error);
      });
    if ((host !== '127.0.0.1' && host !== 'localhost') && !SESSION_SECURE_COOKIE) {
      console.warn(
        '[admin-web] SESSION cookie is not secure. Set ADMIN_WEB_SECURE_COOKIE=true for HTTPS production.',
      );
    }
    console.log(
      `[admin-web] session cookie: name=${SESSION_COOKIE_NAME} path=${SESSION_COOKIE_PATH} sameSite=${SESSION_COOKIE_SAMESITE} secure=${SESSION_SECURE_COOKIE}${SESSION_COOKIE_DOMAIN ? ` domain=${SESSION_COOKIE_DOMAIN}` : ''}`,
    );
    if (!process.env.ADMIN_WEB_PASSWORD) {
      console.log(
        '[admin-web] ยังไม่ได้ตั้งค่า ADMIN_WEB_PASSWORD จึงใช้ ADMIN_WEB_TOKEN (หรือโทเค็นชั่วคราว) เป็นรหัสผ่านล็อกอิน',
      );
    }
    if (!process.env.ADMIN_WEB_TOKEN) {
      console.log(`[admin-web] โทเค็น/รหัสผ่านชั่วคราว: ${token}`);
    }
    if (ADMIN_WEB_2FA_ACTIVE) {
      console.log('[admin-web] 2FA (TOTP) is enabled');
    } else if (ADMIN_WEB_2FA_ENABLED) {
      console.warn('[admin-web] ADMIN_WEB_2FA_ENABLED=true but ADMIN_WEB_2FA_SECRET is empty');
    }
    if (SSO_DISCORD_ACTIVE) {
      console.log(
        `[admin-web] Discord SSO enabled: http://${host}:${port}/admin/auth/discord/start`,
      );
    } else if (SSO_DISCORD_ENABLED) {
      console.warn('[admin-web] ADMIN_WEB_SSO_DISCORD_ENABLED=true but client id/secret missing');
    }
  });

  return adminServer;
}

module.exports = {
  startAdminWebServer,
};
