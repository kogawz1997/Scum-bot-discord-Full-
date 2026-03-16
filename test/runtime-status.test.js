const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyRuntimeStatus,
  createValidationCheck,
  createValidationReport,
  summarizeRuntimeReason,
  unwrapRuntimePayload,
} = require('../src/utils/runtimeStatus');

test('unwrapRuntimePayload prefers nested data object', () => {
  assert.deepEqual(
    unwrapRuntimePayload({
      ok: true,
      data: { status: 'ready', ready: true },
    }),
    { status: 'ready', ready: true },
  );
});

test('classifyRuntimeStatus treats degraded runtime as optional when not required', () => {
  const result = classifyRuntimeStatus({
    ok: true,
    data: {
      status: 'degraded',
      ready: false,
      statusMessage: 'agent window missing',
    },
  }, { required: false });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'degraded');
  assert.equal(result.reason, 'agent window missing');
});

test('classifyRuntimeStatus fails required disabled runtime unless disabled is allowed', () => {
  const result = classifyRuntimeStatus({
    ok: true,
    data: {
      status: 'disabled',
      reason: 'watcher-disabled',
    },
  }, { required: true, allowDisabled: false });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'disabled');
  assert.equal(summarizeRuntimeReason(result.payload), 'watcher-disabled');
});

test('createValidationReport escalates to failed when any check fails', () => {
  const report = createValidationReport({
    kind: 'smoke',
    checks: [
      createValidationCheck('bot health', { ok: true }),
      createValidationCheck('worker health', { ok: false, detail: 'worker-down' }),
    ],
  });

  assert.equal(report.kind, 'smoke');
  assert.equal(report.ok, false);
  assert.equal(report.status, 'failed');
  assert.match(report.summary, /failed/i);
});
