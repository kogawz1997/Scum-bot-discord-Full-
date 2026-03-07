const { loadJson, saveJsonDebounced } = require('./_persist');

const MAX_AUDIT_ITEMS = 3000;
const audits = [];

function normalizeAudit(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const createdAt = entry.createdAt ? new Date(entry.createdAt) : new Date();
  const id = String(entry.id || `audit-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
  return {
    id,
    createdAt,
    level: String(entry.level || 'info'),
    action: String(entry.action || 'event'),
    purchaseCode: entry.purchaseCode ? String(entry.purchaseCode) : null,
    itemId: entry.itemId ? String(entry.itemId) : null,
    userId: entry.userId ? String(entry.userId) : null,
    steamId: entry.steamId ? String(entry.steamId) : null,
    attempt: entry.attempt == null ? null : Number(entry.attempt),
    message: entry.message ? String(entry.message) : '',
    meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : null,
  };
}

const persisted = loadJson('delivery-audit.json', null);
if (persisted?.audits && Array.isArray(persisted.audits)) {
  for (const item of persisted.audits) {
    const normalized = normalizeAudit(item);
    if (!normalized) continue;
    audits.push(normalized);
  }
}

const scheduleSave = saveJsonDebounced('delivery-audit.json', () => ({
  audits: audits.map((a) => ({
    ...a,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
  })),
}));

function addDeliveryAudit(entry) {
  const normalized = normalizeAudit(entry);
  if (!normalized) return null;
  audits.push(normalized);
  if (audits.length > MAX_AUDIT_ITEMS) {
    audits.splice(0, audits.length - MAX_AUDIT_ITEMS);
  }
  scheduleSave();
  return normalized;
}

function listDeliveryAudit(limit = 500) {
  const max = Math.max(1, Number(limit || 500));
  return audits
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, max)
    .map((a) => ({ ...a }));
}

function clearDeliveryAudit() {
  audits.length = 0;
  scheduleSave();
}

function replaceDeliveryAudit(nextAudits = []) {
  audits.length = 0;
  for (const row of Array.isArray(nextAudits) ? nextAudits : []) {
    const normalized = normalizeAudit(row);
    if (!normalized) continue;
    audits.push(normalized);
  }
  if (audits.length > MAX_AUDIT_ITEMS) {
    audits.splice(0, audits.length - MAX_AUDIT_ITEMS);
  }
  scheduleSave();
  return audits.length;
}

module.exports = {
  addDeliveryAudit,
  listDeliveryAudit,
  clearDeliveryAudit,
  replaceDeliveryAudit,
};
