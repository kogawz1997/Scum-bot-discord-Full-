const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '../src/services/platformMonitoringService.js');
const configPath = path.resolve(__dirname, '../src/config.js');
const snapshotServicePath = path.resolve(__dirname, '../src/services/adminSnapshotService.js');
const liveBusPath = path.resolve(__dirname, '../src/services/adminLiveBus.js');
const runtimeSupervisorPath = path.resolve(__dirname, '../src/services/runtimeSupervisorService.js');
const platformServicePath = path.resolve(__dirname, '../src/services/platformService.js');
const opsStateStorePath = path.resolve(__dirname, '../src/store/platformOpsStateStore.js');

function installMock(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

test.afterEach(() => {
  clearModule(servicePath);
  clearModule(configPath);
  clearModule(snapshotServicePath);
  clearModule(liveBusPath);
  clearModule(runtimeSupervisorPath);
  clearModule(platformServicePath);
  clearModule(opsStateStorePath);
});

test('platform monitoring emits subscription-expiring alerts for near-term subscriptions', async () => {
  const published = [];
  let state = {
    lastAlertAtByKey: {},
    lastMonitoringAt: null,
    lastReconcileAt: null,
    lastAutoBackupAt: null,
  };

  installMock(configPath, {
    platform: {
      monitoring: {
        enabled: true,
        intervalMs: 60_000,
        reconcileEveryMs: 600_000,
        staleAgentMs: 900_000,
        alertCooldownMs: 600_000,
        subscriptionExpiringMs: 7 * 24 * 60 * 60 * 1000,
      },
      backups: {
        enabled: false,
      },
    },
  });
  installMock(snapshotServicePath, {
    createAdminBackup: async () => ({ ok: true }),
  });
  installMock(liveBusPath, {
    publishAdminLiveUpdate(type, payload) {
      published.push({ type, payload });
    },
  });
  installMock(runtimeSupervisorPath, {
    getRuntimeSupervisorSnapshot: async () => ({ items: [] }),
  });
  installMock(platformServicePath, {
    listPlatformAgentRuntimes: async () => ([]),
    getPlatformAnalyticsOverview: async () => ({}),
    getTenantQuotaSnapshot: async () => ({ quotas: {} }),
    listPlatformTenants: async () => ([]),
    listPlatformSubscriptions: async () => ([
      {
        id: 'sub-expiring-1',
        tenantId: 'tenant-expiring-1',
        tenantName: 'Tenant Expiring',
        packageName: 'FULL_OPTION',
        lifecycleStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toISOString(),
      },
      {
        id: 'sub-far-future',
        tenantId: 'tenant-future',
        packageName: 'BOT_LOG',
        lifecycleStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + (20 * 24 * 60 * 60 * 1000)).toISOString(),
      },
    ]),
    reconcileDeliveryState: async () => ({
      summary: {
        anomalies: 0,
        abuseFindings: 0,
      },
      anomalies: [],
      abuseFindings: [],
    }),
  });
  installMock(opsStateStorePath, {
    async getPlatformOpsState() {
      return state;
    },
    async updatePlatformOpsState(patch = {}) {
      state = {
        ...state,
        ...patch,
      };
      return state;
    },
  });

  const {
    runPlatformMonitoringCycle,
  } = require(servicePath);

  const report = await runPlatformMonitoringCycle({ force: true });

  assert.equal(report.ok, true);
  assert.equal(Array.isArray(report.subscriptions?.expiring), true);
  assert.equal(report.subscriptions.expiring.length, 1);
  assert.equal(String(report.subscriptions.expiring[0]?.subscriptionId || ''), 'sub-expiring-1');
  assert.ok(
    published.some((entry) => entry.type === 'subscription-expiring'
      && String(entry.payload?.tenantId || '') === 'tenant-expiring-1'
      && String(entry.payload?.subscriptionId || '') === 'sub-expiring-1'),
  );
});
