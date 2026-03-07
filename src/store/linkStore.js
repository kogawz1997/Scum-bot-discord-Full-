const { loadJson, saveJsonDebounced } = require('./_persist');

// steamId -> { userId, inGameName, linkedAt }
const links = new Map();

const scheduleSave = saveJsonDebounced('links.json', () => ({
  links: Array.from(links.entries()).map(([steamId, v]) => [
    steamId,
    { ...v, linkedAt: v.linkedAt ? new Date(v.linkedAt).toISOString() : null },
  ]),
}));

const persisted = loadJson('links.json', null);
if (persisted) {
  for (const [steamId, v] of persisted.links || []) {
    if (!steamId || !v) continue;
    links.set(String(steamId), {
      userId: String(v.userId || ''),
      inGameName: v.inGameName ?? null,
      linkedAt: v.linkedAt ? new Date(v.linkedAt) : new Date(),
    });
  }
}

function normalizeSteamId(steamId) {
  const s = String(steamId || '').trim();
  if (!/^\d{15,25}$/.test(s)) return null;
  return s;
}

function getLinkBySteamId(steamId) {
  const s = normalizeSteamId(steamId);
  if (!s) return null;
  return links.get(s) || null;
}

function getLinkByUserId(userId) {
  const u = String(userId || '').trim();
  for (const [steamId, v] of links.entries()) {
    if (v.userId === u) return { steamId, ...v };
  }
  return null;
}

function setLink({ steamId, userId, inGameName }) {
  const s = normalizeSteamId(steamId);
  if (!s) return { ok: false, reason: 'invalid-steamid' };
  const u = String(userId || '').trim();
  if (!u) return { ok: false, reason: 'invalid-userid' };

  // 1 user ต่อ 1 steamId: ลบลิงก์เดิมของ user ก่อน
  for (const [sid, v] of links.entries()) {
    if (v.userId === u && sid !== s) {
      links.delete(sid);
    }
  }

  links.set(s, {
    userId: u,
    inGameName: inGameName ? String(inGameName) : null,
    linkedAt: new Date(),
  });
  scheduleSave();
  return { ok: true, steamId: s, userId: u };
}

function unlinkByUserId(userId) {
  const u = String(userId || '').trim();
  let removed = null;
  for (const [sid, v] of links.entries()) {
    if (v.userId === u) {
      removed = { steamId: sid, ...v };
      links.delete(sid);
      break;
    }
  }
  if (removed) scheduleSave();
  return removed;
}

function unlinkBySteamId(steamId) {
  const s = normalizeSteamId(steamId);
  if (!s) return null;
  const v = links.get(s);
  if (!v) return null;
  links.delete(s);
  scheduleSave();
  return { steamId: s, ...v };
}

function listLinks() {
  return Array.from(links.entries()).map(([steamId, v]) => ({ steamId, ...v }));
}

function replaceLinks(nextLinks = []) {
  links.clear();
  for (const row of Array.isArray(nextLinks) ? nextLinks : []) {
    if (!row || typeof row !== 'object') continue;
    const steamId = normalizeSteamId(row.steamId);
    const userId = String(row.userId || '').trim();
    if (!steamId || !userId) continue;
    links.set(steamId, {
      userId,
      inGameName: row.inGameName ? String(row.inGameName) : null,
      linkedAt: row.linkedAt ? new Date(row.linkedAt) : new Date(),
    });
  }
  scheduleSave();
  return links.size;
}

module.exports = {
  normalizeSteamId,
  getLinkBySteamId,
  getLinkByUserId,
  setLink,
  unlinkByUserId,
  unlinkBySteamId,
  listLinks,
  replaceLinks,
};
