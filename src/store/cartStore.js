const { loadJson, saveJsonDebounced } = require('./_persist');

const carts = new Map(); // userId -> { items: Map<itemId, quantity>, updatedAt }

function normalizeUserId(value) {
  return String(value || '').trim();
}

function normalizeItemId(value) {
  return String(value || '').trim();
}

function normalizeQuantity(value, fallback = 1, min = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.trunc(n));
}

function toSerializableCart(userId, cart) {
  return {
    userId,
    updatedAt: cart.updatedAt || new Date().toISOString(),
    items: Array.from(cart.items.entries()).map(([itemId, quantity]) => ({
      itemId,
      quantity: normalizeQuantity(quantity, 1, 1),
    })),
  };
}

function fromSerializableCart(row) {
  if (!row || typeof row !== 'object') return null;
  const userId = normalizeUserId(row.userId);
  if (!userId) return null;

  const items = new Map();
  for (const item of Array.isArray(row.items) ? row.items : []) {
    const itemId = normalizeItemId(item?.itemId);
    if (!itemId) continue;
    items.set(itemId, normalizeQuantity(item?.quantity, 1, 1));
  }

  return {
    userId,
    cart: {
      items,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    },
  };
}

const scheduleSave = saveJsonDebounced('carts.json', () => ({
  carts: Array.from(carts.entries()).map(([userId, cart]) =>
    toSerializableCart(userId, cart),
  ),
}));

const persisted = loadJson('carts.json', null);
if (persisted?.carts && Array.isArray(persisted.carts)) {
  for (const row of persisted.carts) {
    const parsed = fromSerializableCart(row);
    if (!parsed) continue;
    carts.set(parsed.userId, parsed.cart);
  }
}

function getOrCreateCart(userId) {
  const key = normalizeUserId(userId);
  if (!key) return null;

  let cart = carts.get(key);
  if (!cart) {
    cart = {
      items: new Map(),
      updatedAt: new Date().toISOString(),
    };
    carts.set(key, cart);
  }
  return cart;
}

function touchCart(cart) {
  if (!cart) return;
  cart.updatedAt = new Date().toISOString();
}

function listCartItems(userId) {
  const key = normalizeUserId(userId);
  if (!key) return [];
  const cart = carts.get(key);
  if (!cart) return [];
  return Array.from(cart.items.entries()).map(([itemId, quantity]) => ({
    itemId,
    quantity: normalizeQuantity(quantity, 1, 1),
  }));
}

function getCartUnits(userId) {
  return listCartItems(userId).reduce((sum, row) => sum + row.quantity, 0);
}

function addCartItem(userId, itemId, quantity = 1) {
  const key = normalizeUserId(userId);
  const itemKey = normalizeItemId(itemId);
  if (!key || !itemKey) return null;

  const cart = getOrCreateCart(key);
  const nextQty = normalizeQuantity(quantity, 1, 1);
  const prev = normalizeQuantity(cart.items.get(itemKey) || 0, 0, 0);
  cart.items.set(itemKey, Math.max(1, prev + nextQty));
  touchCart(cart);
  scheduleSave();
  return {
    itemId: itemKey,
    quantity: cart.items.get(itemKey),
    units: getCartUnits(key),
  };
}

function removeCartItem(userId, itemId, quantity = 1) {
  const key = normalizeUserId(userId);
  const itemKey = normalizeItemId(itemId);
  if (!key || !itemKey) return null;

  const cart = carts.get(key);
  if (!cart || !cart.items.has(itemKey)) return null;

  const dec = normalizeQuantity(quantity, 1, 1);
  const current = normalizeQuantity(cart.items.get(itemKey) || 0, 0, 0);
  const next = current - dec;
  if (next <= 0) {
    cart.items.delete(itemKey);
  } else {
    cart.items.set(itemKey, next);
  }

  if (cart.items.size === 0) {
    carts.delete(key);
  } else {
    touchCart(cart);
  }
  scheduleSave();
  return {
    itemId: itemKey,
    quantity: next > 0 ? next : 0,
    units: getCartUnits(key),
  };
}

function clearCart(userId) {
  const key = normalizeUserId(userId);
  if (!key) return false;
  const existed = carts.delete(key);
  if (existed) scheduleSave();
  return existed;
}

function listAllCarts() {
  return Array.from(carts.entries()).map(([userId, cart]) =>
    toSerializableCart(userId, cart),
  );
}

function replaceCarts(nextCarts = []) {
  carts.clear();
  for (const row of Array.isArray(nextCarts) ? nextCarts : []) {
    const parsed = fromSerializableCart(row);
    if (!parsed) continue;
    carts.set(parsed.userId, parsed.cart);
  }
  scheduleSave();
  return carts.size;
}

module.exports = {
  addCartItem,
  removeCartItem,
  clearCart,
  listCartItems,
  getCartUnits,
  listAllCarts,
  replaceCarts,
};
