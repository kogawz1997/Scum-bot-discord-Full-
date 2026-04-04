const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTenantBillingV4Model,
  buildTenantBillingV4Html,
} = require('../src/admin/assets/tenant-billing-v4.js');

test('tenant billing v4 model summarizes current subscription and upgrade options', () => {
  const model = createTenantBillingV4Model({
    tenantConfig: { name: 'Tenant Demo' },
    overview: {
      plans: [
        { id: 'platform-starter', name: 'Starter', amountCents: 490000, currency: 'THB', billingCycle: 'monthly', features: ['1 production tenant'] },
        { id: 'platform-growth', name: 'Growth', amountCents: 1290000, currency: 'THB', billingCycle: 'monthly', features: ['multi-tenant management'] },
      ],
      tenantFeatureAccess: {
        package: { name: 'Starter Package', features: ['server_hosting', 'server_settings'] },
      },
    },
    subscriptions: [{
      id: 'sub-1',
      planId: 'platform-starter',
      lifecycleStatus: 'active',
      status: 'active',
      amountCents: 490000,
      currency: 'THB',
      billingCycle: 'monthly',
      currentPeriodStart: '2026-04-01T00:00:00.000Z',
      currentPeriodEnd: '2026-05-01T00:00:00.000Z',
    }],
    billingOverview: { summary: { collectedCents: 490000, openInvoiceCount: 1 } },
    billingInvoices: [{ id: 'inv-1', status: 'open', amountCents: 490000, currency: 'THB' }],
    billingPaymentAttempts: [{ id: 'att-1', provider: 'stripe', status: 'failed', amountCents: 490000, currency: 'THB', errorCode: 'card_declined' }],
    featureEntitlements: { actions: { can_manage_events: { locked: true, reason: 'Upgrade required' } } },
    quota: {
      subscription: { id: 'sub-1' },
      enabledFeatureKeys: ['server_hosting', 'server_settings'],
      quotas: {
        agentRuntimes: { used: 2, limit: 3, remaining: 1 },
      },
    },
  });

  assert.equal(model.header.title, 'แพ็กเกจและการชำระเงิน');
  assert.equal(model.subscriptions.length, 1);
  assert.equal(model.lockedActions.length, 1);
  assert.equal(model.features.length, 2);
  assert.equal(model.quotaRows.length, 1);
  assert.equal(model.planRows.length, 2);
  assert.equal(model.actions.primary.planId, 'platform-growth');
  assert.ok(model.billingOpsCenter);
  assert.equal(model.billingOpsCenter.retryEligible, true);
  assert.ok(model.billingOpsCenter.summaryCards.some((item) => item.label === 'Open invoices'));
  assert.ok(model.billingOpsCenter.timeline.some((item) => item.title === 'Latest payment attempt'));
});

test('tenant billing v4 html includes checkout actions and billing history', () => {
  const html = buildTenantBillingV4Html(createTenantBillingV4Model({
    overview: {
      plans: [
        { id: 'platform-starter', name: 'Starter', amountCents: 490000, currency: 'THB', billingCycle: 'monthly', features: ['starter'] },
      ],
    },
  }));

  assert.match(html, /แพ็กเกจและการชำระเงิน/);
  assert.match(html, /data-tenant-billing-refresh/);
  assert.match(html, /data-tenant-billing-checkout/);
  assert.match(html, /data-tenant-billing-ops/);
  assert.match(html, /Billing \/ Subscription Ops Center/);
  assert.match(html, /ประวัติการเรียกเก็บเงิน/);
});

test('tenant billing v4 html exposes enabled features and package limits', () => {
  const html = buildTenantBillingV4Html(createTenantBillingV4Model({
    quota: {
      enabledFeatureKeys: ['delivery_agent', 'server_bot'],
      quotas: {
        agentRuntimes: { used: 1, limit: 2, remaining: 1 },
      },
    },
  }));

  assert.match(html, /สิทธิ์จากแพ็กเกจ/);
  assert.match(html, /ขีดจำกัดของแพ็กเกจ/);
  assert.match(html, /Delivery Agent/);
  assert.match(html, /ใช้แล้ว 1/);
});

test('tenant billing v4 html exposes retry payment when invoices or attempts need recovery', () => {
  const html = buildTenantBillingV4Html(createTenantBillingV4Model({
    overview: {
      plans: [
        { id: 'platform-starter', name: 'Starter', amountCents: 490000, currency: 'THB', billingCycle: 'monthly', features: ['starter'] },
      ],
    },
    subscriptions: [{
      id: 'sub-ops-1',
      planId: 'platform-starter',
      lifecycleStatus: 'suspended',
      status: 'suspended',
      amountCents: 490000,
      currency: 'THB',
      billingCycle: 'monthly',
      currentPeriodEnd: '2026-05-01T00:00:00.000Z',
    }],
    billingInvoices: [{ id: 'inv-ops-1', status: 'past_due', amountCents: 490000, currency: 'THB' }],
    billingPaymentAttempts: [{ id: 'att-ops-1', provider: 'stripe', status: 'failed', amountCents: 490000, currency: 'THB', errorCode: 'card_declined' }],
  }));

  assert.match(html, /Retry payment/);
  assert.match(html, /data-tenant-billing-retry="true"/);
  assert.match(html, /Recent billing milestones/);
});
