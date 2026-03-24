'use strict';

const os = require('node:os');
const path = require('node:path');

function isTruthy(value, fallback = false) {
  if (value == null || String(value).trim() === '') return fallback;
  const text = String(value).trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

function resolveExternalRuntimeDataDir({
  env = process.env,
  platform = process.platform,
  homedir = os.homedir(),
} = {}) {
  if (platform === 'win32') {
    const localAppData = String(env.LOCALAPPDATA || '').trim()
      || path.join(homedir, 'AppData', 'Local');
    return path.join(localAppData, 'SCUMTHPlatform', 'data');
  }

  const xdgStateHome = String(env.XDG_STATE_HOME || '').trim()
    || path.join(homedir, '.local', 'state');
  return path.join(xdgStateHome, 'scum-th-platform', 'data');
}

function resolveRuntimeDataDir({
  env = process.env,
  projectRoot = path.resolve(__dirname, '..', '..'),
  platform = process.platform,
  homedir = os.homedir(),
} = {}) {
  if (String(env.BOT_DATA_DIR || '').trim()) {
    return path.resolve(String(env.BOT_DATA_DIR).trim());
  }

  const shouldUseExternalDefault =
    isTruthy(env.PERSIST_REQUIRE_DB)
    || String(env.NODE_ENV || '').trim().toLowerCase() === 'production';

  if (!shouldUseExternalDefault) {
    return path.join(projectRoot, 'data');
  }

  return resolveExternalRuntimeDataDir({
    env,
    platform,
    homedir,
  });
}

module.exports = {
  resolveExternalRuntimeDataDir,
  resolveRuntimeDataDir,
};
