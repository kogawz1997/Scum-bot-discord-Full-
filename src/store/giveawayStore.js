const { loadJson, saveJsonDebounced } = require('./_persist');

const giveaways = new Map(); // messageId -> { prize, winnersCount, endsAt, channelId, guildId, entrants: Set<userId> }

const scheduleSave = saveJsonDebounced('giveaways.json', () => ({
  giveaways: Array.from(giveaways.entries()).map(([messageId, g]) => [
    messageId,
    {
      ...g,
      endsAt: g.endsAt ? new Date(g.endsAt).toISOString() : null,
      entrants: Array.from(g.entrants || []),
    },
  ]),
}));

const persisted = loadJson('giveaways.json', null);
if (persisted) {
  for (const [messageId, g] of persisted.giveaways || []) {
    if (!messageId || !g) continue;
    giveaways.set(String(messageId), {
      ...g,
      endsAt: g.endsAt ? new Date(g.endsAt) : null,
      entrants: new Set(Array.isArray(g.entrants) ? g.entrants : []),
    });
  }
}

function createGiveaway({ messageId, channelId, guildId, prize, winnersCount, endsAt }) {
  const g = {
    messageId,
    channelId,
    guildId,
    prize,
    winnersCount,
    endsAt,
    entrants: new Set(),
  };
  giveaways.set(messageId, g);
  scheduleSave();
  return g;
}

function getGiveaway(messageId) {
  return giveaways.get(messageId) || null;
}

function addEntrant(messageId, userId) {
  const g = giveaways.get(messageId);
  if (!g) return null;
  g.entrants.add(userId);
  scheduleSave();
  return g;
}

function removeGiveaway(messageId) {
  giveaways.delete(messageId);
  scheduleSave();
}

module.exports = {
  giveaways,
  createGiveaway,
  getGiveaway,
  addEntrant,
  removeGiveaway,
};

