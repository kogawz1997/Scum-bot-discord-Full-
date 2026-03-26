const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantServerStatusV4Html,
  createTenantServerStatusV4Model,
} = require('../src/admin/assets/tenant-server-status-v4.js');

test('tenant server status v4 model summarizes runtime, sync, and queue health', () => {
  const model = createTenantServerStatusV4Model({
    me: { tenantId: 'tenant-prod-001' },
    tenantConfig: { name: 'SCUM TH Production' },
    overview: {
      serverStatus: 'online',
      analytics: { delivery: { purchaseCount30d: 44, successRate: 94, lastSyncAt: '2026-03-26T08:00:00+07:00' } },
    },
    agents: [{ role: 'execute', status: 'online' }, { role: 'sync', status: 'warning' }],
    queueItems: [{}, {}, {}],
    deadLetters: [{}],
    reconcile: { lastRunAt: '2026-03-26T08:15:00+07:00', summary: { anomalies: 2, abuseFindings: 0 } },
    notifications: [{ severity: 'warning', title: 'Sync delayed', createdAt: '2026-03-26T08:20:00+07:00' }],
    deliveryRuntime: { status: 'degraded', mode: 'managed', updatedAt: '2026-03-26T08:22:00+07:00' },
  });

  assert.equal(model.header.title, 'สถานะเซิร์ฟเวอร์');
  assert.equal(model.statusStrip.length, 5);
  assert.equal(model.runtimePanels.length, 2);
  assert.ok(model.incidentRows.some((item) => item.title.includes('dead-letter') || item.title.includes('ผิดปกติ')));
});

test('tenant server status v4 html includes status strip and incident summary', () => {
  const html = buildTenantServerStatusV4Html(createTenantServerStatusV4Model({
    me: { tenantId: 'tenant-demo' },
    tenantConfig: { name: 'Tenant Demo' },
  }));

  assert.match(html, /สถานะเซิร์ฟเวอร์/);
  assert.match(html, /สรุปเหตุขัดข้องของ tenant นี้/);
  assert.match(html, /ความพร้อมของรันไทม์/);
  assert.match(html, /กิจกรรมและเหตุล่าสุด/);
});

test('tenant server status preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-server-status-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-server-status-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-server-status-v4\.js/);
  assert.match(html, /tenantServerStatusV4PreviewRoot/);
});
