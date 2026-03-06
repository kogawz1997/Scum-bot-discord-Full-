const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function freshPersistModule() {
  const modulePath = path.resolve(__dirname, '../src/store/_persist.js');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('db persistence save/load roundtrip', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scumdb-'));
  process.env.DATABASE_URL = `file:${path.join(tempDir, 'test.db')}`;
  process.env.BOT_DATA_DIR = path.join(tempDir, 'legacy-data');

  const persist = freshPersistModule();
  const schedule = persist.saveJsonDebounced('unit.json', () => ({ ok: true }), 10);
  schedule();

  await new Promise((r) => setTimeout(r, 50));
  const got = persist.loadJson('unit.json', null);
  assert.deepEqual(got, { ok: true });
});
