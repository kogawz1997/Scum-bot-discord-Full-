const { loadJson, saveJsonDebounced } = require('./_persist');

const PANEL_TYPES = new Set([
  'topKiller',
  'topGunKill',
  'topKd',
  'topPlaytime',
  'topEconomy',
]);
const panelsByGuild = new Map(); // guildId -> panel refs

function normalizePanelType(panelType) {
  const raw = String(panelType || '').trim();
  if (!raw) return null;
  if (raw === 'top-killer') return 'topKiller';
  if (raw === 'top-gun-kill' || raw === 'top-gun') return 'topGunKill';
  if (raw === 'top-kd') return 'topKd';
  if (raw === 'top-playtime') return 'topPlaytime';
  if (raw === 'top-economy') return 'topEconomy';
  if (PANEL_TYPES.has(raw)) return raw;
  return null;
}

function normalizeRef(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const channelId = String(ref.channelId || '').trim();
  const messageId = String(ref.messageId || '').trim();
  if (!channelId || !messageId) return null;
  return {
    channelId,
    messageId,
    updatedAt: ref.updatedAt ? new Date(ref.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function normalizeState(input) {
  const state = {
    topKiller: null,
    topGunKill: null,
    topKd: null,
    topPlaytime: null,
    topEconomy: null,
  };
  if (!input || typeof input !== 'object') return state;

  state.topKiller = normalizeRef(input.topKiller);
  state.topGunKill = normalizeRef(input.topGunKill);
  state.topKd = normalizeRef(input.topKd);
  state.topPlaytime = normalizeRef(input.topPlaytime);
  state.topEconomy = normalizeRef(input.topEconomy);
  return state;
}

const scheduleSave = saveJsonDebounced('top-panels.json', () => ({
  guilds: Array.from(panelsByGuild.entries()),
}));

const persisted = loadJson('top-panels.json', null);
if (persisted?.guilds && Array.isArray(persisted.guilds)) {
  for (const [guildIdRaw, stateRaw] of persisted.guilds) {
    const guildId = String(guildIdRaw || '').trim();
    if (!guildId) continue;
    panelsByGuild.set(guildId, normalizeState(stateRaw));
  }
}

function getGuildState(guildId, createIfMissing = false) {
  const key = String(guildId || '').trim();
  if (!key) return null;
  let state = panelsByGuild.get(key) || null;
  if (!state && createIfMissing) {
    state = normalizeState(null);
    panelsByGuild.set(key, state);
    scheduleSave();
  }
  return state;
}

function setTopPanelMessage(guildId, panelType, channelId, messageId) {
  const key = normalizePanelType(panelType);
  if (!key) return null;
  const state = getGuildState(guildId, true);
  if (!state) return null;
  state[key] = normalizeRef({ channelId, messageId, updatedAt: new Date().toISOString() });
  scheduleSave();
  return state[key];
}

function getTopPanelMessage(guildId, panelType) {
  const key = normalizePanelType(panelType);
  if (!key) return null;
  const state = getGuildState(guildId, false);
  if (!state) return null;
  return state[key] || null;
}

function removeTopPanelMessage(guildId, panelType) {
  const key = normalizePanelType(panelType);
  if (!key) return false;
  const state = getGuildState(guildId, false);
  if (!state || !state[key]) return false;
  state[key] = null;
  scheduleSave();
  return true;
}

function getTopPanelsForGuild(guildId) {
  const state = getGuildState(guildId, false);
  if (!state) {
    return {
      topKiller: null,
      topGunKill: null,
      topKd: null,
      topPlaytime: null,
      topEconomy: null,
    };
  }
  return {
    topKiller: state.topKiller || null,
    topGunKill: state.topGunKill || null,
    topKd: state.topKd || null,
    topPlaytime: state.topPlaytime || null,
    topEconomy: state.topEconomy || null,
  };
}

function listTopPanels() {
  return Array.from(panelsByGuild.entries()).map(([guildId, state]) => ({
    guildId,
    topKiller: state?.topKiller || null,
    topGunKill: state?.topGunKill || null,
    topKd: state?.topKd || null,
    topPlaytime: state?.topPlaytime || null,
    topEconomy: state?.topEconomy || null,
  }));
}

function replaceTopPanels(nextPanels = []) {
  panelsByGuild.clear();
  for (const row of Array.isArray(nextPanels) ? nextPanels : []) {
    if (!row || typeof row !== 'object') continue;
    const guildId = String(row.guildId || '').trim();
    if (!guildId) continue;
    panelsByGuild.set(guildId, normalizeState(row));
  }
  scheduleSave();
  return panelsByGuild.size;
}

module.exports = {
  normalizePanelType,
  setTopPanelMessage,
  getTopPanelMessage,
  removeTopPanelMessage,
  getTopPanelsForGuild,
  listTopPanels,
  replaceTopPanels,
};
