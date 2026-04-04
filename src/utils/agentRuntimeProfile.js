const SYNC_ROLE = 'sync';
const EXECUTE_ROLE = 'execute';

const SYNC_ONLY_SCOPE = 'sync_only';
const EXECUTE_ONLY_SCOPE = 'execute_only';

const SYNC_SIGNALS = Object.freeze([
  'sync',
  'watch',
  'watcher',
  'read',
  'reader',
  'monitor',
  'monitoring',
  'ingest',
  'snapshot',
  'telemetry',
  'log',
  'logs',
  'probe',
]);

const EXECUTE_SIGNALS = Object.freeze([
  'execute',
  'exec',
  'write',
  'writer',
  'delivery',
  'dispatch',
  'command',
  'rcon',
  'console-agent',
  'consoleagent',
  'apply',
  'reconcile',
  'repair',
  'retry',
]);

function trimText(value, maxLen = 160) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}

function normalizeCapabilities(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n]+/g)
      : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of rawValues) {
    const token = trimText(entry, 80).toLowerCase();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    normalized.push(token);
  }
  return normalized;
}

function normalizeAgentRole(value) {
  const text = trimText(value, 80).toLowerCase();
  if (!text) return null;
  if ([SYNC_ROLE, 'read', 'reader', 'watch', 'watcher', 'monitor'].includes(text)) return SYNC_ROLE;
  if ([EXECUTE_ROLE, 'write', 'writer', 'command', 'delivery', 'rcon'].includes(text)) return EXECUTE_ROLE;
  return null;
}

function normalizeAgentScope(value) {
  const text = trimText(value, 80).toLowerCase();
  if (!text) return null;
  if ([SYNC_ONLY_SCOPE, 'sync-only', 'synconly', 'read-only', 'readonly'].includes(text)) return SYNC_ONLY_SCOPE;
  if ([EXECUTE_ONLY_SCOPE, 'execute-only', 'executeonly', 'write-only', 'writeonly'].includes(text)) return EXECUTE_ONLY_SCOPE;
  return null;
}

function deriveRoleFromScope(scope) {
  if (scope === SYNC_ONLY_SCOPE) return SYNC_ROLE;
  if (scope === EXECUTE_ONLY_SCOPE) return EXECUTE_ROLE;
  return null;
}

function deriveScopeFromRole(role) {
  if (role === SYNC_ROLE) return SYNC_ONLY_SCOPE;
  if (role === EXECUTE_ROLE) return EXECUTE_ONLY_SCOPE;
  return null;
}

function hasAnySignal(haystack, signals) {
  return signals.some((token) => haystack.includes(token));
}

function buildSignalText(input = {}, meta = {}, capabilities = []) {
  const values = [
    input.runtimeKey,
    input.channel,
    meta.kind,
    meta.mode,
    meta.type,
    meta.agentLabel,
    meta.label,
    meta.runtimeLabel,
    ...capabilities,
  ];
  return values
    .map((entry) => trimText(entry, 160).toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function normalizeAgentRuntimeProfile(input = {}) {
  const meta = input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)
    ? input.meta
    : {};
  const capabilities = normalizeCapabilities(meta.capabilities || meta.features);
  const explicitScope = normalizeAgentScope(meta.agentScope || meta.scope);
  const explicitRole = normalizeAgentRole(meta.agentRole || meta.role || meta.mode) || deriveRoleFromScope(explicitScope);

  let inferredRole = explicitRole;
  if (!inferredRole) {
    const signalText = buildSignalText(input, meta, capabilities);
    const hasSync = hasAnySignal(signalText, SYNC_SIGNALS);
    const hasExecute = hasAnySignal(signalText, EXECUTE_SIGNALS);
    if (hasSync) inferredRole = SYNC_ROLE;
    if (hasExecute && !hasSync) inferredRole = EXECUTE_ROLE;
  }

  const scope = explicitScope || deriveScopeFromRole(inferredRole);
  const agentId = trimText(meta.agentId || meta.id || meta.agentKey, 120) || null;
  const serverId = trimText(meta.serverId || meta.nodeId, 120) || null;
  const guildId = trimText(meta.guildId || meta.discordGuildId, 120) || null;
  const agentLabel = trimText(meta.agentLabel || meta.label || meta.runtimeLabel, 120) || null;

  return {
    agentRole: inferredRole || null,
    agentScope: scope || null,
    agentId,
    serverId,
    guildId,
    agentLabel,
    capabilities,
  };
}

function mergeAgentRuntimeProfile(meta, profile) {
  const next = meta && typeof meta === 'object' && !Array.isArray(meta) ? { ...meta } : {};
  if (!profile || typeof profile !== 'object') return Object.keys(next).length > 0 ? next : null;
  if (profile.agentRole) next.agentRole = profile.agentRole;
  if (profile.agentScope) next.agentScope = profile.agentScope;
  if (profile.agentId) next.agentId = profile.agentId;
  if (profile.serverId) next.serverId = profile.serverId;
  if (profile.guildId) next.guildId = profile.guildId;
  if (profile.agentLabel) next.agentLabel = profile.agentLabel;
  if (Array.isArray(profile.capabilities) && profile.capabilities.length > 0) next.capabilities = profile.capabilities;
  return Object.keys(next).length > 0 ? next : null;
}

module.exports = {
  EXECUTE_ONLY_SCOPE,
  EXECUTE_ROLE,
  SYNC_ONLY_SCOPE,
  SYNC_ROLE,
  mergeAgentRuntimeProfile,
  normalizeAgentRuntimeProfile,
};
