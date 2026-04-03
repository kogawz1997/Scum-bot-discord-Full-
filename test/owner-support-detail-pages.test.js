const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createOwnerControlV4Model,
  buildOwnerControlV4Html,
} = require('../src/admin/assets/owner-control-v4.js');

function buildState() {
  return {
    overview: {
      packages: [
        { id: 'TRIAL', title: 'Trial', description: 'Entry plan', features: ['sync_agent'] },
        { id: 'PRO', title: 'Pro', description: 'Full plan', features: ['sync_agent', 'execute_agent'] },
      ],
      features: [
        { key: 'sync_agent', title: 'Server Bot' },
        { key: 'execute_agent', title: 'Delivery Agent' },
      ],
      plans: [
        { id: 'trial-14d', title: 'Trial 14 days' },
        { id: 'pro-monthly', title: 'Pro Monthly' },
      ],
      analytics: {
        tenants: { total: 1, active: 1 },
        subscriptions: { mrrCents: 120000 },
        delivery: { failedJobs: 1, queueDepth: 2 },
      },
    },
    tenants: [
      {
        id: 'tenant-1',
        name: 'Prime',
        slug: 'prime',
        type: 'direct',
        status: 'active',
        locale: 'th',
        ownerName: 'Ariya',
        ownerEmail: 'ariya@example.com',
      },
    ],
    subscriptions: [
      {
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'active',
        packageId: 'PRO',
        planId: 'pro-monthly',
        billingCycle: 'monthly',
        amountCents: 99000,
        currency: 'THB',
        renewsAt: '2026-04-05T09:00:00.000Z',
        metadata: { packageId: 'PRO' },
      },
    ],
    tenantQuotaSnapshots: [
      {
        tenantId: 'tenant-1',
        quotas: {
          apiKeys: { used: 2, limit: 5 },
        },
      },
    ],
    billingInvoices: [
      {
        id: 'inv-1',
        tenantId: 'tenant-1',
        subscriptionId: 'sub-1',
        status: 'paid',
        amountCents: 99000,
        currency: 'THB',
        paidAt: '2026-03-29T08:15:00.000Z',
        metadata: { targetPlanId: 'pro-monthly', targetPackageId: 'PRO', targetBillingCycle: 'monthly' },
      },
    ],
    billingPaymentAttempts: [],
    agents: [
      {
        tenantId: 'tenant-1',
        serverId: 'server-1',
        guildId: 'guild-1',
        agentId: 'sync-1',
        runtimeKey: 'sync-runtime',
        role: 'sync',
        scope: 'sync_only',
        status: 'online',
        lastSeenAt: '2026-03-29T08:35:00.000Z',
        version: '2.0.0',
      },
    ],
    agentRegistry: [
      {
        tenantId: 'tenant-1',
        serverId: 'server-1',
        guildId: 'guild-1',
        agentId: 'sync-1',
        runtimeKey: 'sync-runtime',
        role: 'sync',
        scope: 'sync_only',
        runtimeKind: 'server-bots',
        status: 'online',
        machineName: 'machine-a',
        version: '2.0.0',
        lastSeenAt: '2026-03-29T08:35:00.000Z',
        displayName: 'Prime Server Bot',
        minimumVersion: '2.0.0',
      },
    ],
    agentDevices: [
      {
        tenantId: 'tenant-1',
        serverId: 'server-1',
        guildId: 'guild-1',
        agentId: 'sync-1',
        runtimeKey: 'sync-runtime',
        id: 'device-1',
        hostname: 'machine-a',
        lastSeenAt: '2026-03-29T08:35:00.000Z',
      },
    ],
    agentCredentials: [
      {
        tenantId: 'tenant-1',
        serverId: 'server-1',
        guildId: 'guild-1',
        agentId: 'sync-1',
        runtimeKey: 'sync-runtime',
        apiKeyId: 'cred-1',
        deviceId: 'device-1',
        role: 'sync',
        scope: 'sync_only',
        minVersion: '2.0.0',
      },
    ],
    agentProvisioning: [
      {
        tenantId: 'tenant-1',
        runtimeKey: 'sync-runtime',
        tokenId: 'setup-1',
      },
    ],
    supportTickets: [
      {
        id: 1,
        channelId: 'ticket-001',
        guildId: 'tenant-1',
        userId: 'player-1',
        category: 'support',
        reason: 'Player cannot receive VIP delivery',
        status: 'open',
        claimedBy: null,
        createdAt: '2026-03-29T05:00:00.000Z',
      },
      {
        id: 2,
        channelId: 'ticket-002',
        guildId: 'tenant-1',
        userId: 'player-2',
        category: 'appeal',
        reason: 'Appeal for moderation review',
        status: 'claimed',
        claimedBy: 'mod-1',
        createdAt: '2026-03-29T06:30:00.000Z',
      },
      {
        id: 3,
        channelId: 'ticket-003',
        guildId: 'tenant-1',
        userId: 'player-3',
        category: 'support',
        reason: 'Order issue still needs closure',
        status: 'claimed',
        claimedBy: 'mod-2',
        createdAt: '2026-03-29T07:10:00.000Z',
      },
    ],
  };
}

function buildSupportCase() {
  return {
    tenantId: 'tenant-1',
    lifecycle: {
      label: 'needs attention',
      detail: 'Delivery and alert signals still need owner follow-up.',
      tone: 'warning',
    },
    onboarding: {
      completed: 2,
      total: 3,
      requiredCompleted: 1,
      requiredTotal: 2,
      items: [
        { key: 'tenant-record', required: true, status: 'done', detail: 'Tenant exists' },
      ],
    },
    signals: {
      total: 3,
      items: [
        { key: 'dead-letters', tone: 'danger', count: 1, detail: 'A failed delivery still needs review.' },
      ],
    },
    actions: [
      { key: 'inspect-dead-letters', tone: 'danger', detail: 'Retry or clear the failed delivery before closing the case.' },
    ],
    diagnostics: {
      delivery: {
        deadLetters: 1,
        anomalies: 0,
      },
      notifications: [
        {
          id: 'note-1',
          title: 'Queue warning',
          detail: 'Delivery worker needs review',
          severity: 'warning',
          createdAt: '2026-03-29T09:00:00.000Z',
          acknowledged: false,
        },
      ],
      requestErrors: {
        summary: { total: 1 },
        items: [
          {
            method: 'POST',
            path: '/owner/api/platform/subscription/update',
            statusCode: 500,
            detail: 'Simulated billing failure',
            at: '2026-03-29T09:05:00.000Z',
          },
        ],
      },
    },
  };
}

test('tenant detail workspace exposes support shortcut and tenant runtime actions', () => {
  const model = createOwnerControlV4Model(buildState(), {
    currentRoute: 'tenant-tenant-1',
    supportCase: buildSupportCase(),
    supportCaseLoading: false,
  });
  const html = buildOwnerControlV4Html(model);
  assert.match(html, /id="owner-tenant-detail-summary"/);
  assert.match(html, /href="\/owner\/support\/tenant-1"/);
  assert.match(html, /id="owner-tenant-detail-form"/);
  assert.match(html, /id="owner-tenant-detail-runtime-live"/);
  assert.match(html, /data-owner-action="inspect-runtime"/);
});

test('support workspace exposes dead-letter, alert, and request-error tools', () => {
  const state = buildState();
  state.supportTickets.push({
    id: 4,
    channelId: 'ticket-004',
    guildId: 'tenant-1',
    userId: 'player-4',
    category: 'support',
    reason: 'Owner escalation already in progress',
    status: 'escalated',
    claimedBy: 'owner-ops',
    createdAt: '2026-03-29T07:45:00.000Z',
  });
  const model = createOwnerControlV4Model(state, {
    currentRoute: 'support-tenant-1',
    supportCase: buildSupportCase(),
    supportCaseLoading: false,
    supportDeadLetters: [
      {
        purchaseCode: 'PUR-001',
        tenantId: 'tenant-1',
        guildId: 'guild-1',
        itemName: 'VIP Pack',
        lastErrorCode: 'missing-steam-link',
        lastError: 'Player has no linked Steam account',
        updatedAt: '2026-03-29T09:10:00.000Z',
      },
    ],
    supportDeadLettersLoading: false,
  });
  const html = buildOwnerControlV4Html(model);
  assert.match(html, /id="owner-tenant-support-ticket-queue-live"/);
  assert.match(html, /Ticket queue and appeal decisions/);
  assert.match(html, /id="owner-tenant-support-priority-live"/);
  assert.match(html, /data-owner-support-escalation-snapshot/);
  assert.match(html, /Escalation watch/);
  assert.match(html, /data-owner-support-operational-drag/);
  assert.match(html, /Operational drag/);
  assert.match(html, /data-owner-action="claim-support-ticket"/);
  assert.match(html, /data-owner-action="assign-support-ticket"/);
  assert.match(html, /data-owner-action="toggle-support-ticket-escalation"/);
  assert.match(html, /data-owner-action="review-support-appeal"/);
  assert.match(html, /data-owner-action="close-support-ticket"/);
  assert.match(html, /data-owner-support-ticket-row="ticket-001"/);
  assert.match(html, /data-owner-support-ticket-row="ticket-004"/);
  assert.match(html, /Return to queue/);
  assert.match(html, /id="owner-tenant-support-dead-letters-live"/);
  assert.match(html, /data-owner-action="retry-dead-letter"/);
  assert.match(html, /data-owner-action="clear-dead-letter"/);
  assert.match(html, /data-owner-action="acknowledge-notification"/);
  assert.match(html, /id="owner-tenant-support-request-errors-live"/);
});
