const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAdminEntityPostRoutes,
} = require('../src/admin/api/adminEntityPostRoutes');
const {
  buildTenantProductEntitlements,
} = require('../src/domain/billing/productEntitlementService');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = { ...this.headers, ...headers };
    },
    end(body = null) {
      this.ended = true;
      this.body = body;
    },
  };
}

function buildRoutes(overrides = {}) {
  return createAdminEntityPostRoutes({
    sendJson(res, statusCode, payload) {
      res.writeHead(statusCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    },
    requiredString(value, key) {
      if (value && typeof value === 'object' && key) {
        return String(value[key] || '').trim();
      }
      return String(value || '').trim();
    },
    asInt(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
    resolveScopedTenantId: (_req, _res, auth, requestedTenantId) => requestedTenantId || auth?.tenantId || null,
    claimSupportTicket: () => ({ ok: true }),
    assignSupportTicket: () => ({ ok: true, ticket: { channelId: 'ticket-1', status: 'claimed' } }),
    closeSupportTicket: () => ({ ok: true }),
    setSupportTicketEscalation: () => ({ ok: true, ticket: { channelId: 'ticket-1', status: 'escalated' } }),
    reviewSupportAppeal: () => ({ ok: true, ticket: { channelId: 'appeal-1', status: 'approved' } }),
    tryNotifyTicket: async () => {},
    createBountyForUser: async () => ({ ok: true }),
    cancelBountyForUser: () => ({ ok: true }),
    createServerEvent: async () => ({ ok: true, event: { id: 1 } }),
    updateServerEvent: async () => ({ ok: true, event: { id: 1 } }),
    startServerEvent: async () => ({ ok: true, event: { id: 1 } }),
    finishServerEvent: async () => ({ ok: true, event: { id: 1 }, participants: [], rewardGranted: false }),
    joinServerEvent: async () => ({ ok: true, event: { id: 1 }, participantsCount: 1 }),
    reviewRaidRequest: async () => ({ ok: true, request: { id: 11 } }),
    createRaidWindow: async () => ({ ok: true, window: { id: 21 } }),
    createRaidSummary: async () => ({ ok: true, summary: { id: 31 } }),
    bindSteamLinkForUser: async () => ({ ok: true }),
    removeSteamLink: () => ({ ok: true, removed: {} }),
    upsertPlayerAccount: async () => ({ ok: true, data: {} }),
    bindPlayerSteamId: async () => ({ ok: true, data: {} }),
    unbindPlayerSteamId: async () => ({ ok: true, data: {} }),
    grantVipForUser: async () => ({ ok: true, plan: { id: 'vip' }, expiresAt: null }),
    revokeVipForUser: async () => ({ ok: true }),
    createRedeemCodeForAdmin: () => ({ ok: true }),
    deleteRedeemCodeForAdmin: () => ({ ok: true, code: 'WELCOME' }),
    resetRedeemCodeUsageForAdmin: () => ({ ok: true, data: {} }),
    createPunishmentEntry: () => ({ ok: true, entry: {} }),
    revokeWelcomePackClaimForAdmin: () => ({ ok: true, userId: 'user-1' }),
    clearWelcomePackClaimsForAdmin: () => ({ ok: true }),
    addKillsForUser: () => ({ ok: true, stat: {} }),
    addDeathsForUser: () => ({ ok: true, stat: {} }),
    addPlaytimeForUser: () => ({ ok: true, stat: {} }),
    queueLeaderboardRefreshForAllGuilds: () => {},
    buildTenantProductEntitlements,
    ...overrides,
  });
}

test('admin entity event create route denies event action when event entitlement is locked', async () => {
  let called = false;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: [],
    }),
    createServerEvent: async () => {
      called = true;
      return { ok: true, event: { id: 1 } };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/event/create',
    body: {
      tenantId: 'tenant-1',
      name: 'Weekend Arena',
      time: '2026-04-01 20:00 ICT',
      reward: '5000 coins',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.error, 'feature-not-enabled');
  assert.equal(payload.data.actionKey, 'can_manage_events');
});

test('admin entity link route denies player action when player entitlement is locked', async () => {
  let called = false;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: [],
    }),
    bindSteamLinkForUser: async () => {
      called = true;
      return { ok: true };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/link/set',
    body: {
      tenantId: 'tenant-1',
      userId: 'user-1',
      steamId: 'steam-1',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.error, 'feature-not-enabled');
  assert.equal(payload.data.actionKey, 'can_manage_players');
});

test('admin entity ticket claim route denies support actions when player entitlement is locked', async () => {
  let called = false;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: [],
    }),
    claimSupportTicket: () => {
      called = true;
      return { ok: true, ticket: { channelId: 'ticket-1' } };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/ticket/claim',
    body: {
      tenantId: 'tenant-1',
      channelId: 'ticket-1',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.error, 'feature-not-enabled');
  assert.equal(payload.data.actionKey, 'can_manage_players');
});

test('admin entity ticket assign route denies support actions when player entitlement is locked', async () => {
  let called = false;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: [],
    }),
    assignSupportTicket: () => {
      called = true;
      return { ok: true, ticket: { channelId: 'ticket-1', status: 'claimed' } };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/ticket/assign',
    body: {
      tenantId: 'tenant-1',
      channelId: 'ticket-1',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.error, 'feature-not-enabled');
  assert.equal(payload.data.actionKey, 'can_manage_players');
});

test('admin entity ticket escalate route forwards the escalated state when player entitlement is enabled', async () => {
  let captured = null;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: ['player_module', 'support_module'],
    }),
    setSupportTicketEscalation: (input) => {
      captured = input;
      return {
        ok: true,
        ticket: {
          channelId: input.channelId,
          status: input.escalated ? 'escalated' : 'claimed',
        },
      };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/ticket/escalate',
    body: {
      tenantId: 'tenant-1',
      channelId: 'ticket-1',
      escalated: 'true',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.channelId, 'ticket-1');
  assert.equal(captured.escalated, true);
  assert.equal(captured.staffId, 'tenant-admin');
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.status, 'escalated');
});

test('admin entity ticket escalate route accepts a boolean false payload when returning a ticket to the queue', async () => {
  let captured = null;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: ['player_module', 'support_module'],
    }),
    setSupportTicketEscalation: (input) => {
      captured = input;
      return {
        ok: true,
        ticket: {
          channelId: input.channelId,
          status: input.escalated ? 'escalated' : 'claimed',
        },
      };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/ticket/escalate',
    body: {
      tenantId: 'tenant-1',
      channelId: 'ticket-1',
      escalated: false,
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.channelId, 'ticket-1');
  assert.equal(captured.escalated, false);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.status, 'claimed');
});

test('admin entity appeal review route resolves appeals when player entitlement is enabled', async () => {
  let captured = null;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: ['player_module', 'support_module'],
    }),
    reviewSupportAppeal: (input) => {
      captured = input;
      return {
        ok: true,
        ticket: {
          channelId: input.channelId,
          status: input.resolution,
        },
      };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/ticket/appeal-review',
    body: {
      tenantId: 'tenant-1',
      channelId: 'appeal-1',
      resolution: 'approved',
      note: 'Evidence reviewed',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.channelId, 'appeal-1');
  assert.equal(captured.resolution, 'approved');
  assert.equal(captured.note, 'Evidence reviewed');
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.ok, true);
  assert.equal(payload.data.status, 'approved');
});

test('admin entity raid review route denies raid action when event entitlement is locked', async () => {
  let called = false;
  const handler = buildRoutes({
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-1',
      enabledFeatureKeys: [],
    }),
    reviewRaidRequest: async () => {
      called = true;
      return { ok: true, request: { id: 11 } };
    },
  });
  const res = createMockRes();

  const handled = await handler({
    client: null,
    req: { method: 'POST', headers: {} },
    pathname: '/admin/api/raid/request/review',
    body: {
      tenantId: 'tenant-1',
      id: 11,
      status: 'approved',
    },
    res,
    auth: { user: 'tenant-admin', role: 'admin', tenantId: 'tenant-1' },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  const payload = JSON.parse(String(res.body || '{}'));
  assert.equal(payload.error, 'feature-not-enabled');
  assert.equal(payload.data.actionKey, 'can_manage_events');
});
