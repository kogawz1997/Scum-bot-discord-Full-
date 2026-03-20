const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getConfigApplyOperationalPhase,
  getDeliveryCaseOperationalPhase,
  getRestoreOperationalPhase,
} = require('../src/utils/operationalStateModel');

test('delivery case operational phase prefers verified over plain delivered', () => {
  assert.deepEqual(
    getDeliveryCaseOperationalPhase({
      purchase: { status: 'delivered' },
      auditRows: [{ id: 'a-1' }],
    }),
    { key: 'verified', tone: 'success' },
  );

  assert.deepEqual(
    getDeliveryCaseOperationalPhase({
      purchase: { status: 'delivered' },
      auditRows: [],
    }),
    { key: 'delivered', tone: 'info' },
  );
});

test('restore operational phase reflects preview, success, and rollback outcomes', () => {
  assert.deepEqual(
    getRestoreOperationalPhase(
      { status: 'idle', previewToken: 'preview-1' },
      null,
    ),
    { key: 'previewed', tone: 'info' },
  );

  assert.deepEqual(
    getRestoreOperationalPhase(
      { status: 'succeeded', rollbackStatus: 'not-needed' },
      null,
    ),
    { key: 'completed', tone: 'success' },
  );

  assert.deepEqual(
    getRestoreOperationalPhase(
      { status: 'failed', rollbackStatus: 'succeeded' },
      null,
    ),
    { key: 'rolled-back', tone: 'warning' },
  );
});

test('config apply operational phase separates validated, restart-required, and restarted states', () => {
  assert.deepEqual(
    getConfigApplyOperationalPhase({ changedCount: 0 }),
    { key: 'validated', tone: 'info' },
  );

  assert.deepEqual(
    getConfigApplyOperationalPhase({ changedCount: 3, restartRequired: true, restarted: false }),
    { key: 'requires-restart', tone: 'warning' },
  );

  assert.deepEqual(
    getConfigApplyOperationalPhase({ changedCount: 3, restartRequired: true, restarted: true }),
    { key: 'applied-restarted', tone: 'success' },
  );
});
