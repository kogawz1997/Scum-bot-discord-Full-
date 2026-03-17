const test = require('node:test');
const assert = require('node:assert/strict');

const prismaModulePath = require.resolve('../src/prisma');
const statsStoreModulePath = require.resolve('../src/store/statsStore');

function clearStatsModules() {
  delete require.cache[statsStoreModulePath];
  delete require.cache[prismaModulePath];
}

test('getStats does not overwrite persisted rows during cold-start hydration', async (t) => {
  clearStatsModules();
  const { prisma } = require('../src/prisma');
  const userId = `stats-cold-read-${Date.now()}`;

  t.after(async () => {
    await prisma.stats.deleteMany({ where: { userId } }).catch(() => null);
    clearStatsModules();
  });

  await prisma.stats.upsert({
    where: { userId },
    update: {
      kills: 12,
      deaths: 3,
      playtimeMinutes: 240,
      squad: 'omega',
    },
    create: {
      userId,
      kills: 12,
      deaths: 3,
      playtimeMinutes: 240,
      squad: 'omega',
    },
  });

  clearStatsModules();
  const statsStore = require('../src/store/statsStore');

  const immediate = statsStore.getStats(userId);
  assert.equal(Number(immediate.kills || 0), 0);
  assert.equal(Number(immediate.deaths || 0), 0);

  await statsStore.flushStatsStoreWrites();

  const persisted = await prisma.stats.findUnique({ where: { userId } });
  assert.equal(Number(persisted?.kills || 0), 12);
  assert.equal(Number(persisted?.deaths || 0), 3);

  const hydrated = statsStore.getStats(userId);
  assert.equal(Number(hydrated.kills || 0), 12);
  assert.equal(Number(hydrated.deaths || 0), 3);
});
