// ระบบโค้ด redeem อย่างง่าย
// โครงเดิมตั้งใจใช้กับโค้ดที่แจกนอกรอบ เช่น โปรโมชัน หรือ topup
// เก็บในหน่วยความจำ + persistence (data/redeem.json)

const { loadJson, saveJsonDebounced } = require('./_persist');

const codes = new Map(); // code -> { type: 'coins' | 'item', amount?, itemId?, usedBy?: string, usedAt?: Date }

// ตัวอย่างโค้ดเริ่มต้น (แก้ไข/เพิ่มเองได้ตรงนี้)
codes.set('WELCOME1000', {
  type: 'coins',
  amount: 1000,
});

const scheduleSave = saveJsonDebounced('redeem.json', () => ({
  codes: Array.from(codes.entries()).map(([code, c]) => [
    code,
    { ...c, usedAt: c.usedAt ? new Date(c.usedAt).toISOString() : null },
  ]),
}));

const persisted = loadJson('redeem.json', null);
if (persisted) {
  codes.clear();
  for (const [code, c] of persisted.codes || []) {
    if (!code || !c) continue;
    codes.set(String(code).toUpperCase(), {
      ...c,
      usedAt: c.usedAt ? new Date(c.usedAt) : null,
    });
  }
}

function getCode(code) {
  return codes.get(code) || null;
}

function markUsed(code, userId) {
  const c = codes.get(code);
  if (!c) return null;
  c.usedBy = userId;
  c.usedAt = new Date();
  scheduleSave();
  return c;
}

function setCode(code, payload) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { ok: false, reason: 'invalid-code' };
  const type = String(payload?.type || '').trim();
  if (!['coins', 'item'].includes(type)) {
    return { ok: false, reason: 'invalid-type' };
  }

  const data = {
    type,
    amount: payload?.amount != null ? Number(payload.amount) : null,
    itemId: payload?.itemId != null ? String(payload.itemId) : null,
    usedBy: null,
    usedAt: null,
  };

  if (data.type === 'coins') {
    data.amount = Math.max(0, Number(data.amount || 0));
    data.itemId = null;
  } else {
    data.itemId = String(data.itemId || '').trim() || null;
    data.amount = null;
  }

  codes.set(normalized, data);
  scheduleSave();
  return { ok: true, code: normalized, value: data };
}

function deleteCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return false;
  const existed = codes.delete(normalized);
  if (existed) scheduleSave();
  return existed;
}

function resetCodeUsage(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const c = codes.get(normalized);
  if (!c) return null;
  c.usedBy = null;
  c.usedAt = null;
  scheduleSave();
  return c;
}

function listCodes() {
  return Array.from(codes.entries()).map(([code, value]) => ({
    code,
    ...value,
  }));
}

function replaceCodes(nextCodes = []) {
  codes.clear();
  for (const row of Array.isArray(nextCodes) ? nextCodes : []) {
    if (!row || typeof row !== 'object') continue;
    const code = String(row.code || '').trim().toUpperCase();
    if (!code) continue;
    const type = String(row.type || '').trim();
    if (!['coins', 'item'].includes(type)) continue;
    codes.set(code, {
      type,
      amount: row.amount == null ? null : Number(row.amount),
      itemId: row.itemId ? String(row.itemId) : null,
      usedBy: row.usedBy ? String(row.usedBy) : null,
      usedAt: row.usedAt ? new Date(row.usedAt) : null,
    });
  }
  scheduleSave();
  return codes.size;
}

module.exports = {
  getCode,
  markUsed,
  setCode,
  deleteCode,
  resetCodeUsage,
  listCodes,
  codes,
  replaceCodes,
};
