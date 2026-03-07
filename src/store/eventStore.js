const { loadJson, saveJsonDebounced } = require('./_persist');

const events = new Map(); // id -> event
const eventParticipants = new Map(); // eventId -> Set(userId)

let eventCounter = 1;

const scheduleSave = saveJsonDebounced('events.json', () => ({
  eventCounter,
  events: Array.from(events.entries()),
  participants: Array.from(eventParticipants.entries()).map(([eventId, set]) => [
    eventId,
    Array.from(set || []),
  ]),
}));

const persisted = loadJson('events.json', null);
if (persisted) {
  if (typeof persisted.eventCounter === 'number') eventCounter = persisted.eventCounter;
  for (const [id, ev] of persisted.events || []) {
    if (!ev) continue;
    events.set(Number(id), { ...ev, id: Number(ev.id ?? id) });
  }
  for (const [eventId, arr] of persisted.participants || []) {
    eventParticipants.set(Number(eventId), new Set(Array.isArray(arr) ? arr : []));
  }
  const maxId = Math.max(0, ...Array.from(events.keys()).map((n) => Number(n)));
  eventCounter = Math.max(eventCounter, maxId + 1);
}

function createEvent({ name, time, reward }) {
  const id = eventCounter++;
  const ev = {
    id,
    name,
    time,
    reward,
    status: 'scheduled', // scheduled | started | ended
  };
  events.set(id, ev);
  eventParticipants.set(id, new Set());
  scheduleSave();
  return ev;
}

function getEvent(id) {
  return events.get(id) || null;
}

function listEvents() {
  return Array.from(events.values());
}

function joinEvent(id, userId) {
  const ev = events.get(id);
  if (!ev) return null;
  const set = eventParticipants.get(id);
  set.add(userId);
  scheduleSave();
  return { ev, participants: set };
}

function startEvent(id) {
  const ev = events.get(id);
  if (!ev) return null;
  ev.status = 'started';
  scheduleSave();
  return ev;
}

function endEvent(id) {
  const ev = events.get(id);
  if (!ev) return null;
  ev.status = 'ended';
  scheduleSave();
  return ev;
}

function getParticipants(id) {
  const set = eventParticipants.get(id);
  if (!set) return [];
  return Array.from(set);
}

function replaceEvents(nextEvents = [], nextParticipants = [], nextCounter = null) {
  events.clear();
  eventParticipants.clear();

  for (const row of Array.isArray(nextEvents) ? nextEvents : []) {
    if (!row || typeof row !== 'object') continue;
    const id = Number(row.id || 0);
    if (!Number.isFinite(id) || id <= 0) continue;
    events.set(id, {
      id,
      name: String(row.name || ''),
      time: String(row.time || ''),
      reward: String(row.reward || ''),
      status: String(row.status || 'scheduled'),
    });
    eventParticipants.set(id, new Set());
  }

  if (Array.isArray(nextParticipants)) {
    for (const row of nextParticipants) {
      if (!row || typeof row !== 'object') continue;
      const eventId = Number(row.eventId || row.id || 0);
      if (!Number.isFinite(eventId) || eventId <= 0) continue;
      const set = eventParticipants.get(eventId) || new Set();
      for (const userId of Array.isArray(row.participants) ? row.participants : []) {
        const normalized = String(userId || '').trim();
        if (normalized) set.add(normalized);
      }
      eventParticipants.set(eventId, set);
    }
  }

  if (Number.isFinite(Number(nextCounter)) && Number(nextCounter) > 0) {
    eventCounter = Math.max(1, Math.trunc(Number(nextCounter)));
  } else {
    const maxId = Math.max(0, ...Array.from(events.keys()).map((n) => Number(n)));
    eventCounter = maxId + 1;
  }
  scheduleSave();
  return events.size;
}

module.exports = {
  createEvent,
  getEvent,
  listEvents,
  joinEvent,
  startEvent,
  endEvent,
  getParticipants,
  replaceEvents,
};
