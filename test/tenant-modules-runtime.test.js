const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectModuleToggleSnapshots,
  collectTenantModuleFeatureFlags,
  computeTenantModuleSaveState,
} = require('../src/admin/assets/tenant-modules-runtime.js');

test('tenant modules runtime clones tenant feature flags safely', () => {
  const state = {
    tenantConfig: {
      featureFlags: {
        support_module: true,
        discord_integration: true,
      },
    },
  };

  const flags = collectTenantModuleFeatureFlags(state);
  assert.deepEqual(flags, {
    support_module: true,
    discord_integration: true,
  });
  assert.notEqual(flags, state.tenantConfig.featureFlags);
});

test('tenant modules runtime collects toggle snapshots from the DOM contract', () => {
  const rootNode = {
    querySelectorAll() {
      return [
        {
          getAttribute(name) {
            const values = {
              'data-module-feature-key': 'support_module',
              'data-module-package-enabled': 'true',
              'data-module-depends-on': 'discord_integration',
            };
            return values[name] || '';
          },
          checked: true,
          disabled: false,
        },
      ];
    },
  };

  assert.deepEqual(collectModuleToggleSnapshots(rootNode), [
    {
      featureKey: 'support_module',
      packageEnabled: true,
      checked: true,
      disabled: false,
      dependsOn: ['discord_integration'],
    },
  ]);
});

test('tenant modules runtime computes next flags and dependency issues from toggle state', () => {
  const result = computeTenantModuleSaveState({
    packageFeatures: ['analytics_module', 'discord_integration'],
    currentFeatureFlags: {
      custom_banner: true,
      support_module: false,
    },
    toggles: [
      {
        featureKey: 'analytics_module',
        packageEnabled: true,
        checked: true,
        disabled: false,
        dependsOn: [],
      },
      {
        featureKey: 'support_module',
        packageEnabled: false,
        checked: true,
        disabled: false,
        dependsOn: ['discord_integration'],
      },
    ],
  });

  assert.deepEqual(result.nextFeatureFlags, {
    custom_banner: true,
    support_module: true,
  });
  assert.deepEqual(result.dependencyIssues, []);
});

test('tenant modules runtime reports dependency issues for enabled toggles with missing requirements', () => {
  const result = computeTenantModuleSaveState({
    packageFeatures: ['support_module'],
    currentFeatureFlags: {},
    toggles: [
      {
        featureKey: 'support_module',
        packageEnabled: true,
        checked: true,
        disabled: false,
        dependsOn: ['discord_integration'],
      },
    ],
  });

  assert.deepEqual(result.nextFeatureFlags, {});
  assert.deepEqual(result.dependencyIssues, [
    {
      featureKey: 'support_module',
      missing: ['discord_integration'],
    },
  ]);
});
