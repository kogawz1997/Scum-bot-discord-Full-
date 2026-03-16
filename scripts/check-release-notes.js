'use strict';

const fs = require('node:fs');
const path = require('node:path');

function main() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = String(packageJson.version || '').trim();
  if (!version) {
    console.error('[release-notes] package.json version is missing');
    process.exit(1);
  }

  const releaseNotePath = path.resolve(process.cwd(), 'docs', 'releases', `v${version}.md`);
  if (!fs.existsSync(releaseNotePath)) {
    console.error(`[release-notes] missing release notes: docs/releases/v${version}.md`);
    process.exit(1);
  }

  console.log(`[release-notes] found docs/releases/v${version}.md`);
}

main();
