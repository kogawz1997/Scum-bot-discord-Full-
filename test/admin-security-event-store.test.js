const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const storePath = path.resolve(__dirname, '../src/store/adminSecurityEventStore.js');
const prismaPath = path.resolve(__dirname, '../src/prisma.js');
const persistPath = path.resolve(__dirname, '../src/store/_persist.js');

function installMock(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

function createDelegateHarness() {
  const rows = new Map();

  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : value;
  }

  return {
    delegate: {
      async findMany() {
        return Array.from(rows.values())
          .sort((left, right) => String(left.occurredAt || '').localeCompare(String(right.occurredAt || '')))
          .map(clone);
      },
      async deleteMany() {
        rows.clear();
        return { count: 0 };
      },
      async createMany({ data }) {
        for (const row of Array.isArray(data) ? data : []) {
          rows.set(String(row.id), clone(row));
        }
        return { count: rows.size };
      },
    },
    snapshot() {
      return Array.from(rows.values()).map(clone);
    },
  };
}

function loadStoreWithMocks(delegate) {
  clearModule(storePath);
  installMock(prismaPath, {
    prisma: {
      platformAdminSecurityEvent: delegate,
    },
  });
  installMock(persistPath, {
    atomicWriteJson() {},
    getFilePath(name) {
      return path.join(process.cwd(), 'tmp', name);
    },
  });
  return require(storePath);
}

test.afterEach(() => {
  clearModule(storePath);
  clearModule(prismaPath);
  clearModule(persistPath);
});

test('admin security event store persists lifecycle rows through the prisma delegate when available', async () => {
  const harness = createDelegateHarness();
  const store = loadStoreWithMocks(harness.delegate);

  await store.initAdminSecurityEventStore();

  const recorded = store.recordAdminSecurityEvent({
    id: 'sec-1',
    at: '2026-03-28T01:00:00.000Z',
    type: 'login-failed',
    severity: 'warn',
    actor: 'owner@example.com',
    sessionId: 'session-1',
    ip: '127.0.0.1',
    reason: 'invalid-password',
    data: { attempts: 3 },
  });
  assert.equal(recorded.id, 'sec-1');
  await store.waitForAdminSecurityEventPersistence();

  let rows = await store.listAdminSecurityEvents({ limit: 10, severity: 'warn' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sessionId, 'session-1');
  assert.equal(rows[0].data.attempts, 3);
  assert.equal(harness.snapshot().length, 1);

  const replaced = await store.replaceAdminSecurityEvents([
    {
      id: 'sec-2',
      at: '2026-03-28T02:00:00.000Z',
      type: 'role-escalation',
      severity: 'error',
      actor: 'support@example.com',
      targetUser: 'tenant@example.com',
      reason: 'manual-override',
    },
  ]);
  assert.equal(replaced, 1);
  await store.waitForAdminSecurityEventPersistence();

  rows = await store.listAdminSecurityEvents({ limit: 10 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'sec-2');
  assert.equal(rows[0].severity, 'error');

  const cleared = await store.clearAdminSecurityEvents();
  assert.deepEqual(cleared, []);
  await store.waitForAdminSecurityEventPersistence();

  rows = await store.listAdminSecurityEvents({ limit: 10 });
  assert.equal(rows.length, 0);
  assert.equal(harness.snapshot().length, 0);
});
