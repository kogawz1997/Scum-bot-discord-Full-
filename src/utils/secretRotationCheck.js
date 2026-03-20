'use strict';

const {
  createValidationCheck,
  createValidationReport,
} = require('./runtimeStatus');

function isTruthy(value, fallback = false) {
  if (value == null || String(value).trim() === '') return fallback;
  const text = String(value).trim().toLowerCase();
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

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseUrl(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  try {
    return new URL(text);
  } catch {
    return null;
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

function hasPort(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function resolveDeliveryOwners(env) {
  const botDelivery = isTruthy(env.BOT_ENABLE_DELIVERY_WORKER, true);
  const workerDelivery = isTruthy(env.WORKER_ENABLE_DELIVERY, true);

  if (botDelivery && workerDelivery) {
    return ['bot', 'worker'];
  }
  if (workerDelivery) return ['worker'];
  if (botDelivery) return ['bot'];
  return [];
}

function isConsoleAgentEnabled(env) {
  return (
    String(env.SCUM_CONSOLE_AGENT_BASE_URL || '').trim().length > 0
    || hasPort(env.SCUM_CONSOLE_AGENT_PORT)
    || isTruthy(env.SCUM_CONSOLE_AGENT_REQUIRED, false)
    || isTruthy(env.SCUM_CONSOLE_AGENT_ENABLED, false)
  );
}

function buildSecretCatalog(env) {
  const portalMode = String(env.WEB_PORTAL_MODE || '').trim().toLowerCase() || 'player';
  const adminSsoEnabled = isTruthy(env.ADMIN_WEB_SSO_DISCORD_ENABLED, false);
  const adminTwoFactorEnabled = isTruthy(env.ADMIN_WEB_2FA_ENABLED, false);
  const deliveryUsesRcon =
    String(env.DELIVERY_EXECUTION_MODE || '').trim().toLowerCase() === 'rcon'
    || String(env.RCON_HOST || '').trim().length > 0
    || String(env.RCON_PASSWORD || '').trim().length > 0;
  const deliveryOwners = resolveDeliveryOwners(env);
  const consoleAgentEnabled = isConsoleAgentEnabled(env);

  // This catalog is the single operator-facing map of which secret affects
  // which runtime and what should be revalidated after a rotation.
  return [
    {
      id: 'DISCORD_TOKEN',
      label: 'Discord bot token',
      envKeys: ['DISCORD_TOKEN'],
      required: true,
      reloadTargets: ['bot'],
      validation: ['bot health ready', 'Discord gateway ready'],
      note: 'Rotate in Discord Developer Portal',
    },
    {
      id: 'SCUM_WEBHOOK_SECRET',
      label: 'SCUM webhook secret',
      envKeys: ['SCUM_WEBHOOK_SECRET'],
      required: true,
      reloadTargets: ['bot', 'watcher'],
      validation: ['watcher webhook delivery', 'bot webhook ingest path'],
      note: 'Reload both webhook sender and receiver after rotation',
    },
    {
      id: 'ADMIN_WEB_PASSWORD',
      label: 'Admin fallback password',
      envKeys: ['ADMIN_WEB_PASSWORD'],
      required: true,
      reloadTargets: ['admin-web'],
      validation: ['admin local login', 'session cookie issue check'],
      note: 'Keep for recovery even when database-backed admin users are primary',
    },
    {
      id: 'ADMIN_WEB_TOKEN',
      label: 'Admin token access secret',
      envKeys: ['ADMIN_WEB_TOKEN'],
      required: true,
      reloadTargets: ['admin-web'],
      validation: ['admin token access disabled/enabled as intended'],
      note: 'Revalidate query-token posture after rotation',
    },
    {
      id: 'ADMIN_WEB_2FA_SECRET',
      label: 'Admin TOTP seed',
      envKeys: ['ADMIN_WEB_2FA_SECRET'],
      required: adminTwoFactorEnabled,
      reloadTargets: ['admin-web'],
      validation: ['admin login with TOTP', 're-import authenticator app seed'],
      note: 'Requires authenticator re-import after rotation',
    },
    {
      id: 'ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET',
      label: 'Admin Discord SSO client secret',
      envKeys: ['ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET'],
      required: adminSsoEnabled,
      reloadTargets: ['admin-web'],
      validation: ['admin Discord SSO callback', 'owner/admin role mapping'],
      note: 'Rotate in Discord Developer Portal if admin SSO is enabled',
    },
    {
      id: 'WEB_PORTAL_DISCORD_CLIENT_SECRET',
      label: 'Player portal Discord client secret',
      envKeys: ['WEB_PORTAL_DISCORD_CLIENT_SECRET'],
      required: portalMode === 'player',
      reloadTargets: ['player-portal'],
      validation: ['player portal OAuth login', 'player callback path'],
      note: 'Rotate in Discord Developer Portal for player login flow',
    },
    {
      id: 'RCON_PASSWORD',
      label: 'RCON password',
      envKeys: ['RCON_PASSWORD'],
      required: deliveryUsesRcon,
      reloadTargets: deliveryOwners.length > 0 ? deliveryOwners : ['worker'],
      validation: ['delivery preflight', 'live command dispatch'],
      note: 'Ownership depends on which runtime hosts delivery execution',
    },
    {
      id: 'SCUM_CONSOLE_AGENT_TOKEN',
      label: 'Console-agent auth token',
      envKeys: ['SCUM_CONSOLE_AGENT_TOKEN'],
      required: consoleAgentEnabled,
      reloadTargets: consoleAgentEnabled
        ? ['console-agent', ...(deliveryOwners.length > 0 ? deliveryOwners : ['bot'])]
        : [],
      validation: ['agent preflight', 'agent command dispatch'],
      note: 'Rotate both server-side agent and caller runtimes together',
    },
  ].map((secret) => {
    const values = secret.envKeys.map((key) => String(env[key] || '').trim());
    const present = values.some((value) => value.length > 0);
    const placeholder = present && values.every((value) => isLikelyPlaceholder(value));
    const missing = secret.required && (!present || placeholder);
    return {
      ...secret,
      present,
      placeholder,
      missing,
      status: missing ? 'missing' : placeholder ? 'placeholder' : present ? 'ready' : 'unused',
    };
  });
}

function buildReloadMatrix(secretCatalog) {
  const runtimeMap = new Map();

  for (const secret of secretCatalog) {
    for (const runtime of secret.reloadTargets || []) {
      if (!runtimeMap.has(runtime)) {
        runtimeMap.set(runtime, {
          runtime,
          secrets: [],
          validation: new Set(),
        });
      }
      const entry = runtimeMap.get(runtime);
      entry.secrets.push(secret.id);
      for (const step of secret.validation || []) {
        entry.validation.add(step);
      }
    }
  }

  return Array.from(runtimeMap.values())
    .map((entry) => ({
      runtime: entry.runtime,
      secrets: entry.secrets,
      validation: Array.from(entry.validation),
    }))
    .sort((a, b) => a.runtime.localeCompare(b.runtime));
}

function evaluateRotationDrift(env, secretCatalog) {
  const errors = [];
  const warnings = [];

  const adminOrigins = parseCsvList(env.ADMIN_WEB_ALLOWED_ORIGINS);
  const portalBaseUrl = parseUrl(env.WEB_PORTAL_BASE_URL);
  const legacyAdminUrl = parseUrl(env.WEB_PORTAL_LEGACY_ADMIN_URL);
  const adminRedirectUrl = parseUrl(env.ADMIN_WEB_SSO_DISCORD_REDIRECT_URI);
  const adminCookieDomain = String(env.ADMIN_WEB_SESSION_COOKIE_DOMAIN || '').trim();
  const portalCookieDomain = String(env.WEB_PORTAL_COOKIE_DOMAIN || '').trim();
  const adminCookiePath = String(env.ADMIN_WEB_SESSION_COOKIE_PATH || '/admin').trim() || '/admin';
  const deliveryOwners = resolveDeliveryOwners(env);

  if (deliveryOwners.includes('bot') && deliveryOwners.includes('worker')) {
    errors.push(
      'Delivery ownership is split across bot and worker; rotate RCON_PASSWORD only after choosing a single delivery owner runtime.',
    );
  }

  for (const secret of secretCatalog) {
    if (!secret.required) continue;
    if (secret.missing) {
      errors.push(`${secret.id} is missing or still placeholder`);
    }
  }

  if (adminRedirectUrl && adminOrigins.length > 0) {
    const allowed = adminOrigins.some((origin) => {
      const parsed = parseUrl(origin);
      return parsed && parsed.origin === adminRedirectUrl.origin;
    });
    if (!allowed) {
      errors.push(
        `ADMIN_WEB_SSO_DISCORD_REDIRECT_URI origin (${adminRedirectUrl.origin}) is not listed in ADMIN_WEB_ALLOWED_ORIGINS`,
      );
    }
  }

  if (legacyAdminUrl && adminOrigins.length > 0) {
    const allowed = adminOrigins.some((origin) => {
      const parsed = parseUrl(origin);
      return parsed && parsed.origin === legacyAdminUrl.origin;
    });
    if (!allowed) {
      errors.push(
        `WEB_PORTAL_LEGACY_ADMIN_URL origin (${legacyAdminUrl.origin}) is not listed in ADMIN_WEB_ALLOWED_ORIGINS`,
      );
    }
  }

  for (const origin of adminOrigins) {
    const parsed = parseUrl(origin);
    if (!parsed) continue;
    if (
      adminCookieDomain
      && !hostnameMatchesCookieDomain(parsed.hostname, adminCookieDomain)
    ) {
      errors.push(
        `ADMIN_WEB_SESSION_COOKIE_DOMAIN (${adminCookieDomain}) does not match admin origin host (${parsed.hostname})`,
      );
    }
  }

  if (
    portalBaseUrl
    && portalCookieDomain
    && !hostnameMatchesCookieDomain(portalBaseUrl.hostname, portalCookieDomain)
  ) {
    errors.push(
      `WEB_PORTAL_COOKIE_DOMAIN (${portalCookieDomain}) does not match player portal host (${portalBaseUrl.hostname})`,
    );
  }

  if (
    portalBaseUrl
    && legacyAdminUrl
    && portalBaseUrl.origin === legacyAdminUrl.origin
    && (adminCookiePath === '/' || !adminCookiePath.startsWith('/admin'))
  ) {
    warnings.push(
      'Admin/player share the same origin while ADMIN_WEB_SESSION_COOKIE_PATH is not isolated to /admin; rotated admin sessions may bleed across surfaces.',
    );
  }

  // If we cannot probe a runtime after rotation, operators lose the fastest
  // validation loop and drift becomes much harder to catch.
  const reloadMatrix = buildReloadMatrix(secretCatalog);
  for (const runtime of reloadMatrix) {
    if (runtime.runtime === 'bot' && !hasPort(env.BOT_HEALTH_PORT)) {
      warnings.push('BOT_HEALTH_PORT is not set; bot reload validation will rely on logs/manual checks.');
    }
    if (runtime.runtime === 'worker' && !hasPort(env.WORKER_HEALTH_PORT)) {
      warnings.push('WORKER_HEALTH_PORT is not set; worker reload validation will rely on logs/manual checks.');
    }
    if (runtime.runtime === 'watcher' && !hasPort(env.SCUM_WATCHER_HEALTH_PORT)) {
      warnings.push('SCUM_WATCHER_HEALTH_PORT is not set; watcher reload validation will rely on logs/manual checks.');
    }
    if (
      runtime.runtime === 'console-agent'
      && !hasPort(env.SCUM_CONSOLE_AGENT_PORT)
      && String(env.SCUM_CONSOLE_AGENT_BASE_URL || '').trim().length === 0
    ) {
      warnings.push('SCUM_CONSOLE_AGENT_PORT / SCUM_CONSOLE_AGENT_BASE_URL is not set; console-agent rotation validation is harder to automate.');
    }
  }

  return { errors, warnings };
}

function buildSecretRotationReport(env = process.env) {
  const secretCatalog = buildSecretCatalog(env);
  const reloadMatrix = buildReloadMatrix(secretCatalog);
  const { errors, warnings } = evaluateRotationDrift(env, secretCatalog);

  const requiredSecrets = secretCatalog.filter((secret) => secret.required);
  const readyRequiredSecrets = requiredSecrets.filter((secret) => !secret.missing);

  return createValidationReport({
    kind: 'secret-rotation-check',
    checks: [
      createValidationCheck('required secret inventory', {
        ok: requiredSecrets.length === readyRequiredSecrets.length,
        detail:
          requiredSecrets.length === readyRequiredSecrets.length
            ? `${readyRequiredSecrets.length} required secret(s) are present`
            : `${requiredSecrets.length - readyRequiredSecrets.length} required secret(s) are missing or placeholder`,
        data: {
          requiredSecrets: requiredSecrets.length,
          readyRequiredSecrets: readyRequiredSecrets.length,
        },
      }),
      createValidationCheck('rotation ownership and reload plan', {
        ok: !errors.some((entry) => /ownership/i.test(entry)),
        detail:
          reloadMatrix.length > 0
            ? `${reloadMatrix.length} runtime reload target(s) mapped`
            : 'no runtime reload targets are currently active',
        data: {
          reloadTargets: reloadMatrix.map((entry) => entry.runtime),
        },
      }),
      createValidationCheck('post-rotation validation posture', {
        status: warnings.length > 0 ? 'warning' : 'pass',
        detail:
          warnings.length > 0
            ? `${warnings.length} validation warning(s) need manual review`
            : 'health/cookie/origin posture is ready for post-rotation validation',
      }),
    ],
    errors,
    warnings,
    data: {
      secrets: secretCatalog,
      reloadMatrix,
    },
  });
}

function buildSecretRotationCsv(report = {}) {
  const secrets = Array.isArray(report?.data?.secrets) ? report.data.secrets : [];
  const headers = [
    'id',
    'label',
    'required',
    'status',
    'reloadTargets',
    'validation',
    'note',
  ];
  const rows = [
    headers.join(','),
    ...secrets.map((secret) => [
      secret.id,
      secret.label,
      secret.required ? 'true' : 'false',
      secret.status,
      Array.isArray(secret.reloadTargets) ? secret.reloadTargets.join(' | ') : '',
      Array.isArray(secret.validation) ? secret.validation.join(' | ') : '',
      String(secret.note || '').replace(/\r?\n/g, ' '),
    ].map((value) => {
      const text = String(value ?? '');
      if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    }).join(',')),
  ];
  return `${rows.join('\n')}\n`;
}

module.exports = {
  buildSecretRotationCsv,
  buildReloadMatrix,
  buildSecretCatalog,
  buildSecretRotationReport,
  evaluateRotationDrift,
  isConsoleAgentEnabled,
  resolveDeliveryOwners,
};
