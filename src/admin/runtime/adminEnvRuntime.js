'use strict';

/**
 * Centralize admin-web env parsing so the entry file focuses on wiring.
 */

function createAdminEnvRuntime(deps = {}) {
  const {
    path,
    processEnv = process.env,
    envBool,
    normalizeCookieDomain,
    normalizeCookiePath,
    normalizeRole,
    normalizeSameSite,
  } = deps;

  const dashboardHtmlPath = path.join(__dirname, '..', 'dashboard.html');
  const loginHtmlPath = path.join(__dirname, '..', 'login.html');
  const adminAssetsDirPath = path.join(__dirname, '..', 'assets');
  const defaultScumItemsDirPath = path.resolve(process.cwd(), 'scum_items-main');
  const scumItemsDirPath = path.resolve(
    String(processEnv.SCUM_ITEMS_DIR_PATH || defaultScumItemsDirPath).trim()
      || defaultScumItemsDirPath,
  );

  const sessionCookieName =
    String(processEnv.ADMIN_WEB_SESSION_COOKIE_NAME || 'scum_admin_session').trim()
      || 'scum_admin_session';
  const sessionTtlMs = Math.max(
    10 * 60 * 1000,
    Number(processEnv.ADMIN_WEB_SESSION_TTL_HOURS || 12) * 60 * 60 * 1000,
  );
  const sessionIdleTimeoutMs = Math.max(
    5 * 60 * 1000,
    Number(processEnv.ADMIN_WEB_SESSION_IDLE_MINUTES || 120) * 60 * 1000,
  );
  const sessionMaxPerUser = Math.max(
    1,
    Number(processEnv.ADMIN_WEB_SESSION_MAX_PER_USER || 5),
  );
  const sessionBindUserAgent = envBool('ADMIN_WEB_SESSION_BIND_USER_AGENT', true);
  const sessionCookiePath = normalizeCookiePath(
    processEnv.ADMIN_WEB_SESSION_COOKIE_PATH || '/admin',
    '/admin',
  );
  const sessionCookieSameSite = normalizeSameSite(
    processEnv.ADMIN_WEB_SESSION_COOKIE_SAMESITE || 'strict',
    'Strict',
  );
  const sessionCookieDomain = normalizeCookieDomain(
    processEnv.ADMIN_WEB_SESSION_COOKIE_DOMAIN || '',
  );

  const adminWebMaxBodyBytes = Math.max(
    8 * 1024,
    Number(processEnv.ADMIN_WEB_MAX_BODY_BYTES || 1024 * 1024),
  );
  const liveHeartbeatMs = Math.max(
    10000,
    Number(processEnv.ADMIN_WEB_LIVE_HEARTBEAT_MS || 20000),
  );
  const sessionSecureCookie = envBool('ADMIN_WEB_SECURE_COOKIE', false);
  const adminWebHstsEnabled = envBool(
    'ADMIN_WEB_HSTS_ENABLED',
    sessionSecureCookie,
  );
  const adminWebHstsMaxAgeSec = Math.max(
    300,
    Number(processEnv.ADMIN_WEB_HSTS_MAX_AGE_SEC || 31536000),
  );
  const adminWebTrustProxy = envBool('ADMIN_WEB_TRUST_PROXY', false);
  const adminWebAllowTokenQuery = envBool('ADMIN_WEB_ALLOW_TOKEN_QUERY', false);
  const adminWebEnforceOriginCheck = envBool(
    'ADMIN_WEB_ENFORCE_ORIGIN_CHECK',
    true,
  );
  const adminWebAllowedOrigins = String(
    processEnv.ADMIN_WEB_ALLOWED_ORIGINS || '',
  ).trim();
  const adminWebCsp = String(
    processEnv.ADMIN_WEB_CSP
      || "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
  ).trim();
  const adminWebUser =
    String(processEnv.ADMIN_WEB_USER || 'admin').trim() || 'admin';
  const loginRateLimitWindowMs = Math.max(
    10_000,
    Number(processEnv.ADMIN_WEB_LOGIN_WINDOW_MS || 60_000),
  );
  const loginRateLimitMaxAttempts = Math.max(
    3,
    Number(processEnv.ADMIN_WEB_LOGIN_MAX_ATTEMPTS || 8),
  );
  const loginSpikeWindowMs = Math.max(
    60 * 1000,
    Number(processEnv.ADMIN_WEB_LOGIN_SPIKE_WINDOW_MS || 5 * 60 * 1000),
  );
  const loginSpikeThreshold = Math.max(
    3,
    Number(processEnv.ADMIN_WEB_LOGIN_SPIKE_THRESHOLD || 10),
  );
  const loginSpikeIpThreshold = Math.max(
    3,
    Number(processEnv.ADMIN_WEB_LOGIN_SPIKE_IP_THRESHOLD || 5),
  );
  const loginSpikeAlertCooldownMs = Math.max(
    15 * 1000,
    Number(processEnv.ADMIN_WEB_LOGIN_SPIKE_ALERT_COOLDOWN_MS || 60 * 1000),
  );
  const adminWebUserRole = normalizeRole(
    processEnv.ADMIN_WEB_USER_ROLE || 'owner',
  );
  const adminWebTokenRole = normalizeRole(
    processEnv.ADMIN_WEB_TOKEN_ROLE || 'owner',
  );
  const adminWebUsersJson = String(processEnv.ADMIN_WEB_USERS_JSON || '').trim();
  const adminWeb2faEnabled = envBool('ADMIN_WEB_2FA_ENABLED', false);
  const adminWeb2faSecret = String(processEnv.ADMIN_WEB_2FA_SECRET || '').trim();
  const adminWeb2faActive = adminWeb2faEnabled && adminWeb2faSecret.length > 0;
  const adminWeb2faWindowSteps = Math.max(
    0,
    Number(processEnv.ADMIN_WEB_2FA_WINDOW_STEPS || 1),
  );
  const adminWebStepUpEnabled = envBool(
    'ADMIN_WEB_STEP_UP_ENABLED',
    adminWeb2faActive,
  );
  const adminWebStepUpTtlMs = Math.max(
    60 * 1000,
    Number(processEnv.ADMIN_WEB_STEP_UP_TTL_MINUTES || 15) * 60 * 1000,
  );
  const adminWebAllowTokenSensitiveMutations = envBool(
    'ADMIN_WEB_ALLOW_TOKEN_SENSITIVE_MUTATIONS',
    false,
  );
  const ssoDiscordEnabled = envBool('ADMIN_WEB_SSO_DISCORD_ENABLED', false);
  const ssoDiscordClientId = String(
    processEnv.ADMIN_WEB_SSO_DISCORD_CLIENT_ID || '',
  ).trim();
  const ssoDiscordClientSecret = String(
    processEnv.ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET || '',
  ).trim();
  const ssoDiscordActive =
    ssoDiscordEnabled &&
    ssoDiscordClientId.length > 0 &&
    ssoDiscordClientSecret.length > 0;
  const ssoDiscordRedirectUri = String(
    processEnv.ADMIN_WEB_SSO_DISCORD_REDIRECT_URI || '',
  ).trim();
  const ssoDiscordGuildId = String(
    processEnv.ADMIN_WEB_SSO_DISCORD_GUILD_ID || '',
  ).trim();
  const ssoDiscordDefaultRole = normalizeRole(
    processEnv.ADMIN_WEB_SSO_DEFAULT_ROLE || 'mod',
  );
  const ssoStateTtlMs = Math.max(
    60 * 1000,
    Number(processEnv.ADMIN_WEB_SSO_STATE_TTL_MS || 10 * 60 * 1000),
  );
  const metricsSeriesIntervalMs = Math.max(
    2_000,
    Number(processEnv.ADMIN_WEB_METRICS_SERIES_INTERVAL_MS || 15_000),
  );
  const metricsSeriesRetentionMs = Math.max(
    10 * 60 * 1000,
    Number(processEnv.ADMIN_WEB_METRICS_SERIES_RETENTION_MS || 24 * 60 * 60 * 1000),
  );

  return {
    dashboardHtmlPath,
    loginHtmlPath,
    adminAssetsDirPath,
    defaultScumItemsDirPath,
    scumItemsDirPath,
    sessionCookieName,
    sessionTtlMs,
    sessionIdleTimeoutMs,
    sessionMaxPerUser,
    sessionBindUserAgent,
    sessionCookiePath,
    sessionCookieSameSite,
    sessionCookieDomain,
    adminWebMaxBodyBytes,
    liveHeartbeatMs,
    sessionSecureCookie,
    adminWebHstsEnabled,
    adminWebHstsMaxAgeSec,
    adminWebTrustProxy,
    adminWebAllowTokenQuery,
    adminWebEnforceOriginCheck,
    adminWebAllowedOrigins,
    adminWebCsp,
    adminWebUser,
    loginRateLimitWindowMs,
    loginRateLimitMaxAttempts,
    loginSpikeWindowMs,
    loginSpikeThreshold,
    loginSpikeIpThreshold,
    loginSpikeAlertCooldownMs,
    adminWebUserRole,
    adminWebTokenRole,
    adminWebUsersJson,
    adminWeb2faEnabled,
    adminWeb2faSecret,
    adminWeb2faActive,
    adminWeb2faWindowSteps,
    adminWebStepUpEnabled,
    adminWebStepUpTtlMs,
    adminWebAllowTokenSensitiveMutations,
    ssoDiscordEnabled,
    ssoDiscordClientId,
    ssoDiscordClientSecret,
    ssoDiscordActive,
    ssoDiscordRedirectUri,
    ssoDiscordGuildId,
    ssoDiscordDefaultRole,
    ssoStateTtlMs,
    metricsSeriesIntervalMs,
    metricsSeriesRetentionMs,
    discordApiBase: 'https://discord.com/api/v10',
  };
}

module.exports = {
  createAdminEnvRuntime,
};
