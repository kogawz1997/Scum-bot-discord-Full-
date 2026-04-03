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
    sendDownload() {
      throw new Error('download not used in this test');
    },
    ensureRole: () => ({ user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' }),
    resolveScopedTenantId: (_req, _res, auth, requestedTenantId) => requestedTenantId || auth?.tenantId || null,
    getAuthTenantId: (auth) => auth?.tenantId || null,
    requiredString(value) {
      return String(value || '').trim();
    },
    asInt(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    listSupportTickets: () => ([
      {
        id: 11,
        channelId: 'portal-tenant-1-user-1-open',
        guildId: 'tenant-1',
        userId: 'user-1',
        category: 'player-support',
        reason: 'Need help with order ORD-1',
        status: 'open',
        createdAt: '2026-04-03T10:00:00.000Z',
      },
      {
        id: 12,
        channelId: 'portal-tenant-1-user-1-appeal',
        guildId: 'tenant-1',
        userId: 'user-1',
        category: 'appeal',
        reason: 'Appeal request',
        status: 'claimed',
        claimedBy: 'staff-1',
        createdAt: '2026-04-03T12:00:00.000Z',
      },
    ]),
    jsonReplacer: null,
    ...overrides,
  });
}

test('admin platform support-tickets route returns support queue summary and normalized items', async () => {
  const handler = buildRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/platform/support-tickets?tenantId=tenant-1&limit=10'),
    pathname: '/admin/api/platform/support-tickets',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.total, 2);
  assert.equal(payload.data.openCount, 2);
  assert.equal(payload.data.appealCount, 1);
  assert.equal(payload.data.items[0].channelId, 'portal-tenant-1-user-1-open');
  assert.equal(payload.data.items[1].isAppeal, true);
});
