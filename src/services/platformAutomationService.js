const config = require('../config');
const { publishAdminLiveUpdate } = require('./adminLiveBus');
const { restartManagedRuntimeServices } = require('./adminServiceControl');
const { runPlatformMonitoringCycle } = require('./platformMonitoringService');
const { getRuntimeSupervisorSnapshot } = require('./runtimeSupervisorService');
const {
  getPlatformAutomationState,
  updatePlatformAutomationState,
} = require('../store/platformAutomationStateStore');

let automationTimer = null;
let cyclePromise = null;

const MANAGED_SERVICE_KEYS = new Set([
  'bot',
  'worker',
  'watcher',
  'console-agent',
  'player-portal',
]);
const DEFAULT_RESTART_SERVICES = Object.freeze([
  'worker',
  'watcher',
  'player-portal',
  'console-agent',
]);
const DEFAULT_CONSOLE_AGENT_REASONS = new Set([
  'managed-server-restarting',
  'managed-process-exited',
  'managed-server-exited',
  'timeout',
  'agent-degraded',
]);

function nowIso() {
  return new Date().toISOString();
}

function envFlag(value, fallback = false) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function asInt(value, fallback, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.trunc(parsed));
}

function trimText(value, maxLen = 240) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

function parseServiceList(value, fallback = DEFAULT_RESTART_SERVICES) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  const entries = raw
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry) => MANAGED_SERVICE_KEYS.has(entry));
  return new Set(entries.length > 0 ? entries : fallback);
}

function waitMs(delayMs) {
  const duration = asInt(delayMs, 0, 0);
  if (duration <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function elapsedMsSince(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Date.now() - date.getTime();
}

// The automation layer is intentionally conservative: it only restarts managed
// runtimes that the platform already knows how to supervise and leaves risky
// tenant/order mutations to explicit operators.
function getAutomationConfig() {
  const runtimeConfig = config.platform?.automation || {};
  const isTest = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'test';
  const enabledFallback = runtimeConfig.enabled === true && !isTest;
  return {
    enabled: envFlag(process.env.PLATFORM_AUTOMATION_ENABLED, enabledFallback),
    intervalMs: asInt(
      process.env.PLATFORM_AUTOMATION_INTERVAL_MS,
      asInt(runtimeConfig.intervalMs, 2 * 60 * 1000, 30 * 1000),
      30 * 1000,
    ),
    recoveryCooldownMs: asInt(
      process.env.PLATFORM_AUTOMATION_RECOVERY_COOLDOWN_MS,
      asInt(runtimeConfig.recoveryCooldownMs, 5 * 60 * 1000, 30 * 1000),
      30 * 1000,
    ),
    recoveryWindowMs: asInt(
      process.env.PLATFORM_AUTOMATION_RECOVERY_WINDOW_MS,
      asInt(runtimeConfig.recoveryWindowMs, 30 * 60 * 1000, 60 * 1000),
      60 * 1000,
    ),
    maxAttemptsPerRuntime: asInt(
      process.env.PLATFORM_AUTOMATION_MAX_ATTEMPTS_PER_RUNTIME,
      asInt(runtimeConfig.maxAttemptsPerRuntime, 2, 1),
      1,
    ),
    maxActionsPerCycle: asInt(
      process.env.PLATFORM_AUTOMATION_MAX_ACTIONS_PER_CYCLE,
      asInt(runtimeConfig.maxActionsPerCycle, 1, 1),
      1,
    ),
    postRestartMonitoringDelayMs: asInt(
      process.env.PLATFORM_AUTOMATION_POST_RESTART_MONITORING_DELAY_MS,
      asInt(runtimeConfig.postRestartMonitoringDelayMs, 5 * 1000, 0),
      0,
    ),
    runMonitoringAfterRecovery: envFlag(
      process.env.PLATFORM_AUTOMATION_RUN_MONITORING_AFTER_RECOVERY,
      runtimeConfig.runMonitoringAfterRecovery !== false,
    ),
    allowSelfRestart: envFlag(
      process.env.PLATFORM_AUTOMATION_ALLOW_SELF_RESTART,
      runtimeConfig.allowSelfRestart === true,
    ),
    restartServices: parseServiceList(
      process.env.PLATFORM_AUTOMATION_RESTART_SERVICES,
      runtimeConfig.restartServices,
    ),
  };
}

function resolveManagedServiceKey(item, automationConfig) {
  const runtimeKey = String(item?.key || '').trim().toLowerCase();
  if (!runtimeKey) return null;
  if (MANAGED_SERVICE_KEYS.has(runtimeKey)) {
    if ((runtimeKey === 'bot' || runtimeKey === 'admin-web') && !automationConfig.allowSelfRestart) {
      return null;
    }
    return runtimeKey;
  }
  if (runtimeKey === 'admin-web' && automationConfig.allowSelfRestart) {
    return 'bot';
  }
  return null;
}

function isConsoleAgentAutoRecoverable(item) {
  const autoRecoverable =
    item?.data?.classification?.autoRecoverable === true
    || item?.data?.recovery?.autoRecoverable === true;
  if (autoRecoverable) return true;
  const reason = String(item?.reason || '').trim().toLowerCase();
  return DEFAULT_CONSOLE_AGENT_REASONS.has(reason);
}

function getAttemptWindowState(serviceKey, state, automationConfig) {
  const lastWindowAt = state?.recoveryWindowStartedAtByKey?.[serviceKey] || null;
  const withinWindow = elapsedMsSince(lastWindowAt) < automationConfig.recoveryWindowMs;
  return {
    startedAt: withinWindow ? lastWindowAt : null,
    attempts: withinWindow
      ? Math.max(0, Number(state?.recoveryAttemptsByKey?.[serviceKey] || 0))
      : 0,
  };
}

function evaluateRuntimeRecovery(item, state, automationConfig) {
  const runtimeKey = trimText(item?.key, 120) || 'unknown-runtime';
  const runtimeLabel = trimText(item?.label, 160) || runtimeKey;

  if (!item?.enabled || !item?.required) {
    return {
      runtimeKey,
      runtimeLabel,
      decision: 'skip',
      reason: 'runtime-not-required',
    };
  }

  const serviceKey = resolveManagedServiceKey(item, automationConfig);
  if (!serviceKey) {
    return {
      runtimeKey,
      runtimeLabel,
      decision: 'skip',
      reason: 'self-restart-disabled',
    };
  }
  if (!automationConfig.restartServices.has(serviceKey)) {
    return {
      runtimeKey,
      runtimeLabel,
      serviceKey,
      decision: 'skip',
      reason: 'service-not-enabled-for-automation',
    };
  }

  if (item.status === 'offline') {
    const elapsedSinceLastRecovery = elapsedMsSince(state?.lastRecoveryAtByKey?.[serviceKey]);
    if (elapsedSinceLastRecovery < automationConfig.recoveryCooldownMs) {
      return {
        runtimeKey,
        runtimeLabel,
        serviceKey,
        decision: 'skip',
        reason: 'restart-cooldown-active',
      };
    }
    const budget = getAttemptWindowState(serviceKey, state, automationConfig);
    if (budget.attempts >= automationConfig.maxAttemptsPerRuntime) {
      return {
        runtimeKey,
        runtimeLabel,
        serviceKey,
        decision: 'skip',
        reason: 'max-restart-attempts-reached',
      };
    }
    return {
      runtimeKey,
      runtimeLabel,
      serviceKey,
      decision: 'restart',
      status: String(item.status || '').trim() || 'offline',
      reason: trimText(item.reason, 240) || 'runtime-offline',
      url: trimText(item.url, 240) || null,
      budget,
    };
  }

  if (item.status === 'degraded' && serviceKey === 'console-agent' && isConsoleAgentAutoRecoverable(item)) {
    const elapsedSinceLastRecovery = elapsedMsSince(state?.lastRecoveryAtByKey?.[serviceKey]);
    if (elapsedSinceLastRecovery < automationConfig.recoveryCooldownMs) {
      return {
        runtimeKey,
        runtimeLabel,
        serviceKey,
        decision: 'skip',
        reason: 'restart-cooldown-active',
      };
    }
    const budget = getAttemptWindowState(serviceKey, state, automationConfig);
    if (budget.attempts >= automationConfig.maxAttemptsPerRuntime) {
      return {
        runtimeKey,
        runtimeLabel,
        serviceKey,
        decision: 'skip',
        reason: 'max-restart-attempts-reached',
      };
    }
    return {
      runtimeKey,
      runtimeLabel,
      serviceKey,
      decision: 'restart',
      status: 'degraded',
      reason: trimText(item.reason, 240) || 'console-agent-degraded',
      url: trimText(item.url, 240) || null,
      budget,
    };
  }

  return {
    runtimeKey,
    runtimeLabel,
    serviceKey,
    decision: 'skip',
    reason: `status-not-auto-recoverable:${String(item.status || 'unknown')}`,
  };
}

function buildNextAutomationState(currentState, actions = [], report = {}) {
  const nextState = {
    lastAutomationAt: report.generatedAt || nowIso(),
    lastForcedMonitoringAt: report.forcedMonitoring?.generatedAt || currentState?.lastForcedMonitoringAt || null,
    lastRecoveryAtByKey: {
      ...(currentState?.lastRecoveryAtByKey || {}),
    },
    recoveryWindowStartedAtByKey: {
      ...(currentState?.recoveryWindowStartedAtByKey || {}),
    },
    recoveryAttemptsByKey: {
      ...(currentState?.recoveryAttemptsByKey || {}),
    },
    lastRecoveryResultByKey: {
      ...(currentState?.lastRecoveryResultByKey || {}),
    },
  };

  for (const action of actions) {
    if (!action?.serviceKey) continue;
    const serviceKey = action.serviceKey;
    const generatedAt = action.at || report.generatedAt || nowIso();
    const previousWindowStartedAt = nextState.recoveryWindowStartedAtByKey[serviceKey];
    const withinWindow = elapsedMsSince(previousWindowStartedAt) < (report.recoveryWindowMs || 0);
    const windowStartedAt = withinWindow ? previousWindowStartedAt : generatedAt;
    const attempts = withinWindow
      ? Math.max(0, Number(nextState.recoveryAttemptsByKey[serviceKey] || 0)) + 1
      : 1;

    nextState.lastRecoveryAtByKey[serviceKey] = generatedAt;
    nextState.recoveryWindowStartedAtByKey[serviceKey] = windowStartedAt;
    nextState.recoveryAttemptsByKey[serviceKey] = attempts;
    nextState.lastRecoveryResultByKey[serviceKey] = {
      at: generatedAt,
      ok: action.ok === true,
      action: 'restart-managed-service',
      runtimeKey: action.runtimeKey,
      status: action.status,
      reason: action.reason,
      exitCode: Number.isFinite(Number(action.exitCode)) ? Math.trunc(Number(action.exitCode)) : null,
    };
  }

  return nextState;
}

async function runPlatformAutomationCycle({ client = null, force = false, dryRun = false } = {}) {
  const automationConfig = getAutomationConfig();
  if (!automationConfig.enabled && !force) {
    return {
      ok: true,
      skipped: true,
      reason: 'platform-automation-disabled',
    };
  }
  if (cyclePromise && !force) {
    return cyclePromise;
  }

  cyclePromise = (async () => {
    const generatedAt = nowIso();
    const stateBefore = await getPlatformAutomationState();
    const runtimeSupervisor = await getRuntimeSupervisorSnapshot({ forceRefresh: true });
    const evaluated = [];
    const actions = [];
    const eligibleIndexes = [];

    for (const item of Array.isArray(runtimeSupervisor?.items) ? runtimeSupervisor.items : []) {
      const evaluation = evaluateRuntimeRecovery(item, stateBefore, automationConfig);
      evaluated.push(evaluation);
      if (evaluation.decision === 'restart') {
        eligibleIndexes.push(evaluated.length - 1);
      }
    }

    const actionable = eligibleIndexes
      .slice(0, automationConfig.maxActionsPerCycle)
      .map((index) => evaluated[index]);
    for (const index of eligibleIndexes.slice(automationConfig.maxActionsPerCycle)) {
      evaluated[index] = {
        ...evaluated[index],
        decision: 'skip',
        reason: 'cycle-action-budget-exhausted',
      };
    }

    let forcedMonitoring = null;

    for (const decision of actionable) {
      if (dryRun) {
        actions.push({
          ...decision,
          ok: true,
          dryRun: true,
          at: generatedAt,
          command: null,
          args: [],
          stdout: '',
          stderr: '',
          exitCode: null,
        });
        continue;
      }

      publishAdminLiveUpdate('ops-alert', {
        source: 'platform-automation',
        kind: 'platform-auto-restart-started',
        runtimeKey: decision.runtimeKey,
        runtimeLabel: decision.runtimeLabel,
        serviceKey: decision.serviceKey,
        reason: decision.reason,
      });

      const restartResult = await restartManagedRuntimeServices([decision.serviceKey]);
      const action = {
        ...decision,
        ok: restartResult.ok === true,
        at: nowIso(),
        exitCode: restartResult.exitCode,
        command: trimText(restartResult.command, 80) || null,
        args: Array.isArray(restartResult.args) ? restartResult.args.map((entry) => trimText(entry, 120)) : [],
        stdout: trimText(restartResult.stdout, 240),
        stderr: trimText(restartResult.stderr, 240),
      };
      actions.push(action);

      publishAdminLiveUpdate('ops-alert', {
        source: 'platform-automation',
        kind: action.ok ? 'platform-auto-restart-succeeded' : 'platform-auto-restart-failed',
        runtimeKey: action.runtimeKey,
        runtimeLabel: action.runtimeLabel,
        serviceKey: action.serviceKey,
        reason: action.reason,
        exitCode: action.exitCode,
        stdout: action.stdout || null,
        stderr: action.stderr || null,
      });

      if (action.ok && automationConfig.runMonitoringAfterRecovery) {
        await waitMs(automationConfig.postRestartMonitoringDelayMs);
        try {
          forcedMonitoring = await runPlatformMonitoringCycle({ client, force: true });
        } catch (error) {
          forcedMonitoring = {
            ok: false,
            error: trimText(error?.message || error, 240),
            generatedAt: nowIso(),
          };
          publishAdminLiveUpdate('ops-alert', {
            source: 'platform-automation',
            kind: 'platform-auto-monitoring-followup-failed',
            runtimeKey: action.runtimeKey,
            runtimeLabel: action.runtimeLabel,
            serviceKey: action.serviceKey,
            error: forcedMonitoring.error,
          });
        }
      }
    }

    let stateAfter = stateBefore;
    if (!dryRun) {
      stateAfter = await updatePlatformAutomationState(
        buildNextAutomationState(
          stateBefore,
          actions,
          {
            generatedAt,
            forcedMonitoring,
            recoveryWindowMs: automationConfig.recoveryWindowMs,
          },
        ),
      );
    }

    return {
      ok: true,
      skipped: false,
      generatedAt,
      dryRun,
      runtimeSupervisor: {
        overall: runtimeSupervisor?.overall || 'unknown',
        counts: runtimeSupervisor?.counts || null,
      },
      evaluated,
      actions,
      forcedMonitoring,
      stateBefore,
      stateAfter,
      automationConfig: {
        enabled: automationConfig.enabled,
        intervalMs: automationConfig.intervalMs,
        recoveryCooldownMs: automationConfig.recoveryCooldownMs,
        recoveryWindowMs: automationConfig.recoveryWindowMs,
        maxAttemptsPerRuntime: automationConfig.maxAttemptsPerRuntime,
        maxActionsPerCycle: automationConfig.maxActionsPerCycle,
        runMonitoringAfterRecovery: automationConfig.runMonitoringAfterRecovery,
        allowSelfRestart: automationConfig.allowSelfRestart,
        restartServices: Array.from(automationConfig.restartServices),
      },
    };
  })().finally(() => {
    cyclePromise = null;
  });

  return cyclePromise;
}

function startPlatformAutomation({ client = null } = {}) {
  const automationConfig = getAutomationConfig();
  if (!automationConfig.enabled) return false;
  if (automationTimer) return true;
  void runPlatformAutomationCycle({ client }).catch((error) => {
    console.error('[platform-automation] initial cycle failed:', error.message);
  });
  automationTimer = setInterval(() => {
    void runPlatformAutomationCycle({ client }).catch((error) => {
      console.error('[platform-automation] cycle failed:', error.message);
    });
  }, automationConfig.intervalMs);
  if (typeof automationTimer.unref === 'function') {
    automationTimer.unref();
  }
  return true;
}

function stopPlatformAutomation() {
  if (automationTimer) {
    clearInterval(automationTimer);
    automationTimer = null;
  }
}

module.exports = {
  getAutomationConfig,
  runPlatformAutomationCycle,
  startPlatformAutomation,
  stopPlatformAutomation,
};
