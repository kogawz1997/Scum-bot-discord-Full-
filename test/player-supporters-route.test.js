const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPlayerGeneralRoutes,
} = require('../apps/web-portal-standalone/api/playerGeneralRoutes');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = { ...this.headers, ...headers };
    },
    end(body) {
      this.payload = body;
    },
  };
}

function createSendJson() {
  return (res, statusCode, payload, extraHeaders = {}) => {
    res.writeHead(statusCode, extraHeaders);
    res.end(payload);
  };
}

function createUrl(pathname) {
  return new URL(`http://localhost${pathname}`);
}

test('player supporters route returns supporter community data for donation-enabled tenants', async () => {
  const route = createPlayerGeneralRoutes({
    sendJson: createSendJson(),
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-prod-001',
      enabledFeatureKeys: ['donation_module'],
    }),
    buildTenantDonationOverview: async () => ({
      summary: {
        activeSupporters30d: 2,
      },
      recentActivity: [
        {
          userId: '123456789012345678',
          itemName: 'Supporter VIP',
          status: 'delivered',
          createdAt: '2026-04-02T10:00:00.000Z',
          price: 3000,
          isSupporter: true,
        },
        {
          userId: '123456789012345678',
          itemName: 'Supporter VIP',
          status: 'delivered',
          createdAt: '2026-04-01T10:00:00.000Z',
          price: 3000,
          isSupporter: true,
        },
      ],
    }),
    listPlayerAccounts: async () => ([
      {
        discordId: '123456789012345678',
        displayName: 'MiraTH',
      },
    ]),
  });

  const res = createResponse();
  const handled = await route({
    req: {},
    res,
    urlObj: createUrl('/player/api/supporters?limit=8'),
    pathname: '/player/api/supporters',
    method: 'GET',
    session: {
      discordId: '123456789012345678',
      user: 'MiraTH',
      role: 'player',
      tenantId: 'tenant-prod-001',
      activeServerId: 'server-main',
    },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.data.summary.activeSupporters30d, 2);
  assert.equal(res.payload.data.items.length, 1);
  assert.equal(res.payload.data.items[0].label, 'MiraTH');
  assert.equal(res.payload.data.items[0].latestPackage, 'Supporter VIP');
});

test('player supporters route denies access when donation feature is disabled', async () => {
  const route = createPlayerGeneralRoutes({
    sendJson: createSendJson(),
    getTenantFeatureAccess: async () => ({
      tenantId: 'tenant-prod-001',
      enabledFeatureKeys: [],
    }),
  });

  const res = createResponse();
  const handled = await route({
    req: {},
    res,
    urlObj: createUrl('/player/api/supporters'),
    pathname: '/player/api/supporters',
    method: 'GET',
    session: {
      discordId: '123456789012345678',
      user: 'MiraTH',
      role: 'player',
      tenantId: 'tenant-prod-001',
    },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, 'feature-not-enabled');
});
