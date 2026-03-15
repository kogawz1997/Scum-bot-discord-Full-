const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterRowsByTenantScope,
  getAuthTenantId,
  resolveTenantScope,
} = require('../src/admin/adminTenantScope');

test('getAuthTenantId normalizes auth tenant id', () => {
  assert.equal(getAuthTenantId({ tenantId: ' tenant-a ' }), 'tenant-a');
  assert.equal(getAuthTenantId({ tenantId: '' }), null);
  assert.equal(getAuthTenantId(null), null);
});

test('resolveTenantScope requires tenantId when requested by non-tenant auth', () => {
  const result = resolveTenantScope({
    auth: { role: 'owner', tenantId: null },
    requestedTenantId: '',
    required: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.error, 'tenantId is required');
});

test('resolveTenantScope blocks tenant mismatch for scoped auth', () => {
  const result = resolveTenantScope({
    auth: { role: 'admin', tenantId: 'tenant-a' },
    requestedTenantId: 'tenant-b',
    required: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.tenantId, 'tenant-a');
});

test('filterRowsByTenantScope keeps only rows inside auth tenant scope', () => {
  const rows = [
    { tenantId: 'tenant-a', label: 'one' },
    { tenantId: 'tenant-b', label: 'two' },
    { id: 'tenant-a', label: 'three' },
  ];

  const filtered = filterRowsByTenantScope(rows, { tenantId: 'tenant-a' });

  assert.deepEqual(filtered, [
    { tenantId: 'tenant-a', label: 'one' },
    { id: 'tenant-a', label: 'three' },
  ]);
});
