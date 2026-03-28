'use strict';

const CONTROL_PLANE_REGISTRY_SLICE_KEYS = Object.freeze([
  'servers',
  'serverDiscordLinks',
  'agents',
  'agentTokenBindings',
  'agentProvisioningTokens',
  'agentDevices',
  'agentCredentials',
  'agentSessions',
  'syncRuns',
  'syncEvents',
]);

const CONTROL_PLANE_REGISTRY_HIGH_CHURN_FILE_MIRROR_SLICES = Object.freeze([
  'agentSessions',
  'syncRuns',
  'syncEvents',
]);

const CONTROL_PLANE_REGISTRY_DEFAULT_DB_FILE_MIRROR_SLICES = Object.freeze(
  CONTROL_PLANE_REGISTRY_SLICE_KEYS.filter(
    (sliceKey) => !CONTROL_PLANE_REGISTRY_HIGH_CHURN_FILE_MIRROR_SLICES.includes(sliceKey),
  ),
);

const SLICE_KEY_LOOKUP = new Map(
  CONTROL_PLANE_REGISTRY_SLICE_KEYS.map((sliceKey) => [sliceKey.toLowerCase(), sliceKey]),
);

function normalizeControlPlaneRegistrySliceKey(value) {
  return SLICE_KEY_LOOKUP.get(String(value || '').trim().toLowerCase()) || null;
}

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function resolveControlPlaneRegistryFileMirrorSlices(options = {}) {
  const env = options.env && typeof options.env === 'object'
    ? options.env
    : process.env;
  const persistenceMode = String(options.persistenceMode || '').trim().toLowerCase();
  const defaultSlices = Array.isArray(options.defaultSlices) && options.defaultSlices.length > 0
    ? options.defaultSlices
    : (
      persistenceMode === 'db'
        ? CONTROL_PLANE_REGISTRY_DEFAULT_DB_FILE_MIRROR_SLICES
        : CONTROL_PLANE_REGISTRY_SLICE_KEYS
    );
  const rawValue = Object.prototype.hasOwnProperty.call(options, 'value')
    ? options.value
    : env.CONTROL_PLANE_REGISTRY_FILE_MIRROR_SLICES;
  const text = String(rawValue == null ? '' : rawValue).trim();

  if (!text) {
    return {
      mode: 'default',
      slices: [...defaultSlices],
      invalid: [],
    };
  }

  const lowered = text.toLowerCase();
  if (['none', 'off', 'false', '0'].includes(lowered)) {
    return {
      mode: 'explicit',
      slices: [],
      invalid: [],
    };
  }

  const invalid = [];
  const slices = [];
  const seen = new Set();
  for (const token of parseCsvList(text)) {
    const loweredToken = token.toLowerCase();
    if (loweredToken === 'all' || loweredToken === '*') {
      return {
        mode: 'explicit',
        slices: [...CONTROL_PLANE_REGISTRY_SLICE_KEYS],
        invalid: [],
      };
    }
    const normalized = normalizeControlPlaneRegistrySliceKey(token);
    if (!normalized) {
      invalid.push(token);
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    slices.push(normalized);
  }

  return {
    mode: 'explicit',
    slices,
    invalid,
  };
}

module.exports = {
  CONTROL_PLANE_REGISTRY_DEFAULT_DB_FILE_MIRROR_SLICES,
  CONTROL_PLANE_REGISTRY_HIGH_CHURN_FILE_MIRROR_SLICES,
  CONTROL_PLANE_REGISTRY_SLICE_KEYS,
  normalizeControlPlaneRegistrySliceKey,
  resolveControlPlaneRegistryFileMirrorSlices,
};
