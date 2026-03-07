const { loadJson, saveJsonDebounced } = require('./_persist');

const memberships = new Map(); // userId -> { planId, expiresAt }

const scheduleSave = saveJsonDebounced('vip.json', () => ({
  memberships: Array.from(memberships.entries()).map(([userId, m]) => [
    userId,
    { ...m, expiresAt: m.expiresAt ? new Date(m.expiresAt).toISOString() : null },
  ]),
}));

const persisted = loadJson('vip.json', null);
if (persisted) {
  for (const [userId, m] of persisted.memberships || []) {
    if (!userId || !m) continue;
    memberships.set(String(userId), {
      planId: String(m.planId || ''),
      expiresAt: m.expiresAt ? new Date(m.expiresAt) : null,
    });
  }
}

function setMembership(userId, planId, expiresAt) {
  memberships.set(userId, { planId, expiresAt });
  scheduleSave();
}

function getMembership(userId) {
  return memberships.get(userId) || null;
}

function listMemberships() {
  return Array.from(memberships.entries()).map(([userId, m]) => ({
    userId,
    ...m,
  }));
}

function removeMembership(userId) {
  memberships.delete(userId);
  scheduleSave();
}

function replaceMemberships(nextMemberships = []) {
  memberships.clear();
  for (const row of Array.isArray(nextMemberships) ? nextMemberships : []) {
    if (!row || typeof row !== 'object') continue;
    const userId = String(row.userId || '').trim();
    const planId = String(row.planId || '').trim();
    if (!userId || !planId) continue;
    memberships.set(userId, {
      planId,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    });
  }
  scheduleSave();
  return memberships.size;
}

module.exports = {
  setMembership,
  getMembership,
  listMemberships,
  removeMembership,
  replaceMemberships,
};
