'use strict';

/** Admin control-panel registry for env keys that can be edited from the web UI. */

const path = require('node:path');

const { parseEnvFile } = require('../utils/loadEnvFiles');

function getRootEnvFilePath() {
  return path.resolve(
    String(process.env.ADMIN_WEB_ENV_FILE_PATH || path.join(process.cwd(), '.env')).trim()
      || path.join(process.cwd(), '.env'),
  );
}

function getPortalEnvFilePath() {
  return path.resolve(
    String(
      process.env.ADMIN_WEB_PORTAL_ENV_FILE_PATH
        || path.join(process.cwd(), 'apps', 'web-portal-standalone', '.env'),
    ).trim() || path.join(process.cwd(), 'apps', 'web-portal-standalone', '.env'),
  );
}

const CONTROL_PANEL_ENV_FIELDS = Object.freeze([
  { file: 'root', key: 'DATABASE_URL', type: 'secret', secret: true },
  { file: 'root', key: 'PRISMA_SCHEMA_PROVIDER', type: 'text', secret: false },
  { file: 'root', key: 'DISCORD_GUILD_ID', type: 'text', secret: false },
  { file: 'root', key: 'BOT_ENABLE_ADMIN_WEB', type: 'boolean', secret: false },
  { file: 'root', key: 'BOT_ENABLE_SCUM_WEBHOOK', type: 'boolean', secret: false },
  { file: 'root', key: 'BOT_ENABLE_RENTBIKE_SERVICE', type: 'boolean', secret: false },
  { file: 'root', key: 'BOT_ENABLE_DELIVERY_WORKER', type: 'boolean', secret: false },
  { file: 'root', key: 'WORKER_ENABLE_DELIVERY', type: 'boolean', secret: false },
  { file: 'root', key: 'WORKER_ENABLE_RENTBIKE', type: 'boolean', secret: false },
  { file: 'root', key: 'DELIVERY_EXECUTION_MODE', type: 'text', secret: false },
  { file: 'root', key: 'RCON_HOST', type: 'text', secret: false },
  { file: 'root', key: 'RCON_PORT', type: 'number', secret: false },
  { file: 'root', key: 'RCON_PROTOCOL', type: 'text', secret: false },
  { file: 'root', key: 'RCON_EXEC_TEMPLATE', type: 'text', secret: false },
  { file: 'root', key: 'RCON_PASSWORD', type: 'secret', secret: true },
  { file: 'root', key: 'SCUM_CONSOLE_AGENT_BASE_URL', type: 'text', secret: false },
  { file: 'root', key: 'SCUM_CONSOLE_AGENT_HOST', type: 'text', secret: false },
  { file: 'root', key: 'SCUM_CONSOLE_AGENT_PORT', type: 'number', secret: false },
  { file: 'root', key: 'SCUM_CONSOLE_AGENT_BACKEND', type: 'text', secret: false },
  { file: 'root', key: 'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE', type: 'text', secret: false },
  { file: 'root', key: 'SCUM_CONSOLE_AGENT_TOKEN', type: 'secret', secret: true },
  { file: 'root', key: 'DELIVERY_AGENT_FAILOVER_MODE', type: 'text', secret: false },
  { file: 'root', key: 'DELIVERY_AGENT_CIRCUIT_BREAKER_THRESHOLD', type: 'number', secret: false },
  { file: 'root', key: 'DELIVERY_AGENT_CIRCUIT_BREAKER_COOLDOWN_MS', type: 'number', secret: false },
  { file: 'root', key: 'DELIVERY_VERIFY_MODE', type: 'text', secret: false },
  { file: 'root', key: 'DELIVERY_VERIFY_SUCCESS_REGEX', type: 'text', secret: false },
  { file: 'root', key: 'DELIVERY_VERIFY_FAILURE_REGEX', type: 'text', secret: false },
  { file: 'root', key: 'SCUM_WEBHOOK_URL', type: 'text', secret: false },
  { file: 'root', key: 'SCUM_WEBHOOK_PORT', type: 'number', secret: false },
  { file: 'root', key: 'SCUM_WEBHOOK_SECRET', type: 'secret', secret: true },
  { file: 'root', key: 'SCUM_LOG_PATH', type: 'text', secret: false },
  { file: 'root', key: 'PLATFORM_DEFAULT_TENANT_ID', type: 'text', secret: false },
  { file: 'portal', key: 'WEB_PORTAL_BASE_URL', type: 'text', secret: false },
  { file: 'portal', key: 'WEB_PORTAL_PLAYER_OPEN_ACCESS', type: 'boolean', secret: false },
  { file: 'portal', key: 'WEB_PORTAL_REQUIRE_GUILD_MEMBER', type: 'boolean', secret: false },
  { file: 'portal', key: 'WEB_PORTAL_MAP_EXTERNAL_URL', type: 'text', secret: false },
]);

const CONTROL_PANEL_ENV_INDEX = new Map(
  CONTROL_PANEL_ENV_FIELDS.map((field) => [field.key, Object.freeze({ ...field })]),
);

function normalizeBooleanEnvValue(value, fallback = false) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function getControlPanelEnvFileValues() {
  return {
    root: parseEnvFile(getRootEnvFilePath()),
    portal: parseEnvFile(getPortalEnvFilePath()),
  };
}

function buildControlPanelEnvSection(fileKey, values = {}) {
  const section = {};
  for (const field of CONTROL_PANEL_ENV_FIELDS) {
    if (field.file !== fileKey) continue;
    const fileValue = Object.prototype.hasOwnProperty.call(values, field.key)
      ? values[field.key]
      : process.env[field.key];
    const configured = String(fileValue || '').trim().length > 0;
    if (field.secret) {
      section[field.key] = {
        type: field.type,
        configured,
        value: '',
      };
      continue;
    }
    if (field.type === 'boolean') {
      section[field.key] = {
        type: field.type,
        configured,
        value: normalizeBooleanEnvValue(fileValue, false),
      };
      continue;
    }
    if (field.type === 'number') {
      const text = String(fileValue || '').trim();
      const parsed = text ? Number(text) : null;
      section[field.key] = {
        type: field.type,
        configured,
        value: Number.isFinite(parsed) ? parsed : text,
      };
      continue;
    }
    section[field.key] = {
      type: field.type,
      configured,
      value: String(fileValue || ''),
    };
  }
  return section;
}

function normalizeEnvPatchValue(field, value) {
  if (!field) return null;
  if (field.type === 'boolean') {
    return normalizeBooleanEnvValue(value, false) ? 'true' : 'false';
  }
  if (field.type === 'number') {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid number for ${field.key}`);
    }
    return String(Math.trunc(parsed));
  }
  return String(value ?? '').trim();
}

function buildControlPanelEnvPatch(body = {}) {
  const patch = {
    root: {},
    portal: {},
  };

  for (const fileKey of ['root', 'portal']) {
    const input = body?.[fileKey];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      continue;
    }
    for (const [key, rawValue] of Object.entries(input)) {
      const field = CONTROL_PANEL_ENV_INDEX.get(String(key || '').trim());
      if (!field || field.file !== fileKey) continue;
      if (field.secret && String(rawValue || '').trim() === '') {
        continue;
      }
      patch[fileKey][field.key] = normalizeEnvPatchValue(field, rawValue);
    }
  }

  return patch;
}

module.exports = {
  buildControlPanelEnvPatch,
  buildControlPanelEnvSection,
  CONTROL_PANEL_ENV_FIELDS,
  CONTROL_PANEL_ENV_INDEX,
  getControlPanelEnvFileValues,
  getPortalEnvFilePath,
  getRootEnvFilePath,
  normalizeBooleanEnvValue,
  normalizeEnvPatchValue,
};
