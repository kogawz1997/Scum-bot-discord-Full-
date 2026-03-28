const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantServerBotsV4Html,
  createTenantServerBotsV4Model,
} = require('../src/admin/assets/tenant-server-bots-v4.js');

test('tenant server bots v4 model keeps runtime and discord management context', () => {
  const model = createTenantServerBotsV4Model({
    tenantLabel: 'Codex Test Community',
    activeServer: { id: 'server-alpha', name: 'Alpha Server' },
    servers: [{ id: 'server-alpha', name: 'Alpha Server' }],
    agents: [
      {
        runtimeKey: 'watcher-1',
        status: 'online',
        lastSeenAt: '2026-03-27T10:00:00.000Z',
        meta: {
          agentId: 'agent-sync-1',
          agentRole: 'sync',
          agentScope: 'sync_only',
          serverId: 'server-alpha',
          capabilities: ['sync', 'config', 'restart'],
        },
      },
      {
        runtimeKey: 'delivery-1',
        status: 'online',
        lastSeenAt: '2026-03-27T10:00:00.000Z',
        meta: { agentId: 'agent-delivery-1', agentRole: 'execute', agentScope: 'execute_only', serverId: 'server-alpha' },
      },
    ],
    agentDevices: [
      {
        id: 'device-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        hostname: 'server-bot-host',
        status: 'online',
      },
    ],
    agentCredentials: [
      {
        id: 'cred-1',
        apiKeyId: 'apikey-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        status: 'active',
      },
    ],
    agentProvisioning: [
      {
        id: 'token-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        role: 'sync',
        scope: 'sync_only',
        displayName: 'Server Bot Alpha',
        status: 'pending_activation',
        expiresAt: '2026-03-30T10:00:00.000Z',
      },
    ],
    serverDiscordLinks: [
      {
        id: 'link-1',
        serverId: 'server-alpha',
        guildId: '123456789012345678',
        status: 'active',
        updatedAt: '2026-03-28T09:00:00.000Z',
      },
    ],
    queueItems: [{}],
    deadLetters: [{}],
  });

  assert.equal(model.header.title, 'Server Bot');
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].name, 'watcher-1');
  assert.equal(model.rows[0].deviceId, 'device-1');
  assert.equal(model.rows[0].apiKeyId, 'apikey-1');
  assert.equal(model.tokens[0].tokenId, 'token-1');
  assert.equal(model.discordLinks.length, 1);
});

test('tenant server bots v4 html exposes provisioning, management, and discord mapping hooks', () => {
  const html = buildTenantServerBotsV4Html(createTenantServerBotsV4Model({
    tenantLabel: 'Codex Test Community',
    activeServer: { id: 'server-alpha', name: 'Alpha Server' },
    servers: [{ id: 'server-alpha', name: 'Alpha Server' }],
    agents: [
      {
        runtimeKey: 'watcher-1',
        status: 'online',
        lastSeenAt: '2026-03-27T10:00:00.000Z',
        meta: {
          agentId: 'agent-sync-1',
          agentRole: 'sync',
          agentScope: 'sync_only',
          serverId: 'server-alpha',
          capabilities: ['sync', 'config', 'restart'],
        },
      },
    ],
    agentDevices: [
      {
        id: 'device-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        hostname: 'server-bot-host',
        status: 'online',
      },
    ],
    agentCredentials: [
      {
        id: 'cred-1',
        apiKeyId: 'apikey-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        status: 'active',
      },
    ],
    agentProvisioning: [
      {
        id: 'token-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        role: 'sync',
        scope: 'sync_only',
        displayName: 'Server Bot Alpha',
        status: 'pending_activation',
        expiresAt: '2026-03-30T10:00:00.000Z',
      },
    ],
    serverDiscordLinks: [
      {
        id: 'link-1',
        serverId: 'server-alpha',
        guildId: '123456789012345678',
        status: 'active',
      },
    ],
  }));

  assert.match(html, /Server Bot/);
  assert.match(html, /data-runtime-server-id="server-bots"/);
  assert.match(html, /data-runtime-display-name="server-bots"/);
  assert.match(html, /data-runtime-runtime-key="server-bots"/);
  assert.match(html, /data-runtime-provision-button="server-bots"/);
  assert.match(html, /data-runtime-action="rotate-token"/);
  assert.match(html, /data-runtime-action="revoke-token"/);
  assert.match(html, /data-runtime-action="revoke-device"/);
  assert.match(html, /data-runtime-action="reissue-provision"/);
  assert.match(html, /data-runtime-action="revoke-provision"/);
  assert.match(html, /data-server-discord-link-server/);
  assert.match(html, /data-server-discord-link-guild/);
  assert.match(html, /data-server-discord-link-status/);
  assert.match(html, /data-server-discord-link-create/);
  assert.match(html, /data-server-discord-link-item/);
});

test('tenant server bots v4 guides the user when no server exists yet', () => {
  const html = buildTenantServerBotsV4Html(createTenantServerBotsV4Model({
    tenantLabel: 'Codex Test Community',
    servers: [],
    agents: [],
    agentDevices: [],
    agentCredentials: [],
    agentProvisioning: [],
  }));

  assert.match(html, /data-runtime-empty-kind="missing-server"/);
  assert.match(html, /data-runtime-empty-action="server-bots"/);
  assert.match(html, /#server-status/);
});

test('tenant server bots v4 guides the user to install pending setup tokens', () => {
  const html = buildTenantServerBotsV4Html(createTenantServerBotsV4Model({
    tenantLabel: 'Codex Test Community',
    activeServer: { id: 'server-alpha', name: 'Alpha Server' },
    servers: [{ id: 'server-alpha', name: 'Alpha Server' }],
    agents: [],
    agentDevices: [],
    agentCredentials: [],
    agentProvisioning: [
      {
        id: 'token-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        role: 'sync',
        scope: 'sync_only',
        displayName: 'Server Bot Alpha',
        status: 'pending_activation',
        expiresAt: '2026-03-30T10:00:00.000Z',
      },
    ],
  }));

  assert.match(html, /data-runtime-empty-kind="pending-install"/);
  assert.match(html, /data-runtime-empty-action="server-bots"/);
});

test('tenant server bots preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-server-bots-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-server-bots-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-server-bots-v4\.js/);
  assert.match(html, /tenantServerBotsV4PreviewRoot/);
});
