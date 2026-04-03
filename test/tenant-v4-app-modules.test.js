const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readTenantAppSource() {
  return fs.readFileSync(path.join(__dirname, '..', 'src', 'admin', 'assets', 'tenant-v4-app.js'), 'utf8');
}

test('tenant v4 app wires the modules page controls into the tenant config route', () => {
  const source = readTenantAppSource();

  assert.match(source, /function wireModulesPage\(renderState, surfaceState\)/);
  assert.match(source, /window\.TenantModulesRuntime/);
  assert.match(source, /\[data-tenant-modules-save\]/);
  assert.match(source, /\[data-tenant-modules-reset\]/);
  assert.match(source, /\[data-module-toggle\]\[data-module-feature-key\]/);
  assert.match(source, /apiRequest\('\/admin\/api\/platform\/tenant-config'/);
  assert.match(source, /updateScope:\s*'modules'/);
  assert.match(source, /featureFlags:\s*nextFeatureFlags/);
});

test('tenant v4 app keeps dependency validation and reset affordances on the modules page', () => {
  const source = readTenantAppSource();

  assert.match(source, /computeModuleSaveState\(renderState\)/);
  assert.match(source, /dependencyIssues\.length > 0/);
  assert.match(source, /data-module-depends-on/);
  assert.match(source, /toggle\.checked = packageEnabled/);
  assert.match(source, /Save/);
});

test('tenant console html loads the extracted modules runtime before the app shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'admin', 'tenant-console.html'), 'utf8');

  assert.match(html, /tenant-modules-v4\.js\?v=/);
  assert.match(html, /tenant-modules-runtime\.js\?v=20260404-modules-runtime-1/);
  assert.match(html, /tenant-v4-app\.js\?v=/);
});
