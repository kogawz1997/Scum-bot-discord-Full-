const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const servicePath = path.join(
  rootDir,
  'src',
  'services',
  'platformAutomationService.js',
);
const configPath = path.join(rootDir, 'src', 'config.js');
const adminLiveBusPath = path.join(rootDir, 'src', 'services', 'adminLiveBus.js');
const runtimeSupervisorPath = path.join(rootDir, 'src', 'services', 'runtimeSupervisorService.js');
const adminServiceControlPath = path.join(rootDir, 'src', 'services', 'adminServiceControl.js');
const platformMonitoringPath = path.join(rootDir, 'src', 'services', 'platformMonitoringService.js');
const automationStateStorePath = path.join(
  rootDir,
  'src',
  'store',
  'platformAutomationStateStore.js',
);

const ENV_KEYS = [
  'NODE_ENV',
  'PLATFORM_AUTOMATION_ENABLED',
  'PLATFORM_AUTOMATION_RESTART_SERVICES',
  'PLATFORM_AUTOMATION_ALLOW_SELF_RESTART',
];

const originalEnv = new Map(
  ENV_KEYS.map((key) => [
    key,
    Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined,
  ]),
);

function restoreEnv() {
  for (const [key, value] of originalEnv.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function installMock(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function loadAutomationService(options = {}) {
  const liveEvents = [];
  const restarts = [];
  const monitoringRuns = [];
  let state = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    lastAutomationAt: null,
    lastForcedMonitoringAt: null,
    lastRecoveryAtByKey: {},
    recoveryWindowStartedAtByKey: {},
    recoveryAttemptsByKey: {},
    lastRecoveryResultByKey: {},
    ...(options.initialState || {}),
  };

  installMock(configPath, {
    platform: {
      automation: {
        enabled: options.enabled === true,
        intervalMs: 60_000,
        recoveryCooldownMs: 1_000,
        recoveryWindowMs: 60_000,
        maxAttemptsPerRuntime: 2,
        maxActionsPerCycle: 1,
        runMonitoringAfterRecovery: true,
        postRestartMonitoringDelayMs: 0,
        allowSelfRestart: options.allowSelfRestart === true,
        restartServices: options.restartServices || ['worker', 'watcher', 'player-portal', 'console-agent'],
      },
    },
  });
  installMock(adminLiveBusPath, {
    publishAdminLiveUpdate: (type, payload) => {
      liveEvents.push({ type, payload });
    },
  });
  installMock(runtimeSupervisorPath, {
    getRuntimeSupervisorSnapshot: async () => options.runtimeSupervisorSnapshot || {
      overall: 'ready',
      counts: { total: 0, required: 0, ready: 0, degraded: 0, offline: 0, disabled: 0 },
      items: [],
    },
  });
  installMock(adminServiceControlPath, {
    restartManagedRuntimeServices: async (input) => {
      restarts.push(input);
      return options.restartResult || {
        ok: true,
        exitCode: 0,
        command: 'pm2',
        args: ['restart', 'scum-worker', '--update-env'],
        stdout: 'ok',
        stderr: '',
      };
    },
  });
  installMock(platformMonitoringPath, {
    runPlatformMonitoringCycle: async () => {
      const result = options.monitoringResult || {
        ok: true,
        generatedAt: new Date().toISOString(),
      };
      monitoringRuns.push(result);
      return result;
    },
  });
  installMock(automationStateStorePath, {
    getPlatformAutomationState: () => ({
      ...state,
      lastRecoveryAtByKey: { ...(state.lastRecoveryAtByKey || {}) },
      recoveryWindowStartedAtByKey: { ...(state.recoveryWindowStartedAtByKey || {}) },
      recoveryAttemptsByKey: { ...(state.recoveryAttemptsByKey || {}) },
      lastRecoveryResultByKey: { ...(state.lastRecoveryResultByKey || {}) },
    }),
    updatePlatformAutomationState: (patch) => {
      state = {
        ...state,
        ...(patch || {}),
      };
      return {
        ...state,
        lastRecoveryAtByKey: { ...(state.lastRecoveryAtByKey || {}) },
        recoveryWindowStartedAtByKey: { ...(state.recoveryWindowStartedAtByKey || {}) },
        recoveryAttemptsByKey: { ...(state.recoveryAttemptsByKey || {}) },
        lastRecoveryResultByKey: { ...(state.lastRecoveryResultByKey || {}) },
      };
    },
  });

  delete require.cache[servicePath];
  const service = require(servicePath);
  return {
    ...service,
    liveEvents,
    restarts,
    monitoringRuns,
    getState: () => state,
  };
}

test.afterEach(() => {
  restoreEnv();
  delete require.cache[servicePath];
  delete require.cache[configPath];
  delete require.cache[adminLiveBusPath];
  delete require.cache[runtimeSupervisorPath];
  delete require.cache[adminServiceControlPath];
  delete require.cache[platformMonitoringPath];
  delete require.cache[automationStateStorePath];
});

test('platform automation skips when disabled and not forced', async () => {
  process.env.NODE_ENV = 'test';
  const { runPlatformAutomationCycle, restarts, monitoringRuns } = loadAutomationService({
    enabled: false,
  });

  const result = await runPlatformAutomationCycle();

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'platform-automation-disabled');
  assert.equal(restarts.length, 0);
  assert.equal(monitoringRuns.length, 0);
});

test('platform automation restarts an offline worker and runs follow-up monitoring', async () => {
  process.env.NODE_ENV = 'test';
  const { runPlatformAutomationCycle, liveEvents, restarts, monitoringRuns, getState } = loadAutomationService({
    enabled: false,
    runtimeSupervisorSnapshot: {
      overall: 'offline',
      counts: { total: 1, required: 1, ready: 0, degraded: 0, offline: 1, disabled: 0 },
      items: [
        {
          key: 'worker',
          label: 'Worker',
          enabled: true,
          required: true,
          status: 'offline',
          reason: 'timeout',
          url: 'http://127.0.0.1:3310',
          data: null,
        },
      ],
    },
  });

  const result = await runPlatformAutomationCycle({ force: true });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].serviceKey, 'worker');
  assert.equal(result.actions[0].ok, true);
  assert.deepEqual(restarts, [['worker']]);
  assert.equal(monitoringRuns.length, 1);
  assert.ok(
    liveEvents.some((entry) => entry.payload?.kind === 'platform-auto-restart-started'),
  );
  assert.ok(
    liveEvents.some((entry) => entry.payload?.kind === 'platform-auto-restart-succeeded'),
  );
  assert.equal(typeof getState().lastAutomationAt, 'string');
  assert.equal(getState().recoveryAttemptsByKey.worker, 1);
  assert.equal(getState().lastRecoveryResultByKey.worker.ok, true);
});

test('platform automation does not restart self-hosted bot when self-restart is disabled', async () => {
  process.env.NODE_ENV = 'test';
  const { runPlatformAutomationCycle, restarts } = loadAutomationService({
    enabled: false,
    runtimeSupervisorSnapshot: {
      overall: 'offline',
      counts: { total: 1, required: 1, ready: 0, degraded: 0, offline: 1, disabled: 0 },
      items: [
        {
          key: 'bot',
          label: 'Discord Bot',
          enabled: true,
          required: true,
          status: 'offline',
          reason: 'discord-not-ready',
          url: 'http://127.0.0.1:3201',
          data: null,
        },
      ],
    },
  });

  const result = await runPlatformAutomationCycle({ force: true, dryRun: true });

  assert.equal(result.ok, true);
  assert.equal(result.actions.length, 0);
  assert.equal(restarts.length, 0);
  assert.ok(
    result.evaluated.some(
      (entry) => entry.runtimeKey === 'bot' && entry.reason === 'self-restart-disabled',
    ),
  );
});

test('platform automation can auto-recover a degraded console-agent when recovery is marked safe', async () => {
  process.env.NODE_ENV = 'test';
  const { runPlatformAutomationCycle, restarts } = loadAutomationService({
    enabled: false,
    runtimeSupervisorSnapshot: {
      overall: 'degraded',
      counts: { total: 1, required: 1, ready: 0, degraded: 1, offline: 0, disabled: 0 },
      items: [
        {
          key: 'console-agent',
          label: 'Console Agent',
          enabled: true,
          required: true,
          status: 'degraded',
          reason: 'managed-server-restarting',
          url: 'http://127.0.0.1:3330',
          data: {
            classification: {
              autoRecoverable: true,
            },
          },
        },
      ],
    },
  });

  const result = await runPlatformAutomationCycle({ force: true });

  assert.equal(result.ok, true);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].serviceKey, 'console-agent');
  assert.deepEqual(restarts, [['console-agent']]);
});
