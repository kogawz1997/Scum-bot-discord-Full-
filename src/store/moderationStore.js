const { loadJson, saveJsonDebounced } = require('./_persist');

const recentMessages = new Map(); // userId -> [timestamps] (ไม่ต้อง persist)
const punishments = new Map(); // userId -> [entries]

const scheduleSave = saveJsonDebounced('moderation.json', () => ({
  punishments: Array.from(punishments.entries()).map(([userId, arr]) => [
    userId,
    (arr || []).map((e) => ({
      ...e,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
    })),
  ]),
}));

const persisted = loadJson('moderation.json', null);
if (persisted) {
  for (const [userId, arr] of persisted.punishments || []) {
    if (!userId || !Array.isArray(arr)) continue;
    punishments.set(
      String(userId),
      arr.map((e) => ({
        ...e,
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
      })),
    );
  }
}

function pushMessage(userId, timestamp) {
  const arr = recentMessages.get(userId) || [];
  arr.push(timestamp);
  recentMessages.set(userId, arr);
}

function getRecentMessages(userId, sinceMs) {
  const arr = recentMessages.get(userId) || [];
  const filtered = arr.filter((t) => Date.now() - t <= sinceMs);
  recentMessages.set(userId, filtered);
  return filtered;
}

function addPunishment(userId, type, reason, staffId, durationMinutes) {
  const arr = punishments.get(userId) || [];
  const entry = {
    type, // warn | mute | timeout | ban | note
    reason,
    staffId,
    durationMinutes: durationMinutes ?? null,
    createdAt: new Date(),
  };
  arr.push(entry);
  punishments.set(userId, arr);
  scheduleSave();
  return entry;
}

function getPunishments(userId) {
  return punishments.get(userId) || [];
}

function listAllPunishments() {
  return Array.from(punishments.entries()).map(([userId, entries]) => ({
    userId,
    entries: entries || [],
  }));
}

function replacePunishments(nextRows = []) {
  punishments.clear();
  for (const row of Array.isArray(nextRows) ? nextRows : []) {
    if (!row || typeof row !== 'object') continue;
    const userId = String(row.userId || '').trim();
    if (!userId) continue;
    const entries = Array.isArray(row.entries) ? row.entries : [];
    punishments.set(
      userId,
      entries.map((entry) => ({
        type: String(entry?.type || 'note'),
        reason: String(entry?.reason || ''),
        staffId: String(entry?.staffId || ''),
        durationMinutes:
          entry?.durationMinutes == null
            ? null
            : Number(entry.durationMinutes),
        createdAt: entry?.createdAt ? new Date(entry.createdAt) : new Date(),
      })),
    );
  }
  scheduleSave();
  return punishments.size;
}

module.exports = {
  pushMessage,
  getRecentMessages,
  addPunishment,
  getPunishments,
  listAllPunishments,
  replacePunishments,
};
