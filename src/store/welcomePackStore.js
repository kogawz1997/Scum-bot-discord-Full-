const { loadJson, saveJsonDebounced } = require('./_persist');

const claimed = new Set();

const scheduleSave = saveJsonDebounced('welcome-pack.json', () => ({
  claimed: Array.from(claimed),
}));

const persisted = loadJson('welcome-pack.json', null);
if (persisted) {
  for (const id of persisted.claimed || []) {
    claimed.add(String(id));
  }
}

function hasClaimed(userId) {
  return claimed.has(String(userId));
}

function claim(userId) {
  const id = String(userId);
  if (claimed.has(id)) return false;
  claimed.add(id);
  scheduleSave();
  return true;
}

function listClaimed() {
  return Array.from(claimed.values());
}

function revokeClaim(userId) {
  const id = String(userId);
  const removed = claimed.delete(id);
  if (removed) scheduleSave();
  return removed;
}

function clearClaims() {
  claimed.clear();
  scheduleSave();
}

module.exports = {
  hasClaimed,
  claim,
  listClaimed,
  revokeClaim,
  clearClaims,
};
