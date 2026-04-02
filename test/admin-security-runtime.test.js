const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAdminSecurityRuntime,
} = require('../src/admin/runtime/adminSecurityRuntime');

test('admin security runtime rate limits repeated sensitive actions and records one security event per cooldown window', () => {
  const events = [];
  const notifications = [];
  const liveUpdates = [];

  const runtime = createAdminSecurityRuntime({
    loginRateLimitWindowMs: 60_000,
    loginRateLimitMaxAttempts: 5,
    loginSpikeWindowMs: 60_000,
    loginSpikeThreshold: 10,
    loginSpikeIpThreshold: 5,
    loginSpikeAlertCooldownMs: 60_000,
    actionRateLimitAlertCooldownMs: 60_000,
    actionRateLimitPolicies: {
      'server-restart': {
        windowMs: 60_000,
        maxAttempts: 1,
      },
    },
    getClientIp: () => '127.0.0.1',
    publishAdminLiveUpdate: (type, payload) => {
      liveUpdates.push({ type, payload });
    },
    addAdminNotification: (entry) => {
      notifications.push(entry);
      return entry;
    },
    recordAdminSecurityEvent: (entry) => {
      const event = { id: `evt-${events.length + 1}`, ...entry };
      events.push(event);
      return event;
    },
    logger: { warn() {} },
  });

  const first = runtime.consumeActionRateLimit('server-restart', {
    tenantId: 'tenant-1',
    actor: 'tenant-admin',
    ip: '10.0.0.1',
    identityKey: 'server-1',
    path: '/admin/api/platform/servers/server-1/restart',
  });
  const second = runtime.consumeActionRateLimit('server-restart', {
    tenantId: 'tenant-1',
    actor: 'tenant-admin',
    ip: '10.0.0.1',
    identityKey: 'server-1',
    path: '/admin/api/platform/servers/server-1/restart',
  });
  const third = runtime.consumeActionRateLimit('server-restart', {
    tenantId: 'tenant-1',
    actor: 'tenant-admin',
    ip: '10.0.0.1',
    identityKey: 'server-1',
    path: '/admin/api/platform/servers/server-1/restart',
  });

  assert.equal(first.limited, false);
  assert.equal(second.limited, true);
  assert.equal(third.limited, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'admin-action-rate-limited');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].kind, 'admin-action-rate-limited');
  assert.equal(liveUpdates.length, 1);
  assert.equal(liveUpdates[0].type, 'admin-security');
});
