const test = require('node:test');
const assert = require('node:assert/strict');

const { prisma } = require('../src/prisma');
const { createSubscription } = require('../src/services/platformService');
const { ensurePlatformBillingLifecycleTables } = require('../src/services/platformBillingLifecycleService');

async function cleanupFixtures() {
  await ensurePlatformBillingLifecycleTables(prisma);
  await prisma.$executeRawUnsafe("DELETE FROM platform_billing_payment_attempts WHERE tenantId = 'tenant-sub-billing-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_billing_invoices WHERE tenantId = 'tenant-sub-billing-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_subscription_events WHERE tenantId = 'tenant-sub-billing-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_billing_customers WHERE tenantId = 'tenant-sub-billing-test'").catch(() => null);
  await prisma.platformSubscription.deleteMany({
    where: { tenantId: 'tenant-sub-billing-test' },
  }).catch(() => null);
  await prisma.platformTenant.deleteMany({
    where: { id: 'tenant-sub-billing-test' },
  }).catch(() => null);
}

test('createSubscription provisions billing customer and invoice context', async (t) => {
  await cleanupFixtures();
  t.after(cleanupFixtures);

  await prisma.platformTenant.create({
    data: {
      id: 'tenant-sub-billing-test',
      slug: 'tenant-sub-billing-test',
      name: 'Tenant Subscription Billing Test',
      ownerEmail: 'owner-billing@test.local',
      ownerName: 'Owner Billing',
    },
  });

  const result = await createSubscription({
    tenantId: 'tenant-sub-billing-test',
    planId: 'platform-starter',
    billingCycle: 'monthly',
    status: 'active',
    amountCents: 490000,
    currency: 'THB',
  }, 'test-suite');

  assert.equal(result.ok, true);
  assert.equal(String(result.billing?.customer?.tenantId || ''), 'tenant-sub-billing-test');
  assert.equal(String(result.billing?.invoice?.status || ''), 'open');
});
