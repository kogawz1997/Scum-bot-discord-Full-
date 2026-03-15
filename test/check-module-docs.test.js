const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hasModuleDocBlock,
} = require('../scripts/check-module-docs');

test('module doc block detector accepts a documented module header', () => {
  assert.equal(
    hasModuleDocBlock("'use strict';\n\n/** Example module. */\nconst a = 1;\n"),
    true,
  );
});

test('module doc block detector rejects files without a doc block', () => {
  assert.equal(
    hasModuleDocBlock("'use strict';\n\nconst a = 1;\n"),
    false,
  );
});
