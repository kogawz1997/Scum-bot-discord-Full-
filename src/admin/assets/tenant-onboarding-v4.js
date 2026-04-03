(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantOnboardingV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const SERVER_BOT_SIGNALS = ['sync', 'watcher', 'watch', 'log', 'config', 'restart', 'read', 'monitor'];
  const DELIVERY_SIGNALS = ['execute', 'delivery', 'dispatch', 'command', 'console-agent', 'announce', 'write'];

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function firstNonEmpty(values, fallback) {
    const rows = Array.isArray(values) ? values : [values];
    for (const value of rows) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
    return fallback || '';
  }

  function formatNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat('en-US').format(numeric) : (fallback || '0');
  }

  function renderBadge(label, tone) {
    return '<span class="tdv4-badge tdv4-badge-' + escapeHtml(tone || 'muted') + '">' + escapeHtml(label) + '</span>';
  }

  function renderNavGroup(group) {
    return [
      '<section class="tdv4-nav-group">',
      '<div class="tdv4-nav-group-label">' + escapeHtml(group.label) + '</div>',
      '<div class="tdv4-nav-items">',
      ...(Array.isArray(group.items) ? group.items.map(function (item) {
        return '<a class="tdv4-nav-link' + (item.current ? ' tdv4-nav-link-current' : '') + '" href="' + escapeHtml(item.href || '#') + '">' + escapeHtml(item.label) + '</a>';
      }) : []),
      '</div>',
      '</section>',
    ].join('');
  }

  function renderSummaryCard(item) {
    return [
      '<article class="tdv4-kpi tdv4-tone-' + escapeHtml(item.tone || 'muted') + '">',
      '<div class="tdv4-kpi-label">' + escapeHtml(item.label) + '</div>',
      '<div class="tdv4-kpi-value">' + escapeHtml(item.value) + '</div>',
      '<div class="tdv4-kpi-detail">' + escapeHtml(item.detail) + '</div>',
      '</article>',
    ].join('');
  }

  function statusTone(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['online', 'ready', 'healthy', 'active'].includes(normalized)) return 'success';
    if (['pending_activation', 'pending-activation', 'draft', 'provisioned', 'degraded', 'stale'].includes(normalized)) return 'warning';
    if (['offline', 'revoked', 'error', 'failed'].includes(normalized)) return 'danger';
    return 'muted';
  }

  function normalizeCapabilities(value) {
    const raw = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[,\n]+/g)
        : [];
    return raw.map(function (entry) {
      return String(entry || '').trim().toLowerCase();
    }).filter(Boolean);
  }

  function isServerBot(row) {
    const meta = row && typeof row.meta === 'object' ? row.meta : {};
    const role = String(meta.agentRole || meta.role || row.role || '').trim().toLowerCase();
    const scope = String(meta.agentScope || meta.scope || row.scope || '').trim().toLowerCase();
    if (['sync', 'hybrid'].includes(role) || ['sync_only', 'sync-only', 'synconly', 'sync_execute', 'sync-execute'].includes(scope)) return true;
    const text = [
      row && row.runtimeKey,
      row && row.channel,
      row && row.name,
      row && row.status,
      row && row.role,
      row && row.scope,
      meta.agentRole,
      meta.agentScope,
      ...normalizeCapabilities(meta.capabilities || meta.features),
    ].map(function (entry) {
      return String(entry || '').trim().toLowerCase();
    }).filter(Boolean).join(' ');
    return SERVER_BOT_SIGNALS.some(function (token) { return text.includes(token); });
  }

  function isDeliveryAgent(row) {
    const meta = row && typeof row.meta === 'object' ? row.meta : {};
    const role = String(meta.agentRole || meta.role || row.role || '').trim().toLowerCase();
    const scope = String(meta.agentScope || meta.scope || row.scope || '').trim().toLowerCase();
    if (role === 'execute' || ['execute_only', 'execute-only', 'executeonly'].includes(scope)) return true;
    const text = [
      row && row.runtimeKey,
      row && row.channel,
      row && row.name,
      row && row.status,
      row && row.role,
      row && row.scope,
      meta.agentRole,
      meta.agentScope,
      ...normalizeCapabilities(meta.capabilities || meta.features),
    ].map(function (entry) {
      return String(entry || '').trim().toLowerCase();
    }).filter(Boolean).join(' ');
    return DELIVERY_SIGNALS.some(function (token) { return text.includes(token); });
  }

  function normalizeSubscriptionStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (['trial', 'trialing'].includes(normalized)) return 'trial';
    if (normalized === 'active') return 'active';
    if (['expired', 'cancelled', 'canceled'].includes(normalized)) return 'expired';
    if (['suspended', 'past_due', 'failed', 'pending', 'paused', 'inactive'].includes(normalized)) return 'suspended';
    return normalized;
  }

  function actionEntitlement(state, key) {
    return state && state.featureEntitlements && state.featureEntitlements.actions
      ? state.featureEntitlements.actions[key] || null
      : null;
  }

  function sectionEntitlement(state, key) {
    return state && state.featureEntitlements && state.featureEntitlements.sections
      ? state.featureEntitlements.sections[key] || null
      : null;
  }

  function buildUpgradeAction(value) {
    if (!value || typeof value !== 'object') return null;
    const href = String(value.href || '').trim();
    const label = String(value.label || '').trim();
    if (!href || !label) return null;
    return { href: href, label: label };
  }

  function packageLabel(state) {
    return firstNonEmpty([
      state && state.featureEntitlements && state.featureEntitlements.package && state.featureEntitlements.package.name,
      state && state.billingOverview && state.billingOverview.packageName,
      state && state.quota && state.quota.package && state.quota.package.name,
      state && state.quota && state.quota.plan && state.quota.plan.name,
      state && state.tenantConfig && state.tenantConfig.packageName,
      'No package assigned',
    ], 'No package assigned');
  }

  function subscriptionStatusLabel(value) {
    const normalized = normalizeSubscriptionStatus(value);
    if (normalized === 'active') return 'Active';
    if (normalized === 'trial') return 'Trial';
    if (normalized === 'expired') return 'Expired';
    if (normalized === 'suspended') return 'Suspended';
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Not set';
  }

  function subscriptionTone(value) {
    const normalized = normalizeSubscriptionStatus(value);
    if (normalized === 'active') return 'success';
    if (normalized === 'trial') return 'info';
    if (normalized === 'expired') return 'danger';
    if (normalized === 'suspended') return 'warning';
    return 'muted';
  }

  function buildStep(options) {
    const locked = Boolean(options && options.locked);
    const blocked = !locked && Boolean(options && options.blocked);
    const done = !locked && !blocked && Boolean(options && options.done);
    const tone = locked ? 'danger' : blocked ? 'warning' : done ? 'success' : 'warning';
    const stateLabel = locked ? 'locked' : blocked ? 'blocked' : done ? 'complete' : 'needs setup';
    return {
      key: String(options && options.key || '').trim(),
      title: String(options && options.title || '').trim(),
      detail: String(options && options.detail || '').trim(),
      done: done,
      blocked: blocked,
      locked: locked,
      tone: tone,
      stateLabel: stateLabel,
      reason: firstNonEmpty([
        options && options.reason,
        locked ? 'This step is locked in the current package.' : '',
        blocked ? 'Finish the earlier setup step first.' : '',
        done ? 'This step is already complete.' : '',
      ], ''),
      href: String(options && options.href || '#').trim() || '#',
      actionLabel: String(options && options.actionLabel || '').trim(),
      upgradeAction: buildUpgradeAction(options && options.upgradeAction),
    };
  }

  function buildChecklist(state) {
    const runtimes = Array.isArray(state.agents) ? state.agents : [];
    const provisioning = Array.isArray(state.agentProvisioning) ? state.agentProvisioning : [];
    const configWorkspace = state && state.serverConfigWorkspace && typeof state.serverConfigWorkspace === 'object'
      ? state.serverConfigWorkspace
      : null;
    const serverBots = runtimes.filter(isServerBot);
    const deliveryAgents = runtimes.filter(isDeliveryAgent);
    const serverBotProvisioning = provisioning.filter(isServerBot);
    const deliveryProvisioning = provisioning.filter(isDeliveryAgent);
    const hasServerBot = serverBots.length > 0 || serverBotProvisioning.length > 0;
    const hasDeliveryAgent = deliveryAgents.length > 0 || deliveryProvisioning.length > 0;
    const serverBotOnline = serverBots.some(function (row) {
      return statusTone(row && row.status) === 'success';
    });
    const deliveryOnline = deliveryAgents.some(function (row) {
      return statusTone(row && row.status) === 'success';
    });
    const hasActiveServer = Boolean(state && state.activeServer && typeof state.activeServer === 'object');
    const hasConfig = Boolean(
      Array.isArray(configWorkspace && configWorkspace.categories) && configWorkspace.categories.length
      || Array.isArray(configWorkspace && configWorkspace.files) && configWorkspace.files.length
      || Array.isArray(configWorkspace && configWorkspace.groups) && configWorkspace.groups.length
    );
    const deliveryAction = actionEntitlement(state, 'can_create_delivery_agent');
    const serverBotAction = actionEntitlement(state, 'can_create_server_bot');
    const editConfigAction = actionEntitlement(state, 'can_edit_config');
    const serverStatusSection = sectionEntitlement(state, 'server');
    const readyForDailyWork = hasActiveServer && serverBotOnline && deliveryOnline && hasConfig;

    return [
      buildStep({
        key: 'create-server-bot',
        title: 'Create Server Bot',
        detail: 'Issue the setup token for the machine that can read SCUM.log and edit server config.',
        done: hasServerBot,
        locked: Boolean(serverBotAction && serverBotAction.locked),
        reason: serverBotAction && serverBotAction.locked
          ? serverBotAction.reason
          : hasServerBot
            ? 'A Server Bot record or setup token already exists for this tenant.'
            : 'Create the first Server Bot so the server-side machine can connect.',
        href: '/tenant/runtimes/server-bots',
        actionLabel: hasServerBot ? 'Review Server Bot' : 'Create Server Bot',
        upgradeAction: serverBotAction && serverBotAction.upgradeCta,
      }),
      buildStep({
        key: 'connect-server-bot',
        title: 'Connect Server Bot',
        detail: 'The bot should come online before config apply and restart actions become dependable.',
        done: serverBotOnline,
        blocked: !hasServerBot,
        locked: Boolean(serverBotAction && serverBotAction.locked),
        reason: serverBotAction && serverBotAction.locked
          ? serverBotAction.reason
          : !hasServerBot
            ? 'Create a Server Bot first so the install instructions and setup token are available.'
            : serverBotOnline
              ? 'The Server Bot is online and reporting fresh activity.'
              : 'Run the setup command on the server-side machine, then wait for the bot to report online.',
        href: '/tenant/runtimes/server-bots',
        actionLabel: serverBotOnline ? 'Server Bot online' : 'Finish Server Bot setup',
        upgradeAction: serverBotAction && serverBotAction.upgradeCta,
      }),
      buildStep({
        key: 'create-delivery-agent',
        title: 'Create Delivery Agent',
        detail: 'Issue the setup token for the machine that can keep the SCUM client open for deliveries.',
        done: hasDeliveryAgent,
        locked: Boolean(deliveryAction && deliveryAction.locked),
        reason: deliveryAction && deliveryAction.locked
          ? deliveryAction.reason
          : hasDeliveryAgent
            ? 'A Delivery Agent record or setup token already exists for this tenant.'
            : 'Create the first Delivery Agent so in-game delivery can be connected later.',
        href: '/tenant/runtimes/delivery-agents',
        actionLabel: hasDeliveryAgent ? 'Review Delivery Agent' : 'Create Delivery Agent',
        upgradeAction: deliveryAction && deliveryAction.upgradeCta,
      }),
      buildStep({
        key: 'connect-delivery-agent',
        title: 'Connect Delivery Agent',
        detail: 'The delivery machine should come online before live order delivery becomes reliable.',
        done: deliveryOnline,
        blocked: !hasDeliveryAgent,
        locked: Boolean(deliveryAction && deliveryAction.locked),
        reason: deliveryAction && deliveryAction.locked
          ? deliveryAction.reason
          : !hasDeliveryAgent
            ? 'Create a Delivery Agent first so the install instructions and setup token are available.'
            : deliveryOnline
              ? 'The Delivery Agent is online and ready for live delivery work.'
              : 'Run the setup command on the delivery machine and keep the SCUM client session ready.',
        href: '/tenant/runtimes/delivery-agents',
        actionLabel: deliveryOnline ? 'Delivery Agent online' : 'Finish Delivery Agent setup',
        upgradeAction: deliveryAction && deliveryAction.upgradeCta,
      }),
      buildStep({
        key: 'review-server-settings',
        title: 'Review Server Settings',
        detail: 'Open the config workspace, confirm the current values, and save when ready.',
        done: hasConfig,
        blocked: !hasActiveServer || !serverBotOnline,
        locked: Boolean(editConfigAction && editConfigAction.locked),
        reason: editConfigAction && editConfigAction.locked
          ? editConfigAction.reason
          : !hasActiveServer
            ? 'Connect or create a server first so the settings workspace knows which server to load.'
            : !hasServerBot
              ? 'Create a Server Bot first. The web app never reads server files directly.'
              : !serverBotOnline
                ? 'Bring the Server Bot online first so it can send the live config snapshot back to the platform.'
                : hasConfig
                  ? 'Live config values are available and ready to review.'
                  : 'Open Server Settings and wait for the first live config snapshot from the Server Bot.',
        href: '/tenant/server/config',
        actionLabel: hasConfig ? 'Open Server Settings' : 'Review Server Settings',
        upgradeAction: editConfigAction && editConfigAction.upgradeCta,
      }),
      buildStep({
        key: 'start-using',
        title: 'Start using the system',
        detail: 'Move into daily operations once the core runtime setup and server settings are ready.',
        done: readyForDailyWork,
        blocked: !readyForDailyWork,
        locked: Boolean(serverStatusSection && serverStatusSection.locked),
        reason: serverStatusSection && serverStatusSection.locked
          ? serverStatusSection.reason
          : readyForDailyWork
            ? 'Core setup is complete. You can move into daily operations now.'
            : !hasActiveServer
              ? 'Connect or create a server before daily operations can start.'
              : !serverBotOnline
                ? 'Bring the Server Bot online so sync, config, and restart actions are dependable.'
                : !deliveryOnline
                  ? 'Bring the Delivery Agent online before relying on live item delivery.'
                  : 'Review Server Settings first so the tenant starts from confirmed live values.',
        href: '/tenant',
        actionLabel: readyForDailyWork ? 'Open daily overview' : 'Finish setup first',
        upgradeAction: serverStatusSection && serverStatusSection.upgradeCta,
      }),
    ];
  }

  function buildPrimaryAction(checklist) {
    const nextItem = (Array.isArray(checklist) ? checklist : []).find(function (row) {
      return !row.done;
    });
    if (nextItem) {
      return {
        label: nextItem.actionLabel,
        href: nextItem.href,
      };
    }
    return {
      label: 'Open daily overview',
      href: '/tenant',
    };
  }

  function buildSystemReadiness(state, checklist) {
    const rows = Array.isArray(checklist) ? checklist : [];
    const completed = rows.filter(function (row) { return row.done; }).length;
    const total = rows.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const nextStep = rows.find(function (row) { return !row.done; }) || null;
    const warnings = rows
      .filter(function (row) { return !row.done && (row.blocked || row.locked); })
      .slice(0, 3)
      .map(function (row) {
        return {
          title: row.title,
          detail: row.reason,
          tone: row.locked ? 'danger' : 'warning',
        };
      });
    return {
      percent: percent,
      completed: completed,
      total: total,
      ready: total > 0 && completed === total,
      title: completed === total ? 'System readiness is complete' : 'Finish the missing setup steps first',
      detail: nextStep
        ? nextStep.reason || nextStep.detail
        : 'Server setup, live config, and runtime connections are ready for daily use.',
      nextStep: nextStep
        ? {
          title: nextStep.title,
          detail: nextStep.reason || nextStep.detail,
          href: nextStep.href,
          actionLabel: nextStep.actionLabel,
        }
        : {
          title: 'Start daily operations',
          detail: 'Open the daily overview and continue from server status, orders, players, or events.',
          href: '/tenant',
          actionLabel: 'Open daily overview',
        },
      warnings: warnings,
    };
  }

  function createTenantOnboardingV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const checklist = buildChecklist(state);
    const completed = checklist.filter(function (row) { return row.done; }).length;
    const activeServer = state && state.activeServer && typeof state.activeServer === 'object' ? state.activeServer : null;
    const primaryAction = buildPrimaryAction(checklist);
    const readiness = buildSystemReadiness(state, checklist);
    const subscriptionStatus = normalizeSubscriptionStatus(
      state && state.featureEntitlements && (state.featureEntitlements.subscriptionStatus
      || state.featureEntitlements.subscription && (state.featureEntitlements.subscription.lifecycleStatus || state.featureEntitlements.subscription.status))
      || state && state.billingOverview && (state.billingOverview.subscriptionStatus || state.billingOverview.lifecycleStatus)
      || state && state.quota && state.quota.subscription && (state.quota.subscription.lifecycleStatus || state.quota.subscription.status)
    );
    const currentPackageLabel = packageLabel(state);

    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Tenant admin',
        workspaceLabel: firstNonEmpty([
          state.tenantLabel,
          state.tenantConfig && state.tenantConfig.name,
          state.overview && state.overview.tenantName,
          state.me && state.me.tenantId,
          'Tenant workspace',
        ]),
        navGroups: Array.isArray(state.__surfaceShell && state.__surfaceShell.navGroups) ? state.__surfaceShell.navGroups : [],
      },
      header: {
        title: 'Onboarding',
        subtitle: 'Finish the first-time setup, then move into daily operations.',
        primaryAction: primaryAction,
        statusChips: [
          { label: formatNumber(completed) + ' of ' + formatNumber(checklist.length) + ' complete', tone: completed === checklist.length ? 'success' : 'info' },
          { label: activeServer ? 'Server ready' : 'No server connected', tone: activeServer ? 'success' : 'warning' },
          { label: 'Subscription ' + subscriptionStatusLabel(subscriptionStatus), tone: subscriptionTone(subscriptionStatus) },
        ],
      },
      summaryStrip: [
        { label: 'Checklist', value: formatNumber(completed) + '/' + formatNumber(checklist.length), detail: 'Setup steps completed inside this tenant', tone: completed === checklist.length ? 'success' : 'info' },
        { label: 'Package', value: currentPackageLabel, detail: 'Current package and feature access for this tenant', tone: subscriptionTone(subscriptionStatus) },
        { label: 'Server', value: activeServer ? firstNonEmpty([activeServer.name, activeServer.slug, activeServer.id], 'Connected') : 'Missing', detail: activeServer ? 'Current tenant server target' : 'Create or connect a server first', tone: activeServer ? 'success' : 'warning' },
        { label: 'Server Bot', value: checklist[1] && checklist[1].done ? 'Online' : (checklist[0] && checklist[0].done ? 'Pending' : 'Missing'), detail: 'Needed for config apply, sync, and restart jobs', tone: checklist[1] && checklist[1].done ? 'success' : ((checklist[0] && checklist[0].done) ? 'warning' : 'danger') },
        { label: 'Delivery Agent', value: checklist[3] && checklist[3].done ? 'Online' : (checklist[2] && checklist[2].done ? 'Pending' : 'Missing'), detail: 'Needed for live in-game item handoff', tone: checklist[3] && checklist[3].done ? 'success' : ((checklist[2] && checklist[2].done) ? 'warning' : 'danger') },
      ],
      progress: {
        completed: completed,
        total: checklist.length,
        percent: readiness.percent,
      },
      readiness: readiness,
      checklist: checklist,
    };
  }

  function buildTenantOnboardingV4Html(model) {
    const safe = model || createTenantOnboardingV4Model({});
    return [
      '<div class="tdv4-app">',
      '<header class="tdv4-topbar"><div class="tdv4-brand-row">',
      '<div class="tdv4-brand-mark">' + escapeHtml(safe.shell.brand) + '</div>',
      '<div class="tdv4-brand-copy"><div class="tdv4-surface-label">' + escapeHtml(safe.shell.surfaceLabel) + '</div><div class="tdv4-workspace-label">' + escapeHtml(safe.shell.workspaceLabel) + '</div></div>',
      '</div></header>',
      '<div class="tdv4-shell">',
      '<aside class="tdv4-sidebar">' + (Array.isArray(safe.shell.navGroups) ? safe.shell.navGroups.map(renderNavGroup).join('') : '') + '</aside>',
      '<main class="tdv4-main tdv4-stack">',
      '<section class="tdv4-pagehead tdv4-panel">',
      '<div><h1 class="tdv4-page-title">' + escapeHtml(safe.header.title) + '</h1><p class="tdv4-page-subtitle">' + escapeHtml(safe.header.subtitle) + '</p><div class="tdv4-chip-row">' + safe.header.statusChips.map(function (chip) { return renderBadge(chip.label, chip.tone); }).join('') + '</div></div>',
      '<div class="tdv4-pagehead-actions"><a class="tdv4-button tdv4-button-primary" href="' + escapeHtml(safe.header.primaryAction.href) + '">' + escapeHtml(safe.header.primaryAction.label) + '</a></div>',
      '</section>',
      '<section class="tdv4-kpi-strip">' + safe.summaryStrip.map(renderSummaryCard).join('') + '</section>',
      '<section class="tdv4-dual-grid">',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">Status</div>',
      '<h2 class="tdv4-section-title">Setup checklist</h2>',
      '<p class="tdv4-section-copy">Finish the missing steps in order. Each step opens the real workspace you will use every day after setup.</p>',
      safe.checklist.map(function (item) {
        return [
          '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(item.tone || 'warning') + '">',
          '<div class="tdv4-list-main"><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.detail) + '</p><div class="tdv4-chip-row">' + renderBadge(item.stateLabel, item.tone || 'warning') + '</div><p>' + escapeHtml(item.reason || '') + '</p></div>',
          '<div class="tdv4-action-list">',
          '<a class="tdv4-button tdv4-button-secondary" href="' + escapeHtml(item.href) + '">' + escapeHtml(item.actionLabel) + '</a>',
          item.upgradeAction
            ? '<a class="tdv4-button tdv4-button-secondary" href="' + escapeHtml(item.upgradeAction.href) + '">' + escapeHtml(item.upgradeAction.label) + '</a>'
            : '',
          '</div>',
          '</article>',
        ].join('');
      }).join(''),
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">Primary action</div>',
      '<h2 class="tdv4-section-title">' + escapeHtml(safe.readiness.title) + '</h2>',
      '<p class="tdv4-section-copy">' + escapeHtml(safe.readiness.detail) + '</p>',
      '<div class="tdv4-chip-row">' + renderBadge('Readiness ' + escapeHtml(String(safe.progress.percent)) + '%', safe.readiness.ready ? 'success' : 'warning') + renderBadge(String(safe.progress.completed) + ' / ' + String(safe.progress.total) + ' steps complete', 'info') + '</div>',
      '<div class="tdv4-list">',
      '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(safe.readiness.ready ? 'success' : 'warning') + '"><div class="tdv4-list-main"><strong>' + escapeHtml(safe.readiness.nextStep.title) + '</strong><p>' + escapeHtml(safe.readiness.nextStep.detail) + '</p></div><a class="tdv4-button tdv4-button-primary" href="' + escapeHtml(safe.readiness.nextStep.href) + '">' + escapeHtml(safe.readiness.nextStep.actionLabel) + '</a></article>',
      (Array.isArray(safe.readiness.warnings) && safe.readiness.warnings.length
        ? safe.readiness.warnings.map(function (warning) {
          return '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(warning.tone || 'warning') + '"><div class="tdv4-list-main"><strong>' + escapeHtml(warning.title) + '</strong><p>' + escapeHtml(warning.detail) + '</p></div></article>';
        }).join('')
        : '<article class="tdv4-list-item tdv4-tone-success"><div class="tdv4-list-main"><strong>No blocking setup issues right now</strong><p>The tenant can move forward without package or runtime blockers at the moment.</p></div></article>') +
      '</div>',
      '<div class="tdv4-section-kicker">Details / history</div>',
      '<h2 class="tdv4-section-title">What happens after setup</h2>',
      '<div class="tdv4-list">',
      '<article class="tdv4-list-item tdv4-tone-info"><div class="tdv4-list-main"><strong>Server Bot first</strong><p>Config save, apply, backup, and restart actions depend on the Server Bot being online.</p></div></article>',
      '<article class="tdv4-list-item tdv4-tone-info"><div class="tdv4-list-main"><strong>Delivery Agent second</strong><p>Orders can exist before it, but reliable in-game delivery starts only after the Delivery Agent connects.</p></div></article>',
      '<article class="tdv4-list-item tdv4-tone-info"><div class="tdv4-list-main"><strong>Then move into daily operations</strong><p>After setup, the Server, Orders, Players, and Events pages become the daily workspace.</p></div></article>',
      '</div>',
      '</section>',
      '</section>',
      '</main>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderTenantOnboardingV4(rootElement, source) {
    if (!rootElement) throw new Error('renderTenantOnboardingV4 requires a root element');
    const model = source && source.header && Array.isArray(source.checklist)
      ? source
      : createTenantOnboardingV4Model(source);
    rootElement.innerHTML = buildTenantOnboardingV4Html(model);
    return model;
  }

  return {
    buildTenantOnboardingV4Html: buildTenantOnboardingV4Html,
    createTenantOnboardingV4Model: createTenantOnboardingV4Model,
    renderTenantOnboardingV4: renderTenantOnboardingV4,
  };
});
