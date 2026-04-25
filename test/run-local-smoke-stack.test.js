const test = require('node:test');
const assert = require('node:assert/strict');

const { applyLocalSmokeTenantTopologyEnv } = require('../scripts/run-local-smoke-stack');

test('local smoke stack pins tenant topology to shared without auto provisioning', () => {
  const env = {
    TENANT_DB_TOPOLOGY_MODE: 'schema-per-tenant',
    TENANT_DB_AUTO_PROVISION: 'true',
    BOT_HEALTH_PORT: '3210',
    WORKER_HEALTH_PORT: '3211',
    SCUM_WATCHER_HEALTH_PORT: '3212',
    SMOKE_BOT_HEALTH_URL: 'http://127.0.0.1:3210',
    SMOKE_WORKER_HEALTH_URL: 'http://127.0.0.1:3211',
    SMOKE_WATCHER_HEALTH_URL: 'http://127.0.0.1:3212',
  };

  applyLocalSmokeTenantTopologyEnv(env);

  assert.equal(env.TENANT_DB_TOPOLOGY_MODE, 'shared');
  assert.equal(env.TENANT_DB_AUTO_PROVISION, 'false');
  assert.equal(env.TENANT_DB_ISOLATION_MODE, 'application');
  assert.equal(env.BOT_HEALTH_PORT, '0');
  assert.equal(env.WORKER_HEALTH_PORT, '0');
  assert.equal(env.SCUM_WATCHER_HEALTH_PORT, '0');
  assert.equal(env.SMOKE_BOT_HEALTH_URL, '');
  assert.equal(env.SMOKE_WORKER_HEALTH_URL, '');
  assert.equal(env.SMOKE_WATCHER_HEALTH_URL, '');
});
