const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyRootFiles,
} = require('../scripts/check-repo-hygiene');

test('classifyRootFiles accepts normal repository root files', () => {
  const findings = classifyRootFiles([
    { name: 'README.md' },
    { name: 'package.json' },
    { name: '.gitignore' },
  ]);

  assert.deepEqual(findings, []);
});

test('classifyRootFiles flags ambiguous txt, temp, and log files in root', () => {
  const findings = classifyRootFiles([
    { name: 'fix.txt' },
    { name: 'tmp-startup.log' },
    { name: 'tmp_capture.png' },
    { name: 'temp_scum_tail.txt' },
  ]);

  assert.equal(findings.length, 4);
  assert.deepEqual(
    findings.map((entry) => entry.ruleId),
    ['root-txt', 'root-temp-prefix', 'root-temp-prefix', 'root-txt'],
  );
});
