const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTenantOnboardingV4Model,
  buildTenantOnboardingV4Html,
} = require('../src/admin/assets/tenant-onboarding-v4.js');

test('tenant onboarding v4 model builds checklist from runtime readiness', () => {
  const model = createTenantOnboardingV4Model({
    tenantConfig: { name: 'Tenant Demo' },
    activeServer: { id: 'server-1', name: 'Server 1' },
    agents: [
      { role: 'sync', status: 'online' },
      { role: 'execute', status: 'pending_activation' },
    ],
    serverConfigWorkspace: { categories: [{ key: 'general' }] },
  });

  assert.equal(model.header.title, 'Onboarding');
  assert.equal(model.checklist.length, 6);
  assert.equal(model.checklist.filter((item) => item.done).length, 4);
  assert.equal(model.progress.percent, 67);
  assert.equal(model.readiness.nextStep.title, 'Connect Delivery Agent');
  assert.equal(model.header.primaryAction.href, '/tenant/runtimes/delivery-agents');
});

test('tenant onboarding v4 html includes checklist and primary action', () => {
  const html = buildTenantOnboardingV4Html(createTenantOnboardingV4Model({}));

  assert.match(html, /Onboarding/);
  assert.match(html, /Setup checklist/);
  assert.match(html, /Create Server Bot/);
  assert.match(html, /Start using the system/);
  assert.match(html, /System readiness is complete|Finish the missing setup steps first/);
  assert.match(html, /Open daily overview|Create Server Bot|Finish Server Bot setup/);
});

test('tenant onboarding v4 surfaces entitlement lock reasons in checklist', () => {
  const model = createTenantOnboardingV4Model({
    featureEntitlements: {
      package: { name: 'BOT_LOG' },
      subscriptionStatus: 'suspended',
      actions: {
        can_create_server_bot: {
          locked: true,
          reason: 'Create Server Bot is locked until billing is restored.',
          upgradeCta: { label: 'Open billing', href: '/tenant/billing' },
        },
        can_create_delivery_agent: {
          locked: true,
          reason: 'Create Delivery Agent is locked until billing is restored.',
          upgradeCta: { label: 'Open billing', href: '/tenant/billing' },
        },
        can_edit_config: {
          locked: true,
          reason: 'Config access is locked until billing is restored.',
          upgradeCta: { label: 'Open billing', href: '/tenant/billing' },
        },
      },
      sections: {
        server: {
          locked: true,
          reason: 'Server operations are locked until billing is restored.',
          upgradeCta: { label: 'Open billing', href: '/tenant/billing' },
        },
      },
    },
  });

  assert.equal(model.summaryStrip[1].value, 'BOT_LOG');
  assert.equal(model.checklist[0].locked, true);
  assert.equal(model.checklist[0].upgradeAction.href, '/tenant/billing');
  assert.match(model.checklist[0].reason, /billing is restored/i);
  assert.match(model.readiness.detail, /billing is restored/i);
});
