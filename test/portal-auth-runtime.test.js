const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPortalAuthRuntime,
} = require('../apps/web-portal-standalone/auth/portalAuthRuntime');

function createRuntime(overrides = {}) {
  return createPortalAuthRuntime({
    sessions: new Map(),
    oauthStates: new Map(),
    baseUrl: 'https://player.example.com',
    enforceOriginCheck: true,
    playerOpenAccess: true,
    requireGuildMember: false,
    allowedDiscordIds: new Set(),
    oauthStateTtlMs: 60_000,
    sessionTtlMs: 60_000,
    sessionCookieName: 'portal_session',
    sessionCookiePath: '/',
    sessionCookieSameSite: 'Lax',
    sessionCookieDomain: '',
    secureCookie: true,
    discordApiBase: 'https://discord.com/api/v10',
    discordClientId: 'client-id',
    discordClientSecret: 'client-secret',
    discordGuildId: '',
    discordRedirectPath: '/auth/discord/callback',
    sendJson(_res, _status, payload) {
      return payload;
    },
    upsertPlayerAccount: async () => {},
    buildDiscordAvatarUrl: () => null,
    normalizeText(value) {
      return String(value || '').trim();
    },
    isDiscordId(value) {
      return /^\d{15,25}$/.test(String(value || '').trim());
    },
    logger: console,
    ...overrides,
  });
}

test('portal auth runtime creates and reads sessions from cookies', () => {
  const runtime = createRuntime();
  const sessionId = runtime.createSession({
    user: 'tester',
    discordId: '123456789012345',
    role: 'player',
  });
  const req = {
    headers: {
      cookie: `portal_session=${encodeURIComponent(sessionId)}`,
    },
  };

  const session = runtime.getSession(req);

  assert.equal(session.user, 'tester');
  assert.equal(session.discordId, '123456789012345');
});

test('portal auth runtime enforces origin on unsafe methods', () => {
  const runtime = createRuntime();
  const allowed = runtime.verifyOrigin({
    method: 'POST',
    headers: {
      origin: 'https://player.example.com',
    },
  });
  const denied = runtime.verifyOrigin({
    method: 'POST',
    headers: {
      origin: 'https://evil.example.com',
    },
  });

  assert.equal(allowed, true);
  assert.equal(denied, false);
});

test('portal auth runtime builds canonical redirect for mismatched host/proto', () => {
  const runtime = createRuntime();
  const url = runtime.getCanonicalRedirectUrl({
    url: '/player',
    headers: {
      host: '127.0.0.1:3300',
      'x-forwarded-proto': 'http',
    },
    socket: {
      encrypted: false,
    },
  });

  assert.equal(url, 'https://player.example.com/player');
});
