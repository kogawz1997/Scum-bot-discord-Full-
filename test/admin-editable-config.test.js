const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTROL_PANEL_ENV_FIELDS,
  buildControlPanelEnvPatch,
  buildControlPanelEnvSection,
} = require('../src/config/adminEditableConfig');

test('control panel env registry does not duplicate keys', () => {
  const seen = new Set();
  for (const field of CONTROL_PANEL_ENV_FIELDS) {
    assert.equal(seen.has(field.key), false, `duplicate key: ${field.key}`);
    seen.add(field.key);
  }
});

test('control panel env section hides secrets and normalizes booleans', () => {
  const section = buildControlPanelEnvSection('root', {
    BOT_ENABLE_ADMIN_WEB: 'true',
    RCON_PASSWORD: 'secret-value',
  });

  assert.equal(section.BOT_ENABLE_ADMIN_WEB.value, true);
  assert.equal(section.RCON_PASSWORD.configured, true);
  assert.equal(section.RCON_PASSWORD.value, '');
});

test('control panel env patch ignores empty secret updates', () => {
  const patch = buildControlPanelEnvPatch({
    root: {
      BOT_ENABLE_ADMIN_WEB: false,
      RCON_PASSWORD: '',
    },
  });

  assert.deepEqual(patch, {
    root: {
      BOT_ENABLE_ADMIN_WEB: 'false',
    },
    portal: {},
  });
});
