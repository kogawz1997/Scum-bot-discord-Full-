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
        channel: 'beta',
        meta: {
          agentId: 'agent-sync-1',
          agentRole: 'sync',
          agentScope: 'sync_only',
          serverId: 'server-alpha',
          capabilities: ['sync', 'config', 'restart'],
          minimumVersion: '2.1.0',
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
    agentSessions: [
      {
        id: 'session-1',
        sessionId: 'session-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        displayName: 'Server Bot Alpha',
        role: 'sync',
        scope: 'sync_only',
        status: 'online',
        hostname: 'server-bot-host',
        version: '2.0.0',
        heartbeatAt: '2026-03-27T10:05:00.000Z',
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

  assert.match(model.header.title, /บอตเซิร์ฟเวอร์|Server Bot/);
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].name, 'watcher-1');
  assert.equal(model.rows[0].deviceId, 'device-1');
  assert.equal(model.rows[0].apiKeyId, 'apikey-1');
  assert.equal(model.rows[0].machine, 'server-bot-host');
  assert.equal(model.rows[0].version, '2.0.0');
  assert.equal(model.rows[0].channel, 'beta');
  assert.equal(model.rows[0].versionWatchTone, 'danger');
  assert.equal(model.rows[0].versionWatchLabel, 'Upgrade to 2.1.0');
  assert.equal(model.rows[0].bindingTone, 'success');
  assert.equal(model.tokens[0].tokenId, 'token-1');
  assert.equal(model.probeReadiness.restartConfigured, false);
  assert.equal(model.discordLinks.length, 1);
  assert.equal(model.history.length, 1);
  assert.equal(model.fleetWatch.items[0].value, '1');
  assert.equal(model.fleetWatch.items[1].value, '0');
});

test('tenant server bots v4 model falls back to session details and latest error', () => {
  const model = createTenantServerBotsV4Model({
    tenantLabel: 'Codex Test Community',
    activeServer: { id: 'server-alpha', name: 'Alpha Server' },
    servers: [{ id: 'server-alpha', name: 'Alpha Server' }],
    agents: [
      {
        runtimeKey: 'watcher-1',
        status: 'offline',
        meta: {
          agentId: 'agent-sync-1',
          agentRole: 'sync',
          agentScope: 'sync_only',
          serverId: 'server-alpha',
          capabilities: ['sync'],
        },
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
    agentSessions: [
      {
        id: 'session-1',
        sessionId: 'session-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        role: 'sync',
        scope: 'sync_only',
        status: 'offline',
        hostname: 'server-bot-from-session',
        version: '2.1.0',
        heartbeatAt: '2026-03-27T10:05:00.000Z',
        metadata: { lastError: 'Config path unavailable' },
      },
    ],
  });

  assert.equal(model.rows[0].machine, 'server-bot-from-session');
  assert.equal(model.rows[0].version, '2.1.0');
  assert.match(model.rows[0].lastSeenAt, /2026|Mar|มี\.ค\./);
  assert.equal(model.rows[0].manageNote, 'Config path unavailable');
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
    agentSessions: [
      {
        id: 'session-1',
        sessionId: 'session-1',
        agentId: 'agent-sync-1',
        serverId: 'server-alpha',
        runtimeKey: 'watcher-1',
        displayName: 'Server Bot Alpha',
        role: 'sync',
        scope: 'sync_only',
        status: 'online',
        hostname: 'server-bot-host',
        version: '2.0.0',
        heartbeatAt: '2026-03-27T10:05:00.000Z',
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
    __provisioningResult: {
      'server-bots': {
        instructions: {
          title: 'Server Bot installer ready',
          detail: 'Download the installer package for the target machine.',
          downloads: [
            { key: 'install-ps1', label: 'Download install script (.ps1)' },
            { key: 'quick-install-cmd', label: 'Download quick install (.cmd)' },
          ],
        },
      },
    },
  }));

  assert.match(html, /บอตเซิร์ฟเวอร์|Server Bot/);
  assert.match(html, /data-runtime-fleet-watch="server-bots"/);
  assert.match(html, /Fleet watch/);
  assert.match(html, /data-runtime-server-id="server-bots"/);
  assert.match(html, /data-runtime-display-name="server-bots"/);
  assert.match(html, /data-runtime-runtime-key="server-bots"/);
  assert.match(html, /data-runtime-provision-button="server-bots"/);
  assert.match(html, /data-runtime-action="rotate-token"/);
  assert.match(html, /data-runtime-action="revoke-token"/);
  assert.match(html, /data-runtime-action="revoke-device"/);
  assert.match(html, /data-runtime-action="revoke-runtime"/);
  assert.match(html, /data-runtime-action="reissue-provision"/);
  assert.match(html, /data-runtime-action="revoke-provision"/);
  assert.match(html, /data-runtime-download-kind="server-bots"/);
  assert.match(html, /data-runtime-download-key="install-ps1"/);
  assert.match(html, /href="#server-bots-history"/);
  assert.match(html, /ดาวน์โหลดสคริปต์ติดตั้ง \(\.ps1\)|Download install script \(\.ps1\)/);
  assert.match(html, /กิจกรรมล่าสุดของบอต|Recent bot activity/);
  assert.match(html, /กติกาการผูกเครื่อง|Binding rule/);
  assert.match(html, /หมุนคีย์บอตใหม่|Rotate bot key/);
  assert.match(html, /เพิกถอนสิทธิ์บอต|Revoke bot access/);
  assert.match(html, /data-server-discord-link-server/);
  assert.match(html, /data-server-discord-link-guild/);
  assert.match(html, /data-server-discord-link-status/);
  assert.match(html, /data-server-discord-link-create/);
  assert.match(html, /data-server-discord-link-item/);
  assert.match(html, /เครื่องมือทดสอบบอต|Bot test actions/);
  assert.match(html, /ยังต้องตั้งคำสั่งรีสตาร์ต|Restart probe needs restart template/);
  assert.match(html, />ทดสอบการซิงก์<|>Test sync</);
  assert.match(html, />ทดสอบการอ่านค่าตั้งค่า<|>Test config access</);
  assert.match(html, />ทดสอบความพร้อมรีสตาร์ต<|>Test restart</);
  assert.match(html, />เวอร์ชัน<|>Version</);
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
  assert.match(html, />Open server</);
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
