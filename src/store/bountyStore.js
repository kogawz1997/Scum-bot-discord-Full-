const { loadJson, saveJsonDebounced } = require('./_persist');

const bounties = new Map(); // id -> bounty

let bountyCounter = 1;

const scheduleSave = saveJsonDebounced('bounties.json', () => ({
  bountyCounter,
  bounties: Array.from(bounties.entries()),
}));

const persisted = loadJson('bounties.json', null);
if (persisted) {
  if (typeof persisted.bountyCounter === 'number') bountyCounter = persisted.bountyCounter;
  for (const [id, b] of persisted.bounties || []) {
    if (!b) continue;
    const numId = Number(b.id ?? id);
    bounties.set(numId, {
      id: numId,
      targetName: String(b.targetName || ''),
      amount: Number(b.amount || 0),
      createdBy: String(b.createdBy || ''),
      status: b.status || 'active',
      claimedBy: b.claimedBy ?? null,
    });
  }
  const maxId = Math.max(0, ...Array.from(bounties.keys()).map((n) => Number(n)));
  bountyCounter = Math.max(bountyCounter, maxId + 1);
}

function createBounty({ targetName, amount, createdBy }) {
  const id = bountyCounter++;
  const b = {
    id,
    targetName,
    amount,
    createdBy,
    status: 'active', // active | claimed | cancelled
    claimedBy: null,
  };
  bounties.set(id, b);
  scheduleSave();
  return b;
}

function listBounties() {
  return Array.from(bounties.values());
}

function cancelBounty(id, requesterId, isStaff) {
  const b = bounties.get(id);
  if (!b) return { ok: false, reason: 'not-found' };
  if (!isStaff && b.createdBy !== requesterId) {
    return { ok: false, reason: 'forbidden' };
  }
  b.status = 'cancelled';
  scheduleSave();
  return { ok: true, bounty: b };
}

function claimBounty(id, killerName) {
  const b = bounties.get(id);
  if (!b) return { ok: false, reason: 'not-found' };
  if (b.status !== 'active') return { ok: false, reason: 'not-active' };
  b.status = 'claimed';
  b.claimedBy = killerName;
  scheduleSave();
  return { ok: true, bounty: b };
}

module.exports = {
  createBounty,
  listBounties,
  cancelBounty,
  claimBounty,
};

