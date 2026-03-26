const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantOrdersV4Html,
  createTenantOrdersV4Model,
} = require('../src/admin/assets/tenant-orders-v4.js');

test('tenant orders v4 model builds support-first transaction view', () => {
  const model = createTenantOrdersV4Model({
    me: { tenantId: 'tenant-prod-001' },
    tenantConfig: { name: 'SCUM TH Production' },
    overview: { analytics: { delivery: { purchaseCount30d: 54, successRate: 98 } } },
    purchaseStatusCatalog: { knownStatuses: ['queued', 'delivered'] },
    purchaseLookup: {
      userId: '123',
      status: 'queued',
      items: [{ code: 'PUR-1', itemName: 'Starter Kit', status: 'queued', totalPrice: 100, createdAt: '2026-03-26T08:00:00+07:00' }],
    },
    queueItems: [{}, {}],
    deadLetters: [{}],
    deliveryCase: { purchaseCode: 'PUR-1', purchase: { status: 'queued' }, timeline: [{}], auditRows: [{}] },
  });

  assert.equal(model.header.title, 'คำสั่งซื้อและการส่งของ');
  assert.equal(model.summaryStrip.length, 4);
  assert.equal(model.orders.length, 1);
  assert.equal(model.selectedOrder.code, 'PUR-1');
  assert.ok(model.deliveryCase.actions.length > 0);
});

test('tenant orders v4 html includes table and delivery case workspace', () => {
  const html = buildTenantOrdersV4Html(createTenantOrdersV4Model({ tenantConfig: { name: 'Tenant Demo' }, purchaseLookup: { items: [] } }));

  assert.match(html, /คำสั่งซื้อและการส่งของ/);
  assert.match(html, /ตารางคำสั่งซื้อ/);
  assert.match(html, /Delivery case workspace/);
  assert.match(html, /คำสั่งซื้อที่เลือก/);
});

test('tenant orders preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-orders-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-orders-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-orders-v4\.js/);
  assert.match(html, /tenantOrdersV4PreviewRoot/);
});
