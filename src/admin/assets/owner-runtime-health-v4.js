(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.OwnerRuntimeHealthV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const NAV_GROUPS = [
    { label: 'Platform', items: [
      { label: 'Overview', href: '#overview' },
      { label: 'Tenants', href: '#tenants' },
      { label: 'Packages', href: '#packages' },
      { label: 'Subscriptions', href: '#subscriptions' },
    ] },
    { label: 'Operations', items: [
      { label: 'Runtime Health', href: '#runtime-health', current: true },
      { label: 'Incidents', href: '#incidents' },
      { label: 'Observability', href: '#observability' },
      { label: 'Jobs', href: '#jobs' },
    ] },
    { label: 'Business', items: [
      { label: 'Support', href: '#support' },
      { label: 'Security', href: '#security' },
      { label: 'Audit', href: '#audit' },
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
  function firstNonEmpty(values, fallback = '') {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return fallback;
  }
  function toneForStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (['ready', 'healthy', 'active', 'online'].includes(raw)) return 'success';
    if (['warning', 'degraded', 'stale', 'slow', 'outdated'].includes(raw)) return 'warning';
    if (['offline', 'failed', 'error', 'expired', 'suspended'].includes(raw)) return 'danger';
    if (['pending', 'draft', 'provisioned'].includes(raw)) return 'info';
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
  function buildHotspots(state) {
    const rows = Array.isArray(state.requestLogs && state.requestLogs.metrics && state.requestLogs.metrics.routeHotspots)
      ? state.requestLogs.metrics.routeHotspots
      : [];
    return rows.slice(0, 5).map((row) => ({
      route: row.routeGroup || row.samplePath || '/',
      requests: formatNumber(row.requests, '0'),
      errors: formatNumber(row.errors, '0'),
      p95LatencyMs: formatNumber(row.p95LatencyMs, '0'),
    }));
  }

  function createOwnerRuntimeHealthV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const runtimeRows = normalizeRuntimeRows(state.runtimeSupervisor).map((row) => ({
      name: row.label || row.name || row.service || '-',
      status: row.status || 'unknown',
      detail: row.detail || row.reason || row.summary || '-',
      updatedAt: row.updatedAt || row.checkedAt || row.lastSeenAt,
    }));
    const agentRows = (Array.isArray(state.agents) ? state.agents : []).slice(0, 12).map((row) => ({
      runtime: row.runtimeKey || row.name || '-',
      channel: row.channel || row.meta && row.meta.agentScope || '-',
      role: row.meta && row.meta.agentRole || row.role || '-',
      status: row.status || 'unknown',
      version: row.version || '-',
      lastSeenAt: row.lastSeenAt,
    }));
    const feed = buildIncidentFeed(state);
    const hotspots = buildHotspots(state);
    const readyRuntimeCount = runtimeRows.filter((row) => toneForStatus(row.status) === 'success').length;
    const degradedRuntimeCount = runtimeRows.filter((row) => toneForStatus(row.status) === 'warning').length;
    const staleAgents = agentRows.filter((row) => toneForStatus(row.status) !== 'success').length;
    const lifecycle = state.deliveryLifecycle && state.deliveryLifecycle.summary ? state.deliveryLifecycle.summary : {};
    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Owner Panel V4 Preview',
        workspaceLabel: 'Runtime Health',
        environmentLabel: 'Parallel V4',
        navGroups: NAV_GROUPS,
      },
      header: {
        title: 'Runtime health and incidents',
        subtitle: 'A focused owner ops desk for runtime readiness, incident pressure, and request anomalies. This page is for triage, not for browsing every metric in the system.',
        statusChips: [
          { label: `${formatNumber(readyRuntimeCount, '0')}/${formatNumber(runtimeRows.length, '0')} runtimes ready`, tone: readyRuntimeCount === runtimeRows.length ? 'success' : 'warning' },
          { label: `${formatNumber(staleAgents, '0')} agent(s) degraded`, tone: staleAgents > 0 ? 'warning' : 'success' },
          { label: `${formatNumber(feed.length, '0')} active signals`, tone: feed.length > 0 ? 'warning' : 'muted' },
          { label: `${formatNumber(Number(state.requestLogs && state.requestLogs.metrics && state.requestLogs.metrics.slowRequests || 0), '0')} slow requests`, tone: Number(state.requestLogs && state.requestLogs.metrics && state.requestLogs.metrics.slowRequests || 0) > 0 ? 'warning' : 'muted' },
        ],
        primaryAction: { label: 'Export observability', href: '#observability-export' },
      },
      summaryStrip: [
        { label: 'Ready services', value: formatNumber(readyRuntimeCount, '0'), detail: 'Managed runtimes reporting healthy', tone: 'success' },
        { label: 'Degraded services', value: formatNumber(degradedRuntimeCount, '0'), detail: 'Services that need owner attention', tone: degradedRuntimeCount > 0 ? 'warning' : 'muted' },
        { label: 'Agent drift', value: formatNumber(staleAgents, '0'), detail: 'Delivery Agent and Server Bot posture', tone: staleAgents > 0 ? 'danger' : 'success' },
        { label: 'Dead letters', value: formatNumber(lifecycle.deadLetterCount, '0'), detail: 'Delivery backlog that should not be ignored', tone: Number(lifecycle.deadLetterCount || 0) > 0 ? 'danger' : 'muted' },
      ],
      runtimeRows,
      agentRows,
      incidentFeed: feed,
      hotspots,
      runbooks: [
        { title: 'Queue pressure', body: 'Check dead-letter volume, lifecycle anomalies, and agent readiness before asking tenant operators to retry or replay jobs.' },
        { title: 'Runtime degradation', body: 'If a required service is stale or degraded, confirm heartbeat freshness and recent changes before touching tenant-facing queues.' },
        { title: 'Request anomaly', body: 'Use hotspot data and the latest request errors to decide whether this is runtime, API, or commercial/support fallout.' },
      ],
      railCards: [
        { title: 'Owner export path', body: 'Use diagnostics and observability export before making destructive changes. Evidence should move with the incident, not live only in memory.', meta: 'Support and security reviews should share the same evidence trail.', tone: 'info' },
        { title: 'Current pressure', body: feed.length > 0 ? 'The incident feed is active. Start with the newest high-severity rows and keep runtime posture in view.' : 'No urgent signal cluster is visible in the current sample.', meta: hotspots.length > 0 ? `${hotspots[0].route} is the hottest route group right now.` : 'No hotspot sample available.', tone: feed.length > 0 ? 'warning' : 'success' },
      ],
    };
  }

  function renderNavGroups(items) {
    return (Array.isArray(items) ? items : []).map((group) => [
      '<section class="odv4-nav-group">',
      `<span class="odv4-nav-group-label">${escapeHtml(group.label || '')}</span>`,
      '<div class="odv4-nav-items">',
      ...(Array.isArray(group.items) ? group.items : []).map((item) => `<a class="${item.current ? 'odv4-nav-link odv4-nav-link-current' : 'odv4-nav-link'}" href="${escapeHtml(item.href || '#')}">${escapeHtml(item.label || '')}</a>`),
      '</div></section>',
    ].join('')).join('');
  }
  function renderChips(items) {
    return (Array.isArray(items) ? items : []).map((item) => `<span class="odv4-badge odv4-badge-${escapeHtml(item.tone || 'muted')}">${escapeHtml(item.label || '')}</span>`).join('');
  }
  function renderSummaryStrip(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      `<article class="odv4-kpi odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<span class="odv4-kpi-label">${escapeHtml(item.label || '')}</span>`,
      `<strong class="odv4-kpi-value">${escapeHtml(item.value || '-')}</strong>`,
      `<p class="odv4-kpi-detail">${escapeHtml(item.detail || '')}</p>`,
      '</article>',
    ].join('')).join('');
  }
  function renderRuntimeTable(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">No runtime rows in the current sample.</div>';
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-4"><span>Service</span><span>Status</span><span>Detail</span><span>Updated</span></div>',
      ...items.map((row) => [
        '<div class="odv4-table-row cols-4">',
        `<div class="odv4-table-cell"><strong>${escapeHtml(row.name)}</strong></div>`,
        `<div class="odv4-table-cell"><span class="odv4-pill odv4-pill-${escapeHtml(toneForStatus(row.status))}">${escapeHtml(row.status || 'unknown')}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-note">${escapeHtml(row.detail)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-value">${escapeHtml(formatDateTime(row.updatedAt))}</span></div>`,
        '</div>',
      ].join('')),
      '</div>',
    ].join('');
  }
  function renderAgentTable(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">No agent runtimes in the current sample.</div>';
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-5"><span>Runtime</span><span>Role</span><span>Channel</span><span>Status</span><span>Last seen</span></div>',
      ...items.map((row) => [
        '<div class="odv4-table-row cols-5">',
        `<div class="odv4-table-cell"><strong>${escapeHtml(row.runtime)}</strong><span class="odv4-table-note">${escapeHtml(row.version)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-pill odv4-pill-muted">${escapeHtml(row.role)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-note">${escapeHtml(row.channel)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-pill odv4-pill-${escapeHtml(toneForStatus(row.status))}">${escapeHtml(row.status || 'unknown')}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-value">${escapeHtml(formatDateTime(row.lastSeenAt))}</span></div>`,
        '</div>',
      ].join('')),
      '</div>',
    ].join('');
  }
  function renderFeed(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">No current incident feed rows.</div>';
    return items.map((item) => [
      `<article class="odv4-feed-item odv4-tone-${escapeHtml(toneForStatus(item.severity || 'warning'))}">`,
      `<div class="odv4-feed-meta"><span class="odv4-pill odv4-pill-${escapeHtml(toneForStatus(item.severity || 'warning'))}">${escapeHtml(item.source || 'signal')}</span><span>${escapeHtml(formatDateTime(item.time))}</span></div>`,
      `<strong>${escapeHtml(item.title || 'Signal')}</strong>`,
      item.detail ? `<p>${escapeHtml(item.detail)}</p>` : '',
      '</article>',
    ].join('')).join('');
  }
  function renderHotspots(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">No request hotspot sample available.</div>';
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-4"><span>Route group</span><span>Requests</span><span>Errors</span><span>P95 latency</span></div>',
      ...items.map((row) => [
        '<div class="odv4-table-row cols-4">',
        `<div class="odv4-table-cell"><strong>${escapeHtml(row.route)}</strong></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-value">${escapeHtml(row.requests)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-value">${escapeHtml(row.errors)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-value">${escapeHtml(row.p95LatencyMs)} ms</span></div>`,
        '</div>',
      ].join('')),
      '</div>',
    ].join('');
  }
  function renderRunbooks(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      '<article class="odv4-runbook-card">',
      '<span class="odv4-table-label">Runbook</span>',
      `<strong>${escapeHtml(item.title || '')}</strong><p>${escapeHtml(item.body || '')}</p>`,
      '</article>',
    ].join('')).join('');
  }
  function renderRailCards(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      `<article class="odv4-rail-card odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<h4 class="odv4-rail-title">${escapeHtml(item.title || '')}</h4><p class="odv4-rail-copy">${escapeHtml(item.body || '')}</p><div class="odv4-rail-detail">${escapeHtml(item.meta || '')}</div>`,
      '</article>',
    ].join('')).join('');
  }

  function buildOwnerRuntimeHealthV4Html(model) {
    const safeModel = model && typeof model === 'object' ? model : createOwnerRuntimeHealthV4Model({});
    return [
      '<div class="odv4-app"><header class="odv4-topbar"><div class="odv4-brand-row">',
      `<div class="odv4-brand-mark">${escapeHtml(safeModel.shell.brand || 'SCUM')}</div><div class="odv4-brand-copy"><span class="odv4-surface-label">${escapeHtml(safeModel.shell.surfaceLabel || '')}</span><strong class="odv4-workspace-label">${escapeHtml(safeModel.shell.workspaceLabel || '')}</strong></div>`,
      '</div><div class="odv4-topbar-actions"><span class="odv4-badge odv4-badge-muted">Parallel V4</span><a class="odv4-button odv4-button-secondary" href="#incidents">Incidents</a><a class="odv4-button odv4-button-secondary" href="#observability">Observability</a></div></header>',
      '<div class="odv4-shell"><aside class="odv4-sidebar"><div class="odv4-stack"><span class="odv4-sidebar-title">Owner navigation</span><p class="odv4-sidebar-copy">This surface is the owner operations desk. Use it to separate runtime issues from support pressure and request anomalies before escalating.</p></div>',
      renderNavGroups(safeModel.shell.navGroups),
      '</aside><main class="odv4-main"><section class="odv4-pagehead"><div class="odv4-stack"><span class="odv4-section-kicker">Ops and incident desk</span>',
      `<h1 class="odv4-page-title">${escapeHtml(safeModel.header.title || '')}</h1><p class="odv4-page-subtitle">${escapeHtml(safeModel.header.subtitle || '')}</p><div class="odv4-chip-row">${renderChips(safeModel.header.statusChips)}</div></div>`,
      `<div class="odv4-pagehead-actions"><a class="odv4-button odv4-button-primary" href="${escapeHtml(safeModel.header.primaryAction.href || '#')}">${escapeHtml(safeModel.header.primaryAction.label || 'Export')}</a></div></section>`,
      `<section class="odv4-kpi-strip">${renderSummaryStrip(safeModel.summaryStrip)}</section>`,
      '<div class="odv4-split-grid"><section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Runtime matrix</span><h2 class="odv4-section-title">Managed services</h2><p class="odv4-section-copy">Keep the platform service layer and the remote runtime fleet readable in one workspace.</p></div>',
      renderRuntimeTable(safeModel.runtimeRows),
      '</section><section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Remote runtimes</span><h2 class="odv4-section-title">Agent registry</h2><p class="odv4-section-copy">Delivery Agent and Server Bot posture should stay visible without mixing them into tenant admin views.</p></div>',
      renderAgentTable(safeModel.agentRows),
      '</section></div>',
      '<div class="odv4-split-grid"><section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Incident feed</span><h2 class="odv4-section-title">Current owner signals</h2><p class="odv4-section-copy">Use this feed to acknowledge the newest signals before opening support or replay tooling.</p></div>',
      `<div class="odv4-feed">${renderFeed(safeModel.incidentFeed)}</div></section>`,
      '<section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Observability</span><h2 class="odv4-section-title">Request hotspots</h2><p class="odv4-section-copy">A compact request summary beats a giant graph wall for fast owner triage.</p></div>',
      renderHotspots(safeModel.hotspots),
      '<div class="odv4-section-head" style="margin-top:16px;"><span class="odv4-section-kicker">Runbooks</span><h3 class="odv4-section-title">Recommended next steps</h3></div>',
      `<div class="odv4-runbook-grid">${renderRunbooks(safeModel.runbooks)}</div></section></div></main>`,
      `<aside class="odv4-rail"><div class="odv4-rail-sticky"><div class="odv4-rail-header">Ops rail</div><p class="odv4-rail-copy">Keep evidence and owner follow-through visible while you inspect runtime or incident data.</p>${renderRailCards(safeModel.railCards)}</div></aside></div></div>`,
    ].join('');
  }

  function renderOwnerRuntimeHealthV4(target, source) {
    if (!target) throw new Error('Owner runtime health V4 target is required');
    target.innerHTML = buildOwnerRuntimeHealthV4Html(createOwnerRuntimeHealthV4Model(source));
    return target;
  }

  return {
    createOwnerRuntimeHealthV4Model,
    buildOwnerRuntimeHealthV4Html,
    renderOwnerRuntimeHealthV4,
  };
});
