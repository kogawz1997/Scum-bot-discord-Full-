const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildTenantPlayersV4Html,
  createTenantPlayersV4Model,
} = require('../src/admin/assets/tenant-players-v4.js');

test('tenant players v4 model builds support-focused workspace', () => {
  const model = createTenantPlayersV4Model({
    me: { tenantId: 'tenant-prod-001', role: 'admin' },
    tenantConfig: { name: 'SCUM TH Production' },
    players: [
      {
        displayName: 'John Walker',
        discordId: '123',
        steamId: '76561198000000001',
        inGameName: 'RW-John',
        isActive: true,
        updatedAt: '2026-03-26T08:00:00+07:00',
      },
    ],
    purchaseLookup: {
      items: [{ code: 'PUR-1', status: 'queued', userId: '123' }],
    },
    deliveryCase: {
      purchase: { userId: '123' },
      deadLetter: { reason: 'waiting for agent' },
    },
    supportTickets: [
      {
        channelId: 'portal-tenant-prod-001-123-open',
        status: 'open',
        isOpen: true,
        category: 'player-support',
      },
    ],
    playerSupportTickets: [
      {
        channelId: 'portal-tenant-prod-001-123-appeal',
        status: 'open',
        isOpen: true,
        isAppeal: true,
        category: 'appeal',
        reason: 'Appeal request',
        createdAt: '2026-04-03T09:00:00.000Z',
      },
    ],
  });

  assert.equal(model.header.title, 'Players');
  assert.equal(model.summaryStrip.length, 5);
  assert.equal(model.players.length, 1);
  assert.equal(model.selected.discordId, '123');
  assert.equal(model.selected.supportTickets.length, 1);
  assert.equal(model.selected.openAppeal.channelId, 'portal-tenant-prod-001-123-appeal');
  assert.ok(model.railCards.length >= 3);
});

test('tenant players v4 html includes player table and team access handoff', () => {
  const html = buildTenantPlayersV4Html(createTenantPlayersV4Model({
    me: { role: 'owner' },
    tenantConfig: { name: 'Tenant Demo' },
    players: [
      {
        displayName: 'Mira',
        discordId: 'user-1',
        steamId: 'steam-1',
        inGameName: 'MiraTH',
        isActive: true,
      },
    ],
    playerSupportTickets: [
      {
        channelId: 'appeal-1',
        status: 'open',
        isOpen: true,
        isAppeal: true,
        category: 'appeal',
        reason: 'Appeal request',
        createdAt: '2026-04-03T09:00:00.000Z',
      },
    ],
  }));

  assert.match(html, /Steam \/ In-game/);
  assert.match(html, /Manage team access from the dedicated team pages/);
  assert.match(html, /Open staff/);
  assert.match(html, /data-tenant-player-ticket-review="approved"/);
  assert.match(html, /data-tenant-player-ticket-claim="appeal-1"/);
  assert.match(html, /data-tenant-player-ticket-escalate="appeal-1"/);
  assert.match(html, />Escalate</);
  assert.doesNotMatch(html, /data-tenant-staff-card/);
  assert.match(html, /tdv4-players-main-grid/);
});

test('tenant players v4 html exposes assign and return-to-queue actions for escalated claimed tickets', () => {
  const html = buildTenantPlayersV4Html(createTenantPlayersV4Model({
    me: { role: 'admin' },
    tenantConfig: { name: 'Tenant Demo' },
    players: [
      {
        displayName: 'Mira',
        discordId: 'user-1',
        steamId: 'steam-1',
        inGameName: 'MiraTH',
        isActive: true,
      },
    ],
    playerSupportTickets: [
      {
        channelId: 'ticket-claimed-1',
        status: 'escalated',
        isOpen: true,
        claimedBy: 'ops-lead',
        reason: 'Delivery was delayed twice',
        createdAt: '2026-04-03T09:00:00.000Z',
      },
    ],
  }));

  assert.match(html, /data-tenant-player-ticket-assign="ticket-claimed-1"/);
  assert.match(html, /data-tenant-player-ticket-escalate="ticket-claimed-1"/);
  assert.match(html, /data-escalated="false"/);
  assert.match(html, />Return to queue</);
  assert.match(html, /claimed by ops-lead/);
  assert.match(html, /escalated/);
});

test('tenant players preview html references parallel assets', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'admin', 'v4', 'tenant-players-v4.preview.html');
  const html = fs.readFileSync(previewPath, 'utf8');

  assert.match(html, /\.\.\/assets\/tenant-players-v4\.css/);
  assert.match(html, /\.\.\/assets\/tenant-players-v4\.js/);
  assert.match(html, /tenantPlayersV4PreviewRoot/);
});
