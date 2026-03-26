(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.OwnerTenantsV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const NAV_GROUPS = [
    { label: 'Platform', items: [
      { label: 'Overview', href: '#overview' },
      { label: 'Tenants', href: '#tenants', current: true },
      { label: 'Packages', href: '#packages' },
      { label: 'Subscriptions', href: '#subscriptions' },
    ] },
    { label: 'Operations', items: [
      { label: 'Runtime Health', href: '#runtime-health' },
      { label: 'Incidents', href: '#incidents' },
      { label: 'Support', href: '#support' },
      { label: 'Audit', href: '#audit' },
    ] },
    { label: 'Business', items: [
      { label: 'Billing', href: '#billing' },
      { label: 'Security', href: '#security' },
      { label: 'Settings', href: '#settings' },
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
  function toneForStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (['active', 'licensed', 'healthy', 'online'].includes(raw)) return 'success';
    if (['trial', 'preview', 'warning', 'expiring'].includes(raw)) return 'warning';
    if (['expired', 'suspended', 'offline', 'failed'].includes(raw)) return 'danger';
    return 'muted';
  }
  function quotaTone(entry) {
    if (!entry || typeof entry !== 'object') return 'muted';
    if (entry.exceeded === true) return 'danger';
    if (entry.unlimited) return 'info';
    const limit = Number(entry.limit || 0);
    const used = Number(entry.used || 0);
    if (!Number.isFinite(limit) || limit <= 0) return 'muted';
    if (used >= limit) return 'danger';
    if (used / limit >= 0.75) return 'warning';
    return 'success';
  }
  function summarizeQuota(snapshot) {
    const quotas = snapshot && snapshot.quotas && typeof snapshot.quotas === 'object' ? snapshot.quotas : {};
    const hot = Object.entries(quotas).filter(([, value]) => ['warning', 'danger'].includes(quotaTone(value)));
    if (hot.length === 0) return { text: 'Healthy quota posture', tone: 'success' };
    return {
      text: hot.slice(0, 2).map(([key, value]) => {
        const used = formatNumber(value && value.used, '0');
        const limit = value && value.unlimited ? 'unlimited' : formatNumber(value && value.limit, '0');
        return `${key}: ${used}/${limit}`;
      }).join(' · '),
      tone: hot.some(([, value]) => quotaTone(value) === 'danger') ? 'danger' : 'warning',
    };
  }

  function buildRows(state) {
    const tenants = Array.isArray(state.tenants) ? state.tenants : [];
    const subscriptions = Array.isArray(state.subscriptions) ? state.subscriptions : [];
    const licenses = Array.isArray(state.licenses) ? state.licenses : [];
    const quotaSnapshots = Array.isArray(state.tenantQuotaSnapshots) ? state.tenantQuotaSnapshots : [];
    const quotaMap = new Map(quotaSnapshots.map((row) => [String(row.tenantId || row.tenant && row.tenant.id || ''), row]));
    return tenants.map((tenant) => {
      const tenantId = String(tenant.id || '').trim();
      const subscription = subscriptions.find((row) => String(row.tenantId || row.ownerTenantId || '').trim() === tenantId) || {};
      const license = licenses.find((row) => String(row.tenantId || row.ownerTenantId || '').trim() === tenantId) || {};
      const quota = summarizeQuota(quotaMap.get(tenantId));
      return {
        tenantId,
        name: tenant.name || tenant.slug || tenantId || 'Unknown tenant',
        owner: firstNonEmpty([tenant.ownerName, tenant.ownerEmail, '-']),
        packageName: firstNonEmpty([subscription.packageName, subscription.planName, tenant.plan, tenant.type, 'No package']),
        status: firstNonEmpty([subscription.status, tenant.status, 'active']),
        statusTone: toneForStatus(subscription.status || tenant.status),
        licenseState: firstNonEmpty([license.status, license.state, 'No license']),
        quotaText: quota.text,
        quotaTone: quota.tone,
        updatedAt: tenant.updatedAt || tenant.createdAt,
        renewsAt: subscription.renewsAt || subscription.expiresAt || subscription.endsAt,
      };
    });
  }

  function createOwnerTenantsV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const rows = buildRows(state);
    const activeCount = rows.filter((row) => row.statusTone === 'success').length;
    const warningCount = rows.filter((row) => row.statusTone === 'warning').length;
    const dangerCount = rows.filter((row) => row.statusTone === 'danger').length;
    const spotlight = rows.find((row) => row.tenantId === String(state.supportCase && state.supportCase.tenantId || '').trim()) || rows[0] || null;
    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Owner Panel V4 Preview',
        workspaceLabel: 'Tenant Registry',
        environmentLabel: 'Parallel V4',
        navGroups: NAV_GROUPS,
      },
      header: {
        title: 'Tenants',
        subtitle: 'A clean owner registry for package, subscription, quota, and support posture. Start here before opening a deeper tenant detail workflow.',
        statusChips: [
          { label: `${formatNumber(rows.length, '0')} tenants`, tone: 'info' },
          { label: `${formatNumber(activeCount, '0')} healthy`, tone: 'success' },
          { label: `${formatNumber(warningCount, '0')} watch`, tone: warningCount > 0 ? 'warning' : 'muted' },
          { label: `${formatNumber(dangerCount, '0')} urgent`, tone: dangerCount > 0 ? 'danger' : 'muted' },
        ],
        primaryAction: { label: 'Create tenant', href: '#create-tenant' },
      },
      summaryStrip: [
        { label: 'Healthy', value: formatNumber(activeCount, '0'), detail: 'Active tenants with stable posture', tone: 'success' },
        { label: 'Watch list', value: formatNumber(warningCount, '0'), detail: 'Renewal or quota pressure', tone: warningCount > 0 ? 'warning' : 'muted' },
        { label: 'Urgent', value: formatNumber(dangerCount, '0'), detail: 'Expired, suspended, or high-risk tenants', tone: dangerCount > 0 ? 'danger' : 'muted' },
        { label: 'Support context', value: String(state.supportCase ? 'Loaded' : 'Idle'), detail: 'Owner support case context', tone: state.supportCase ? 'info' : 'muted' },
      ],
      rows,
      spotlight,
      railCards: [
        { title: 'Support tools', body: 'Keep diagnostics export and support-case opening close to the tenant registry so owner triage stays one or two clicks deep.', meta: 'Support actions should not hide inside legacy hash sections.', tone: 'info' },
        { title: 'Commercial review', body: `${formatNumber(warningCount + dangerCount, '0')} tenant(s) currently need renewal, quota, or license review.`, meta: 'Use billing posture before changing plan or entitlement.', tone: warningCount + dangerCount > 0 ? 'warning' : 'success' },
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
  function renderTable(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return [
        '<div class="odv4-table">',
        '<div class="odv4-table-head cols-6"><span>Tenant</span><span>Package</span><span>Subscription</span><span>Quota</span><span>Updated</span><span>Actions</span></div>',
        '<div class="odv4-empty-state">No tenants in the current owner sample.</div>',
        '</div>',
      ].join('');
    }
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-6"><span>Tenant</span><span>Package</span><span>Subscription</span><span>Quota</span><span>Updated</span><span>Actions</span></div>',
      ...items.map((row) => [
        '<div class="odv4-table-row cols-6">',
        `<div class="odv4-table-cell"><strong>${escapeHtml(row.name)}</strong><span class="odv4-table-note">${escapeHtml(row.owner)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-pill odv4-pill-muted">${escapeHtml(row.packageName)}</span><span class="odv4-table-note">${escapeHtml(row.licenseState)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-pill odv4-pill-${escapeHtml(row.statusTone)}">${escapeHtml(row.status)}</span>${row.renewsAt ? `<span class="odv4-table-note">${escapeHtml(formatRelative(row.renewsAt))}</span>` : ''}</div>`,
        `<div class="odv4-table-cell"><span class="odv4-pill odv4-pill-${escapeHtml(row.quotaTone)}">${escapeHtml(row.quotaTone)}</span><span class="odv4-table-note">${escapeHtml(row.quotaText)}</span></div>`,
        `<div class="odv4-table-cell"><span class="odv4-table-value">${escapeHtml(formatDateTime(row.updatedAt))}</span></div>`,
        `<div class="odv4-table-actions"><a class="odv4-table-button odv4-table-button-primary" href="#tenant-${escapeHtml(row.tenantId)}">Open detail</a><a class="odv4-table-button" href="#support-${escapeHtml(row.tenantId)}">Support</a></div>`,
        '</div>',
      ].join('')),
      '</div>',
    ].join('');
  }
  function renderSpotlight(spotlight) {
    if (!spotlight) {
      return [
        '<section class="odv4-panel">',
        '<div class="odv4-section-head"><span class="odv4-section-kicker">Tenant spotlight</span><h2 class="odv4-section-title">Tenant spotlight</h2><p class="odv4-section-copy">Choose a tenant from the registry to inspect health, support, and commercial posture.</p></div>',
        '<div class="odv4-empty-state">No tenant spotlight available.</div>',
        '</section>',
      ].join('');
    }
    return [
      '<section class="odv4-panel">',
      '<div class="odv4-section-head"><span class="odv4-section-kicker">Tenant spotlight</span>',
      `<h2 class="odv4-section-title">${escapeHtml(spotlight.name)}</h2>`,
      '<p class="odv4-section-copy">Use this card to keep the next owner action obvious before opening a deeper tenant detail page.</p></div>',
      '<div class="odv4-runbook-grid">',
      `<article class="odv4-runbook-card"><span class="odv4-table-label">Package</span><strong>${escapeHtml(spotlight.packageName)}</strong></article>`,
      `<article class="odv4-runbook-card"><span class="odv4-table-label">Subscription</span><strong>${escapeHtml(spotlight.status)}</strong></article>`,
      `<article class="odv4-runbook-card"><span class="odv4-table-label">Quota</span><strong>${escapeHtml(spotlight.quotaText)}</strong></article>`,
      '</div>',
      '<div class="odv4-panel" style="margin-top:16px;"><div class="odv4-section-head"><span class="odv4-section-kicker">Next actions</span><h3 class="odv4-section-title">Stay in tenant context</h3></div><ul class="odv4-bullet-list"><li>Open support case</li><li>Export diagnostics</li><li>Inspect billing and renewal</li></ul></div>',
      '</section>',
    ].join('');
  }
  function renderRailCards(items) {
    return (Array.isArray(items) ? items : []).map((item) => [
      `<article class="odv4-rail-card odv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<h4 class="odv4-rail-title">${escapeHtml(item.title || '')}</h4><p class="odv4-rail-copy">${escapeHtml(item.body || '')}</p><div class="odv4-rail-detail">${escapeHtml(item.meta || '')}</div>`,
      '</article>',
    ].join('')).join('');
  }

  function buildOwnerTenantsV4Html(model) {
    const safeModel = model && typeof model === 'object' ? model : createOwnerTenantsV4Model({});
    return [
      '<div class="odv4-app"><header class="odv4-topbar"><div class="odv4-brand-row">',
      `<div class="odv4-brand-mark">${escapeHtml(safeModel.shell.brand || 'SCUM')}</div><div class="odv4-brand-copy"><span class="odv4-surface-label">${escapeHtml(safeModel.shell.surfaceLabel || '')}</span><strong class="odv4-workspace-label">${escapeHtml(safeModel.shell.workspaceLabel || '')}</strong></div>`,
      '</div><div class="odv4-topbar-actions"><span class="odv4-badge odv4-badge-muted">Parallel V4</span><a class="odv4-button odv4-button-secondary" href="#overview">Overview</a><a class="odv4-button odv4-button-secondary" href="#support">Support</a></div></header>',
      '<div class="odv4-shell"><aside class="odv4-sidebar"><div class="odv4-stack"><span class="odv4-sidebar-title">Owner navigation</span><p class="odv4-sidebar-copy">Keep tenant registry, support context, and commercial posture together so owner work feels like a serious SaaS operations panel.</p></div>',
      renderNavGroups(safeModel.shell.navGroups),
      '</aside><main class="odv4-main"><section class="odv4-pagehead"><div class="odv4-stack"><span class="odv4-section-kicker">Customer operations registry</span>',
      `<h1 class="odv4-page-title">${escapeHtml(safeModel.header.title || '')}</h1><p class="odv4-page-subtitle">${escapeHtml(safeModel.header.subtitle || '')}</p><div class="odv4-chip-row">${renderChips(safeModel.header.statusChips)}</div></div>`,
      `<div class="odv4-pagehead-actions"><a class="odv4-button odv4-button-primary" href="${escapeHtml(safeModel.header.primaryAction.href || '#')}">${escapeHtml(safeModel.header.primaryAction.label || 'Create')}</a></div></section>`,
      `<section class="odv4-kpi-strip">${renderSummaryStrip(safeModel.summaryStrip)}</section>`,
      '<section class="odv4-panel"><div class="odv4-section-head"><span class="odv4-section-kicker">Registry</span><h2 class="odv4-section-title">Tenant list</h2><p class="odv4-section-copy">This table is intentionally plain and readable. It should feel like a modern admin registry, not a wall of widgets.</p></div>',
      renderTable(safeModel.rows),
      '</section>',
      renderSpotlight(safeModel.spotlight),
      `</main><aside class="odv4-rail"><div class="odv4-rail-sticky"><div class="odv4-rail-header">Owner context</div><p class="odv4-rail-copy">Keep support and commercial follow-through close to the registry so the owner never loses tenant context.</p>${renderRailCards(safeModel.railCards)}</div></aside></div></div>`,
    ].join('');
  }

  function renderOwnerTenantsV4(target, source) {
    if (!target) throw new Error('Owner tenants V4 target is required');
    target.innerHTML = buildOwnerTenantsV4Html(createOwnerTenantsV4Model(source));
    return target;
  }

  return {
    createOwnerTenantsV4Model,
    buildOwnerTenantsV4Html,
    renderOwnerTenantsV4,
  };
});
