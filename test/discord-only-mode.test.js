const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDiscordOnlySurfacePayload,
  createDiscordOnlySurfaceRequestHandler,
  isDiscordOnlyMode,
} = require('../src/config/discordOnlyMode');
const { getBotFeatureFlags } = require('../src/config/featureFlags');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = { ...this.headers, ...headers };
    },
    end(body = null) {
      this.body = body;
    },
  };
}

test('discord-only mode parser respects PLATFORM_DISCORD_ONLY', () => {
  assert.equal(isDiscordOnlyMode({ PLATFORM_DISCORD_ONLY: 'true' }), true);
  assert.equal(isDiscordOnlyMode({ PLATFORM_DISCORD_ONLY: '1' }), true);
  assert.equal(isDiscordOnlyMode({ PLATFORM_DISCORD_ONLY: '' }), false);
});

test('bot feature flags disable admin web in discord-only mode', () => {
  const flags = getBotFeatureFlags({
    PLATFORM_DISCORD_ONLY: 'true',
    BOT_ENABLE_ADMIN_WEB: 'true',
  });
  assert.equal(flags.adminWeb, false);
});

test('discord-only surface handler returns 410 for pages and 503 for health', () => {
  const handler = createDiscordOnlySurfaceRequestHandler('player-portal');
  const pageRes = createMockRes();
  handler({ url: '/landing' }, pageRes);
  assert.equal(pageRes.statusCode, 410);
  assert.match(String(pageRes.body || ''), /player-portal/i);

  const healthRes = createMockRes();
  handler({ url: '/healthz' }, healthRes);
  assert.equal(healthRes.statusCode, 503);
});

test('discord-only payload uses stable disabled surface shape', () => {
  const payload = buildDiscordOnlySurfacePayload('admin-web');
  assert.equal(payload.ok, false);
  assert.equal(payload.mode, 'discord-only');
  assert.equal(payload.surface, 'admin-web');
  assert.equal(payload.error, 'WEB_SURFACE_DISABLED');
});
