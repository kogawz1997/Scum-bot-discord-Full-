const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  getSupportedProfiles,
  normalizeProfile,
  buildProfilePaths,
  buildMergedProfile,
  shouldWritePortalEnv,
  buildProfilePlan,
} = require('../scripts/setup-env-profile.js');

test('setup env profile supports single-host and multi-tenant production aliases', () => {
  const profiles = getSupportedProfiles();
  assert.ok(profiles.includes('single-host-prod'));
  assert.ok(profiles.includes('multi-tenant-prod'));
  assert.ok(profiles.includes('machine-a-control-plane'));
  assert.ok(profiles.includes('machine-b-game-bot'));
  assert.equal(normalizeProfile('SINGLE-HOST-PROD'), 'single-host-prod');
  assert.equal(normalizeProfile('multi-tenant-prod'), 'multi-tenant-prod');
  assert.equal(
    normalizeProfile('machine-a-control-plane'),
    'machine-a-control-plane',
  );
  assert.equal(normalizeProfile('MACHINE-B-GAME-BOT'), 'machine-b-game-bot');
});

test('setup env profile resolves overlay example file names for extended profiles', () => {
  const root = 'C:\\new';
  const singleHost = buildProfilePaths(root, 'single-host-prod');
  const multiTenant = buildProfilePaths(root, 'multi-tenant-prod');
  const machineA = buildProfilePaths(root, 'machine-a-control-plane');
  const machineB = buildProfilePaths(root, 'machine-b-game-bot');
  assert.equal(path.basename(singleHost.overlay), '.env.single-host-prod.example');
  assert.equal(path.basename(multiTenant.overlay), '.env.multi-tenant-prod.example');
  assert.equal(
    path.basename(machineA.overlay),
    '.env.machine-a-control-plane.example',
  );
  assert.equal(
    path.basename(machineB.overlay),
    '.env.machine-b-game-bot.example',
  );
});

test('production-style env overlays keep PostgreSQL runtime defaults explicit', () => {
  const root = 'C:\\new';
  const singleHost = buildMergedProfile(root, 'single-host-prod');
  const multiTenant = buildMergedProfile(root, 'multi-tenant-prod');
  const machineA = buildMergedProfile(root, 'machine-a-control-plane');
  const machineB = buildMergedProfile(root, 'machine-b-game-bot');
  for (const profile of [singleHost, multiTenant, machineA, machineB]) {
    assert.match(profile.content, /DATABASE_PROVIDER=postgresql/);
    assert.match(profile.content, /DATABASE_URL="postgresql:/);
    assert.match(profile.content, /TENANT_DB_TOPOLOGY_MODE=schema-per-tenant/);
  }
});

test('execution-node profile skips player portal env materialization', () => {
  assert.equal(shouldWritePortalEnv('machine-a-control-plane'), true);
  assert.equal(shouldWritePortalEnv('machine-b-game-bot'), false);
  const machineBPlan = buildProfilePlan('machine-b-game-bot');
  assert.equal(machineBPlan.writesPortalEnv, false);
  assert.equal(machineBPlan.portalProfile, null);
});
