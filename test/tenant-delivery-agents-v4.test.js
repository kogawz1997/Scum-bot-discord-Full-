const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantDeliveryAgentsV4Html,
  createTenantDeliveryAgentsV4Model,
} = require('../src/admin/assets/tenant-delivery-agents-v4.js');

test('tenant delivery agents v4 model filters execute runtimes and builds readiness view', () => {
  const model = createTenantDeliveryAgentsV4Model({
    tenantConfig: { name: 'SCUM TH Production' },
    agents: [
      { runtimeKey: 'delivery-1', status: 'online', version: '1.4.2', lastSeenAt: '2026-03-26T08:00:00+07:00', meta: { agentRole: 'execute', agentScope: 'execute_only', serverId: 'server-1' } },
      { runtimeKey: 'watcher-1', status: 'online', version: '1.3.0', lastSeenAt: '2026-03-26T08:00:00+07:00', meta: { agentRole: 'sync', agentScope: 'sync_only', serverId: 'server-1' } },
    ],
    queueItems: [{}, {}],
    deadLetters: [{}],
    deliveryRuntime: { status: 'ready', mode: 'agent' },
  });

  assert.equal(model.header.title, 'Delivery Agents');
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].name, 'delivery-1');
  assert.equal(model.readiness.queueCount, '2');
});

test('tenant delivery agents v4 html includes runtime table and readiness section', () => {
  const html = buildTenantDeliveryAgentsV4Html(createTenantDeliveryAgentsV4Model({ tenantConfig: { name: 'Tenant Demo' }, agents: [] }));

  assert.match(html, /Delivery Agents/);
  assert.match(html, /ตาราง Delivery Agents/);
  assert.match(html, /คิวและสถานะรันไทม์ที่กระทบการส่งของ/);
  assert.match(html, /Provisioning checklist/);
});

test('tenant delivery agents preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-delivery-agents-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-delivery-agents-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-delivery-agents-v4\.js/);
  assert.match(html, /tenantDeliveryAgentsV4PreviewRoot/);
});
