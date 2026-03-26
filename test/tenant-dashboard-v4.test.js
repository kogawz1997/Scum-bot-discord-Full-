const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantDashboardV4Html,
  createTenantDashboardV4Model,
} = require('../src/admin/assets/tenant-dashboard-v4.js');

test('tenant dashboard v4 model maps legacy tenant state into operator-first content', () => {
  const model = createTenantDashboardV4Model({
    me: { tenantId: 'tenant-prod-001', role: 'tenant_admin' },
    tenantConfig: { name: 'SCUM TH Production' },
    overview: {
      serverStatus: 'online',
      analytics: { delivery: { purchaseCount30d: 54, successRate: 98, lastSyncAt: '2026-03-26T08:00:00+07:00' } },
    },
    subscriptions: [{ packageName: 'FULL_OPTION', status: 'active' }],
    agents: [{ role: 'execute', status: 'online' }, { role: 'sync', status: 'warning' }],
    queueItems: [{ id: 'queue-1' }, { id: 'queue-2' }],
    deadLetters: [{ id: 'dead-1' }],
    reconcile: { summary: { anomalies: 3, abuseFindings: 1 } },
    notifications: [{ severity: 'warning', title: 'Sync delayed', createdAt: '2026-03-26T08:30:00+07:00' }],
    quota: { quotas: { apiKeys: { used: 1, limit: 5 }, webhooks: { used: 2, limit: 10 }, agentRuntimes: { used: 2, limit: 3 } } },
    players: [{ steamId: '1' }, {}],
    shopItems: [{ id: '1' }, { id: '2' }],
  });

  assert.equal(model.header.title, 'SCUM TH Production');
  assert.equal(model.kpis.length, 6);
  assert.equal(model.taskGroups.length, 3);
  assert.ok(model.issues.some((item) => item.title.includes('dead-letter')));
  assert.ok(model.contextBlocks.some((item) => item.label === 'สถานะแพ็กเกจ'));
  assert.ok(model.railCards.length >= 3);
});

test('tenant dashboard v4 html includes shell, task groups, and issue center', () => {
  const html = buildTenantDashboardV4Html(createTenantDashboardV4Model({
    me: { tenantId: 'tenant-demo' },
    tenantConfig: { name: 'Tenant Demo' },
  }));

  assert.match(html, /tdv4-topbar/);
  assert.match(html, /เซิร์ฟเวอร์และสุขภาพระบบ/);
  assert.match(html, /ปัญหาที่กระทบงานประจำวัน/);
  assert.match(html, /ลำดับเหตุการณ์ที่เกี่ยวข้องกับ tenant นี้/);
});

test('tenant dashboard v4 preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-dashboard-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-dashboard-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-dashboard-v4\.js/);
  assert.match(html, /tenantDashboardV4PreviewRoot/);
  assert.match(html, /__TENANT_DASHBOARD_V4_SAMPLE__/);
});
