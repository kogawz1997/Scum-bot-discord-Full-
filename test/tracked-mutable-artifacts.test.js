const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyTrackedMutableArtifact,
  collectTrackedMutableArtifacts,
  normalizeRepoPath,
} = require('../src/utils/trackedMutableArtifacts');

test('normalizeRepoPath converts Windows separators and trims prefixes', () => {
  assert.equal(normalizeRepoPath('.\\data\\runtime.json'), 'data/runtime.json');
  assert.equal(normalizeRepoPath('/output/report.json'), 'output/report.json');
});

test('classifyTrackedMutableArtifact flags tracked runtime data roots', () => {
  assert.deepEqual(classifyTrackedMutableArtifact('data/admin-request-log.json'), {
    file: 'data/admin-request-log.json',
    reason: 'data/ contains runtime or mutable artifacts and must not be tracked',
  });
  assert.deepEqual(classifyTrackedMutableArtifact('output/playwright/capture.png'), {
    file: 'output/playwright/capture.png',
    reason: 'output/ contains runtime or mutable artifacts and must not be tracked',
  });
});

test('classifyTrackedMutableArtifact flags tracked temporary roots', () => {
  assert.deepEqual(classifyTrackedMutableArtifact('tmp_audit_20260324/report.json'), {
    file: 'tmp_audit_20260324/report.json',
    reason: 'temporary audit/proof folders must not be tracked',
  });
});

test('collectTrackedMutableArtifacts ignores normal source files', () => {
  const result = collectTrackedMutableArtifacts([
    'src/bot.js',
    'docs/README.md',
    'data/admin-log.json',
    'tmp_capture/report.json',
  ]);

  assert.deepEqual(result, [
    {
      file: 'data/admin-log.json',
      reason: 'data/ contains runtime or mutable artifacts and must not be tracked',
    },
    {
      file: 'tmp_capture/report.json',
      reason: 'temporary audit/proof folders must not be tracked',
    },
  ]);
});
