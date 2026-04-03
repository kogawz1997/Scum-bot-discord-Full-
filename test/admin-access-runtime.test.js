const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAdminAccessRuntime,
} = require('../src/admin/runtime/adminAccessRuntime');

test('admin access runtime records tenant-scope mismatch as a signal-only security event', () => {
  const sent = [];
  const signals = [];

  const runtime = createAdminAccessRuntime({
    sendJson: (res, statusCode, payload) => {
      sent.push({ res, statusCode, payload });
      return payload;
    },
    getAuthContext: () => null,
    hasRoleAtLeast: () => true,
    resolveTenantScope: ({ auth, requestedTenantId }) => {
      const authTenantId = String(auth?.tenantId || '').trim() || null;
      const requested = String(requestedTenantId || '').trim() || null;
      if (authTenantId && requested && requested !== authTenantId) {
        return {
          ok: false,
          statusCode: 403,
          error: 'Forbidden: tenant scope mismatch',
          tenantId: authTenantId,
        };
      }
      return { ok: true, tenantId: requested || authTenantId };
    },
    verifyPlatformApiKey: async () => ({ ok: false }),
    setRequestMeta: () => {},
    getAdminPermissionForPath: () => null,
    resolveItemIconUrl: () => null,
    getClientIp: () => '10.10.10.10',
    recordAdminSecuritySignal: (type, payload) => {
      signals.push({ type, payload });
    },
  });

  const req = {
    url: '/admin/api/platform/quota?tenantId=tenant-b',
    headers: {},
  };
  const res = {};
  const auth = {
    user: 'tenant-admin',
    role: 'admin',
    tenantId: 'tenant-a',
  };

  const tenantId = runtime.resolveScopedTenantId(req, res, auth, 'tenant-b', { required: true });

  assert.equal(tenantId, null);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].statusCode, 403);
  assert.equal(sent[0].payload.error, 'Forbidden: tenant scope mismatch');

  assert.equal(signals.length, 1);
  assert.equal(signals[0].type, 'tenant-scope-mismatch');
  assert.equal(signals[0].payload.severity, 'warn');
  assert.equal(signals[0].payload.suppressNotification, true);
  assert.equal(signals[0].payload.actor, 'tenant-admin');
  assert.equal(signals[0].payload.role, 'admin');
  assert.equal(signals[0].payload.ip, '10.10.10.10');
  assert.equal(signals[0].payload.reason, 'tenant-scope-mismatch');
  assert.deepEqual(signals[0].payload.data, {
    authTenantId: 'tenant-a',
    requestedTenantId: 'tenant-b',
  });
});
