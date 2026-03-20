const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  getSupportedProfiles,
  normalizeProfile,
  buildProfilePaths,
} = require('../scripts/setup-env-profile.js');

test('setup env profile supports single-host and multi-tenant production aliases', () => {
  const profiles = getSupportedProfiles();
  assert.ok(profiles.includes('single-host-prod'));
  assert.ok(profiles.includes('multi-tenant-prod'));
  assert.equal(normalizeProfile('SINGLE-HOST-PROD'), 'single-host-prod');
  assert.equal(normalizeProfile('multi-tenant-prod'), 'multi-tenant-prod');
});

test('setup env profile resolves overlay example file names for extended profiles', () => {
  const root = 'C:\\new';
  const singleHost = buildProfilePaths(root, 'single-host-prod');
  const multiTenant = buildProfilePaths(root, 'multi-tenant-prod');
  assert.equal(path.basename(singleHost.overlay), '.env.single-host-prod.example');
  assert.equal(path.basename(multiTenant.overlay), '.env.multi-tenant-prod.example');
});
