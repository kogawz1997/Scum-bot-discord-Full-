'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadMergedEnvFiles } = require('../src/utils/loadEnvFiles');
const { buildSecretRotationReport } = require('../src/utils/secretRotationCheck');

const ROOT_DIR = process.cwd();
const ROOT_ENV_PATH = path.join(ROOT_DIR, '.env');
const PORTAL_ENV_PATH = path.join(
  ROOT_DIR,
  'apps',
  'web-portal-standalone',
  '.env',
);

loadMergedEnvFiles({
  basePath: ROOT_ENV_PATH,
  overlayPath: fs.existsSync(PORTAL_ENV_PATH) ? PORTAL_ENV_PATH : null,
});

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

function printSecretRow(secret) {
  const requirement = secret.required ? 'required' : 'optional';
  const readiness =
    secret.status === 'ready'
      ? 'ready'
      : secret.status === 'unused'
        ? 'unused'
        : secret.status;
  const reloadTargets = secret.reloadTargets.length > 0
    ? secret.reloadTargets.join(', ')
    : 'none';
  console.log(
    `- ${secret.id} [${requirement}] -> ${readiness}; reload: ${reloadTargets}`,
  );
  if (secret.validation.length > 0) {
    console.log(`    validate: ${secret.validation.join(' | ')}`);
  }
  if (secret.note) {
    console.log(`    note: ${secret.note}`);
  }
}

function printReloadRow(entry) {
  console.log(`- ${entry.runtime}: ${entry.secrets.join(', ')}`);
  if (entry.validation.length > 0) {
    console.log(`    validate: ${entry.validation.join(' | ')}`);
  }
}

function run() {
  const report = buildSecretRotationReport(process.env);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  if (report.ok && report.warnings.length === 0) {
    console.log('SECRET_ROTATION_CHECK: PASSED');
  } else if (report.ok) {
    console.log('SECRET_ROTATION_CHECK: PASSED with warnings');
  } else {
    console.error('SECRET_ROTATION_CHECK: FAILED');
  }

  console.log('');
  console.log('Secret Rotation Matrix');
  for (const secret of report.data.secrets || []) {
    printSecretRow(secret);
  }

  console.log('');
  console.log('Runtime Reload Plan');
  for (const entry of report.data.reloadMatrix || []) {
    printReloadRow(entry);
  }

  if (report.warnings.length > 0) {
    console.log('');
    console.log('Warnings');
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Errors');
    for (const error of report.errors) {
      console.log(`- ${error}`);
    }
  }

  console.log('');
  console.log('Recommended follow-up');
  console.log('- Run `npm run doctor` to verify origin/cookie/runtime topology.');
  console.log('- Run `npm run security:check` to verify hardening posture.');
  console.log('- Run `npm run readiness:prod` before reopening production traffic.');

  return report;
}

if (require.main === module) {
  const report = run();
  if (!report.ok) {
    process.exit(1);
  }
}

module.exports = {
  run,
};
