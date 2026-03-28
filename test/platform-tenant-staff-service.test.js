const test = require('node:test');
const assert = require('node:assert/strict');

const { prisma } = require('../src/prisma');
const {
  ensurePlatformIdentityTables,
} = require('../src/services/platformIdentityService');
const {
  inviteTenantStaff,
  listTenantStaffMemberships,
  revokeTenantStaffMembership,
  updateTenantStaffRole,
} = require('../src/services/platformTenantStaffService');

async function cleanupTenantStaffFixtures() {
  await ensurePlatformIdentityTables(prisma);
  await prisma.$executeRawUnsafe(`
    DELETE FROM platform_memberships
    WHERE tenantId = 'tenant-staff-test'
  `).catch(() => null);
  await prisma.$executeRawUnsafe(`
    DELETE FROM platform_user_identities
    WHERE provider = 'email_staff'
      AND providerUserId = 'staff@example.com'
  `).catch(() => null);
  await prisma.$executeRawUnsafe(`
    DELETE FROM platform_users
    WHERE primaryEmail = 'staff@example.com'
  `).catch(() => null);
}

test('platform tenant staff service invites, lists, updates, and revokes tenant staff', async (t) => {
  await cleanupTenantStaffFixtures();
  t.after(cleanupTenantStaffFixtures);

  const invited = await inviteTenantStaff({
    tenantId: 'tenant-staff-test',
    email: 'staff@example.com',
    displayName: 'Staff Example',
    role: 'manager',
    locale: 'th',
  }, 'test-suite');

  assert.equal(invited.ok, true);
  assert.equal(String(invited.staff?.tenantId || ''), 'tenant-staff-test');
  assert.equal(String(invited.staff?.role || ''), 'manager');
  assert.equal(String(invited.staff?.status || ''), 'invited');

  const listed = await listTenantStaffMemberships('tenant-staff-test');
  assert.equal(listed.length, 1);
  assert.equal(String(listed[0]?.user?.email || ''), 'staff@example.com');

  const updated = await updateTenantStaffRole({
    tenantId: 'tenant-staff-test',
    membershipId: invited.staff.membershipId,
    role: 'admin',
    status: 'active',
  }, 'test-suite');

  assert.equal(updated.ok, true);
  assert.equal(String(updated.staff?.role || ''), 'admin');
  assert.equal(String(updated.staff?.status || ''), 'active');

  const revoked = await revokeTenantStaffMembership({
    tenantId: 'tenant-staff-test',
    membershipId: invited.staff.membershipId,
    revokeReason: 'test cleanup',
  }, 'test-suite');

  assert.equal(revoked.ok, true);
  assert.equal(String(revoked.staff?.status || ''), 'revoked');
  assert.ok(revoked.staff?.revokedAt);
});
