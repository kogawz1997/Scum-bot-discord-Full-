const test = require('node:test');
const assert = require('node:assert/strict');

const { prisma } = require('../src/prisma');
const {
  createCheckoutSession,
  createInvoiceDraft,
  ensureBillingCustomer,
  ensurePlatformBillingLifecycleTables,
  finalizeCheckoutSession,
  getBillingProviderConfigSummary,
  getCheckoutSessionByToken,
  listBillingInvoices,
  listBillingPaymentAttempts,
  recordPaymentAttempt,
  recordSubscriptionEvent,
} = require('../src/services/platformBillingLifecycleService');

async function cleanupBillingFixtures() {
  await ensurePlatformBillingLifecycleTables(prisma);
  await prisma.$executeRawUnsafe("DELETE FROM platform_billing_payment_attempts WHERE tenantId = 'tenant-billing-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_billing_invoices WHERE tenantId = 'tenant-billing-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_subscription_events WHERE tenantId = 'tenant-billing-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_billing_customers WHERE tenantId = 'tenant-billing-test'").catch(() => null);
  await prisma.platformSubscription.deleteMany({
    where: { tenantId: 'tenant-billing-test' },
  }).catch(() => null);
  await prisma.platformTenant.deleteMany({
    where: { id: 'tenant-billing-test' },
  }).catch(() => null);
}

test('platform billing lifecycle service records customer, invoice, payment, and subscription events', async (t) => {
  await cleanupBillingFixtures();
  t.after(cleanupBillingFixtures);

  const customer = await ensureBillingCustomer({
    tenantId: 'tenant-billing-test',
    email: 'billing@example.com',
    displayName: 'Billing Test',
  });
  assert.equal(customer.ok, true);
  assert.equal(String(customer.customer?.tenantId || ''), 'tenant-billing-test');

  const invoice = await createInvoiceDraft({
    tenantId: 'tenant-billing-test',
    subscriptionId: 'sub-billing-test',
    customerId: customer.customer.id,
    amountCents: 490000,
    currency: 'THB',
    status: 'open',
  });
  assert.equal(invoice.ok, true);
  assert.equal(String(invoice.invoice?.status || ''), 'open');

  const attempt = await recordPaymentAttempt({
    tenantId: 'tenant-billing-test',
    invoiceId: invoice.invoice.id,
    provider: 'manual',
    status: 'pending',
    amountCents: 490000,
    currency: 'THB',
  });
  assert.equal(attempt.ok, true);

  const event = await recordSubscriptionEvent({
    tenantId: 'tenant-billing-test',
    subscriptionId: 'sub-billing-test',
    eventType: 'subscription.created',
    billingStatus: 'active',
    actor: 'test-suite',
    payload: { amountCents: 490000 },
  });
  assert.equal(event.ok, true);

  const invoices = await listBillingInvoices({
    tenantId: 'tenant-billing-test',
    limit: 10,
  });
  const attempts = await listBillingPaymentAttempts({
    tenantId: 'tenant-billing-test',
    limit: 10,
  });
  assert.equal(invoices.length, 1);
  assert.equal(attempts.length, 1);

  const previousProvider = process.env.PLATFORM_BILLING_PROVIDER;
  process.env.PLATFORM_BILLING_PROVIDER = 'platform_local';
  const providerSummary = getBillingProviderConfigSummary();
  process.env.PLATFORM_BILLING_PROVIDER = previousProvider;
  assert.equal(providerSummary.provider, 'platform_local');
});

test('platform billing lifecycle service creates and finalizes a checkout session', async (t) => {
  await cleanupBillingFixtures();
  t.after(cleanupBillingFixtures);

  await prisma.platformTenant.create({
    data: {
      id: 'tenant-billing-test',
      slug: 'tenant-billing-test',
      name: 'Billing Checkout Test',
    },
  });

  await prisma.platformSubscription.create({
    data: {
      id: 'sub-billing-checkout',
      tenantId: 'tenant-billing-test',
      planId: 'trial-14d',
      billingCycle: 'trial',
      status: 'trialing',
      amountCents: 0,
      currency: 'THB',
    },
  });

  const customer = await ensureBillingCustomer({
    tenantId: 'tenant-billing-test',
    email: 'checkout@example.com',
    displayName: 'Checkout Test',
  });

  const session = await createCheckoutSession({
    tenantId: 'tenant-billing-test',
    subscriptionId: 'sub-billing-checkout',
    customerId: customer.customer.id,
    planId: 'platform-starter',
    packageId: 'BOT_LOG_DELIVERY',
    billingCycle: 'monthly',
    amountCents: 490000,
    currency: 'THB',
  });

  assert.equal(session.ok, true);
  assert.equal(String(session.session?.status || ''), 'requires_action');
  assert.ok(String(session.session?.sessionToken || '').startsWith('chk_'));

  const fetched = await getCheckoutSessionByToken({
    sessionToken: session.session.sessionToken,
    tenantId: 'tenant-billing-test',
  });
  assert.equal(String(fetched?.invoiceId || ''), String(session.invoice?.id || ''));

  const finalized = await finalizeCheckoutSession({
    sessionToken: session.session.sessionToken,
    tenantId: 'tenant-billing-test',
    action: 'paid',
  });

  assert.equal(finalized.ok, true);
  assert.equal(String(finalized.invoice?.status || ''), 'paid');
  assert.equal(String(finalized.subscription?.status || ''), 'active');
  assert.equal(String(finalized.subscription?.planId || ''), 'platform-starter');
});
