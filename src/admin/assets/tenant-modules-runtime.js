(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantModulesRuntime = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  function cloneFeatureFlags(featureFlags) {
    return featureFlags && typeof featureFlags === 'object' && !Array.isArray(featureFlags)
      ? { ...featureFlags }
      : {};
  }

  function collectTenantModuleFeatureFlags(renderState) {
    return cloneFeatureFlags(renderState?.tenantConfig?.featureFlags);
  }

  function normalizeFeatureKey(value) {
    return String(value || '').trim();
  }

  function normalizeModuleToggleSnapshot(input) {
    const featureKey = normalizeFeatureKey(input?.featureKey);
    if (!featureKey) return null;
    const dependsOn = Array.isArray(input?.dependsOn)
      ? input.dependsOn.map(normalizeFeatureKey).filter(Boolean)
      : String(input?.dependsOn || '')
        .split(',')
        .map(normalizeFeatureKey)
        .filter(Boolean);
    return {
      featureKey,
      packageEnabled: input?.packageEnabled === true,
      checked: input?.checked === true,
      disabled: input?.disabled === true,
      dependsOn,
    };
  }

  function collectModuleToggleSnapshots(rootNode) {
    const queryRoot = rootNode && typeof rootNode.querySelectorAll === 'function' ? rootNode : null;
    const nodes = queryRoot
      ? Array.from(queryRoot.querySelectorAll('[data-module-toggle][data-module-feature-key]'))
      : [];
    return nodes
      .map((node) => normalizeModuleToggleSnapshot({
        featureKey: node.getAttribute('data-module-feature-key'),
        packageEnabled: String(node.getAttribute('data-module-package-enabled') || '').trim() === 'true',
        checked: node.checked === true,
        disabled: node.disabled === true,
        dependsOn: node.getAttribute('data-module-depends-on'),
      }))
      .filter(Boolean);
  }

  function computeTenantModuleSaveState(options = {}) {
    const packageFeatures = Array.isArray(options.packageFeatures)
      ? options.packageFeatures.map(normalizeFeatureKey).filter(Boolean)
      : [];
    const toggles = Array.isArray(options.toggles)
      ? options.toggles.map(normalizeModuleToggleSnapshot).filter(Boolean)
      : [];
    const nextFeatureFlags = cloneFeatureFlags(options.currentFeatureFlags);
    const baseFeatureSet = new Set(packageFeatures);
    const moduleKeys = new Set();

    toggles.forEach((toggle) => {
      moduleKeys.add(toggle.featureKey);
      if (toggle.disabled) return;
      if (toggle.checked === toggle.packageEnabled) {
        delete nextFeatureFlags[toggle.featureKey];
      } else {
        nextFeatureFlags[toggle.featureKey] = toggle.checked;
      }
    });

    const effectiveFeatureSet = new Set(baseFeatureSet);
    Object.entries(nextFeatureFlags).forEach(([featureKey, rawValue]) => {
      const normalizedKey = normalizeFeatureKey(featureKey);
      if (!normalizedKey) return;
      if (rawValue === true) effectiveFeatureSet.add(normalizedKey);
      if (rawValue === false) effectiveFeatureSet.delete(normalizedKey);
    });

    const dependencyIssues = toggles.reduce((rows, toggle) => {
      if (!toggle.checked || !toggle.dependsOn.length) return rows;
      const missing = toggle.dependsOn.filter((dependency) => !effectiveFeatureSet.has(dependency));
      if (!missing.length) return rows;
      rows.push({
        featureKey: toggle.featureKey,
        missing,
      });
      return rows;
    }, []);

    moduleKeys.forEach((featureKey) => {
      if (!Object.prototype.hasOwnProperty.call(nextFeatureFlags, featureKey)) return;
      const rawValue = nextFeatureFlags[featureKey];
      if (rawValue !== true && rawValue !== false) {
        delete nextFeatureFlags[featureKey];
      }
    });

    return {
      nextFeatureFlags,
      dependencyIssues,
    };
  }

  return {
    collectModuleToggleSnapshots,
    collectTenantModuleFeatureFlags,
    computeTenantModuleSaveState,
  };
});
