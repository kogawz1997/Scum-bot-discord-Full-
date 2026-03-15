'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

function runGitHook(hookName) {
  const normalizedHookName = String(hookName || '').trim().toLowerCase();

  if (normalizedHookName === 'pre-commit') {
    runCommand(process.execPath, ['scripts/secret-scan.js', '--staged']);
    runCommand(process.execPath, ['scripts/check-js-syntax.js']);
    runCommand(process.execPath, ['scripts/check-text-encoding.js']);
    return;
  }

  if (normalizedHookName === 'pre-push') {
    runCommand(process.execPath, ['scripts/secret-scan.js']);
    runCommand(process.execPath, [
      '--test',
      'test/runtime-profile.test.js',
      'test/admin-editable-config.test.js',
      'test/check-module-docs.test.js',
      'test/post-deploy-smoke.test.js',
      'test/readiness-gate.test.js',
      'test/portal-runtime.test.js',
      'test/portal-auth-runtime.test.js',
      'test/admin-tenant-scope.test.js',
    ]);
    return;
  }

  throw new Error(`Unsupported git hook: ${hookName}`);
}

if (require.main === module) {
  try {
    runGitHook(process.argv[2]);
  } catch (error) {
    console.error(`[git-hook] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  runGitHook,
};
