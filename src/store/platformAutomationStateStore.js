const fs = require('node:fs');

const { atomicWriteJson, getFilePath } = require('./_persist');

const FILE_PATH = getFilePath('platform-automation-state.json');

let state = null;

function nowIso() {
  return new Date().toISOString();
}

function normalizeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function trimText(value, maxLen = 240) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

function normalizeIsoMap(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = trimText(key, 120);
    const normalizedAt = normalizeIso(entry);
    if (!normalizedKey || !normalizedAt) continue;
    out[normalizedKey] = normalizedAt;
  }
  return out;
}

function normalizeIntMap(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = trimText(key, 120);
    const parsed = Number(entry);
    if (!normalizedKey || !Number.isFinite(parsed) || parsed < 0) continue;
    out[normalizedKey] = Math.trunc(parsed);
  }
  return out;
}

function normalizeResultMap(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = trimText(key, 120);
    if (!normalizedKey || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    out[normalizedKey] = {
      at: normalizeIso(entry.at) || nowIso(),
      ok: entry.ok === true,
      action: trimText(entry.action, 120),
      runtimeKey: trimText(entry.runtimeKey, 120),
      status: trimText(entry.status, 80),
      reason: trimText(entry.reason, 240),
      exitCode: Number.isFinite(Number(entry.exitCode)) ? Math.trunc(Number(entry.exitCode)) : null,
    };
  }
  return out;
}

function buildDefaultState() {
  return {
    schemaVersion: 1,
    updatedAt: nowIso(),
    lastAutomationAt: null,
    lastForcedMonitoringAt: null,
    lastRecoveryAtByKey: {},
    recoveryWindowStartedAtByKey: {},
    recoveryAttemptsByKey: {},
    lastRecoveryResultByKey: {},
  };
}

function normalizeState(next = {}) {
  const merged = {
    ...buildDefaultState(),
    ...(state || {}),
    ...(next && typeof next === 'object' ? next : {}),
  };
  return {
    schemaVersion: 1,
    updatedAt: normalizeIso(merged.updatedAt) || nowIso(),
    lastAutomationAt: normalizeIso(merged.lastAutomationAt),
    lastForcedMonitoringAt: normalizeIso(merged.lastForcedMonitoringAt),
    lastRecoveryAtByKey: normalizeIsoMap(merged.lastRecoveryAtByKey),
    recoveryWindowStartedAtByKey: normalizeIsoMap(merged.recoveryWindowStartedAtByKey),
    recoveryAttemptsByKey: normalizeIntMap(merged.recoveryAttemptsByKey),
    lastRecoveryResultByKey: normalizeResultMap(merged.lastRecoveryResultByKey),
  };
}

function writeStateToDisk() {
  const snapshot = normalizeState(state || {});
  atomicWriteJson(FILE_PATH, snapshot);
}

function initPlatformAutomationStateStore() {
  if (state) return state;
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf8');
      if (raw.trim()) {
        state = normalizeState(JSON.parse(raw));
        return state;
      }
    }
  } catch (error) {
    console.error('[platformAutomationStateStore] failed to hydrate:', error.message);
  }
  state = buildDefaultState();
  return state;
}

function getPlatformAutomationState() {
  initPlatformAutomationStateStore();
  return normalizeState(state || {});
}

function updatePlatformAutomationState(patch = {}) {
  initPlatformAutomationStateStore();
  state = normalizeState({
    ...(state || {}),
    ...(patch && typeof patch === 'object' ? patch : {}),
    updatedAt: nowIso(),
  });
  try {
    writeStateToDisk();
  } catch (error) {
    console.error('[platformAutomationStateStore] failed to persist:', error.message);
  }
  return getPlatformAutomationState();
}

function resetPlatformAutomationState() {
  state = buildDefaultState();
  try {
    writeStateToDisk();
  } catch (error) {
    console.error('[platformAutomationStateStore] failed to reset:', error.message);
  }
  return getPlatformAutomationState();
}

initPlatformAutomationStateStore();

module.exports = {
  getPlatformAutomationState,
  initPlatformAutomationStateStore,
  resetPlatformAutomationState,
  updatePlatformAutomationState,
};
