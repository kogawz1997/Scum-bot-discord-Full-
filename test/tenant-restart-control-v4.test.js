const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantRestartControlV4Html,
  createTenantRestartControlV4Model,
} = require('../src/admin/assets/tenant-restart-control-v4.js');

test('tenant restart control v4 model builds blockers and mode cards', () => {
  const model = createTenantRestartControlV4Model({
    tenantConfig: { name: 'SCUM TH Production' },
    serverStatus: 'ready',
    deliveryRuntime: { status: 'degraded', mode: 'agent' },
    queueItems: [{}, {}],
    deadLetters: [{}],
    serverBotReady: false,
    restartHistory: [{ at: '2026-03-26T08:00:00+07:00', mode: 'safe-restart', result: 'success', actor: 'owner' }],
  });

  assert.equal(model.header.title, 'Restart Control');
  assert.equal(model.modeCards.length, 5);
  assert.ok(model.blockers.length >= 3);
  assert.equal(model.history.length, 1);
});

test('tenant restart control v4 html includes mode grid and blockers', () => {
  const html = buildTenantRestartControlV4Html(createTenantRestartControlV4Model({ tenantConfig: { name: 'Tenant Demo' } }));

  assert.match(html, /Restart Control/);
  assert.match(html, /เลือกโหมดรีสตาร์ตที่เหมาะกับสถานการณ์/);
  assert.match(html, /สิ่งที่ควรเคลียร์ก่อน restart/);
  assert.match(html, /Checklist ก่อน restart/);
});

test('tenant restart control preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-restart-control-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-restart-control-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-restart-control-v4\.js/);
  assert.match(html, /tenantRestartControlV4PreviewRoot/);
});
