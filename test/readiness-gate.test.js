const test = require('node:test');
const assert = require('node:assert/strict');

const { buildScriptSequence } = require('../scripts/readiness-gate');

test('readiness production includes smoke by default', () => {
  const scripts = buildScriptSequence({ isProduction: true, skipSmoke: false });

  assert.equal(scripts.includes('smoke:postdeploy'), true);
  assert.deepEqual(scripts.slice(0, 5), [
    'check',
    'security:check',
    'doctor',
    'doctor:topology',
    'doctor:web-standalone',
  ]);
});

test('readiness production can skip smoke explicitly', () => {
  const scripts = buildScriptSequence({ isProduction: true, skipSmoke: true });

  assert.equal(scripts.includes('smoke:postdeploy'), false);
});
