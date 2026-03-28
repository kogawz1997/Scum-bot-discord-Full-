const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAdminPlatformPostRoutes,
} = require('../src/admin/api/adminPlatformPostRoutes');
const {
  createAdminGetRoutes,
} = require('../src/admin/api/adminGetRoutes');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = { ...this.headers, ...headers };
    },
    end(body = null) {
      this.ended = true;
      this.body = body;
    },
  };
}

function buildPostRoutes(overrides = {}) {
  return createAdminPlatformPostRoutes({
    sendJson(res, statusCode, payload) {
      res.writeHead(statusCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    },
    requiredString(value, key) {
      if (value && typeof value === 'object' && key) {
        return String(value[key] || '').trim();
      }
      return String(value || '').trim();
    },
    parseStringArray: () => [],
    getAuthTenantId: (auth) => auth?.tenantId || null,
    resolveScopedTenantId: (_req, _res, auth, requestedTenantId) => requestedTenantId || auth?.tenantId || null,
    createAdminBackup: async () => ({}),
    previewAdminBackupRestore: async () => ({}),
    restoreAdminBackup: async () => ({}),
    getCurrentObservabilitySnapshot: async () => ({}),
    publishAdminLiveUpdate: () => {},
    createTenant: async () => ({ ok: true }),
    createSubscription: async () => ({ ok: true }),
    issuePlatformLicense: async () => ({ ok: true }),
    listPlatformLicenses: async () => ([]),
    acceptPlatformLicenseLegal: async () => ({ ok: true }),
    createPlatformApiKey: async () => ({ ok: true }),
    createPlatformWebhookEndpoint: async () => ({ ok: true }),
    dispatchPlatformWebhookEvent: async () => ([]),
    createMarketplaceOffer: async () => ({ ok: true }),
    reconcileDeliveryState: async () => ({ ok: true }),
    runPlatformMonitoringCycle: async () => ({ ok: true }),
    runPlatformAutomationCycle: async () => ({ ok: true, evaluated: [] }),
    acknowledgeAdminNotifications: () => ({}),
    clearAdminNotifications: () => ({}),
    ...overrides,
  });
}

function buildGetRoutes(overrides = {}) {
  return createAdminGetRoutes({
    sendJson(res, statusCode, payload) {
      res.writeHead(statusCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    },
    sendDownload(res, statusCode, content, options = {}) {
      res.writeHead(statusCode, {
        'content-type': options.contentType || 'application/octet-stream',
      });
      res.end(content);
    },
    ensureRole: () => ({ user: 'owner', role: 'owner', tenantId: null }),
    getAuthTenantId: (auth) => auth?.tenantId || null,
    resolveScopedTenantId: (_req, _res, auth, requestedTenantId) => requestedTenantId || auth?.tenantId || null,
    requiredString(value) {
      return String(value || '').trim();
    },
    asInt(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    getPlatformAnalyticsOverview: async () => ({ subscriptions: { mrrCents: 0 } }),
    getPlatformPublicOverview: async () => ({ tenants: 0 }),
    getPlatformPermissionCatalog: () => [],
    getPlanCatalog: () => [],
    getPlatformOpsState: () => ({ lastMonitoringAt: '2026-03-19T00:00:00.000Z' }),
    getPlatformAutomationState: () => ({ lastAutomationAt: '2026-03-19T00:01:00.000Z' }),
    getPlatformAutomationConfig: () => ({ enabled: true, maxActionsPerCycle: 1, restartServices: ['worker'] }),
    getPlatformTenantConfig: async () => null,
    listRestartPlans: async () => [],
    listRestartExecutions: async () => [],
    listAdminNotifications: () => [],
    getRuntimeSupervisorSnapshot: async () => null,
    getAdminRestoreState: () => ({}),
    jsonReplacer: null,
    filterRowsByTenantScope: (rows) => rows,
    ...overrides,
  });
}

test('admin platform automation route blocks tenant-scoped auth', async () => {
  const handler = buildPostRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/platform/automation/run',
    body: {},
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.match(String(res.body || ''), /Tenant-scoped admin cannot run shared platform automation directly/i);
});

test('admin platform automation route forwards force and dry-run flags', async () => {
  const calls = [];
  const handler = buildPostRoutes({
    runPlatformAutomationCycle: async (options) => {
      calls.push(options);
      return {
        ok: true,
        dryRun: options?.dryRun === true,
        evaluated: [],
      };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: { user: { id: 'client-1' } },
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/platform/automation/run',
    body: { force: true, dryRun: true },
    res,
    auth: { user: 'owner', role: 'owner', tenantId: null },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].force, true);
  assert.equal(calls[0].dryRun, true);
  assert.ok(calls[0].client);
});

test('admin platform overview exposes automation state alongside ops state', async () => {
  const handler = buildGetRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/platform/overview'),
    pathname: '/admin/api/platform/overview',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.data?.opsState, 'object');
  assert.equal(typeof payload.data?.automationState, 'object');
  assert.equal(typeof payload.data?.automationConfig, 'object');
});

test('admin platform ops-state route includes automation details', async () => {
  const handler = buildGetRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/platform/ops-state'),
    pathname: '/admin/api/platform/ops-state',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.data?.automation, 'object');
  assert.equal(typeof payload.data?.automationConfig, 'object');
});

test('admin platform restart plan route exposes filtered restart plans', async () => {
  const handler = buildGetRoutes({
    listRestartPlans: async (filters) => ([{
      id: 'rplan-1',
      tenantId: filters.tenantId,
      serverId: filters.serverId,
      status: filters.status || 'scheduled',
    }]),
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/platform/restart-plans?tenantId=tenant-1&serverId=server-1&status=scheduled'),
    pathname: '/admin/api/platform/restart-plans',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.length, 1);
  assert.equal(payload.data[0].tenantId, 'tenant-1');
  assert.equal(payload.data[0].serverId, 'server-1');
});

test('admin platform restart execution route exposes filtered execution history', async () => {
  const handler = buildGetRoutes({
    listRestartExecutions: async (filters) => ([{
      id: 'rexec-1',
      planId: filters.planId || 'rplan-1',
      tenantId: filters.tenantId,
      serverId: filters.serverId,
      resultStatus: filters.status || 'succeeded',
    }]),
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/platform/restart-executions?tenantId=tenant-1&serverId=server-1&planId=rplan-1&status=succeeded'),
    pathname: '/admin/api/platform/restart-executions',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.length, 1);
  assert.equal(payload.data[0].planId, 'rplan-1');
  assert.equal(payload.data[0].resultStatus, 'succeeded');
});
