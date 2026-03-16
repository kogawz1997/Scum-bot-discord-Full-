const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { once } = require('node:events');

const { prisma } = require('../src/prisma');
const {
  setAdminRestoreState,
} = require('../src/store/adminRestoreStateStore');
const {
  clearAdminRequestLogs,
} = require('../src/store/adminRequestLogStore');
const {
  clearAdminSecurityEvents,
} = require('../src/store/adminSecurityEventStore');
const {
  resetPlatformOpsState,
} = require('../src/store/platformOpsStateStore');

const adminWebServerPath = path.resolve(__dirname, '../src/adminWebServer.js');

function freshAdminWebServerModule() {
  delete require.cache[adminWebServerPath];
  return require(adminWebServerPath);
}

function randomPort(base = 40100, span = 500) {
  return base + Math.floor(Math.random() * span);
}

function resetAdminIntegrationRuntimeState() {
  setAdminRestoreState({
    status: 'idle',
    active: false,
    maintenance: false,
    backup: null,
    confirmBackup: null,
    rollbackBackup: null,
    actor: null,
    role: null,
    startedAt: null,
    endedAt: null,
    updatedAt: new Date().toISOString(),
    lastCompletedAt: null,
    durationMs: null,
    lastError: null,
    rollbackStatus: 'none',
    rollbackError: null,
    counts: null,
    currentCounts: null,
    diff: null,
    warnings: [],
    previewToken: null,
    previewBackup: null,
    previewIssuedAt: null,
    previewExpiresAt: null,
  });
  resetPlatformOpsState();
  clearAdminRequestLogs();
  clearAdminSecurityEvents();
  process.env.ADMIN_WEB_SSO_DISCORD_ENABLED = 'false';
  process.env.ADMIN_WEB_2FA_ENABLED = 'false';
}

test('tenant-scoped admin cannot cross tenant boundaries on platform read/write routes', async (t) => {
  resetAdminIntegrationRuntimeState();
  const port = randomPort();
  const ownerUser = `owner_boundary_${Date.now()}`;
  const tenantAdminUser = `tenant_admin_${Date.now()}`;
  const tenantOwnerUser = `tenant_owner_${Date.now()}`;
  const tenantId = `tenant-boundary-${Date.now()}`;
  const otherTenantId = `tenant-boundary-other-${Date.now()}`;

  process.env.ADMIN_WEB_HOST = '127.0.0.1';
  process.env.ADMIN_WEB_PORT = String(port);
  process.env.ADMIN_WEB_USER = ownerUser;
  process.env.ADMIN_WEB_PASSWORD = 'pass_boundary_owner';
  process.env.ADMIN_WEB_TOKEN = 'token_boundary_owner';
  process.env.ADMIN_WEB_USERS_JSON = '';

  const fakeClient = {
    guilds: { cache: new Map() },
    channels: { fetch: async () => null },
  };

  const { startAdminWebServer } = freshAdminWebServerModule();
  const server = startAdminWebServer(fakeClient);
  if (!server.listening) {
    await once(server, 'listening');
  }

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.platformMarketplaceOffer.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } }).catch(() => null);
    await prisma.platformApiKey.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } }).catch(() => null);
    await prisma.platformLicense.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } }).catch(() => null);
    await prisma.platformSubscription.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } }).catch(() => null);
    await prisma.platformWebhookEndpoint.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } }).catch(() => null);
    await prisma.platformTenant.deleteMany({ where: { id: { in: [tenantId, otherTenantId] } } }).catch(() => null);
    await prisma.$executeRawUnsafe(
      'DELETE FROM admin_web_users WHERE username IN ($1, $2, $3)',
      tenantAdminUser,
      tenantOwnerUser,
      ownerUser,
    ).catch(() => null);
    resetAdminIntegrationRuntimeState();
    delete require.cache[adminWebServerPath];
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  async function request(pathname, method = 'GET', body = null, cookie = '') {
    const headers = {};
    if (body != null) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const res = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  const ownerLogin = await request('/admin/api/login', 'POST', {
    username: ownerUser,
    password: 'pass_boundary_owner',
  });
  assert.equal(ownerLogin.res.status, 200);
  const ownerCookie = String(ownerLogin.res.headers.get('set-cookie') || '').split(';')[0];

  for (const id of [tenantId, otherTenantId]) {
    const tenantRes = await request('/admin/api/platform/tenant', 'POST', {
      id,
      name: id,
      slug: id,
      type: 'trial',
      status: 'active',
      locale: 'th',
      ownerEmail: `${id}@example.com`,
    }, ownerCookie);
    assert.equal(tenantRes.res.status, 200);
  }

  const tenantUserRes = await request('/admin/api/auth/user', 'POST', {
    username: tenantAdminUser,
    role: 'admin',
    password: 'pass_boundary_tenant',
    isActive: true,
    tenantId,
  }, ownerCookie);
  assert.equal(tenantUserRes.res.status, 200);
  assert.equal(String(tenantUserRes.data.data?.tenantId || ''), tenantId);

  const tenantOwnerRes = await request('/admin/api/auth/user', 'POST', {
    username: tenantOwnerUser,
    role: 'owner',
    password: 'pass_boundary_tenant_owner',
    isActive: true,
    tenantId,
  }, ownerCookie);
  assert.equal(tenantOwnerRes.res.status, 200);
  assert.equal(String(tenantOwnerRes.data.data?.tenantId || ''), tenantId);

  const tenantLogin = await request('/admin/api/login', 'POST', {
    username: tenantAdminUser,
    password: 'pass_boundary_tenant',
  });
  assert.equal(tenantLogin.res.status, 200);
  const tenantCookie = String(tenantLogin.res.headers.get('set-cookie') || '').split(';')[0];

  const tenantOwnerLogin = await request('/admin/api/login', 'POST', {
    username: tenantOwnerUser,
    password: 'pass_boundary_tenant_owner',
  });
  assert.equal(tenantOwnerLogin.res.status, 200);
  const tenantOwnerCookie = String(tenantOwnerLogin.res.headers.get('set-cookie') || '').split(';')[0];

  const tenantConfigUpsert = await request('/admin/api/platform/tenant-config', 'POST', {
    tenantId,
    featureFlags: {
      tenantBoundaryTest: true,
    },
    configPatch: {
      platform: {
        tenantBoundaryTest: true,
      },
    },
  }, ownerCookie);
  assert.equal(tenantConfigUpsert.res.status, 200);

  const scopedQuota = await request(`/admin/api/platform/quota?tenantId=${encodeURIComponent(tenantId)}`, 'GET', null, tenantCookie);
  assert.equal(scopedQuota.res.status, 200);

  const crossQuota = await request(`/admin/api/platform/quota?tenantId=${encodeURIComponent(otherTenantId)}`, 'GET', null, tenantCookie);
  assert.equal(crossQuota.res.status, 403);
  assert.equal(String(crossQuota.data.error || ''), 'Forbidden: tenant scope mismatch');

  const scopedWebhookTest = await request('/admin/api/platform/webhook/test', 'POST', {
    tenantId,
    eventType: 'platform.boundary.test',
    payload: { scope: 'same-tenant' },
  }, tenantCookie);
  assert.equal(scopedWebhookTest.res.status, 200);
  assert.equal(String(scopedWebhookTest.data.data?.tenantId || ''), tenantId);

  const crossWebhookTest = await request('/admin/api/platform/webhook/test', 'POST', {
    tenantId: otherTenantId,
    eventType: 'platform.boundary.test',
    payload: { scope: 'other-tenant' },
  }, tenantCookie);
  assert.equal(crossWebhookTest.res.status, 403);
  assert.equal(String(crossWebhookTest.data.error || ''), 'Forbidden: tenant scope mismatch');

  const scopedControlPanel = await request('/admin/api/control-panel/settings', 'GET', null, tenantCookie);
  assert.equal(scopedControlPanel.res.status, 200);
  assert.equal(String(scopedControlPanel.data.data?.tenantScope?.tenantId || ''), tenantId);
  assert.deepEqual(scopedControlPanel.data.data?.env?.root || {}, {});
  assert.deepEqual(scopedControlPanel.data.data?.envCatalog?.root || [], []);

  const crossControlPanel = await request(
    `/admin/api/control-panel/settings?tenantId=${encodeURIComponent(otherTenantId)}`,
    'GET',
    null,
    tenantCookie,
  );
  assert.equal(crossControlPanel.res.status, 403);
  assert.equal(String(crossControlPanel.data.error || ''), 'Forbidden: tenant scope mismatch');

  const tenantEnvWrite = await request('/admin/api/control-panel/env', 'POST', {
    root: {
      DISCORD_GUILD_ID: '999999999999999999',
    },
  }, tenantOwnerCookie);
  assert.equal(tenantEnvWrite.res.status, 403);
  assert.equal(
    String(tenantEnvWrite.data.error || ''),
    'Tenant-scoped admin cannot modify global environment settings',
  );

  const tenantConfigPatch = await request('/admin/api/config/patch', 'POST', {
    patch: {
      commands: {
        disabled: ['buy'],
      },
    },
  }, tenantOwnerCookie);
  assert.equal(tenantConfigPatch.res.status, 403);
  assert.equal(
    String(tenantConfigPatch.data.error || ''),
    'Tenant-scoped admin cannot patch global config directly',
  );

  const tenantRestart = await request('/admin/api/runtime/restart-service', 'POST', {
    service: 'worker',
  }, tenantOwnerCookie);
  assert.equal(tenantRestart.res.status, 403);
  assert.equal(
    String(tenantRestart.data.error || ''),
    'Tenant-scoped admin cannot restart shared runtime services',
  );

  const scopedTenantConfig = await request(
    `/admin/api/platform/tenant-config?tenantId=${encodeURIComponent(tenantId)}`,
    'GET',
    null,
    tenantCookie,
  );
  assert.equal(scopedTenantConfig.res.status, 200);
  assert.equal(String(scopedTenantConfig.data.data?.tenantId || ''), tenantId);

  const crossTenantConfig = await request(
    `/admin/api/platform/tenant-config?tenantId=${encodeURIComponent(otherTenantId)}`,
    'GET',
    null,
    tenantCookie,
  );
  assert.equal(crossTenantConfig.res.status, 403);
  assert.equal(String(crossTenantConfig.data.error || ''), 'Forbidden: tenant scope mismatch');

  const scopedTenantConfigList = await request('/admin/api/platform/tenant-configs', 'GET', null, tenantCookie);
  assert.equal(scopedTenantConfigList.res.status, 200);
  assert.ok(
    Array.isArray(scopedTenantConfigList.data.data)
      && scopedTenantConfigList.data.data.every((row) => String(row?.tenantId || '') === tenantId),
  );

  const crossTenantConfigList = await request(
    `/admin/api/platform/tenant-configs?tenantId=${encodeURIComponent(otherTenantId)}`,
    'GET',
    null,
    tenantCookie,
  );
  assert.equal(crossTenantConfigList.res.status, 403);
  assert.equal(String(crossTenantConfigList.data.error || ''), 'Forbidden: tenant scope mismatch');

  const sameTenantWebhookList = await request(
    `/admin/api/platform/webhooks?tenantId=${encodeURIComponent(tenantId)}`,
    'GET',
    null,
    tenantOwnerCookie,
  );
  assert.equal(sameTenantWebhookList.res.status, 200);

  const crossTenantWebhookList = await request(
    `/admin/api/platform/webhooks?tenantId=${encodeURIComponent(otherTenantId)}`,
    'GET',
    null,
    tenantOwnerCookie,
  );
  assert.equal(crossTenantWebhookList.res.status, 403);
  assert.equal(String(crossTenantWebhookList.data.error || ''), 'Forbidden: tenant scope mismatch');

  const monitoringRes = await request('/admin/api/platform/monitoring/run', 'POST', {
  }, tenantCookie);
  assert.equal(monitoringRes.res.status, 403);
  assert.equal(
    String(monitoringRes.data.error || ''),
    'Tenant-scoped admin cannot run shared platform monitoring directly',
  );
});
