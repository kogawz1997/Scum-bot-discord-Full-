const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const persistPath = path.resolve(__dirname, '../src/store/_persist.js');
const cartStorePath = path.resolve(__dirname, '../src/store/cartStore.js');

function freshCartStore() {
  delete require.cache[persistPath];
  delete require.cache[cartStorePath];
  return require(cartStorePath);
}

test('cart store add/remove/clear flow', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-cart-store-'));
  const oldDataDir = process.env.BOT_DATA_DIR;
  process.env.BOT_DATA_DIR = tempDir;

  try {
    const store = freshCartStore();

    const addA = store.addCartItem('user-1', 'vip-7d', 1);
    assert.equal(addA.quantity, 1);
    assert.equal(addA.units, 1);

    const addB = store.addCartItem('user-1', 'vip-7d', 2);
    assert.equal(addB.quantity, 3);
    assert.equal(addB.units, 3);

    store.addCartItem('user-1', 'loot-box', 1);
    assert.equal(store.getCartUnits('user-1'), 4);

    const rows = store.listCartItems('user-1');
    assert.deepEqual(
      rows.sort((a, b) => a.itemId.localeCompare(b.itemId)),
      [
        { itemId: 'loot-box', quantity: 1 },
        { itemId: 'vip-7d', quantity: 3 },
      ],
    );

    const removeA = store.removeCartItem('user-1', 'vip-7d', 2);
    assert.equal(removeA.quantity, 1);
    assert.equal(removeA.units, 2);

    const removeB = store.removeCartItem('user-1', 'vip-7d', 1);
    assert.equal(removeB.quantity, 0);
    assert.equal(store.getCartUnits('user-1'), 1);

    const cleared = store.clearCart('user-1');
    assert.equal(cleared, true);
    assert.equal(store.getCartUnits('user-1'), 0);
  } finally {
    if (oldDataDir == null) {
      delete process.env.BOT_DATA_DIR;
    } else {
      process.env.BOT_DATA_DIR = oldDataDir;
    }
    delete require.cache[persistPath];
    delete require.cache[cartStorePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

