'use strict';

const { spawnSync } = require('node:child_process');

const args = new Set(process.argv.slice(2));
const isWindows = process.platform === 'win32';
const isProduction = args.has('--production');
const withAudit = args.has('--with-audit');
const skipSmoke = args.has('--skip-smoke');

if (args.has('--help') || args.has('-h')) {
  console.log('Usage: node scripts/readiness-gate.js [--production] [--with-audit] [--skip-smoke]');
  console.log('');
  console.log('Runs readiness checks in sequence and exits non-zero on first failure.');
  console.log('');
  console.log('Options:');
  console.log('  --production  Include production doctor checks');
  console.log('  --with-audit  Include npm audit --omit=dev');
  console.log('  --skip-smoke  Skip post-deploy smoke checks in production mode');
  process.exit(0);
}

function runStep(label, command, commandArgs) {
  console.log(`\n[readiness] ${label}`);
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`[readiness] FAILED at: ${label}`);
    process.exit(result.status || 1);
  }
}

function runNpm(commandArgs) {
  if (isWindows) {
    runStep(`npm ${commandArgs.join(' ')}`, 'cmd', ['/c', 'npm', ...commandArgs]);
    return;
  }
  runStep(`npm ${commandArgs.join(' ')}`, 'npm', commandArgs);
}

function buildScriptSequence(options = {}) {
  const scripts = [
    'check',
    'security:check',
    'doctor',
    'doctor:topology',
    'doctor:web-standalone',
  ];
  if (options.isProduction) {
    scripts.push('doctor:topology:prod');
    scripts.push('doctor:web-standalone:prod');
    if (!options.skipSmoke) {
      scripts.push('smoke:postdeploy');
    }
  }
  return scripts;
}

function main() {
  const scripts = buildScriptSequence({
    isProduction,
    skipSmoke,
  });

  for (const scriptName of scripts) {
    runNpm(['run', scriptName]);
  }

  if (withAudit) {
    runNpm(['audit', '--omit=dev']);
  }

  console.log('\n[readiness] PASS');
}

if (require.main === module) {
  main();
}

module.exports = {
  buildScriptSequence,
};
