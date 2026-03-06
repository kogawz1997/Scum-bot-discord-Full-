const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const rconDeliveryPath = path.join(rootDir, 'src', 'services', 'rconDelivery.js');
const depPaths = {
  config: path.join(rootDir, 'src', 'config.js'),
  persist: path.join(rootDir, 'src', 'store', '_persist.js'),
  linkStore: path.join(rootDir, 'src', 'store', 'linkStore.js'),
  deliveryAuditStore: path.join(rootDir, 'src', 'store', 'deliveryAuditStore.js'),
  memoryStore: path.join(rootDir, 'src', 'store', 'memoryStore.js'),
  adminLiveBus: path.join(rootDir, 'src', 'services', 'adminLiveBus.js'),
  itemIconService: path.join(rootDir, 'src', 'services', 'itemIconService.js'),
};

function installMock(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function loadRconDeliveryWithMocks(mocks) {
  delete require.cache[rconDeliveryPath];
  installMock(depPaths.config, mocks.config);
  installMock(depPaths.persist, mocks.persist);
  installMock(depPaths.linkStore, mocks.linkStore);
  installMock(depPaths.deliveryAuditStore, mocks.deliveryAuditStore);
  installMock(depPaths.memoryStore, mocks.memoryStore);
  installMock(depPaths.adminLiveBus, mocks.adminLiveBus);
  installMock(depPaths.itemIconService, mocks.itemIconService);
  return require(rconDeliveryPath);
}

function makeTestContext(overrides = {}) {
  const purchases = new Map();
  const shopItems = new Map();
  const audits = [];
  const liveEvents = [];
  const statuses = [];

  const config = {
    channels: {
      shopLog: 'shop-log',
      adminLog: 'admin-log',
    },
    delivery: {
      auto: {
        enabled: true,
        queueIntervalMs: 100,
        maxRetries: 1,
        retryDelayMs: 10,
        retryBackoff: 1,
        commandTimeoutMs: 2000,
        failedStatus: 'delivery_failed',
        itemCommands: {},
      },
    },
    ...overrides.config,
  };

  const mocks = {
    config,
    persist: {
      loadJson: () => null,
      saveJsonDebounced: () => () => {},
    },
    linkStore: {
      getLinkByUserId: (userId) =>
        userId === 'u-1' ? { steamId: '76561198000000001' } : null,
    },
    deliveryAuditStore: {
      addDeliveryAudit: (entry) => {
        audits.push(entry);
      },
      listDeliveryAudit: () => audits.slice(),
    },
    memoryStore: {
      findPurchaseByCode: async (code) => purchases.get(String(code)) || null,
      setPurchaseStatusByCode: async (code, status) => {
        const item = purchases.get(String(code));
        if (!item) return null;
        item.status = status;
        statuses.push({ code: String(code), status });
        return { ...item };
      },
      getShopItemById: async (id) => shopItems.get(String(id)) || null,
    },
    adminLiveBus: {
      publishAdminLiveUpdate: (type, payload) => {
        liveEvents.push({ type, payload });
      },
    },
    itemIconService: {
      resolveItemIconUrl: () => null,
    },
  };

  return {
    mocks,
    purchases,
    shopItems,
    audits,
    liveEvents,
    statuses,
  };
}

test.afterEach(() => {
  delete process.env.RCON_EXEC_TEMPLATE;
  delete require.cache[rconDeliveryPath];
  for (const dep of Object.values(depPaths)) {
    delete require.cache[dep];
  }
});

test('purchase -> queue -> auto-delivery success for bundle item', async () => {
  process.env.RCON_EXEC_TEMPLATE = 'echo {command}';
  const ctx = makeTestContext();

  ctx.mocks.config.delivery.auto.itemCommands = {
    'bundle-ak': ['#SpawnItem {steamId} {gameItemId} {quantity}'],
  };

  ctx.purchases.set('P-100', {
    code: 'P-100',
    userId: 'u-1',
    itemId: 'bundle-ak',
    status: 'pending',
  });
  ctx.shopItems.set('bundle-ak', {
    id: 'bundle-ak',
    name: 'AK Bundle',
    kind: 'item',
    deliveryItems: [
      { gameItemId: 'Weapon_AK47', quantity: 2, iconUrl: null },
      { gameItemId: 'Ammo_762', quantity: 150, iconUrl: null },
    ],
  });

  const api = loadRconDeliveryWithMocks(ctx.mocks);
  const queued = await api.enqueuePurchaseDeliveryByCode('P-100', {
    guildId: 'g-1',
  });
  assert.equal(queued.ok, true);
  assert.equal(api.listDeliveryQueue().length, 1);

  const processed = await api.processDeliveryQueueNow(5);
  assert.equal(processed.processed, 1);
  assert.equal(api.listDeliveryQueue().length, 0);
  assert.equal(ctx.purchases.get('P-100').status, 'delivered');

  const successAudit = ctx.audits.find((entry) => entry.action === 'success');
  assert.ok(successAudit, 'expected success audit entry');
  const commands = successAudit.meta.outputs.map((entry) => entry.command);
  assert.deepEqual(commands, [
    '#SpawnItem 76561198000000001 Weapon_AK47 2',
    '#SpawnItem 76561198000000001 Ammo_762 150',
  ]);
});

test('bundle without {gameItemId}/{quantity} placeholder fails fast', async () => {
  process.env.RCON_EXEC_TEMPLATE = 'echo {command}';
  const ctx = makeTestContext({
    config: {
      delivery: {
        auto: {
          enabled: true,
          queueIntervalMs: 100,
          maxRetries: 0,
          retryDelayMs: 10,
          retryBackoff: 1,
          commandTimeoutMs: 2000,
          failedStatus: 'delivery_failed',
          itemCommands: {
            'bundle-no-placeholder': ['#SpawnItem {steamId}'],
          },
        },
      },
    },
  });

  ctx.purchases.set('P-200', {
    code: 'P-200',
    userId: 'u-1',
    itemId: 'bundle-no-placeholder',
    status: 'pending',
  });
  ctx.shopItems.set('bundle-no-placeholder', {
    id: 'bundle-no-placeholder',
    name: 'Broken Bundle',
    kind: 'item',
    deliveryItems: [
      { gameItemId: 'Item_A', quantity: 1, iconUrl: null },
      { gameItemId: 'Item_B', quantity: 2, iconUrl: null },
    ],
  });

  const api = loadRconDeliveryWithMocks(ctx.mocks);
  const queued = await api.enqueuePurchaseDeliveryByCode('P-200');
  assert.equal(queued.ok, false);
  assert.equal(queued.reason, 'bundle-template-missing-placeholder');
  assert.equal(api.listDeliveryQueue().length, 0);
  assert.equal(ctx.purchases.get('P-200').status, 'pending');

  const failedAudit = ctx.audits.find(
    (entry) => entry.action === 'skip-invalid-template',
  );
  assert.ok(failedAudit, 'expected template validation audit entry');
  assert.match(
    String(failedAudit.message || ''),
    /\{gameItemId\}|\{quantity\}/,
  );
});
