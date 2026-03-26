const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantServerBotsV4Html,
  createTenantServerBotsV4Model,
} = require('../src/admin/assets/tenant-server-bots-v4.js');

test('tenant server bots v4 model filters sync runtimes and builds diagnostics', () => {
  const model = createTenantServerBotsV4Model({
    tenantConfig: { name: 'SCUM TH Production' },
    overview: { serverCount: 2 },
    agents: [
      { runtimeKey: 'watcher-1', status: 'online', lastSeenAt: '2026-03-26T08:00:00+07:00', meta: { agentRole: 'sync', agentScope: 'sync_only', serverId: 'server-1', capabilities: ['sync', 'config', 'restart'] } },
      { runtimeKey: 'delivery-1', status: 'online', lastSeenAt: '2026-03-26T08:00:00+07:00', meta: { agentRole: 'execute', agentScope: 'execute_only', serverId: 'server-1', capabilities: ['delivery'] } },
    ],
    queueItems: [{}],
    reconcile: { summary: { alerts: 1 } },
  });

  assert.equal(model.header.title, 'Server Bots');
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].name, 'watcher-1');
  assert.equal(model.diagnostics.reconcileAlerts, '1');
});

test('tenant server bots v4 html includes server-bot table and diagnostics', () => {
  const html = buildTenantServerBotsV4Html(createTenantServerBotsV4Model({ tenantConfig: { name: 'Tenant Demo' }, agents: [] }));

  assert.match(html, /Server Bots/);
  assert.match(html, /ตาราง Server Bots/);
  assert.match(html, /ภาระงานและสัญญาณที่ควรดูต่อ/);
  assert.match(html, /Checklist พร้อมใช้งาน/);
});

test('tenant server bots preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-server-bots-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-server-bots-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-server-bots-v4\.js/);
  assert.match(html, /tenantServerBotsV4PreviewRoot/);
});
