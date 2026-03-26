(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.OwnerDashboardV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const NAV_GROUPS = [
    { label: 'Platform', items: [
      { label: 'Overview', href: '#overview', current: true },
      { label: 'Tenants', href: '#tenants' },
      { label: 'Packages', href: '#packages' },
      { label: 'Subscriptions', href: '#subscriptions' },
    ] },
    { label: 'Operations', items: [
      { label: 'Runtime Health', href: '#runtime-health' },
      { label: 'Incidents', href: '#incidents' },
      { label: 'Jobs', href: '#jobs' },
      { label: 'Logs & Audit', href: '#audit' },
    ] },
    { label: 'Business', items: [
      { label: 'Billing', href: '#billing' },
      { label: 'Support', href: '#support' },
      { label: 'Security', href: '#security' },
      { label: 'Settings', href: '#settings' },
    ] },
  ];

  const ACTION_GROUPS = [
    { tone: 'warning', tag: 'Workflows', title: 'Support and incidents', detail: 'Start here when a tenant reports a problem, a queue stalls, or the owner needs to review active alerts first.', actions: [
      { label: 'Open incident inbox', href: '#incidents', primary: true },
      { label: 'Review support queue', href: '#support' },
      { label: 'Inspect delivery lifecycle', href: '#jobs' },
    ] },
    { tone: 'info', tag: 'Trust', title: 'Security and evidence', detail: 'Use this path when you need audit proof, access review, or an owner-safe evidence trail before changing anything sensitive.', actions: [
      { label: 'Open audit trail', href: '#audit', primary: true },
      { label: 'Review access sessions', href: '#security' },
      { label: 'Export observability', href: '#runtime-health' },
    ] },
    { tone: 'success', tag: 'Business', title: 'Commercial posture', detail: 'Keep renewals, quota pressure, and package posture visible before a tenant issue turns into churn or lost revenue.', actions: [
      { label: 'Review tenants', href: '#tenants', primary: true },
      { label: 'Check renewals', href: '#subscriptions' },
      { label: 'Open packages', href: '#packages' },
    ] },
  ];

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatNumber(value, fallback = '0') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat('th-TH').format(numeric) : fallback;
  }
  function parseDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function formatDateTime(value) {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Unknown time';
  }
  function formatRelative(value) {
    const date = parseDate(value);
    if (!date) return 'No recent signal';
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 60) return `${formatNumber(minutes)} minutes ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${formatNumber(hours)} hours ago`;
    return `${formatNumber(Math.round(hours / 24))} days ago`;
  }
  function firstNonEmpty(values, fallback = '') {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return fallback;
  }
  function listCount(list) {
    return Array.isArray(list) ? list.length : 0;
  }
  function toneForStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (['ready', 'healthy', 'active', 'online'].includes(raw)) return 'success';
    if (['warning', 'degraded', 'stale', 'slow', 'outdated'].includes(raw)) return 'warning';
    if (['offline', 'failed', 'error', 'expired', 'suspended'].includes(raw)) return 'danger';
    return 'muted';
  }
  function normalizeRuntimeRows(snapshot) {
    const services = snapshot && snapshot.services;
    if (Array.isArray(services)) return services;
    if (services && typeof services === 'object') {
      return Object.entries(services).map(([name, row]) => ({ name, ...(row && typeof row === 'object' ? row : {}) }));
    }
    return [];
  }
  function buildIncidentFeed(state) {
    const requestItems = Array.isArray(state.requestLogs && state.requestLogs.items)
      ? state.requestLogs.items.map((item) => ({
          source: 'requests',
          severity: Number(item.statusCode || 0) >= 500 ? 'danger' : 'warning',
          title: `${item.method || 'REQ'} ${item.path || item.routeGroup || 'request'}`,
          detail: `${item.statusCode || '-'} ${item.error || item.summary || item.requestId || ''}`.trim(),
          time: item.at || item.createdAt,
        }))
      : [];
    const alertItems = (Array.isArray(state.notifications) ? state.notifications : []).map((item) => ({
      source: 'alerts',
      severity: item.severity || 'warning',
      title: firstNonEmpty([item.title, item.label, 'Platform alert']),
      detail: firstNonEmpty([item.detail, item.message, 'Monitoring produced an owner-facing alert.']),
      time: item.createdAt || item.at,
    }));
    const securityItems = (Array.isArray(state.securityEvents) ? state.securityEvents : []).map((item) => ({
      source: 'security',
      severity: item.severity || 'info',
      title: item.type || 'Security event',
      detail: item.detail || item.reason || '',
      time: item.createdAt || item.at,
    }));
    return alertItems.concat(securityItems).concat(requestItems)
      .sort((left, right) => new Date(right.time || 0).getTime() - new Date(left.time || 0).getTime())
      .slice(0, 8);
  }
  function buildAttentionRows(state) {
    const tenants = Array.isArray(state.tenants) ? state.tenants : [];
    const subscriptions = Array.isArray(state.subscriptions) ? state.subscriptions : [];
    const quotaSnapshots = Array.isArray(state.tenantQuotaSnapshots) ? state.tenantQuotaSnapshots : [];
    const quotaMap = new Map(quotaSnapshots.map((row) => [String(row.tenantId || row.tenant && row.tenant.id || ''), row]));
    return tenants.map((tenant) => {
      const tenantId = String(tenant.id || '').trim();
      const subscription = subscriptions.find((row) => String(row.tenantId || row.ownerTenantId || '').trim() === tenantId) || {};
      const renewsAt = parseDate(subscription.renewsAt || subscription.expiresAt || subscription.endsAt);
      const quota = quotaMap.get(tenantId);
      const quotaText = quota && quota.quotas ? Object.entries(quota.quotas).slice(0, 2).map(([key, value]) => {
        const used = formatNumber(value && value.used, '0');
        const limit = value && value.unlimited ? 'unlimited' : formatNumber(value && value.limit, '0');
        return `${key}: ${used}/${limit}`;
      }).join(' · ') : 'Healthy quota posture';
      const expiringSoon = renewsAt ? (renewsAt.getTime() - Date.now()) <= 1000 * 60 * 60 * 24 * 14 : false;
      const tone = quota && quotaText !== 'Healthy quota posture' ? 'warning' : expiringSoon ? 'danger' : 'success';
      return {
        name: tenant.name || tenant.slug || tenantId || 'Unknown tenant',
        packageName: firstNonEmpty([subscription.packageName, subscription.planName, tenant.plan, tenant.type, 'No package']),
        detail: quota && quotaText !== 'Healthy quota posture' ? `Quota pressure · ${quotaText}` : expiringSoon ? `Renewal due ${formatDateTime(renewsAt)}` : `Status ${firstNonEmpty([subscription.status, tenant.status, 'active'])}`,
        meta: renewsAt ? formatRelative(renewsAt) : formatRelative(tenant.updatedAt || tenant.createdAt),
        tone,
      };
    }).sort((left, right) => ({ danger: 3, warning: 2, success: 1 }[right.tone] || 0) - ({ danger: 3, warning: 2, success: 1 }[left.tone] || 0)).slice(0, 6);
  }
  function buildHotspot(state) {
    return Array.isArray(state.requestLogs && state.requestLogs.metrics && state.requestLogs.metrics.routeHotspots)
      ? state.requestLogs.metrics.routeHotspots[0]
      : null;
  }

  function createOwnerDashboardV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const runtimeRows = normalizeRuntimeRows(state.runtimeSupervisor);
    const readyRuntimes = runtimeRows.filter((row) => toneForStatus(row.status) === 'success').length;
    const analytics = state.overview && state.overview.analytics ? state.overview.analytics : {};
    const tenants = analytics.tenants || {};
    const delivery = analytics.delivery || {};
    const subscriptions = analytics.subscriptions || {};
    const hotspot = buildHotspot(state);
    const feed = buildIncidentFeed(state);
    const expiringCount = (Array.isArray(state.subscriptions) ? state.subscriptions : []).filter((row) => {
      const renewsAt = parseDate(row.renewsAt || row.expiresAt || row.endsAt);
      return renewsAt && (renewsAt.getTime() - Date.now()) <= 1000 * 60 * 60 * 24 * 14;
    }).length;
    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Owner Panel V4 Preview',
        workspaceLabel: 'Platform Control',
        environmentLabel: 'Parallel V4',
        navGroups: NAV_GROUPS,
      },
      header: {
        title: 'Platform overview',
        subtitle: 'See tenant health, runtime readiness, risk pressure, and the next actions that matter most from a single owner command center.',
        statusChips: [
          { label: `${formatNumber(tenants.total || listCount(state.tenants), '0')} tenants`, tone: 'info' },
          { label: `${formatNumber(readyRuntimes, '0')}/${formatNumber(runtimeRows.length, '0')} runtimes ready`, tone: readyRuntimes === runtimeRows.length ? 'success' : 'warning' },
          { label: `${formatNumber(feed.length, '0')} active signals`, tone: feed.length > 0 ? 'warning' : 'success' },
          { label: `${formatNumber(expiringCount, '0')} renewals soon`, tone: expiringCount > 0 ? 'danger' : 'muted' },
        ],
        primaryAction: { label: 'Open incident inbox', href: '#incidents' },
      },
      kpis: [
        { label: 'Active tenants', value: formatNumber(tenants.active || listCount(state.tenants), '0'), detail: `${formatNumber(tenants.trialing, '0')} trial · ${formatNumber(tenants.reseller, '0')} reseller`, tone: 'info' },
        { label: 'Runtime readiness', value: `${formatNumber(readyRuntimes, '0')}/${formatNumber(runtimeRows.length, '0')}`, detail: 'Managed services under owner scope', tone: readyRuntimes === runtimeRows.length ? 'success' : 'warning' },
        { label: 'Online agents', value: formatNumber((Array.isArray(state.agents) ? state.agents : []).filter((row) => toneForStatus(row.status) === 'success').length, '0'), detail: `${formatNumber(listCount(state.agents), '0')} registered runtimes`, tone: 'success' },
        { label: 'Open incidents', value: formatNumber(listCount(state.notifications) + listCount(state.incidentInbox), '0'), detail: `${formatNumber(listCount(state.securityEvents), '0')} security signals`, tone: listCount(state.notifications) > 0 ? 'warning' : 'muted' },
        { label: 'Delivery success', value: `${formatNumber(delivery.successRate, '0')}%`, detail: `${formatNumber(delivery.purchaseCount30d, '0')} purchases in 30 days`, tone: 'success' },
        { label: 'Commercial watch', value: Number(subscriptions.mrr) > 0 ? `฿${formatNumber(subscriptions.mrr, '0')}` : formatNumber(expiringCount, '0'), detail: Number(subscriptions.mrr) > 0 ? 'Tracked recurring revenue' : 'Subscriptions nearing renewal', tone: expiringCount > 0 ? 'danger' : 'info' },
      ],
      actionGroups: ACTION_GROUPS,
      attentionRows: buildAttentionRows(state),
      incidentFeed: feed,
      railCards: [
        { title: 'Commercial watch', body: expiringCount > 0 ? `${formatNumber(expiringCount, '0')} subscription(s) are close to renewal or expiry.` : 'No immediate renewal pressure is visible in the current sample.', meta: Number(subscriptions.mrr) > 0 ? `Revenue tracked ฿${formatNumber(subscriptions.mrr, '0')}` : 'Review package and subscription posture', tone: expiringCount > 0 ? 'danger' : 'success' },
        { title: 'Support queue', body: state.supportCase && state.supportCase.signals ? `${formatNumber(state.supportCase.signals.total, '0')} support signal(s) are attached to the current owner case.` : 'Support flow is quiet right now.', meta: 'Use support and diagnostics before touching runtime or quota limits.', tone: state.supportCase ? 'warning' : 'muted' },
        { title: 'Observability hotspot', body: hotspot ? `${hotspot.routeGroup || hotspot.samplePath || '/'} · p95 ${formatNumber(hotspot.p95LatencyMs, '0')} ms` : 'No hotspot summary is available from the current request sample.', meta: hotspot ? `${formatNumber(hotspot.requests, '0')} requests · ${formatNumber(hotspot.errors, '0')} errors` : 'Refresh observability to populate this rail', tone: hotspot && hotspot.errors > 0 ? 'warning' : 'info' },
      ],
    };
  }

  function renderNavGroups(groups) {
    return (Array.isArray(groups) ? groups : []).map((group) => [
      '<section class="odv4-nav-group">',
      `<span class="odv4-nav-group-label">${escapeHtml(group.label || '')}</span>`,
      '<div class="odv4-nav-items">',
      ...(Array.isArray(group.items) ? group.items : []).map((item) => {
        const className = item.current ? 'odv4-nav-link odv4-nav-link-current' : 'odv4-nav-link';
        return `<a class="${className}" href="${escapeHtml(item.href || '#')}">${escapeHtml(item.label || '')}</a>`;
      }),
      '</div></section>',
    ].join('')).join('');
  }
  function renderChips(items) {
    return (Array.isArray(items) ? items : []).map((item) => `<span class="odv4-badge odv4-badge-${escapeHtml(item.tone || 'muted')}">${escapeHtml(item.label || '')}</span>`).join('');
  }
  function renderKpis(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      `<article class="odv4-kpi odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<span class="odv4-kpi-label">${escapeHtml(item.label || '')}</span>`,
      `<strong class="odv4-kpi-value">${escapeHtml(item.value || '-')}</strong>`,
      `<p class="odv4-kpi-detail">${escapeHtml(item.detail || '')}</p>`,
      '</article>',
    ].join('')).join('');
  }
  function renderActionGroups(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      `<article class="odv4-task-group odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<span class="odv4-task-tag">${escapeHtml(item.tag || '')}</span>`,
      `<h3 class="odv4-section-title">${escapeHtml(item.title || '')}</h3>`,
      `<p class="odv4-section-copy">${escapeHtml(item.detail || '')}</p>`,
      '<div class="odv4-action-list">',
      ...(Array.isArray(item.actions) ? item.actions : []).map((action) => `<a class="${action.primary ? 'odv4-button odv4-button-primary' : 'odv4-button odv4-button-secondary'}" href="${escapeHtml(action.href || '#')}">${escapeHtml(action.label || '')}</a>`),
      '</div></article>',
    ].join('')).join('');
  }
  function renderAttentionRows(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">No tenant attention rows yet.</div>';
    return items.map((item) => [
      `<article class="odv4-list-item odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<div class="odv4-list-main"><strong>${escapeHtml(item.name || '-')}</strong><p>${escapeHtml(item.detail || '')}</p></div>`,
      `<div class="odv4-list-side"><span class="odv4-pill odv4-pill-${escapeHtml(item.tone || 'muted')}">${escapeHtml(item.packageName || '-')}</span><span class="odv4-list-meta">${escapeHtml(item.meta || '')}</span></div>`,
      '</article>',
    ].join('')).join('');
  }
  function renderFeed(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">No owner signals in the current sample.</div>';
    return items.map((item) => [
      `<article class="odv4-feed-item odv4-tone-${escapeHtml(toneForStatus(item.severity || 'warning'))}">`,
      `<div class="odv4-feed-meta"><span class="odv4-pill odv4-pill-${escapeHtml(toneForStatus(item.severity || 'warning'))}">${escapeHtml(item.source || 'signal')}</span><span>${escapeHtml(formatDateTime(item.time))}</span></div>`,
      `<strong>${escapeHtml(item.title || 'Signal')}</strong>`,
      item.detail ? `<p>${escapeHtml(item.detail)}</p>` : '',
      '</article>',
    ].join('')).join('');
  }
  function renderRailCards(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      `<article class="odv4-rail-card odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<h4 class="odv4-rail-title">${escapeHtml(item.title || '')}</h4>`,
      `<p class="odv4-rail-copy">${escapeHtml(item.body || '')}</p>`,
      `<div class="odv4-rail-detail">${escapeHtml(item.meta || '')}</div>`,
      '</article>',
    ].join('')).join('');
  }

  function buildOwnerDashboardV4Html(model) {
    const safeModel = model && typeof model === 'object' ? model : createOwnerDashboardV4Model({});
    return [
      '<div class="odv4-app"><header class="odv4-topbar"><div class="odv4-brand-row">',
      `<div class="odv4-brand-mark">${escapeHtml(safeModel.shell.brand || 'SCUM')}</div>`,
      `<div class="odv4-brand-copy"><span class="odv4-surface-label">${escapeHtml(safeModel.shell.surfaceLabel || '')}</span><strong class="odv4-workspace-label">${escapeHtml(safeModel.shell.workspaceLabel || '')}</strong></div>`,
      '</div><div class="odv4-topbar-actions">',
      `<span class="odv4-badge odv4-badge-muted">${escapeHtml(safeModel.shell.environmentLabel || '')}</span>`,
      '<a class="odv4-button odv4-button-secondary" href="#tenants">Tenants</a>',
      '<a class="odv4-button odv4-button-secondary" href="#runtime-health">Runtime</a>',
      '</div></header>',
      '<div class="odv4-shell"><aside class="odv4-sidebar"><div class="odv4-stack"><span class="odv4-sidebar-title">Owner navigation</span><p class="odv4-sidebar-copy">Use this owner surface to triage platform health, commercial posture, and cross-tenant risk without jumping through legacy sections.</p></div>',
      renderNavGroups(safeModel.shell.navGroups),
      '</aside><main class="odv4-main">',
      '<section class="odv4-pagehead"><div class="odv4-stack"><span class="odv4-section-kicker">Owner command center</span>',
      `<h1 class="odv4-page-title">${escapeHtml(safeModel.header.title || '')}</h1><p class="odv4-page-subtitle">${escapeHtml(safeModel.header.subtitle || '')}</p><div class="odv4-chip-row">${renderChips(safeModel.header.statusChips)}</div></div>`,
      `<div class="odv4-pagehead-actions"><a class="odv4-button odv4-button-primary" href="${escapeHtml(safeModel.header.primaryAction.href || '#')}">${escapeHtml(safeModel.header.primaryAction.label || 'Open')}</a></div></section>`,
      `<section class="odv4-kpi-strip">${renderKpis(safeModel.kpis)}</section>`,
      '<section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Action hub</span><h2 class="odv4-section-title">Start from the right workflow</h2><p class="odv4-section-copy">Each group below exists to reduce guesswork. Pick the track that matches the problem instead of scanning every owner page.</p></div>',
      `<div class="odv4-task-grid">${renderActionGroups(safeModel.actionGroups)}</div></section>`,
      '<div class="odv4-split-grid"><section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Attention center</span><h2 class="odv4-section-title">Tenants that need owner attention</h2><p class="odv4-section-copy">This short list exists to answer who needs us next without digging through the whole registry.</p></div>',
      `<div class="odv4-list">${renderAttentionRows(safeModel.attentionRows)}</div></section>`,
      '<section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Signals</span><h2 class="odv4-section-title">Latest platform incidents and alerts</h2><p class="odv4-section-copy">This feed pulls the newest owner-relevant alerts from monitoring, request pressure, and security-adjacent events.</p></div>',
      `<div class="odv4-feed">${renderFeed(safeModel.incidentFeed)}</div></section></div></main>`,
      `<aside class="odv4-rail"><div class="odv4-rail-sticky"><div class="odv4-rail-header">Owner context</div><p class="odv4-rail-copy">Keep commercial pressure, support readiness, and observability hotspots in sight while you work.</p>${renderRailCards(safeModel.railCards)}</div></aside>`,
      '</div></div>',
    ].join('');
  }

  function renderOwnerDashboardV4(target, source) {
    if (!target) throw new Error('Owner dashboard V4 target is required');
    target.innerHTML = buildOwnerDashboardV4Html(createOwnerDashboardV4Model(source));
    return target;
  }

  return {
    createOwnerDashboardV4Model,
    buildOwnerDashboardV4Html,
    renderOwnerDashboardV4,
  };
});
