const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  resolveExternalRuntimeDataDir,
  resolveRuntimeDataDir,
} = require('../src/utils/runtimeDataDir');

test('resolveRuntimeDataDir uses project data dir for local development by default', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const result = resolveRuntimeDataDir({
    env: {
      NODE_ENV: 'development',
      PERSIST_REQUIRE_DB: 'false',
      BOT_DATA_DIR: '',
    },
    projectRoot,
    platform: 'win32',
    homedir: 'C:\\Users\\tester',
  });

  assert.equal(result, path.join(projectRoot, 'data'));
});

test('resolveRuntimeDataDir uses BOT_DATA_DIR override when provided', () => {
  const result = resolveRuntimeDataDir({
    env: {
      BOT_DATA_DIR: '.\\ops-data',
      NODE_ENV: 'development',
      PERSIST_REQUIRE_DB: 'false',
    },
    projectRoot: 'C:\\repo',
    platform: 'win32',
    homedir: 'C:\\Users\\tester',
  });

  assert.equal(result, path.resolve('.\\ops-data'));
});

test('resolveRuntimeDataDir uses external runtime state dir in production', () => {
  const result = resolveRuntimeDataDir({
    env: {
      NODE_ENV: 'production',
      PERSIST_REQUIRE_DB: 'true',
      LOCALAPPDATA: 'C:\\RuntimeState',
    },
    projectRoot: 'C:\\repo',
    platform: 'win32',
    homedir: 'C:\\Users\\tester',
  });

  assert.equal(result, path.join('C:\\RuntimeState', 'SCUMTHPlatform', 'data'));
});

test('resolveRuntimeDataDir uses external runtime state dir when DB-only persistence is enabled', () => {
  const result = resolveRuntimeDataDir({
    env: {
      NODE_ENV: 'development',
      PERSIST_REQUIRE_DB: 'true',
      XDG_STATE_HOME: '/srv/state',
    },
    projectRoot: '/repo',
    platform: 'linux',
    homedir: '/home/tester',
  });

  assert.equal(result, path.join('/srv/state', 'scum-th-platform', 'data'));
});

test('resolveExternalRuntimeDataDir falls back to platform-specific defaults', () => {
  const winResult = resolveExternalRuntimeDataDir({
    env: {},
    platform: 'win32',
    homedir: 'C:\\Users\\tester',
  });
  const linuxResult = resolveExternalRuntimeDataDir({
    env: {},
    platform: 'linux',
    homedir: '/home/tester',
  });

  assert.equal(winResult, path.join('C:\\Users\\tester', 'AppData', 'Local', 'SCUMTHPlatform', 'data'));
  assert.equal(linuxResult, path.join('/home/tester', '.local', 'state', 'scum-th-platform', 'data'));
});
