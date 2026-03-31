const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPortalHelperRuntime,
  isDiscordId,
  normalizeHttpUrl,
} = require('../apps/web-portal-standalone/runtime/portalHelperRuntime');

test('portal helper runtime accepts legacy 14-digit discord ids used by local smoke data', () => {
  assert.equal(isDiscordId('91774928273550'), true);
  assert.equal(isDiscordId('123456789012345678'), true);
  assert.equal(isDiscordId('abc123'), false);
  assert.equal(isDiscordId('1234567890123'), false);
});

test('portal helper runtime normalizes http and https URLs safely', () => {
  assert.equal(normalizeHttpUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(normalizeHttpUrl('http://example.com/path'), 'http://example.com/path');
  assert.equal(normalizeHttpUrl('javascript:alert(1)'), null);
  assert.equal(normalizeHttpUrl(''), null);
});

test('portal helper runtime exposes normalizeHttpUrl to downstream runtime wiring', () => {
  const runtime = createPortalHelperRuntime({
    config: {},
    defaultMapPortalUrl: 'https://example.com/map',
    buildPortalRuntimeSettings: (input) => input,
    buildPortalHealthPayload: (input) => input,
    getRuntimeSettingsInput: () => ({}),
    buildBundleSummary: () => null,
    getLinkByUserId: () => null,
    isGameItemShopKind: () => false,
    listAllStats: () => [],
    listPlayerAccounts: async () => [],
    logger: console,
    normalizePartyKey: (value) => value,
    normalizeShopKind: (value) => value,
    printPortalStartupHints: () => true,
    resolveItemIconUrl: () => null,
  });

  assert.equal(typeof runtime.normalizeHttpUrl, 'function');
  assert.equal(runtime.normalizeHttpUrl('https://example.com/reward.png'), 'https://example.com/reward.png');
});
