const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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

test('persist fallback mode is reported when sqlite3 is missing and DB is optional', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scumdb-fallback-'));
  const modulePath = path.resolve(__dirname, '../src/store/_persist.js');
  const script = [
    `const mod = require(${JSON.stringify(modulePath)});`,
    'console.log(`STATUS:${JSON.stringify(mod.getPersistenceStatus())}`);',
  ].join('\n');

  const result = spawnSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: `file:${path.join(tempDir, 'missing.db')}`,
      BOT_DATA_DIR: path.join(tempDir, 'legacy-data'),
      PERSIST_REQUIRE_DB: 'false',
      PATH: '',
      Path: '',
    },
  });

  assert.equal(result.status, 0);
  const line = String(result.stdout || '')
    .split(/\r?\n/)
    .find((row) => row.startsWith('STATUS:'));
  assert.ok(line, 'expected STATUS output');
  const status = JSON.parse(line.slice('STATUS:'.length));
  assert.equal(status.mode, 'json-fallback');
  assert.equal(status.requireDb, false);
  assert.equal(status.fallbackReason, 'sqlite3-not-found');
});

test('PERSIST_REQUIRE_DB=true fails fast when sqlite3 is missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scumdb-required-'));
  const modulePath = path.resolve(__dirname, '../src/store/_persist.js');
  const script = `require(${JSON.stringify(modulePath)});`;

  const result = spawnSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: `file:${path.join(tempDir, 'required.db')}`,
      BOT_DATA_DIR: path.join(tempDir, 'legacy-data'),
      PERSIST_REQUIRE_DB: 'true',
      PATH: '',
      Path: '',
    },
  });

  assert.notEqual(result.status, 0);
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(output, /PERSIST_REQUIRE_DB=true/i);
});
