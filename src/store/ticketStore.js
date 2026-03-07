const { loadJson, saveJsonDebounced } = require('./_persist');

const tickets = new Map(); // channelId -> ticket

let ticketCounter = 1;

const scheduleSave = saveJsonDebounced('tickets.json', () => ({
  ticketCounter,
  tickets: Array.from(tickets.entries()).map(([channelId, t]) => [
    channelId,
    {
      ...t,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      closedAt: t.closedAt ? new Date(t.closedAt).toISOString() : null,
    },
  ]),
}));

const persisted = loadJson('tickets.json', null);
if (persisted) {
  if (typeof persisted.ticketCounter === 'number') ticketCounter = persisted.ticketCounter;
  for (const [channelId, t] of persisted.tickets || []) {
    if (!channelId || !t) continue;
    tickets.set(String(channelId), {
      ...t,
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
      closedAt: t.closedAt ? new Date(t.closedAt) : null,
    });
  }
  const maxId = Math.max(0, ...Array.from(tickets.values()).map((t) => Number(t.id || 0)));
  ticketCounter = Math.max(ticketCounter, maxId + 1);
}

function createTicket({ guildId, userId, channelId, category, reason }) {
  const id = ticketCounter++;
  const t = {
    id,
    guildId,
    userId,
    channelId,
    category,
    reason,
    status: 'open', // open | claimed | closed
    claimedBy: null,
    createdAt: new Date(),
    closedAt: null,
  };
  tickets.set(channelId, t);
  scheduleSave();
  return t;
}

function getTicketByChannel(channelId) {
  return tickets.get(channelId) || null;
}

function claimTicket(channelId, staffId) {
  const t = tickets.get(channelId);
  if (!t) return null;
  t.status = 'claimed';
  t.claimedBy = staffId;
  scheduleSave();
  return t;
}

function closeTicket(channelId) {
  const t = tickets.get(channelId);
  if (!t) return null;
  t.status = 'closed';
  t.closedAt = new Date();
  scheduleSave();
  return t;
}

function replaceTickets(nextTickets = [], nextCounter = null) {
  tickets.clear();
  for (const row of Array.isArray(nextTickets) ? nextTickets : []) {
    if (!row || typeof row !== 'object') continue;
    const channelId = String(row.channelId || '').trim();
    if (!channelId) continue;
    tickets.set(channelId, {
      id: Number(row.id || 0) || 0,
      guildId: row.guildId ? String(row.guildId) : null,
      userId: row.userId ? String(row.userId) : null,
      channelId,
      category: row.category ? String(row.category) : null,
      reason: row.reason ? String(row.reason) : null,
      status: String(row.status || 'open'),
      claimedBy: row.claimedBy ? String(row.claimedBy) : null,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      closedAt: row.closedAt ? new Date(row.closedAt) : null,
    });
  }

  if (Number.isFinite(Number(nextCounter)) && Number(nextCounter) > 0) {
    ticketCounter = Math.max(1, Math.trunc(Number(nextCounter)));
  } else {
    const maxId = Math.max(0, ...Array.from(tickets.values()).map((t) => Number(t.id || 0)));
    ticketCounter = maxId + 1;
  }
  scheduleSave();
  return tickets.size;
}

module.exports = {
  tickets,
  createTicket,
  getTicketByChannel,
  claimTicket,
  closeTicket,
  replaceTickets,
};
