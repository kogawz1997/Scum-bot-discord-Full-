'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_FILES = [
  'src/config/schema.js',
  'src/config/loadEnv.js',
  'src/config/featureFlags.js',
  'src/config/runtimeProfile.js',
  'src/config/adminEditableConfig.js',
  'src/bootstrap/discordRuntime.js',
  'src/bootstrap/adminWebMount.js',
  'src/bootstrap/scumWebhookMount.js',
  'src/bootstrap/gracefulShutdown.js',
  'src/bootstrap/runtimeContainer.js',
  'src/bootstrap/workerQueueRuntime.js',
  'src/bootstrap/deliveryRuntime.js',
  'src/bootstrap/backgroundJobsRuntime.js',
];

function hasModuleDocBlock(sourceText) {
  const header = String(sourceText || '').split(/\r?\n/).slice(0, 8).join('\n');
  return header.includes('/**');
}

function main() {
  const missing = [];
  for (const relativePath of REQUIRED_FILES) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const sourceText = fs.readFileSync(absolutePath, 'utf8');
    if (!hasModuleDocBlock(sourceText)) {
      missing.push(relativePath);
    }
  }

  if (missing.length > 0) {
    console.error('Module documentation header is missing from:');
    for (const item of missing) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log(`OK: module docs headers present (${REQUIRED_FILES.length} files)`);
}

if (require.main === module) {
  main();
}

module.exports = {
  hasModuleDocBlock,
  REQUIRED_FILES,
};
