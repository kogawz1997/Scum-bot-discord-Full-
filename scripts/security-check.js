const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadMergedEnvFiles } = require('../src/utils/loadEnvFiles');
const { validateCommandTemplate } = require('../src/utils/commandTemplate');
const { getAdminSsoRoleMappingSummary } = require('../src/utils/adminSsoRoleMapping');
const { resolveDatabaseRuntime } = require('../src/utils/dbEngine');
const {
  createValidationCheck,
  createValidationReport,
} = require('../src/utils/runtimeStatus');

const ROOT_DIR = process.cwd();
const ROOT_ENV_PATH = path.join(ROOT_DIR, '.env');
const PORTAL_ENV_PATH = path.join(
  ROOT_DIR,
  'apps',
  'web-portal-standalone',
  '.env',
);

const hasPortalEnvFile = fs.existsSync(PORTAL_ENV_PATH);
loadMergedEnvFiles({
  basePath: ROOT_ENV_PATH,
  overlayPath: hasPortalEnvFile ? PORTAL_ENV_PATH : null,
});

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

function isTruthy(value) {
  const text = String(value || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

function isLikelyPlaceholder(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  const patterns = [
    'your_',
    'example',
    'changeme',
    'replace',
    'rotate_in_',
    'rotate_me',
    'token_here',
    'password_here',
    'put_a_',
    'placeholder',
    'xxx',
  ];
  return patterns.some((pattern) => text.includes(pattern));
}

function isLocalHost(host) {
  const value = String(host || '').trim().toLowerCase();
  return value === '127.0.0.1' || value === 'localhost' || value === '::1';
}

function parseOriginOrEmpty(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    return new URL(text).origin;
  } catch {
    return '';
  }
}

function hostnameMatchesCookieDomain(hostname, cookieDomain) {
  const normalizedHost = String(hostname || '').trim().toLowerCase();
  const normalizedDomain = String(cookieDomain || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();
  if (!normalizedHost || !normalizedDomain) return true;
  return (
    normalizedHost === normalizedDomain
    || normalizedHost.endsWith(`.${normalizedDomain}`)
  );
}

function checkMinLength(name, value, minLength, errors, warnings) {
  const text = String(value || '').trim();
  if (!text) {
    errors.push(`${name} is missing`);
    return;
  }
  if (text.length < minLength) {
    warnings.push(
      `${name} should be at least ${minLength} chars (current=${text.length})`,
    );
  }
}

function checkDiscordToken(value, errors, warnings) {
  const token = String(value || '').trim();
  if (!token || isLikelyPlaceholder(token)) {
    errors.push('DISCORD_TOKEN is missing or placeholder');
    return;
  }

  const discordTokenPattern =
    /^[A-Za-z0-9_\-.]{20,}\.[A-Za-z0-9_\-.]{6,}\.[A-Za-z0-9_\-.]{20,}$/;
  if (!discordTokenPattern.test(token)) {
    warnings.push('DISCORD_TOKEN format looks unusual; verify token is correct');
  }
}

function checkPortalOAuth(env, errors) {
  const mode =
    String(env.WEB_PORTAL_MODE || '').trim().toLowerCase() || 'player';
  if (mode !== 'player') return;

  const portalClientId = String(
    env.WEB_PORTAL_DISCORD_CLIENT_ID ||
      env.ADMIN_WEB_SSO_DISCORD_CLIENT_ID ||
      env.DISCORD_CLIENT_ID ||
      '',
  ).trim();
  const portalClientSecret = String(
    env.WEB_PORTAL_DISCORD_CLIENT_SECRET ||
      env.ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET ||
      '',
  ).trim();

  if (!portalClientId || isLikelyPlaceholder(portalClientId)) {
    errors.push(
      'WEB_PORTAL_DISCORD_CLIENT_ID (or ADMIN_WEB_SSO_DISCORD_CLIENT_ID / DISCORD_CLIENT_ID fallback) is missing or placeholder',
    );
  }
  if (!portalClientSecret || isLikelyPlaceholder(portalClientSecret)) {
    errors.push(
      'WEB_PORTAL_DISCORD_CLIENT_SECRET (or ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET fallback) is missing or placeholder',
    );
  }
}

function addSessionAndOriginHardeningWarnings(env, warnings) {
  const adminOrigins = String(env.ADMIN_WEB_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const hasExternalAdminOrigin = adminOrigins.some((origin) => {
    const parsedOrigin = parseOriginOrEmpty(origin);
    if (!parsedOrigin) return false;
    try {
      return !isLocalHost(new URL(parsedOrigin).hostname);
    } catch {
      return false;
    }
  });

  const adminTwoFactorEnabled =
    isTruthy(env.ADMIN_WEB_2FA_ENABLED) && String(env.ADMIN_WEB_2FA_SECRET || '').trim().length > 0;
  if (hasExternalAdminOrigin && !adminTwoFactorEnabled) {
    warnings.push(
      'ADMIN_WEB_2FA_ENABLED=true with ADMIN_WEB_2FA_SECRET set is strongly recommended for externally exposed admin access',
    );
  }

  const adminSessionTtlHours = Number(env.ADMIN_WEB_SESSION_TTL_HOURS || 12);
  if (Number.isFinite(adminSessionTtlHours) && adminSessionTtlHours > 24) {
    warnings.push(
      `ADMIN_WEB_SESSION_TTL_HOURS=${adminSessionTtlHours} is longer than 24 hours; review admin session lifetime`,
    );
  }

  const portalSessionTtlHours = Number(env.WEB_PORTAL_SESSION_TTL_HOURS || 12);
  if (Number.isFinite(portalSessionTtlHours) && portalSessionTtlHours > 24) {
    warnings.push(
      `WEB_PORTAL_SESSION_TTL_HOURS=${portalSessionTtlHours} is longer than 24 hours; review player session lifetime`,
    );
  }

  const portalOrigin = parseOriginOrEmpty(env.WEB_PORTAL_BASE_URL);
  const adminOrigin = parseOriginOrEmpty(env.WEB_PORTAL_LEGACY_ADMIN_URL);
  const adminCookiePath = String(env.ADMIN_WEB_SESSION_COOKIE_PATH || '/admin').trim() || '/admin';
  const adminCookieDomain = String(env.ADMIN_WEB_SESSION_COOKIE_DOMAIN || '').trim();
  const portalCookieDomain = String(env.WEB_PORTAL_COOKIE_DOMAIN || '').trim();
  if (portalOrigin && adminOrigin && portalOrigin === adminOrigin) {
    warnings.push(
      'WEB_PORTAL_BASE_URL and WEB_PORTAL_LEGACY_ADMIN_URL share the same origin; split admin/player origins are recommended',
    );
    if (adminCookiePath === '/' || !adminCookiePath.startsWith('/admin')) {
      warnings.push(
        'ADMIN_WEB_SESSION_COOKIE_PATH=/admin is recommended when admin/player share the same origin',
      );
    }
  }

  if (adminCookieDomain && adminOrigins.length > 0) {
    for (const origin of adminOrigins) {
      const parsedOrigin = parseOriginOrEmpty(origin);
      if (!parsedOrigin) continue;
      const hostname = new URL(parsedOrigin).hostname;
      if (!hostnameMatchesCookieDomain(hostname, adminCookieDomain)) {
        warnings.push(
          `ADMIN_WEB_SESSION_COOKIE_DOMAIN=${adminCookieDomain} does not match admin origin host ${hostname}`,
        );
      }
    }
  }

  if (portalCookieDomain && portalOrigin) {
    const hostname = new URL(portalOrigin).hostname;
    if (!hostnameMatchesCookieDomain(hostname, portalCookieDomain)) {
      warnings.push(
        `WEB_PORTAL_COOKIE_DOMAIN=${portalCookieDomain} does not match player portal host ${hostname}`,
      );
    }
  }
}

function isGitTracked(filePath) {
  const out = spawnSync('git', ['ls-files', '--error-unmatch', filePath], {
    encoding: 'utf8',
  });
  return out.status === 0;
}

function parseAdminUsersJson(raw, warnings, errors) {
  const text = String(raw || '').trim();
  if (!text) return;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    errors.push('ADMIN_WEB_USERS_JSON is invalid JSON');
    return;
  }

  if (!Array.isArray(parsed)) {
    errors.push('ADMIN_WEB_USERS_JSON must be a JSON array');
    return;
  }

  for (const row of parsed) {
    if (!row || typeof row !== 'object') {
      errors.push('ADMIN_WEB_USERS_JSON contains invalid row');
      continue;
    }
    const username = String(row.username || '').trim();
    const password = String(row.password || '').trim();
    const role = String(row.role || '')
      .trim()
      .toLowerCase();
    if (!username || !password) {
      errors.push(
        'ADMIN_WEB_USERS_JSON rows must contain username and password',
      );
      continue;
    }
    if (password.length < 10) {
      warnings.push(
        `ADMIN_WEB_USERS_JSON user ${username} has short password (<10)`,
      );
    }
    if (role && !['owner', 'admin', 'mod'].includes(role)) {
      warnings.push(
        `ADMIN_WEB_USERS_JSON user ${username} has unknown role (${role})`,
      );
    }
  }
}

function run() {
  const env = process.env;
  const errors = [];
  const warnings = [];
  const isProduction =
    String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const persistRequireDb = isTruthy(env.PERSIST_REQUIRE_DB);
  const legacySnapshotsEnabled = isTruthy(env.PERSIST_LEGACY_SNAPSHOTS);

  checkDiscordToken(env.DISCORD_TOKEN, errors, warnings);

  checkMinLength(
    'SCUM_WEBHOOK_SECRET',
    env.SCUM_WEBHOOK_SECRET,
    24,
    errors,
    warnings,
  );
  checkMinLength(
    'ADMIN_WEB_PASSWORD',
    env.ADMIN_WEB_PASSWORD,
    12,
    errors,
    warnings,
  );
  checkMinLength('ADMIN_WEB_TOKEN', env.ADMIN_WEB_TOKEN, 24, errors, warnings);

  parseAdminUsersJson(env.ADMIN_WEB_USERS_JSON, warnings, errors);

  if (hasPortalEnvFile || String(env.WEB_PORTAL_MODE || '').trim() !== '') {
    checkPortalOAuth(env, errors);
  }

  addSessionAndOriginHardeningWarnings(env, warnings);

  if (
    String(env.ADMIN_WEB_ALLOW_TOKEN_QUERY || '').trim().toLowerCase() !==
    'false'
  ) {
    warnings.push('ADMIN_WEB_ALLOW_TOKEN_QUERY should be false in production');
  }

  if (!isTruthy(env.ADMIN_WEB_ENFORCE_ORIGIN_CHECK)) {
    warnings.push('ADMIN_WEB_ENFORCE_ORIGIN_CHECK should be true');
  }

  if (!isTruthy(env.ADMIN_WEB_STEP_UP_ENABLED, isTruthy(env.ADMIN_WEB_2FA_ENABLED))) {
    warnings.push('ADMIN_WEB_STEP_UP_ENABLED should be true when admin 2FA is enabled');
  }

  const allowedOrigins = String(env.ADMIN_WEB_ALLOWED_ORIGINS || '').trim();
  if (!allowedOrigins) {
    warnings.push('ADMIN_WEB_ALLOWED_ORIGINS is empty; set explicit allowed origins');
  }

  const host = String(env.ADMIN_WEB_HOST || '').trim();
  if (host && !isLocalHost(host) && !isTruthy(env.ADMIN_WEB_SECURE_COOKIE)) {
    warnings.push('ADMIN_WEB_SECURE_COOKIE should be true when ADMIN_WEB_HOST is non-local');
  }

  if (
    isTruthy(env.ADMIN_WEB_SECURE_COOKIE) &&
    !isTruthy(env.ADMIN_WEB_HSTS_ENABLED)
  ) {
    warnings.push(
      'ADMIN_WEB_HSTS_ENABLED should be true when using secure cookies behind HTTPS',
    );
  }

  const rconExecTemplate = String(env.RCON_EXEC_TEMPLATE || '').trim();
  const deliveryExecutionMode = String(
    env.DELIVERY_EXECUTION_MODE || 'rcon',
  ).trim().toLowerCase() || 'rcon';
  if (rconExecTemplate) {
    try {
      validateCommandTemplate(rconExecTemplate);
    } catch (error) {
      errors.push(`RCON_EXEC_TEMPLATE is not supported safely: ${error.message}`);
    }
  }
  if (
    rconExecTemplate.includes('{password}') &&
    !String(env.RCON_PASSWORD || '').trim()
  ) {
    warnings.push('RCON_PASSWORD is empty while RCON_EXEC_TEMPLATE uses {password}');
  }

  if (!String(env.DATABASE_URL || '').trim()) {
    errors.push('DATABASE_URL is missing');
  } else {
    const dbRuntime = resolveDatabaseRuntime({
      databaseUrl: env.DATABASE_URL,
      provider: env.PRISMA_SCHEMA_PROVIDER || env.DATABASE_PROVIDER || '',
    });
    if (dbRuntime.engine === 'unsupported') {
      errors.push(`Unsupported DATABASE_URL engine: ${String(env.DATABASE_URL || '').trim()}`);
    }
    if (dbRuntime.isServerEngine) {
      const provider = String(env.PRISMA_SCHEMA_PROVIDER || env.DATABASE_PROVIDER || dbRuntime.engine)
        .trim()
        .toLowerCase();
      const normalizedProvider = provider === 'postgres' ? 'postgresql' : provider;
      if (normalizedProvider && normalizedProvider !== dbRuntime.engine) {
        errors.push(
          `PRISMA_SCHEMA_PROVIDER/DATABASE_PROVIDER (${provider}) does not match DATABASE_URL engine (${dbRuntime.engine})`,
        );
      }
      if (!provider) {
        warnings.push(
          `Set PRISMA_SCHEMA_PROVIDER=${dbRuntime.engine} for DB-server deployments so db scripts render the matching Prisma schema`,
        );
      }
    }

    const topologyMode = String(env.TENANT_DB_TOPOLOGY_MODE || 'shared')
      .trim()
      .toLowerCase() || 'shared';
    if (
      ['schema-per-tenant', 'database-per-tenant'].includes(topologyMode)
      && dbRuntime.engine !== 'postgresql'
    ) {
      errors.push(
        `TENANT_DB_TOPOLOGY_MODE=${topologyMode} requires PostgreSQL DATABASE_URL`,
      );
    }
    if (isProduction && dbRuntime.engine !== 'postgresql') {
      errors.push(
        'Production requires PostgreSQL DATABASE_URL; SQLite remains for local dev/import/compatibility only',
      );
    }
  }

  const botDeliveryWorkerEnabled = isTruthy(
    env.BOT_ENABLE_DELIVERY_WORKER == null ? 'true' : env.BOT_ENABLE_DELIVERY_WORKER,
  );
  const workerDeliveryEnabled = isTruthy(
    env.WORKER_ENABLE_DELIVERY == null ? 'true' : env.WORKER_ENABLE_DELIVERY,
  );
  if (botDeliveryWorkerEnabled && workerDeliveryEnabled) {
    errors.push(
      'Do not enable delivery worker on both bot and worker at the same time (BOT_ENABLE_DELIVERY_WORKER + WORKER_ENABLE_DELIVERY).',
    );
  }

  if (persistRequireDb && legacySnapshotsEnabled) {
    warnings.push(
      'PERSIST_LEGACY_SNAPSHOTS=true keeps legacy file snapshots enabled; set false for clean DB-only production runtime',
    );
  }

  if (deliveryExecutionMode === 'agent') {
    const agentToken = String(env.SCUM_CONSOLE_AGENT_TOKEN || '').trim();
    if (!agentToken || isLikelyPlaceholder(agentToken)) {
      errors.push('DELIVERY_EXECUTION_MODE=agent requires SCUM_CONSOLE_AGENT_TOKEN');
    } else if (agentToken.length < 16) {
      errors.push('SCUM_CONSOLE_AGENT_TOKEN should be at least 16 characters');
    }

    const backend = String(
      env.SCUM_CONSOLE_AGENT_BACKEND || 'exec',
    ).trim().toLowerCase() || 'exec';
    if (backend === 'exec') {
      const execTemplate = String(env.SCUM_CONSOLE_AGENT_EXEC_TEMPLATE || '').trim();
      if (!execTemplate || !execTemplate.includes('{command}')) {
        errors.push(
          'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE must include {command} when agent backend=exec',
        );
      } else {
        try {
          validateCommandTemplate(execTemplate);
        } catch (error) {
          errors.push(
            `SCUM_CONSOLE_AGENT_EXEC_TEMPLATE is not supported safely: ${error.message}`,
          );
        }
      }
    }
  }

  if (isGitTracked('.env')) {
    errors.push('.env is tracked by git (must be ignored)');
  }

  if (isProduction) {
    if (!isTruthy(env.ADMIN_WEB_SECURE_COOKIE)) {
      errors.push('NODE_ENV=production requires ADMIN_WEB_SECURE_COOKIE=true');
    }
    if (!isTruthy(env.ADMIN_WEB_HSTS_ENABLED)) {
      errors.push('NODE_ENV=production requires ADMIN_WEB_HSTS_ENABLED=true');
    }
    if (!allowedOrigins || allowedOrigins.includes('http://')) {
      errors.push(
        'NODE_ENV=production requires strict HTTPS ADMIN_WEB_ALLOWED_ORIGINS',
      );
    }
    if (!persistRequireDb) {
      errors.push('NODE_ENV=production requires PERSIST_REQUIRE_DB=true');
    }
    if (legacySnapshotsEnabled) {
      errors.push(
        'NODE_ENV=production requires PERSIST_LEGACY_SNAPSHOTS=false',
      );
    }
  }

  const adminSsoRoleMapping = getAdminSsoRoleMappingSummary(env);
  if (adminSsoRoleMapping.enabled && !adminSsoRoleMapping.hasExplicitMappings) {
    warnings.push(
      'ADMIN_WEB_SSO_DISCORD_ENABLED=true but no ADMIN_WEB_SSO_DISCORD_*_ROLE_IDS or ADMIN_WEB_SSO_DISCORD_*_ROLE_NAMES are configured; all Discord SSO logins fall back to ADMIN_WEB_SSO_DEFAULT_ROLE',
    );
  } else if (
    adminSsoRoleMapping.enabled
    && !adminSsoRoleMapping.hasElevatedMappings
  ) {
    warnings.push(
      'Admin Discord SSO has no explicit owner/admin role mapping; review elevated access policy before production rollout',
    );
  }

  const report = createValidationReport({
    kind: 'security-check',
    checks: [
      createValidationCheck('discord token configured', {
        ok: !errors.some((entry) => entry.includes('DISCORD_TOKEN')),
      }),
      createValidationCheck('database url configured', {
        ok: !errors.some((entry) => entry.includes('DATABASE_URL')),
      }),
      createValidationCheck('database deployment posture', {
        status:
          errors.some((entry) => entry.includes('PostgreSQL DATABASE_URL'))
          || errors.some((entry) => entry.includes('TENANT_DB_TOPOLOGY_MODE'))
            ? 'failed'
            : 'pass',
      }),
      createValidationCheck('runtime ownership posture', {
        status:
          errors.some((entry) => entry.includes('BOT_ENABLE_DELIVERY_WORKER + WORKER_ENABLE_DELIVERY'))
            ? 'failed'
            : 'pass',
      }),
      createValidationCheck('admin web hardening baseline', {
        status: warnings.some((entry) => entry.includes('ADMIN_WEB_'))
          ? 'warning'
          : errors.some((entry) => entry.includes('ADMIN_WEB_'))
            ? 'failed'
            : 'pass',
      }),
      createValidationCheck('agent execution template safety', {
        status:
          errors.some((entry) => entry.includes('SCUM_CONSOLE_AGENT_EXEC_TEMPLATE'))
          || errors.some((entry) => entry.includes('SCUM_CONSOLE_AGENT_TOKEN'))
            ? 'failed'
            : 'pass',
      }),
    ],
    warnings,
    errors,
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (errors.length > 0) {
    console.error('SECURITY_CHECK: FAILED');
    for (const line of errors) {
      console.error(`ERROR: ${line}`);
    }
    for (const line of warnings) {
      console.error(`WARN: ${line}`);
    }
    process.exit(1);
  }

  if (!asJson && warnings.length > 0) {
    console.warn('SECURITY_CHECK: PASSED with warnings');
    for (const line of warnings) {
      console.warn(`WARN: ${line}`);
    }
  } else if (!asJson) {
    console.log('SECURITY_CHECK: PASSED');
  }

  return report;
}

if (require.main === module) {
  const report = run();
  if (!report.ok) {
    process.exit(1);
  }
}

module.exports = {
  run,
};
