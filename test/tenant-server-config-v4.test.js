const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantServerConfigV4Html,
  createTenantServerConfigV4Model,
} = require('../src/admin/assets/tenant-server-config-v4.js');

test('tenant server config v4 model summarizes draft changes and config sections', () => {
  const model = createTenantServerConfigV4Model({
    me: { tenantId: 'tenant-prod-001' },
    tenantConfig: {
      name: 'SCUM TH Production',
      updatedAt: '2026-03-26T08:00:00+07:00',
      featureFlags: { bot_log: true },
      configPatch: { maxPlayers: 50, restartGraceMinutes: 5 },
      portalEnvPatch: { publicTheme: 'scum-dark' },
    },
    draft: {
      featureFlags: { bot_log: true, shop_module: true },
      configPatch: { maxPlayers: 64, restartGraceMinutes: 10 },
      portalEnvPatch: { publicTheme: 'scum-dark' },
    },
  });

  assert.equal(model.header.title, 'การตั้งค่าเซิร์ฟเวอร์');
  assert.equal(model.sections.length, 4);
  assert.equal(model.editors.length, 3);
  assert.ok(model.summaryCards.some((item) => item.value.includes('การเปลี่ยนแปลง')));
  assert.ok(model.rightRail.length >= 3);
});

test('tenant server config v4 html includes section map and editor panels', () => {
  const html = buildTenantServerConfigV4Html(createTenantServerConfigV4Model({
    me: { tenantId: 'tenant-demo' },
    tenantConfig: { name: 'Tenant Demo', featureFlags: {}, configPatch: {}, portalEnvPatch: {} },
  }));

  assert.match(html, /การตั้งค่าเซิร์ฟเวอร์/);
  assert.match(html, /โครงหมวดการตั้งค่า/);
  assert.match(html, /Feature Flags/);
  assert.match(html, /Config Patch/);
  assert.match(html, /Portal Env Patch/);
});

test('tenant server config preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-server-config-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-server-config-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-server-config-v4\.js/);
  assert.match(html, /tenantServerConfigV4PreviewRoot/);
});
