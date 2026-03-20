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
    resolveScopedTenantId: (_req, _res, _auth, requestedTenantId) => requestedTenantId,
    requiredString(value) {
      return String(value || '').trim();
    },
    asInt(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    buildSecretRotationReport: () => ({
      ok: false,
      warnings: ['cookie scope needs review'],
      errors: ['ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET is missing or still placeholder'],
      data: {
        secrets: [{ id: 'DISCORD_TOKEN', status: 'ready', required: true, reloadTargets: ['bot'], validation: ['bot health ready'] }],
        reloadMatrix: [{ runtime: 'bot', secrets: ['DISCORD_TOKEN'], validation: ['bot health ready'] }],
      },
    }),
    buildSecretRotationCsv: () => 'id,label\nDISCORD_TOKEN,Discord bot token\n',
    jsonReplacer: null,
    ...overrides,
  });
}

test('secret rotation check route returns JSON payload', async () => {
  const handler = buildRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/security/rotation-check'),
    pathname: '/admin/api/security/rotation-check',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers['content-type'] || ''), /application\/json/i);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.data.secrets[0].id, 'DISCORD_TOKEN');
});

test('secret rotation export route returns CSV payload', async () => {
  const handler = buildRoutes();
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'GET', headers: {} },
    res,
    urlObj: new URL('https://admin.example.com/admin/api/security/rotation-check/export?format=csv'),
    pathname: '/admin/api/security/rotation-check/export',
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers['content-type'] || ''), /text\/csv/i);
  assert.match(String(res.headers['content-disposition'] || ''), /secret-rotation-check/i);
  assert.match(String(res.body || ''), /DISCORD_TOKEN/);
});
