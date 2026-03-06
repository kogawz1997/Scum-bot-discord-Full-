const { loadJson, saveJsonDebounced } = require('./_persist');

const weaponStats = new Map(); // weapon -> { kills, longestDistance, recordHolder }

const scheduleSave = saveJsonDebounced('weapon-stats.json', () => ({
  weaponStats: Array.from(weaponStats.entries()),
}));

const persisted = loadJson('weapon-stats.json', null);
if (persisted) {
  for (const [weapon, stat] of persisted.weaponStats || []) {
    if (!weapon || !stat) continue;
    weaponStats.set(String(weapon), {
      kills: Number(stat.kills || 0),
      longestDistance: Number(stat.longestDistance || 0),
      recordHolder: stat.recordHolder || null,
    });
  }
}

function recordWeaponKill({ weapon, distance, killer }) {
  const key = String(weapon || 'อาวุธไม่ทราบชนิด').trim();
  const current = weaponStats.get(key) || {
    kills: 0,
    longestDistance: 0,
    recordHolder: null,
  };

  current.kills += 1;

  const distanceNumber = Number(distance || 0);
  if (distanceNumber > current.longestDistance) {
    current.longestDistance = distanceNumber;
    current.recordHolder = killer || null;
  }

  weaponStats.set(key, current);
  scheduleSave();
  return current;
}

function listWeaponStats() {
  return Array.from(weaponStats.entries()).map(([weapon, stat]) => ({
    weapon,
    ...stat,
  }));
}

module.exports = {
  recordWeaponKill,
  listWeaponStats,
};
