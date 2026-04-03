const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTenantSettingsV4Model,
  buildTenantSettingsV4Html,
} = require('../src/admin/assets/tenant-settings-v4.js');

test('tenant settings v4 model exposes config patch and discord links', () => {
  const model = createTenantSettingsV4Model({
    tenantConfig: {
      name: 'Tenant Demo',
      configPatch: { supportEmail: 'ops@example.com' },
      portalEnvPatch: {
        theme: 'scum',
        publishedBranding: {
          version: 2,
          publishedAt: '2026-04-03T10:00:00.000Z',
          publishedBy: 'tenant-web:owner-1',
          settings: {
            siteName: 'Prime SCUM Network',
            primaryColor: '#3366ff',
          },
        },
        publishedBrandingHistory: [
          {
            version: 2,
            publishedAt: '2026-04-03T10:00:00.000Z',
            publishedBy: 'tenant-web:owner-1',
            settings: {
              siteName: 'Prime SCUM Network',
              primaryColor: '#3366ff',
            },
          },
          {
            version: 1,
            publishedAt: '2026-03-20T10:00:00.000Z',
            publishedBy: 'tenant-web:owner-1',
            settings: {
              siteName: 'Archive Portal',
              primaryColor: '#224466',
            },
          },
        ],
      },
      featureFlags: { donation_module: true },
    },
    servers: [{ id: 'server-1', name: 'Main Server' }],
    serverDiscordLinks: [{ serverId: 'server-1', guildId: '123', status: 'active', updatedAt: '2026-03-29T10:00:00+07:00' }],
  });

  assert.equal(model.header.title, 'Settings');
  assert.equal(model.serverOptions.length, 1);
  assert.equal(model.links.length, 1);
  assert.match(model.configPatchJson, /supportEmail/);
  assert.equal(model.hasPublishedBranding, true);
  assert.equal(model.publishedBranding.version, 2);
  assert.equal(model.publishedBranding.siteName, 'Prime SCUM Network');
  assert.equal(model.publishedBrandingHistory.length, 2);
  assert.doesNotMatch(model.portalEnvPatchJson, /publishedBranding/);
});

test('tenant settings v4 html includes save form and discord link action', () => {
  const html = buildTenantSettingsV4Html(createTenantSettingsV4Model({}));

  assert.match(html, /Save workspace settings/);
  assert.match(html, /data-tenant-settings-form/);
  assert.match(html, /data-server-discord-link-create/);
  assert.match(html, /data-server-discord-link-create[^>]*disabled/);
  assert.match(html, /Add a server first/);
});

test('tenant settings v4 html exposes publish and restore branding controls', () => {
  const html = buildTenantSettingsV4Html(createTenantSettingsV4Model({
    tenantConfig: {
      portalEnvPatch: {
        publishedBranding: {
          version: 3,
          publishedAt: '2026-04-03T10:00:00.000Z',
          publishedBy: 'tenant-web:owner-1',
          settings: {
            siteName: 'Published SCUM Portal',
          },
        },
        publishedBrandingHistory: [
          {
            version: 3,
            publishedAt: '2026-04-03T10:00:00.000Z',
            publishedBy: 'tenant-web:owner-1',
            settings: {
              siteName: 'Published SCUM Portal',
            },
          },
          {
            version: 2,
            publishedAt: '2026-03-28T10:00:00.000Z',
            publishedBy: 'tenant-web:owner-1',
            settings: {
              siteName: 'Archive SCUM Portal',
            },
          },
        ],
      },
    },
  }));

  assert.match(html, /Publish portal branding/);
  assert.match(html, /data-tenant-branding-publish/);
  assert.match(html, /data-tenant-branding-restore/);
  assert.match(html, /data-tenant-branding-restore-version/);
  assert.match(html, /data-has-published-branding="true"/);
  assert.match(html, /Published SCUM Portal/);
  assert.match(html, /Archive SCUM Portal/);
});
