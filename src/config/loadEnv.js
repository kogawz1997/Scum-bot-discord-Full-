'use strict';

/** Shared dotenv loader for runtime entrypoints. */

const path = require('node:path');
const dotenv = require('dotenv');

function resolveRuntimeEnvPath(customPath) {
  return path.resolve(
    String(customPath || path.join(process.cwd(), '.env')).trim()
      || path.join(process.cwd(), '.env'),
  );
}

function loadRuntimeEnv(options = {}) {
  const envPath = resolveRuntimeEnvPath(options.path);
  const result = dotenv.config({
    path: envPath,
    override: options.override === true,
  });
  return {
    path: envPath,
    loaded: !result.error,
    error: result.error || null,
    parsed: result.parsed || {},
  };
}

module.exports = {
  loadRuntimeEnv,
  resolveRuntimeEnvPath,
};
