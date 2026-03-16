/**
 * Browser-side mutable state and shared constants for the admin dashboard.
 */

let snapshot = null;
let controlPanelSettings = null;
let isAuthed = false;
let currentUserRole = 'mod';
let currentUserName = '';
let currentAuthSearch = '';
let currentAuthEventSeverity = '';
let currentAuthEventType = '';
let currentAuthAnomalyOnly = false;
let pendingStepUpResolver = null;
let pendingStepUpRejecter = null;
let currentAuditView = 'wallet';
let currentAuditQuery = '';
let currentAuditUser = '';
let currentAuditActor = '';
let currentAuditActorMode = 'contains';
let currentAuditReason = '';
let currentAuditReference = '';
let currentAuditReferenceMode = 'contains';
let currentAuditStatus = '';
let currentAuditStatusMode = 'contains';
let currentAuditDateFrom = '';
let currentAuditDateTo = '';
let currentAuditSortBy = 'timestamp';
let currentAuditSortOrder = 'desc';
let currentAuditWindowMs = null;
let currentAuditPage = 1;
let currentAuditPageSize = Math.max(
  25,
  Number(auditPageSizeSelect?.value || 50),
);
let currentAuditCursor = null;
let currentAuditPrevCursor = null;
let currentAuditNextCursor = null;
let currentAuditPaginationMode = 'page';
let currentAuditTotalPages = 1;
let currentAuditTotalRows = 0;
let currentAuditExportRows = [];
let currentAuditExportPayload = {};
let currentAuditRequestId = 0;
let currentAuditPresetId = '';
let currentAuditPresetVisibility = 'public';
let currentAuditPresetSharedRole = 'mod';
let auditPresets = [];
let currentDashboardCards = null;
let currentRuntimeSupervisor = null;
let currentBackupRestoreState = null;
let currentRestorePreviewData = null;
let currentPlatformOverview = null;
let currentPlatformReconcile = null;
let currentPlatformMonitoringReport = null;
let currentDeliveryRuntime = null;
let currentDeliveryDetailCode = '';
let currentDeliveryDetailData = null;
let currentAdminNotifications = [];
let currentDeliveryCapabilities = { builtin: [], presets: [] };
let currentDeliveryCapabilityResult = null;
let currentDeliveryQueueErrorFilter = '';
let currentDeliveryQueueSearch = '';
let currentDeliveryDeadErrorFilter = '';
let currentDeliveryDeadSearch = '';
let liveEnabled = true;
let liveIntervalMs = Math.max(1000, Number(liveIntervalSelect.value || 2000));
let liveTimer = null;
let refreshInFlight = false;
let liveEventSource = null;
let liveStreamConnected = false;
let realtimeRefreshTimer = null;
let realtimeRefreshReason = null;
let shopCatalogFetchTimer = null;
let shopCatalogRequestId = 0;
let shopCatalogSource = 'manifest';
let shopDeliveryItems = [];
let currentMetricsWindowMs = Math.max(
  60 * 1000,
  Number(metricsWindowSelect?.value || 24 * 60 * 60 * 1000),
);
const METRICS_SERIES_NAMES = [
  'deliveryQueueLength',
  'deliveryFailRate',
  'loginFailures',
  'webhookErrorRate',
];

const THEME_STORAGE_KEY = 'scum_admin_theme';
const SUPPORTED_THEMES = new Set(['military', 'neon']);
const ROLE_LEVEL = { mod: 1, admin: 2, owner: 3 };
const SHOP_CATALOG_ENDPOINTS = {
  manifest: '/admin/api/items/manifest-catalog',
  weapons: '/admin/api/items/weapons-catalog',
  icons: '/admin/api/items/catalog',
};
