const crypto = require('node:crypto');
const { economy, shop } = require('../config');
const { prisma } = require('../prisma');

function normalizeShopKind(value, fallback = 'item') {
  const raw = String(value || fallback)
    .trim()
    .toLowerCase();
  if (raw === 'vip') return 'vip';
  return 'item';
}

function normalizeShopQuantity(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.trunc(n));
}

function normalizeOptionalText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function inferShopKindById(id) {
  const key = String(id || '').trim().toLowerCase();
  if (key.startsWith('vip')) return 'vip';
  return 'item';
}

function parseJsonArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return [];
  const raw = String(value || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDeliveryItem(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const gameItemId = normalizeOptionalText(entry.gameItemId || entry.id);
  if (!gameItemId) return null;
  const quantity = normalizeShopQuantity(entry.quantity, 1);
  const iconUrl = normalizeOptionalText(entry.iconUrl);
  return { gameItemId, quantity, iconUrl };
}

function compactDeliveryItems(entries) {
  const out = [];
  const byKey = new Map();
  for (const rawEntry of entries) {
    const normalized = normalizeDeliveryItem(rawEntry);
    if (!normalized) continue;

    const key = normalized.gameItemId.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
      out.push(normalized);
      continue;
    }

    existing.quantity += normalized.quantity;
    if (!existing.iconUrl && normalized.iconUrl) {
      existing.iconUrl = normalized.iconUrl;
    }
  }
  return out;
}

function normalizeDeliveryItems(value, fallback = {}) {
  const fromValue = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? [value]
      : [];
  const fromJson = parseJsonArray(value);
  const fallbackItem = normalizeDeliveryItem({
    gameItemId: fallback.gameItemId,
    quantity: fallback.quantity,
    iconUrl: fallback.iconUrl,
  });

  const combined = compactDeliveryItems([...fromValue, ...fromJson]);
  if (combined.length > 0) return combined;
  return fallbackItem ? [fallbackItem] : [];
}

function resolveShopMetaForWrite(meta = {}, fallbackId = '') {
  const resolvedKind = normalizeShopKind(meta.kind, inferShopKindById(fallbackId));
  const deliveryItems = resolvedKind === 'item'
    ? normalizeDeliveryItems(meta.deliveryItems, {
        gameItemId: meta.gameItemId,
        quantity: meta.quantity,
        iconUrl: meta.iconUrl,
      })
    : [];
  const primary = deliveryItems[0] || null;
  return { resolvedKind, deliveryItems, primary };
}

function toShopItemView(rawItem) {
  if (!rawItem) return null;

  const kind = normalizeShopKind(rawItem.kind, inferShopKindById(rawItem.id));
  const deliveryItems = kind === 'item'
    ? normalizeDeliveryItems(rawItem.deliveryItemsJson, {
        gameItemId: rawItem.gameItemId,
        quantity: rawItem.quantity,
        iconUrl: rawItem.iconUrl,
      })
    : [];
  const primary = deliveryItems[0] || null;

  return {
    ...rawItem,
    kind,
    gameItemId: kind === 'item'
      ? normalizeOptionalText(primary?.gameItemId || rawItem.gameItemId)
      : null,
    quantity: kind === 'item'
      ? normalizeShopQuantity(primary?.quantity || rawItem.quantity, 1)
      : 1,
    iconUrl: kind === 'item'
      ? normalizeOptionalText(primary?.iconUrl || rawItem.iconUrl)
      : null,
    deliveryItems,
  };
}

async function getWallet(userId) {
  const id = String(userId);
  let wallet = await prisma.userWallet.findUnique({ where: { userId: id } });
  if (!wallet) {
    wallet = await prisma.userWallet.create({
      data: { userId: id, balance: 0, lastDaily: null, lastWeekly: null },
    });
  }
  return wallet;
}

async function addCoins(userId, amount) {
  const id = String(userId);
  const wallet = await getWallet(id);
  const newBalance = wallet.balance + Number(amount || 0);
  const updated = await prisma.userWallet.update({
    where: { userId: id },
    data: { balance: newBalance },
  });
  return updated.balance;
}

async function removeCoins(userId, amount) {
  const id = String(userId);
  const wallet = await getWallet(id);
  const newBalance = Math.max(0, wallet.balance - Number(amount || 0));
  const updated = await prisma.userWallet.update({
    where: { userId: id },
    data: { balance: newBalance },
  });
  return updated.balance;
}

async function setCoins(userId, amount) {
  const id = String(userId);
  const wallet = await getWallet(id);
  const newBalance = Math.max(0, Number(amount || 0));
  const updated = await prisma.userWallet.update({
    where: { userId: wallet.userId },
    data: { balance: newBalance },
  });
  return updated.balance;
}

async function canClaimDaily(userId) {
  const wallet = await getWallet(userId);
  const now = BigInt(Date.now());
  if (wallet.lastDaily == null) return { ok: true };
  const diff = now - wallet.lastDaily;
  if (diff >= BigInt(economy.dailyCooldownMs)) return { ok: true };
  const remaining = BigInt(economy.dailyCooldownMs) - diff;
  return { ok: false, remainingMs: Number(remaining) };
}

async function claimDaily(userId) {
  const id = String(userId);
  const wallet = await getWallet(id);
  const now = BigInt(Date.now());
  const updated = await prisma.userWallet.update({
    where: { userId: wallet.userId },
    data: {
      lastDaily: now,
      balance: wallet.balance + economy.dailyReward,
    },
  });
  return updated.balance;
}

async function canClaimWeekly(userId) {
  const wallet = await getWallet(userId);
  const now = BigInt(Date.now());
  if (wallet.lastWeekly == null) return { ok: true };
  const diff = now - wallet.lastWeekly;
  if (diff >= BigInt(economy.weeklyCooldownMs)) return { ok: true };
  const remaining = BigInt(economy.weeklyCooldownMs) - diff;
  return { ok: false, remainingMs: Number(remaining) };
}

async function claimWeekly(userId) {
  const id = String(userId);
  const wallet = await getWallet(id);
  const now = BigInt(Date.now());
  const updated = await prisma.userWallet.update({
    where: { userId: wallet.userId },
    data: {
      lastWeekly: now,
      balance: wallet.balance + economy.weeklyReward,
    },
  });
  return updated.balance;
}

async function listShopItems() {
  const items = await prisma.shopItem.findMany();
  if (items.length === 0) {
    await prisma.$transaction(
      shop.initialItems.map((i) => {
        const { resolvedKind, deliveryItems, primary } = resolveShopMetaForWrite(
          {
            kind: i.kind,
            gameItemId: i.gameItemId,
            quantity: i.quantity,
            iconUrl: i.iconUrl,
            deliveryItems: i.deliveryItems,
          },
          i.id,
        );
        return prisma.shopItem.upsert({
          where: { id: i.id },
          update: {
            name: i.name,
            price: i.price,
            description: i.description,
            kind: resolvedKind,
            gameItemId: primary?.gameItemId || null,
            quantity: primary?.quantity || 1,
            iconUrl: primary?.iconUrl || null,
            deliveryItemsJson:
              resolvedKind === 'item' && deliveryItems.length > 0
                ? JSON.stringify(deliveryItems)
                : null,
          },
          create: {
            id: i.id,
            name: i.name,
            price: i.price,
            description: i.description,
            kind: resolvedKind,
            gameItemId: primary?.gameItemId || null,
            quantity: primary?.quantity || 1,
            iconUrl: primary?.iconUrl || null,
            deliveryItemsJson:
              resolvedKind === 'item' && deliveryItems.length > 0
                ? JSON.stringify(deliveryItems)
                : null,
          },
        });
      }),
    );
    const fresh = await prisma.shopItem.findMany();
    return fresh.map((item) => toShopItemView(item));
  }
  return items.map((item) => toShopItemView(item));
}

async function getShopItemById(id) {
  const item = await prisma.shopItem.findUnique({ where: { id: String(id) } });
  return toShopItemView(item);
}

async function getShopItemByName(name) {
  const lower = String(name).toLowerCase();
  const all = await prisma.shopItem.findMany();
  const found = all.find((i) => {
    if (i.name.toLowerCase() === lower) return true;
    if (i.id.toLowerCase() === lower) return true;
    if (String(i.gameItemId || '').toLowerCase() === lower) return true;

    const kind = normalizeShopKind(i.kind, inferShopKindById(i.id));
    if (kind !== 'item') return false;

    const deliveryItems = normalizeDeliveryItems(i.deliveryItemsJson, {
      gameItemId: i.gameItemId,
      quantity: i.quantity,
      iconUrl: i.iconUrl,
    });
    return deliveryItems.some(
      (entry) => String(entry.gameItemId || '').toLowerCase() === lower,
    );
  });
  return toShopItemView(found || null);
}

async function addShopItem(id, name, price, description, meta = {}) {
  const existing = await prisma.shopItem.findUnique({
    where: { id: String(id) },
  });
  if (existing) {
    throw new Error('มี item id นี้อยู่แล้ว');
  }

  const { resolvedKind, deliveryItems, primary } = resolveShopMetaForWrite(
    meta,
    id,
  );

  if (resolvedKind === 'item' && deliveryItems.length === 0) {
    throw new Error('สินค้าประเภท item ต้องมี deliveryItems อย่างน้อย 1 รายการ');
  }

  const created = await prisma.shopItem.create({
    data: {
      id: String(id),
      name,
      price: Number(price || 0),
      description: description || '',
      kind: resolvedKind,
      gameItemId: primary?.gameItemId || null,
      quantity: primary?.quantity || 1,
      iconUrl: primary?.iconUrl || null,
      deliveryItemsJson:
        resolvedKind === 'item' && deliveryItems.length > 0
          ? JSON.stringify(deliveryItems)
          : null,
    },
  });
  return toShopItemView(created);
}

async function deleteShopItem(idOrName) {
  const item =
    (await getShopItemById(idOrName)) || (await getShopItemByName(idOrName));
  if (!item) return null;
  await prisma.shopItem.delete({ where: { id: item.id } });
  return item;
}

async function setShopItemPrice(idOrName, newPrice) {
  const item =
    (await getShopItemById(idOrName)) || (await getShopItemByName(idOrName));
  if (!item) return null;
  const updated = await prisma.shopItem.update({
    where: { id: item.id },
    data: { price: Number(newPrice || 0) },
  });
  return toShopItemView(updated);
}

async function createPurchase(userId, item) {
  const payload = {
    userId: String(userId),
    itemId: String(item.id),
    price: Number(item.price || 0),
    status: 'pending',
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code =
      typeof crypto.randomUUID === 'function'
        ? `P${crypto.randomUUID()}`
        : `P${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    try {
      return await prisma.purchase.create({
        data: {
          code,
          ...payload,
        },
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
    }
  }

  throw new Error('Failed to generate unique purchase code');
}

async function findPurchaseByCode(code) {
  return prisma.purchase.findUnique({ where: { code: String(code) } });
}

async function setPurchaseStatusByCode(code, status) {
  const p = await findPurchaseByCode(code);
  if (!p) return null;
  return prisma.purchase.update({
    where: { code: p.code },
    data: { status: String(status) },
  });
}

async function listUserPurchases(userId) {
  return prisma.purchase.findMany({
    where: { userId: String(userId) },
    orderBy: { createdAt: 'desc' },
  });
}

async function listTopWallets(limit = 10) {
  return prisma.userWallet.findMany({
    orderBy: { balance: 'desc' },
    take: Math.max(1, Number(limit || 10)),
  });
}

module.exports = {
  getWallet,
  addCoins,
  removeCoins,
  setCoins,
  canClaimDaily,
  claimDaily,
  canClaimWeekly,
  claimWeekly,
  listShopItems,
  getShopItemById,
  getShopItemByName,
  addShopItem,
  deleteShopItem,
  setShopItemPrice,
  createPurchase,
  findPurchaseByCode,
  setPurchaseStatusByCode,
  listUserPurchases,
  listTopWallets,
};
