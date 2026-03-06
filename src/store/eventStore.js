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

module.exports = {
  createEvent,
  getEvent,
  listEvents,
  joinEvent,
  startEvent,
  endEvent,
  getParticipants,
};

