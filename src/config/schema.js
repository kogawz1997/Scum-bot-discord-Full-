'use strict';

/** Central runtime env schema and parsing helpers. */

const RUNTIME_ENV_SCHEMA = Object.freeze({
  bot: Object.freeze({
    required: Object.freeze(['DISCORD_TOKEN']),
    optional: Object.freeze([
      'PLATFORM_DISCORD_ONLY',
      'DISCORD_GUILD_ID',
      'BOT_ENABLE_ADMIN_WEB',
      'BOT_ENABLE_SCUM_WEBHOOK',
      'BOT_ENABLE_RESTART_SCHEDULER',
      'BOT_ENABLE_RENTBIKE_SERVICE',
      'BOT_ENABLE_DELIVERY_WORKER',
      'BOT_ENABLE_OPS_ALERT_ROUTE',
      'BOT_HEALTH_HOST',
      'BOT_HEALTH_PORT',
    ]),
  }),
  worker: Object.freeze({
    requiredAnyOf: Object.freeze([
      Object.freeze(['WORKER_ENABLE_RENTBIKE', 'WORKER_ENABLE_DELIVERY']),
    ]),
    optional: Object.freeze([
      'WORKER_HEARTBEAT_MS',
      'WORKER_HEALTH_HOST',
      'WORKER_HEALTH_PORT',
      'DELIVERY_EXECUTION_MODE',
      'DATABASE_URL',
    ]),
  }),
  watcher: Object.freeze({
    required: Object.freeze(['DISCORD_GUILD_ID', 'SCUM_LOG_PATH']),
    optional: Object.freeze([
      'SCUM_WATCHER_ENABLED',
      'SCUM_WATCHER_HEALTH_HOST',
      'SCUM_WATCHER_HEALTH_PORT',
    ]),
  }),
  adminWeb: Object.freeze({
    required: Object.freeze(['ADMIN_WEB_PASSWORD', 'ADMIN_WEB_TOKEN']),
    optional: Object.freeze([
      'PLATFORM_DISCORD_ONLY',
      'ADMIN_WEB_PORT',
      'ADMIN_WEB_HOST',
      'ADMIN_WEB_SECURE_COOKIE',
      'ADMIN_WEB_ALLOWED_ORIGINS',
      'ADMIN_WEB_2FA_ENABLED',
      'ADMIN_WEB_2FA_SECRET',
    ]),
  }),
  portal: Object.freeze({
    required: Object.freeze(['WEB_PORTAL_BASE_URL']),
    optional: Object.freeze([
      'PLATFORM_DISCORD_ONLY',
      'WEB_PORTAL_PORT',
      'WEB_PORTAL_PLAYER_OPEN_ACCESS',
      'WEB_PORTAL_REQUIRE_GUILD_MEMBER',
      'WEB_PORTAL_DISCORD_CLIENT_ID',
      'WEB_PORTAL_DISCORD_CLIENT_SECRET',
    ]),
  }),
  agent: Object.freeze({
    required: Object.freeze(['SCUM_CONSOLE_AGENT_TOKEN']),
    optional: Object.freeze([
      'SCUM_CONSOLE_AGENT_BASE_URL',
      'SCUM_CONSOLE_AGENT_HOST',
      'SCUM_CONSOLE_AGENT_PORT',
      'SCUM_CONSOLE_AGENT_BACKEND',
      'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE',
    ]),
  }),
});

function parseBooleanEnv(value, fallback = false) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function parseIntegerEnv(value, fallback = 0, min = Number.MIN_SAFE_INTEGER) {
  const parsed = Number(String(value == null ? fallback : value).trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.trunc(parsed));
}

function parseTextEnv(value, fallback = '') {
  const text = String(value == null ? fallback : value).trim();
  return text || String(fallback || '').trim();
}

function parseListEnv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getRuntimeEnvSchema(runtimeName) {
  const key = String(runtimeName || '').trim();
  return RUNTIME_ENV_SCHEMA[key] || null;
}

function getMissingRuntimeEnv(runtimeName, env = process.env) {
  const schema = getRuntimeEnvSchema(runtimeName);
  if (!schema) return [];

  const errors = [];
  for (const key of schema.required || []) {
    if (!String(env[key] || '').trim()) {
      errors.push(key);
    }
  }

  for (const group of schema.requiredAnyOf || []) {
    const satisfied = group.some((key) => String(env[key] || '').trim());
    if (!satisfied) {
      errors.push(group.join(' | '));
    }
  }

  return errors;
}

module.exports = {
  RUNTIME_ENV_SCHEMA,
  getMissingRuntimeEnv,
  getRuntimeEnvSchema,
  parseBooleanEnv,
  parseIntegerEnv,
  parseListEnv,
  parseTextEnv,
};
