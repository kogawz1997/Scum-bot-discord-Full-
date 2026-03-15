const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPortalHealthPayload,
  buildPortalStartupValidation,
  printPortalStartupHints,
} = require('../apps/web-portal-standalone/runtime/portalRuntime');

test('portal runtime health payload reflects runtime settings', () => {
  const payload = buildPortalHealthPayload({
    nodeEnv: 'production',
    mode: 'player',
    sessionCount: 2,
    oauthStateCount: 1,
    secureCookie: true,
    cookieName: 'portal',
    cookiePath: '/',
    cookieSameSite: 'Lax',
    enforceOriginCheck: true,
    discordOAuthConfigured: true,
    playerOpenAccess: true,
    requireGuildMember: false,
    legacyAdminUrl: 'https://admin.example.com/admin',
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.data.nodeEnv, 'production');
  assert.equal(payload.data.mode, 'player');
  assert.equal(payload.data.sessions, 2);
  assert.equal(payload.data.oauthStates, 1);
  assert.equal(payload.data.cookieName, 'portal');
  assert.equal(payload.data.legacyAdminUrl, 'https://admin.example.com/admin');
});

test('portal runtime validation reports production and access-policy issues', () => {
  const result = buildPortalStartupValidation({
    baseUrl: 'http://player.example.com',
    legacyAdminUrl: 'http://admin.example.com/admin',
    discordClientId: '',
    discordClientSecret: '',
    discordGuildId: '',
    playerOpenAccess: false,
    requireGuildMember: true,
    allowedDiscordIdsCount: 0,
    mode: 'player',
    enforceOriginCheck: false,
    cookieSameSite: 'None',
    secureCookie: false,
    sessionTtlMs: 48 * 60 * 60 * 1000,
    isProduction: true,
  });

  assert.ok(result.errors.includes('WEB_PORTAL_DISCORD_CLIENT_ID is required'));
  assert.ok(result.errors.includes('WEB_PORTAL_DISCORD_CLIENT_SECRET is required'));
  assert.ok(
    result.errors.includes(
      'WEB_PORTAL_REQUIRE_GUILD_MEMBER=true requires WEB_PORTAL_DISCORD_GUILD_ID',
    ),
  );
  assert.ok(result.errors.includes('WEB_PORTAL_SECURE_COOKIE must be true in production'));
  assert.ok(
    result.errors.includes('WEB_PORTAL_ENFORCE_ORIGIN_CHECK must be true in production'),
  );
  assert.ok(result.errors.includes('WEB_PORTAL_BASE_URL must use https in production'));
  assert.ok(
    result.warnings.includes(
      'WEB_PORTAL_COOKIE_SAMESITE=None without secure cookie may be rejected by browsers',
    ),
  );
  assert.ok(
    result.warnings.includes(
      'WEB_PORTAL_SESSION_TTL_HOURS is longer than 24 hours; review whether player sessions should expire sooner',
    ),
  );
});

test('portal runtime startup printer returns false and logs errors when invalid', () => {
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  const calls = [];
  const logger = {
    log(message) {
      calls.push(['log', message]);
    },
    warn(message) {
      calls.push(['warn', message]);
    },
    error(message) {
      calls.push(['error', message]);
    },
  };

  try {
    const ok = printPortalStartupHints(
      {
        baseUrl: 'http://player.example.com',
        legacyAdminUrl: 'https://admin.example.com/admin',
        discordClientId: '',
        discordClientSecret: '',
        discordGuildId: '',
        playerOpenAccess: true,
        requireGuildMember: false,
        allowedDiscordIdsCount: 0,
        mode: 'player',
        cookieName: 'portal',
        cookiePath: '/',
        cookieSameSite: 'Lax',
        cookieDomain: '',
        enforceOriginCheck: true,
        secureCookie: true,
        sessionTtlMs: 12 * 60 * 60 * 1000,
        isProduction: false,
      },
      logger,
    );

    assert.equal(ok, false);
    assert.equal(process.exitCode, 1);
    assert.ok(calls.some(([level, message]) => level === 'error' && /startup errors/i.test(message)));
  } finally {
    process.exitCode = originalExitCode;
  }
});
