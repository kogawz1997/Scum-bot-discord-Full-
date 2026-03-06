const test = require('node:test');
const assert = require('node:assert/strict');

const { isSnowflake, getMissingEnv } = require('../src/utils/env');

test('isSnowflake validates numeric Discord IDs', () => {
  assert.equal(isSnowflake('12345678901234567'), true);
  assert.equal(isSnowflake('abc'), false);
  assert.equal(isSnowflake('1234'), false);
});

test('getMissingEnv reports empty and missing keys', () => {
  const env = { A: 'ok', B: '', C: '  ' };
  assert.deepEqual(getMissingEnv(['A', 'B', 'C', 'D'], env), ['B', 'C', 'D']);
});
