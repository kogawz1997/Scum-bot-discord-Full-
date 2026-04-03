const test = require('node:test');
const assert = require('node:assert/strict');

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

function buildRoutes(overrides = {}) {
  return createAdminGetRoutes({
    sendJson(res, statusCode, payload) {
      res.writeHead(statusCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    },
    sendDownload(res, statusCode, content, options = {}) {
      res.writeHead(statusCode, {
        'content-type': options.contentType || 'application/octet-stream',
        'content-disposition': `attachment; filename="${options.filename || 'download.txt'}"`,
      });
      res.end(content);
    },
    ensureRole: () => ({ user: 'owner', role: 'owner', tenantId: null }),
    getAuthTenantId(auth) {
      return auth?.tenantId || null;
    },
    listAdminNotifications: () => ([
      {
        id: 'note-1',
        type: 'ops-alert',
        source: 'platform-monitor',
        kind: 'queue-pressure',
        severity: 'warn',
        title: 'Queue Pressure',
        message: 'queue=19 threshold=15',
        entityKey: 'queue-pressure',
        createdAt: '2026-03-19T03:00:00.000Z',
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
    ]),
    asInt(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    jsonReplacer: null,
    ...overrides,
  });
}

test('admin notifications export returns JSON payload', async () => {
  const handler = buildRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/notifications/export?acknowledged=false&limit=50'),
    pathname: '/admin/api/notifications/export',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers['content-type'] || ''), /application\/json/i);
  assert.match(String(res.body || ''), /queue-pressure/);
  assert.match(String(res.headers['content-disposition'] || ''), /admin-notifications-/i);
});

test('admin notifications export returns CSV payload', async () => {
  const handler = buildRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/notifications/export?format=csv&severity=warn'),
    pathname: '/admin/api/notifications/export',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers['content-type'] || ''), /text\/csv/i);
  assert.match(String(res.body || ''), /queue-pressure/);
  assert.match(String(res.body || ''), /severity/);
});

test('tenant notification route forwards tenant scope to the notification store', async () => {
  let seenOptions = null;
  const handler = buildRoutes({
    ensureRole: () => ({ user: 'tenant-admin', role: 'admin', tenantId: 'tenant-scope-1' }),
    listAdminNotifications: (options) => {
      seenOptions = options;
      return [{
        id: 'note-tenant-1',
        kind: 'subscription-expiring',
        severity: 'warn',
        title: 'Subscription Expiring Soon',
        message: 'Tenant-scoped notification',
        tenantId: 'tenant-scope-1',
      }];
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/notifications?limit=10'),
    pathname: '/admin/api/notifications',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(String(seenOptions?.tenantId || ''), 'tenant-scope-1');
  assert.match(String(res.body || ''), /note-tenant-1/);
});
