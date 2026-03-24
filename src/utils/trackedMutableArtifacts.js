'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const MUTABLE_ROOT_PREFIXES = [
  'data',
  'output',
];

function normalizeRepoPath(filePath) {
  const normalized = String(filePath || '').trim().replace(/\\/g, '/').replace(/^\.\/+/, '');
  return normalized.replace(/^\/+/, '');
}

function isTemporaryPrefix(part) {
  return /^(tmp-|tmp_|temp_)/i.test(part);
}

function classifyTrackedMutableArtifact(filePath) {
  const normalized = normalizeRepoPath(filePath);
  if (!normalized) return null;

  const parts = normalized.split('/').filter(Boolean);
  const first = parts[0] || '';
  if (MUTABLE_ROOT_PREFIXES.includes(first)) {
    return {
      file: normalized,
      reason: `${first}/ contains runtime or mutable artifacts and must not be tracked`,
    };
  }

  if (isTemporaryPrefix(first)) {
    return {
      file: normalized,
      reason: 'temporary audit/proof folders must not be tracked',
    };
  }

  return null;
}

function collectTrackedMutableArtifacts(filePaths = []) {
  return filePaths
    .map((filePath) => classifyTrackedMutableArtifact(filePath))
    .filter(Boolean);
}

function listTrackedMutableArtifacts({
  cwd = process.cwd(),
} = {}) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const filePaths = output
    .split('\0')
    .map((entry) => normalizeRepoPath(entry))
    .filter(Boolean);
  return collectTrackedMutableArtifacts(filePaths);
}

module.exports = {
  classifyTrackedMutableArtifact,
  collectTrackedMutableArtifacts,
  listTrackedMutableArtifacts,
  normalizeRepoPath,
};
