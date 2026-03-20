'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  createValidationCheck,
  createValidationReport,
} = require('../src/utils/runtimeStatus');

const ROOT_DIR = process.cwd();
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

const ROOT_FILE_RULES = [
  {
    id: 'root-txt',
    pattern: /\.txt$/i,
    message:
      'Ambiguous .txt files do not belong in the repository root; move them into docs/evidence or artifacts/quarantine.',
  },
  {
    id: 'root-temp-prefix',
    pattern: /^(tmp-|temp_)/i,
    message:
      'Temporary/proof files should not live in the repository root; move them into artifacts/ or a dedicated evidence folder.',
  },
  {
    id: 'root-log',
    pattern: /\.log$/i,
    message:
      'Runtime logs should not live in the repository root; store them under logs/ or artifacts/.',
  },
];

function classifyRootFiles(entries) {
  const findings = [];

  for (const entry of entries) {
    const name = String(entry?.name || '').trim();
    if (!name) continue;
    for (const rule of ROOT_FILE_RULES) {
      if (rule.pattern.test(name)) {
        findings.push({
          file: name,
          ruleId: rule.id,
          message: rule.message,
        });
        break;
      }
    }
  }

  return findings;
}

function collectRootFileEntries(rootDir = ROOT_DIR) {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({ name: entry.name }));
}

function run() {
  const findings = classifyRootFiles(collectRootFileEntries(ROOT_DIR));
  const errors = findings.map((finding) => `${finding.file}: ${finding.message}`);
  const report = createValidationReport({
    kind: 'repo-hygiene',
    checks: [
      createValidationCheck('repository root hygiene', {
        ok: findings.length === 0,
        detail: findings.length === 0
          ? 'root file layout is clean'
          : `${findings.length} root file issue(s) found`,
        data: {
          findingCount: findings.length,
        },
      }),
    ],
    errors,
    warnings: [],
    data: {
      findings,
      rootDir: ROOT_DIR,
    },
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  if (findings.length === 0) {
    console.log('REPO_HYGIENE: PASSED');
    return report;
  }

  console.error('REPO_HYGIENE: FAILED');
  for (const finding of findings) {
    console.error(`ERROR: ${finding.file} -> ${finding.message}`);
  }
  return report;
}

if (require.main === module) {
  const report = run();
  if (!report.ok) {
    process.exit(1);
  }
}

module.exports = {
  ROOT_FILE_RULES,
  classifyRootFiles,
  collectRootFileEntries,
  run,
};
