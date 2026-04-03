(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantModulesV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const MODULE_CATALOG = [
    {
      featureKey: 'bot_delivery',
      title: 'Delivery jobs',
      description: 'Coordinate the delivery queue, execution handoff, and player-facing completion flow for live orders.',
      dependencies: ['orders_module', 'execute_agent'],
      actionHref: '/tenant/orders',
      actionLabel: 'Open deliveries',
      dependencyActions: {
        orders_module: { href: '/tenant/orders', label: 'Open orders' },
        execute_agent: { href: '/tenant/delivery-agents', label: 'Open Delivery Agent' },
      },
      runtimeRole: 'execute',
      runtimeHref: '/tenant/delivery-agents',
    },
    {
      featureKey: 'bot_log',
      title: 'Server log sync',
      description: 'Pull data from SCUM.log so the control plane can track server health and live operational signals.',
      dependencies: ['sync_agent'],
      actionHref: '/tenant/logs-sync',
      actionLabel: 'Open logs and sync',
      dependencyActions: {
        sync_agent: { href: '/tenant/server-bots', label: 'Open Server Bot' },
      },
      runtimeRole: 'sync',
      runtimeHref: '/tenant/server-bots',
    },
    {
      featureKey: 'donation_module',
      title: 'Supporters',
      description: 'Enable supporter packages and purchase paths for players who fund the community.',
      dependencies: ['orders_module', 'player_module'],
      actionHref: '/tenant/donations',
      actionLabel: 'Open supporters',
      dependencyActions: {
        orders_module: { href: '/tenant/orders', label: 'Open orders' },
        player_module: { href: '/tenant/players', label: 'Open players' },
      },
    },
    {
      featureKey: 'event_module',
      title: 'Events',
      description: 'Run event creation, scheduling, and player-facing announcements from the tenant workspace.',
      dependencies: [],
      actionHref: '/tenant/events',
      actionLabel: 'Open events',
    },
    {
      featureKey: 'wallet_module',
      title: 'Wallet',
      description: 'Manage balances, rewards, and purchase flows that rely on player wallet state.',
      dependencies: ['orders_module', 'player_module'],
      actionHref: '/tenant/orders',
      actionLabel: 'Open orders',
      dependencyActions: {
        orders_module: { href: '/tenant/orders', label: 'Open orders' },
        player_module: { href: '/tenant/players', label: 'Open players' },
      },
    },
    {
      featureKey: 'ranking_module',
      title: 'Rankings and stats',
      description: 'Expose leaderboards, stats summaries, and player movement reports that are useful to the community.',
      dependencies: ['player_module'],
      actionHref: '/tenant/players',
      actionLabel: 'Open players',
      dependencyActions: {
        player_module: { href: '/tenant/players', label: 'Open players' },
      },
    },
    {
      featureKey: 'support_module',
      title: 'Support and alerts',
      description: 'Help staff follow player issues and keep community notifications moving through one workflow.',
      dependencies: ['discord_integration'],
      actionHref: '/tenant/players',
      actionLabel: 'Open support tools',
      dependencyActions: {
        discord_integration: { href: '/tenant/settings', label: 'Open settings' },
      },
    },
    {
      featureKey: 'analytics_module',
      title: 'Analytics overview',
      description: 'Review usage, order trends, and key operating signals in one decision-ready workspace.',
      dependencies: [],
      actionHref: '/tenant/analytics',
      actionLabel: 'Open analytics',
    },
  ];

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function firstNonEmpty(values, fallback = '') {
    const list = Array.isArray(values) ? values : [values];
    for (const value of list) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return fallback;
  }

  function formatNumber(value, fallback = '0') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat('en-US').format(numeric) : fallback;
  }

  function humanizeFeatureKey(value) {
    const key = String(value || '').trim();
    const dictionary = {
      bot_delivery: 'Delivery jobs',
      bot_log: 'Server log sync',
      donation_module: 'Supporters',
      event_module: 'Events',
      wallet_module: 'Wallet',
      ranking_module: 'Rankings and stats',
      support_module: 'Support and alerts',
      analytics_module: 'Analytics overview',
      orders_module: 'Orders',
      player_module: 'Players',
      sync_agent: 'Server Bot',
      execute_agent: 'Delivery Agent',
      discord_integration: 'Discord integration',
    };
    return dictionary[key] || key;
  }

  function renderBadge(label, tone) {
    return `<span class="tdv4-badge tdv4-badge-${escapeHtml(tone || 'muted')}">${escapeHtml(label)}</span>`;
  }

  function renderNavGroup(group) {
    return [
      '<section class="tdv4-nav-group">',
      `<div class="tdv4-nav-group-label">${escapeHtml(group.label)}</div>`,
      '<div class="tdv4-nav-items">',
      ...(Array.isArray(group.items) ? group.items.map((item) => {
        const currentClass = item.current ? ' tdv4-nav-link-current' : '';
        return `<a class="tdv4-nav-link${currentClass}" href="${escapeHtml(item.href || '#')}">${escapeHtml(item.label)}</a>`;
      }) : []),
      '</div>',
      '</section>',
    ].join('');
  }

  function renderSummaryCard(item) {
    return [
      `<article class="tdv4-kpi tdv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<div class="tdv4-kpi-label">${escapeHtml(item.label)}</div>`,
      `<div class="tdv4-kpi-value">${escapeHtml(item.value)}</div>`,
      `<div class="tdv4-kpi-detail">${escapeHtml(item.detail)}</div>`,
      '</article>',
    ].join('');
  }

  function buildRuntimeHealth(state) {
    const rows = Array.isArray(state?.agents) ? state.agents : [];
    const syncOnline = rows.some((row) => String(row?.role || '').trim() === 'sync' && String(row?.status || '').trim() === 'online');
    const executeOnline = rows.some((row) => String(row?.role || '').trim() === 'execute' && String(row?.status || '').trim() === 'online');
    return {
      syncOnline,
      executeOnline,
      syncCount: rows.filter((row) => String(row?.role || '').trim() === 'sync').length,
      executeCount: rows.filter((row) => String(row?.role || '').trim() === 'execute').length,
    };
  }

  function resolveRuntimeIssue(entry, runtimeHealth, effectiveEnabled) {
    if (!effectiveEnabled || !entry?.runtimeRole) return null;
    if (entry.runtimeRole === 'sync' && !runtimeHealth.syncOnline) {
      return {
        label: 'Server Bot is offline',
        detail: 'This module needs a connected Server Bot before the workflow can stay healthy in live operations.',
        href: entry.runtimeHref || '/tenant/server-bots',
        actionLabel: 'Open Server Bot',
      };
    }
    if (entry.runtimeRole === 'execute' && !runtimeHealth.executeOnline) {
      return {
        label: 'Delivery Agent is offline',
        detail: 'This module needs a connected Delivery Agent before live execution can complete reliably.',
        href: entry.runtimeHref || '/tenant/delivery-agents',
        actionLabel: 'Open Delivery Agent',
      };
    }
    return null;
  }

  function resolveModuleState(entry, runtimeHealth) {
    const packageEnabled = entry.packageEnabled === true;
    const effectiveEnabled = entry.effectiveEnabled === true;
    const manageable = entry.manageable === true;
    const missingDependencies = Array.isArray(entry.missingDependencies) ? entry.missingDependencies : [];
    const runtimeIssue = resolveRuntimeIssue(entry, runtimeHealth, effectiveEnabled);

    if (!manageable) {
      return {
        label: 'Package upgrade required',
        tone: 'warning',
        detail: 'This module is outside the current package, so it cannot be enabled from this page yet.',
      };
    }
    if (effectiveEnabled && missingDependencies.length > 0) {
      return {
        label: 'Dependency missing',
        tone: 'warning',
        detail: `Missing: ${missingDependencies.map(humanizeFeatureKey).join(', ')}`,
      };
    }
    if (runtimeIssue) {
      return {
        label: runtimeIssue.label,
        tone: 'warning',
        detail: runtimeIssue.detail,
      };
    }
    if (effectiveEnabled) {
      return {
        label: 'Live',
        tone: 'success',
        detail: 'This module is already enabled and ready for daily tenant operations.',
      };
    }
    if (packageEnabled) {
      return {
        label: 'Ready to enable',
        tone: 'info',
        detail: 'This module is included in the package and can be turned on from this page.',
      };
    }
    return {
      label: 'Locked by package',
      tone: 'muted',
      detail: 'This module is not included in the current package.',
    };
  }

  function resolveNextAction(entry) {
    const missingDependencies = Array.isArray(entry?.missingDependencies) ? entry.missingDependencies : [];
    if (missingDependencies.length > 0) {
      const dependencyKey = missingDependencies[0];
      const dependencyAction = entry?.dependencyActions?.[dependencyKey];
      return {
        label: dependencyAction?.label || `Open ${humanizeFeatureKey(dependencyKey)}`,
        href: dependencyAction?.href || '#',
        detail: `Enable ${humanizeFeatureKey(dependencyKey)} before turning on ${entry?.title || humanizeFeatureKey(entry?.featureKey)}.`,
      };
    }
    if (entry?.runtimeIssue) {
      return {
        label: entry.runtimeIssue.actionLabel,
        href: entry.runtimeIssue.href,
        detail: entry.runtimeIssue.detail,
      };
    }
    if (entry?.manageable !== true) {
      return {
        label: 'Review packages',
        href: '/tenant/billing',
        detail: 'Use billing to review the package policy and available upgrade paths.',
      };
    }
    return {
      label: entry?.actionLabel || 'Open workspace',
      href: entry?.actionHref || '#',
      detail: entry?.effectiveEnabled
        ? 'Open the workspace this module already uses in day-to-day operations.'
        : 'Open the related workspace first, then decide whether this module should go live.',
    };
  }

  function buildRolloutGroup(title, tone, rows, emptyDetail) {
    return {
      title,
      tone,
      count: rows.length,
      rows,
      emptyDetail,
    };
  }

  function createTenantModulesV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const runtimeHealth = buildRuntimeHealth(state);
    const packageFeatureSet = new Set(
      Array.isArray(state?.overview?.tenantFeatureAccess?.package?.features)
        ? state.overview.tenantFeatureAccess.package.features.map((value) => String(value || '').trim()).filter(Boolean)
        : [],
    );
    const effectiveFeatureSet = new Set(
      Array.isArray(state?.overview?.tenantFeatureAccess?.enabledFeatureKeys)
        ? state.overview.tenantFeatureAccess.enabledFeatureKeys.map((value) => String(value || '').trim()).filter(Boolean)
        : [],
    );
    const featureFlags = state?.tenantConfig?.featureFlags && typeof state.tenantConfig.featureFlags === 'object'
      ? state.tenantConfig.featureFlags
      : {};
    const locked = Boolean(state?.featureEntitlements?.actions?.can_use_modules?.locked);
    const lockReason = String(state?.featureEntitlements?.actions?.can_use_modules?.reason || '').trim();
    const modules = MODULE_CATALOG.map((entry) => {
      const packageEnabled = packageFeatureSet.has(entry.featureKey);
      const effectiveEnabled = effectiveFeatureSet.has(entry.featureKey);
      const manageable = packageEnabled || effectiveEnabled;
      const missingDependencies = entry.dependencies.filter((dependency) => !effectiveFeatureSet.has(dependency));
      const runtimeIssue = resolveRuntimeIssue({
        ...entry,
        packageEnabled,
        effectiveEnabled,
        manageable,
        missingDependencies,
      }, runtimeHealth, effectiveEnabled);
      const stateDescriptor = resolveModuleState({
        ...entry,
        packageEnabled,
        effectiveEnabled,
        manageable,
        missingDependencies,
        runtimeIssue,
      }, runtimeHealth);
      return {
        ...entry,
        packageEnabled,
        effectiveEnabled,
        manageable,
        missingDependencies,
        runtimeIssue,
        stateLabel: stateDescriptor.label,
        stateTone: stateDescriptor.tone,
        stateDetail: stateDescriptor.detail,
        overrideState: Object.prototype.hasOwnProperty.call(featureFlags, entry.featureKey)
          ? featureFlags[entry.featureKey]
          : null,
        nextAction: resolveNextAction({
          ...entry,
          packageEnabled,
          effectiveEnabled,
          manageable,
          missingDependencies,
          runtimeIssue,
        }),
      };
    });
    const runtimeBlockedCount = modules.filter((row) => row.runtimeIssue).length;
    const dependencyBlockedCount = modules.filter((row) => row.effectiveEnabled && row.missingDependencies.length > 0).length;
    const upgradeRequiredCount = modules.filter((row) => !row.manageable).length;
    const topActions = modules
      .filter((row) => row.nextAction && (row.runtimeIssue || row.missingDependencies.length > 0 || !row.manageable))
      .slice(0, 4)
      .map((row) => ({
        featureKey: row.featureKey,
        title: row.title,
        stateLabel: row.stateLabel,
        action: row.nextAction,
      }));
    const rolloutGroups = [
      buildRolloutGroup(
        'Ready to enable',
        'success',
        modules.filter((row) => row.manageable && !row.effectiveEnabled && row.missingDependencies.length === 0 && !row.runtimeIssue),
        'No additional module is ready to turn on right now.',
      ),
      buildRolloutGroup(
        'Missing dependencies',
        'warning',
        modules.filter((row) => row.missingDependencies.length > 0),
        'No module is blocked by dependency gaps right now.',
      ),
      buildRolloutGroup(
        'Waiting on runtime',
        'warning',
        modules.filter((row) => Boolean(row.runtimeIssue)),
        'No module is waiting on runtime connectivity right now.',
      ),
      buildRolloutGroup(
        'Upgrade required',
        'muted',
        modules.filter((row) => !row.manageable),
        'Everything visible here already belongs to the active package.',
      ),
    ];

    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Tenant admin',
        workspaceLabel: firstNonEmpty([
          state?.tenantLabel,
          state?.tenantConfig?.name,
          state?.overview?.tenantName,
          state?.me?.tenantId,
          'Tenant workspace',
        ]),
        navGroups: Array.isArray(state?.__surfaceShell?.navGroups) ? state.__surfaceShell.navGroups : [],
      },
      header: {
        title: 'Bot modules',
        subtitle: 'Turn tenant modules on or off without mixing package policy into daily operating work.',
        statusChips: [
          { label: `${formatNumber(modules.filter((row) => row.effectiveEnabled).length)} modules live`, tone: 'success' },
          { label: `${formatNumber(modules.filter((row) => row.manageable).length)} modules manageable`, tone: 'info' },
          { label: runtimeBlockedCount ? `${formatNumber(runtimeBlockedCount)} waiting on runtime` : 'Runtimes ready', tone: runtimeBlockedCount ? 'warning' : 'success' },
          { label: locked ? 'Package locked' : 'Ready to save', tone: locked ? 'warning' : 'success' },
        ],
        primaryAction: { label: 'Save changes', href: '#tenant-modules-save' },
      },
      summaryStrip: [
        { label: 'Live now', value: formatNumber(modules.filter((row) => row.effectiveEnabled).length), detail: 'Modules currently active for this tenant.', tone: 'success' },
        { label: 'Package locked', value: formatNumber(upgradeRequiredCount), detail: locked ? lockReason || 'Some modules still require a package upgrade.' : 'Package-locked modules remain visible here for planning.', tone: upgradeRequiredCount ? 'warning' : 'muted' },
        { label: 'Missing dependencies', value: formatNumber(dependencyBlockedCount), detail: 'Enabled modules with unresolved dependencies stay visible here until the chain is complete.', tone: dependencyBlockedCount ? 'warning' : 'info' },
        { label: 'Waiting on runtime', value: formatNumber(runtimeBlockedCount), detail: 'Some modules still need Server Bot or Delivery Agent connectivity before live operations settle down.', tone: runtimeBlockedCount ? 'warning' : 'success' },
        { label: 'Stored in tenant config', value: 'Tenant feature flags', detail: 'This page only changes tenant overrides. It does not rewrite the package itself.', tone: 'info' },
      ],
      locked,
      lockReason,
      topActions,
      rolloutGroups,
      runtimeHealth,
      modules,
    };
  }

  function buildTenantModulesV4Html(model) {
    const safe = model || createTenantModulesV4Model({});
    return [
      '<div class="tdv4-app">',
      '<header class="tdv4-topbar"><div class="tdv4-brand-row">',
      `<div class="tdv4-brand-mark">${escapeHtml(safe.shell.brand)}</div>`,
      '<div class="tdv4-brand-copy">',
      `<div class="tdv4-surface-label">${escapeHtml(safe.shell.surfaceLabel)}</div>`,
      `<div class="tdv4-workspace-label">${escapeHtml(safe.shell.workspaceLabel)}</div>`,
      '</div></div></header>',
      '<div class="tdv4-shell">',
      `<aside class="tdv4-sidebar">${(Array.isArray(safe.shell.navGroups) ? safe.shell.navGroups : []).map(renderNavGroup).join('')}</aside>`,
      '<main class="tdv4-main tdv4-stack">',
      '<section class="tdv4-pagehead tdv4-panel">',
      '<div>',
      `<h1 class="tdv4-page-title">${escapeHtml(safe.header.title)}</h1>`,
      `<p class="tdv4-page-subtitle">${escapeHtml(safe.header.subtitle)}</p>`,
      `<div class="tdv4-chip-row">${safe.header.statusChips.map((chip) => renderBadge(chip.label, chip.tone)).join('')}</div>`,
      '</div>',
      `<div class="tdv4-pagehead-actions"><button id="tenant-modules-save" class="tdv4-button tdv4-button-primary" type="button" data-tenant-modules-save${safe.locked ? ' disabled' : ''}>${escapeHtml(safe.header.primaryAction.label)}</button></div>`,
      '</section>',
      `<section class="tdv4-kpi-strip">${safe.summaryStrip.map(renderSummaryCard).join('')}</section>`,
      `<section class="tdv4-spotlight-grid"><article class="tdv4-panel tdv4-tone-${safe.locked ? 'warning' : 'info'}"><div class="tdv4-section-kicker">Operating rules</div><h2 class="tdv4-section-title">Only toggle what the tenant can truly control</h2><p class="tdv4-section-copy">Use this page for tenant-owned module overrides only. When a module is blocked by package policy, missing dependencies, or runtime readiness, the reason stays visible before anyone saves.</p>${safe.locked ? `<div class="tdv4-chip-row">${renderBadge(safe.lockReason || 'Upgrade the package to unlock more modules.', 'warning')}</div>` : ''}<div class="tdv4-action-list"><a class="tdv4-button tdv4-button-primary" href="#tenant-modules-save">Save when ready</a><a class="tdv4-button tdv4-button-secondary" href="/tenant/billing">Review billing</a><a class="tdv4-button tdv4-button-secondary" href="/tenant/server-bots">Open Server Bot</a></div></article><article class="tdv4-spotlight-media" style="--tdv4-media-image: linear-gradient(135deg, rgba(8, 12, 10, 0.5), rgba(8, 12, 10, 0.18)), url('/admin/assets/tenant-panel-scene.svg');"><div class="tdv4-spotlight-overlay"><span class="tdv4-section-kicker">Module overview</span><h3 class="tdv4-section-title">See what should go live next and what is still blocked</h3><p class="tdv4-section-copy tdv4-spotlight-copy">The page should answer, at a glance, which modules are ready, which still need more access, and which are waiting on a runtime connection.</p></div></article></section>`,
      '<section class="tdv4-panel" data-tenant-modules-rollout-board>',
      '<div class="tdv4-section-kicker">Readiness board</div>',
      '<h2 class="tdv4-section-title">Module rollout board</h2>',
      '<p class="tdv4-section-copy">See which modules are ready now, which still depend on other features, and which need a runtime connection before they are operationally safe.</p>',
      `<div class="tdv4-action-list">${(Array.isArray(safe.rolloutGroups) ? safe.rolloutGroups : []).map((group) => [
        `<article class="tdv4-panel tdv4-tone-${escapeHtml(group.tone || 'muted')}" data-tenant-module-rollout-group="${escapeHtml(group.title || '')}">`,
        `<div class="tdv4-section-kicker">${renderBadge(`${formatNumber(group.count)} modules`, group.tone)}</div>`,
        `<h3 class="tdv4-section-title">${escapeHtml(group.title || '')}</h3>`,
        group.rows.length
          ? `<div class="tdv4-action-list">${group.rows.slice(0, 4).map((row) => [
            `<div class="tdv4-note-card" data-tenant-module-rollout-item="${escapeHtml(row.featureKey)}">`,
            `<strong>${escapeHtml(row.title)}</strong>`,
            `<p>${escapeHtml(row.stateDetail || row.stateLabel || '')}</p>`,
            row.nextAction
              ? `<a class="tdv4-button tdv4-button-secondary" href="${escapeHtml(row.nextAction.href || '#')}">${escapeHtml(row.nextAction.label || 'Open workspace')}</a>`
              : '',
            '</div>',
          ].join('')).join('')}</div>`
          : `<div class="tdv4-note-card">${escapeHtml(group.emptyDetail || 'Nothing is waiting in this bucket right now.')}</div>`,
        '</article>',
      ].join('')).join('')}</div>`,
      '</section>',
      '<section class="tdv4-panel" data-tenant-modules-next-actions>',
      '<div class="tdv4-section-kicker">What to do next</div>',
      '<h2 class="tdv4-section-title">Module follow-up queue</h2>',
      '<p class="tdv4-section-copy">Clear package, dependency, or runtime blockers first, then save the next round of module changes when the tenant is ready.</p>',
      safe.topActions.length
        ? `<div class="tdv4-action-list">${safe.topActions.map((item) => [
          `<article class="tdv4-panel tdv4-tone-${escapeHtml(item.action?.href === '/tenant/billing' ? 'warning' : 'info')}">`,
          `<div class="tdv4-section-kicker">${escapeHtml(humanizeFeatureKey(item.featureKey))}</div>`,
          `<h3 class="tdv4-section-title">${escapeHtml(item.title)}</h3>`,
          `<p class="tdv4-section-copy">${escapeHtml(item.action?.detail || item.stateLabel || '')}</p>`,
          `<div class="tdv4-chip-row">${renderBadge(item.stateLabel, 'warning')}</div>`,
          `<div class="tdv4-action-list"><a class="tdv4-button tdv4-button-secondary" href="${escapeHtml(item.action?.href || '#')}">${escapeHtml(item.action?.label || 'Open workspace')}</a></div>`,
          '</article>',
        ].join('')).join('')}</div>`
        : '<div class="tdv4-note-card">No urgent module follow-up is waiting right now.</div>',
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">All modules</div>',
      '<h2 class="tdv4-section-title">Modules visible to this tenant</h2>',
      '<p class="tdv4-section-copy">Change the desired state and save when ready. Reset restores the package baseline before anything is written.</p>',
      '<div class="tdv4-action-list">',
      `<button class="tdv4-button tdv4-button-secondary" type="button" data-tenant-modules-reset${safe.locked ? ' disabled' : ''}>Reset to package defaults</button>`,
      '</div>',
      safe.modules.map((row) => [
        `<article class="tdv4-panel tdv4-tone-${row.stateTone}" data-tenant-module-card="${escapeHtml(row.featureKey)}">`,
        `<div class="tdv4-section-kicker">${escapeHtml(row.featureKey)}</div>`,
        `<h3 class="tdv4-section-title">${escapeHtml(row.title)}</h3>`,
        `<p class="tdv4-section-copy">${escapeHtml(row.description)}</p>`,
        '<div class="tdv4-chip-row">',
        renderBadge(row.packageEnabled ? 'In package' : 'Upgrade package', row.packageEnabled ? 'info' : 'warning'),
        renderBadge(row.effectiveEnabled ? 'Live' : 'Off', row.effectiveEnabled ? 'success' : 'muted'),
        renderBadge(row.stateLabel, row.stateTone),
        row.overrideState === true ? renderBadge('Forced on', 'success') : '',
        row.overrideState === false ? renderBadge('Forced off', 'warning') : '',
        '</div>',
        `<div class="tdv4-kpi-detail" data-tenant-module-status="${escapeHtml(row.featureKey)}">${escapeHtml(row.stateDetail)}</div>`,
        `<div class="tdv4-kpi-detail">Dependencies: ${escapeHtml(row.dependencies.length ? row.dependencies.map(humanizeFeatureKey).join(', ') : 'None')}</div>`,
        row.missingDependencies.length
          ? `<div class="tdv4-kpi-detail">Missing now: ${escapeHtml(row.missingDependencies.map(humanizeFeatureKey).join(', '))}</div>`
          : '<div class="tdv4-kpi-detail">Dependencies satisfied.</div>',
        row.nextAction
          ? `<div class="tdv4-action-list"><a class="tdv4-button tdv4-button-secondary" data-tenant-module-action-link="${escapeHtml(row.featureKey)}" href="${escapeHtml(row.nextAction.href || '#')}">${escapeHtml(row.nextAction.label || 'Open workspace')}</a></div>`
          : '',
        '<label class="tdv4-basic-field">',
        '<div class="tdv4-basic-field-copy"><div class="tdv4-basic-field-label">Enable module</div><div class="tdv4-basic-field-detail">Package-locked modules remain visible here, but they still need an upgrade before they can be enabled from this page.</div></div>',
        `<input type="checkbox" data-module-toggle data-module-feature-key="${escapeHtml(row.featureKey)}" data-module-package-enabled="${row.packageEnabled ? 'true' : 'false'}" data-module-depends-on="${escapeHtml(row.dependencies.join(','))}"${row.effectiveEnabled ? ' checked' : ''}${(!row.manageable || safe.locked) ? ' disabled' : ''}>`,
        '</label>',
        '</article>',
      ].join('')).join(''),
      '</section>',
      '</main>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderTenantModulesV4(rootElement, source) {
    if (!rootElement) throw new Error('renderTenantModulesV4 requires a root element');
    const model = source && source.header && Array.isArray(source.modules)
      ? source
      : createTenantModulesV4Model(source);
    rootElement.innerHTML = buildTenantModulesV4Html(model);
    return model;
  }

  return {
    buildTenantModulesV4Html,
    createTenantModulesV4Model,
    renderTenantModulesV4,
  };
});
