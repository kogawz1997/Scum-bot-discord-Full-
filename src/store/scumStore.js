const serverStatus = {
  onlinePlayers: 0,
  maxPlayers: 90,
  pingMs: null,
  uptimeMinutes: 0,
  lastUpdated: null,
};

const { loadJson, saveJsonDebounced } = require('./_persist');

const scheduleSave = saveJsonDebounced('scum-status.json', () => ({
  ...serverStatus,
  lastUpdated: serverStatus.lastUpdated
    ? new Date(serverStatus.lastUpdated).toISOString()
    : null,
}));

const persisted = loadJson('scum-status.json', null);
if (persisted) {
  if (typeof persisted.onlinePlayers === 'number')
    serverStatus.onlinePlayers = persisted.onlinePlayers;
  if (typeof persisted.maxPlayers === 'number')
    serverStatus.maxPlayers = persisted.maxPlayers;
  if (typeof persisted.pingMs === 'number') serverStatus.pingMs = persisted.pingMs;
  if (typeof persisted.uptimeMinutes === 'number')
    serverStatus.uptimeMinutes = persisted.uptimeMinutes;
  serverStatus.lastUpdated = persisted.lastUpdated
    ? new Date(persisted.lastUpdated)
    : null;
}

function updateStatus({ onlinePlayers, maxPlayers, pingMs, uptimeMinutes }) {
  if (typeof onlinePlayers === 'number') serverStatus.onlinePlayers = onlinePlayers;
  if (typeof maxPlayers === 'number') serverStatus.maxPlayers = maxPlayers;
  if (typeof pingMs === 'number') serverStatus.pingMs = pingMs;
  if (typeof uptimeMinutes === 'number') serverStatus.uptimeMinutes = uptimeMinutes;
  serverStatus.lastUpdated = new Date();
  scheduleSave();
}

function getStatus() {
  return { ...serverStatus };
}

module.exports = {
  updateStatus,
  getStatus,
};

