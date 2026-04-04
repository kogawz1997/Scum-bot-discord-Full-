const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeAgentRuntimeProfile,
  normalizeAgentRuntimeProfile,
} = require('../src/utils/agentRuntimeProfile');

test('normalizeAgentRuntimeProfile infers sync watcher agents', () => {
  const profile = normalizeAgentRuntimeProfile({
    runtimeKey: 'scum-watcher',
    channel: 'watch',
    meta: {
      capabilities: ['logs', 'telemetry'],
    },
  });

  assert.equal(profile.agentRole, 'sync');
  assert.equal(profile.agentScope, 'sync_only');
  assert.deepEqual(profile.capabilities, ['logs', 'telemetry']);
});

test('normalizeAgentRuntimeProfile infers execute agents from console and delivery signals', () => {
  const profile = normalizeAgentRuntimeProfile({
    runtimeKey: 'console-agent',
    channel: 'delivery',
    meta: {
      capabilities: ['rcon', 'command'],
      serverId: 'server-b',
      guildId: 'guild-b',
    },
  });

  assert.equal(profile.agentRole, 'execute');
  assert.equal(profile.agentScope, 'execute_only');
  assert.equal(profile.serverId, 'server-b');
  assert.equal(profile.guildId, 'guild-b');
});

test('normalizeAgentRuntimeProfile drops legacy hybrid scope from inferred runtime profile', () => {
  const profile = normalizeAgentRuntimeProfile({
    runtimeKey: 'agent-node',
    channel: 'mixed',
    meta: {
      agentRole: 'hybrid',
      agentScope: 'sync_execute',
      agentId: 'agent-77',
      agentLabel: 'Primary bridge',
    },
  });

  assert.equal(profile.agentRole, null);
  assert.equal(profile.agentScope, null);
  assert.equal(profile.agentId, 'agent-77');
  assert.equal(profile.agentLabel, 'Primary bridge');
});

test('mergeAgentRuntimeProfile preserves original meta while adding normalized fields', () => {
  const merged = mergeAgentRuntimeProfile(
    { region: 'ap-southeast', owner: 'ops' },
    {
      agentRole: 'sync',
      agentScope: 'sync_only',
      guildId: 'guild-ops',
      capabilities: ['logs'],
    },
  );

  assert.deepEqual(merged, {
    region: 'ap-southeast',
    owner: 'ops',
    agentRole: 'sync',
    agentScope: 'sync_only',
    guildId: 'guild-ops',
    capabilities: ['logs'],
  });
});
