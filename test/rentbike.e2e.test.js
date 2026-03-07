const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const config = require('../src/config');
const linkStore = require('../src/store/linkStore');
const rentBikeStore = require('../src/store/rentBikeStore');
const {
  requestRentBike,
  runRentBikeMidnightReset,
} = require('../src/services/rentBikeService');

async function waitUntil(fn, timeoutMs = 6000, intervalMs = 40) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for condition');
}

test('rentbike e2e: rent -> delivered -> daily-limit -> midnight reset cleanup', async (t) => {
  const originalConfig = config.getConfigSnapshot();
  const originalLinks = linkStore.listLinks();
  const originalDailyRents = await rentBikeStore.listDailyRents(5000);
  const originalRentalVehicles = await rentBikeStore.listRentalVehicles(5000);
  const fakeStatePath = path.join(
    os.tmpdir(),
    `fake-rentbike-rcon-${Date.now()}-${Math.floor(Math.random() * 1000)}.json`,
  );
  const previousTemplate = process.env.RCON_EXEC_TEMPLATE;
  const previousFakePath = process.env.FAKE_RENTBIKE_STATE_PATH;

  await rentBikeStore.replaceRentBikeData([], []);
  linkStore.replaceLinks([]);

  config.updateConfigPatch({
    rentBike: {
      cooldownMinutes: 0,
      spawnSettleMs: 10,
      resetDestroyDelayMs: 10,
      vehicle: {
        spawnId: 'MOTORBIKE_TEST',
        listCommand: '#ListSpawnedVehicles',
        spawnCommand: '#SpawnVehicle {spawnId}',
        destroyCommand: '#DestroyVehicle {vehicleInstanceId}',
        motorbikeKeywords: ['motorbike'],
      },
      rcon: {
        commandTimeoutMs: 2000,
        commandRetries: 0,
        retryDelayMs: 10,
        execTemplate: '',
      },
    },
  });

  process.env.FAKE_RENTBIKE_STATE_PATH = fakeStatePath;
  process.env.RCON_EXEC_TEMPLATE = 'node scripts/fake-rentbike-rcon.js {command}';

  const testUserId = '888888888888888881';
  const testSteamId = '76561198000000001';
  linkStore.setLink({
    userId: testUserId,
    steamId: testSteamId,
    inGameName: 'rentbike-e2e',
  });

  t.after(async () => {
    if (previousTemplate == null) {
      delete process.env.RCON_EXEC_TEMPLATE;
    } else {
      process.env.RCON_EXEC_TEMPLATE = previousTemplate;
    }
    if (previousFakePath == null) {
      delete process.env.FAKE_RENTBIKE_STATE_PATH;
    } else {
      process.env.FAKE_RENTBIKE_STATE_PATH = previousFakePath;
    }

    config.setFullConfig(originalConfig);
    linkStore.replaceLinks(originalLinks);
    await rentBikeStore.replaceRentBikeData(originalDailyRents, originalRentalVehicles);
    fs.rmSync(fakeStatePath, { force: true });
  });

  const rentResult = await requestRentBike(testUserId, 'guild-rentbike-e2e');
  assert.equal(rentResult.ok, true);
  assert.ok(String(rentResult.orderId || '').startsWith('RB-'));

  const deliveredOrder = await waitUntil(async () => {
    const row = await rentBikeStore.getRentalOrder(rentResult.orderId);
    if (!row) return null;
    if (row.status === 'delivered') return row;
    if (row.status === 'failed') {
      throw new Error(`rent bike delivery failed: ${row.lastError || 'unknown'}`);
    }
    return null;
  });
  assert.equal(deliveredOrder.status, 'delivered');
  assert.ok(String(deliveredOrder.vehicleInstanceId || '').length > 0);

  const limitedResult = await requestRentBike(testUserId, 'guild-rentbike-e2e');
  assert.equal(limitedResult.ok, false);
  assert.equal(limitedResult.reason, 'daily-limit');

  await runRentBikeMidnightReset('rentbike-e2e-test');

  const cleanedOrder = await waitUntil(async () => {
    const row = await rentBikeStore.getRentalOrder(rentResult.orderId);
    if (!row) return null;
    if (row.status === 'destroyed') return row;
    if (row.status === 'missing') {
      throw new Error(`vehicle cleanup missing: ${row.lastError || 'unknown'}`);
    }
    return null;
  });
  assert.equal(cleanedOrder.status, 'destroyed');

  const stateRaw = fs.readFileSync(fakeStatePath, 'utf8');
  const state = JSON.parse(stateRaw);
  assert.ok(Array.isArray(state.vehicles));
  assert.equal(state.vehicles.length, 0);
});
