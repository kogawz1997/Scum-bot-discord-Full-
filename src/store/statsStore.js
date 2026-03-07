const { loadJson, saveJsonDebounced } = require('./_persist');

const stats = new Map(); // userId -> stat

const scheduleSave = saveJsonDebounced('stats.json', () => ({
  stats: Array.from(stats.entries()),
}));

const persisted = loadJson('stats.json', null);
if (persisted) {
  for (const [userId, s] of persisted.stats || []) {
    if (!userId || !s) continue;
    stats.set(String(userId), {
      kills: Number(s.kills || 0),
      deaths: Number(s.deaths || 0),
      playtimeMinutes: Number(s.playtimeMinutes || 0),
      squad: s.squad ?? null,
    });
  }
}

function getOrCreateStats(userId) {
  let s = stats.get(userId);
  if (!s) {
    s = {
      kills: 0,
      deaths: 0,
      playtimeMinutes: 0,
      squad: null,
    };
    stats.set(userId, s);
    scheduleSave();
  }
  return s;
}

function getStats(userId) {
  return getOrCreateStats(userId);
}

function listAllStats() {
  return Array.from(stats.entries()).map(([userId, s]) => ({
    userId,
    ...s,
  }));
}

function addKill(userId, amount = 1) {
  const s = getOrCreateStats(userId);
  s.kills += Number(amount || 0);
  scheduleSave();
  return s;
}

function addDeath(userId, amount = 1) {
  const s = getOrCreateStats(userId);
  s.deaths += Number(amount || 0);
  scheduleSave();
  return s;
}

function addPlaytimeMinutes(userId, minutes) {
  const s = getOrCreateStats(userId);
  s.playtimeMinutes += Math.max(0, Number(minutes || 0));
  scheduleSave();
  return s;
}

function replaceStats(nextStats = []) {
  stats.clear();
  for (const row of Array.isArray(nextStats) ? nextStats : []) {
    if (!row || typeof row !== 'object') continue;
    const userId = String(row.userId || '').trim();
    if (!userId) continue;
    stats.set(userId, {
      kills: Number(row.kills || 0),
      deaths: Number(row.deaths || 0),
      playtimeMinutes: Number(row.playtimeMinutes || 0),
      squad: row.squad ? String(row.squad) : null,
    });
  }
  scheduleSave();
  return stats.size;
}

module.exports = {
  getStats,
  listAllStats,
  addKill,
  addDeath,
  addPlaytimeMinutes,
  replaceStats,
};
