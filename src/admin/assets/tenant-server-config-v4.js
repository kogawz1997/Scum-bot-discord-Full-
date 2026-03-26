(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantServerConfigV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const NAV_GROUPS = [
    {
      label: 'ภาพรวมงานหลัก',
      items: [
        { label: 'แดชบอร์ด', href: '#dashboard' },
        { label: 'สถานะเซิร์ฟเวอร์', href: '#server-status' },
        { label: 'ควบคุมการรีสตาร์ต', href: '#restart-control' },
      ],
    },
    {
      label: 'คำสั่งซื้อและผู้เล่น',
      items: [
        { label: 'คำสั่งซื้อ', href: '#orders' },
        { label: 'การส่งของ', href: '#delivery' },
        { label: 'ผู้เล่น', href: '#players' },
      ],
    },
    {
      label: 'ระบบและหลักฐาน',
      items: [
        { label: 'ตั้งค่าเซิร์ฟเวอร์', href: '#server-config', current: true },
        { label: 'Server Bot', href: '#server-bots' },
        { label: 'Delivery Agent', href: '#delivery-agents' },
        { label: 'บันทึกและหลักฐาน', href: '#audit' },
      ],
    },
  ];

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(value, fallback = '0') {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return new Intl.NumberFormat('th-TH').format(numeric);
  }

  function formatDateTime(value) {
    if (!value) return 'ยังไม่มีข้อมูล';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'ยังไม่มีข้อมูล';
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function stringifyPretty(value) {
    if (!value || typeof value !== 'object') return '{}';
    return JSON.stringify(value, null, 2);
  }

  function firstNonEmpty(values, fallback = '') {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return fallback;
  }

  function summarizeConfigDiff(currentValue, draftValue, label) {
    if (draftValue == null) return null;
    const current = currentValue && typeof currentValue === 'object' ? currentValue : {};
    const draft = draftValue && typeof draftValue === 'object' ? draftValue : {};
    const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(draft)]));
    const changedKeys = keys.filter((key) => JSON.stringify(current[key]) !== JSON.stringify(draft[key]));
    return {
      label,
      changedKeys,
      changedCount: changedKeys.length,
      draftKeys: Object.keys(draft).length,
    };
  }

  function buildSectionGroups(liveConfig) {
    const featureFlags = liveConfig?.featureFlags || {};
    const configPatch = liveConfig?.configPatch || {};
    const portalEnvPatch = liveConfig?.portalEnvPatch || {};
    return [
      {
        key: 'server-basics',
        label: 'ข้อมูลพื้นฐานของเซิร์ฟเวอร์',
        detail: 'ใช้สำหรับค่าที่เกี่ยวข้องกับชื่อเซิร์ฟเวอร์, เปิด-ปิดความสามารถหลัก, และ posture ของผู้เช่า',
        keys: Object.keys(configPatch).slice(0, 6),
        source: 'configPatch',
        tone: 'info',
      },
      {
        key: 'delivery-integrations',
        label: 'การส่งของและการเชื่อมต่อ',
        detail: 'รวม feature flags และค่าที่เกี่ยวกับ delivery, integrations, และ webhook ที่มีผลกับผู้เล่นโดยตรง',
        keys: Object.keys(featureFlags).slice(0, 8),
        source: 'featureFlags',
        tone: 'warning',
      },
      {
        key: 'player-facing',
        label: 'ค่าที่ผู้เล่นรับผลโดยตรง',
        detail: 'ใช้ดูค่าที่กระทบ player portal, หน้าแสดงผล, และ environment patch ฝั่ง portal',
        keys: Object.keys(portalEnvPatch).slice(0, 8),
        source: 'portalEnvPatch',
        tone: 'success',
      },
      {
        key: 'advanced',
        label: 'แก้ค่าแบบขั้นสูง',
        detail: 'พื้นที่สำหรับ raw patch groups และค่าที่ควรแก้โดยผู้ดูแลที่เข้าใจผลกระทบแล้วเท่านั้น',
        keys: [
          'featureFlags',
          'configPatch',
          'portalEnvPatch',
        ],
        source: 'raw',
        tone: 'danger',
      },
    ];
  }

  function createTenantServerConfigV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const liveConfig = state.liveConfig || state.tenantConfig || {};
    const draft = state.draft || {
      featureFlags: liveConfig.featureFlags || {},
      configPatch: liveConfig.configPatch || {},
      portalEnvPatch: liveConfig.portalEnvPatch || {},
    };
    const tenantName = firstNonEmpty([
      liveConfig.name,
      state?.me?.tenantId,
      'Tenant Workspace',
    ]);

    const previewSections = [
      summarizeConfigDiff(liveConfig.featureFlags, draft.featureFlags, 'Feature Flags'),
      summarizeConfigDiff(liveConfig.configPatch, draft.configPatch, 'Config Patch'),
      summarizeConfigDiff(liveConfig.portalEnvPatch, draft.portalEnvPatch, 'Portal Env Patch'),
    ].filter(Boolean);
    const hasChanges = previewSections.some((section) => section.changedCount > 0);
    const restartRequired = previewSections.some((section) => section.changedKeys.some((key) => /restart|rcon|server|runtime|sync/i.test(key)));
    const liveUpdatedAt = firstNonEmpty([liveConfig.updatedAt, state.updatedAt]);

    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Tenant Admin V4 Preview',
        workspaceLabel: tenantName,
        environmentLabel: 'Parallel V4',
        navGroups: NAV_GROUPS,
      },
      header: {
        title: 'การตั้งค่าเซิร์ฟเวอร์',
        subtitle: 'แก้ค่าทีละหมวด พร้อมดูผลต่างก่อนบันทึกจริง และแยกงานเสี่ยงออกจากงานประจำวันให้ชัด',
        statusChips: [
          { label: hasChanges ? 'มี draft ที่ยังไม่บันทึก' : 'ยังไม่มีการเปลี่ยนแปลง', tone: hasChanges ? 'warning' : 'success' },
          { label: restartRequired ? 'อาจต้องรีสตาร์ต' : 'ยังไม่ต้องรีสตาร์ต', tone: restartRequired ? 'danger' : 'muted' },
          { label: `อัปเดตล่าสุด ${formatDateTime(liveUpdatedAt)}`, tone: 'muted' },
        ],
        actions: [
          { label: 'บันทึก', tone: 'primary', href: '#save' },
          { label: 'บันทึกและใช้ทันที', tone: 'secondary', href: '#apply' },
          { label: 'บันทึกและรีสตาร์ต', tone: 'secondary', href: '#restart' },
        ],
      },
      sections: buildSectionGroups(liveConfig),
      summaryCards: previewSections.map((section) => ({
        label: section.label,
        value: section.changedCount > 0 ? `${formatNumber(section.changedCount)} การเปลี่ยนแปลง` : 'ยังไม่ต่างจาก live',
        detail: section.changedKeys.length > 0 ? section.changedKeys.slice(0, 6).join(', ') : `${formatNumber(section.draftKeys)} key ใน draft`,
        tone: section.changedCount > 0 ? 'warning' : 'success',
      })),
      editors: [
        {
          key: 'featureFlags',
          label: 'Feature Flags',
          detail: 'ค่าชุดนี้ใช้กำหนดโมดูลและความสามารถที่เปิดอยู่ของ tenant โดยยังผูกกับระบบ feature gate เดิม',
          value: stringifyPretty(draft.featureFlags),
          tone: 'warning',
        },
        {
          key: 'configPatch',
          label: 'Config Patch',
          detail: 'ค่าหลักของ tenant ฝั่ง control plane ที่ระบบปัจจุบันใช้กับงาน delivery, runtime, integrations และ service posture',
          value: stringifyPretty(draft.configPatch),
          tone: 'info',
        },
        {
          key: 'portalEnvPatch',
          label: 'Portal Env Patch',
          detail: 'ค่าที่กระทบ player/public portal และพฤติกรรมของ environment patch ฝั่งหน้าเว็บหรือ endpoint ที่เกี่ยวข้อง',
          value: stringifyPretty(draft.portalEnvPatch),
          tone: 'success',
        },
      ],
      rightRail: [
        {
          title: 'Backup และ rollback',
          body: 'ควรมีสำเนาก่อนเปลี่ยนค่าเสมอ',
          meta: 'หน้า V4 จะต้องต่อกับ history ของ backup และ flow rollback แบบมี guard ในรอบถัดไป',
          tone: 'info',
        },
        {
          title: 'Validation ที่ต้องเช็ก',
          body: restartRequired ? 'มีค่าบางจุดที่อาจต้องรีสตาร์ต' : 'ยังไม่พบ key ที่ดูเสี่ยงต่อการรีสตาร์ต',
          meta: 'ก่อนบันทึกจริงควรยืนยันว่า Delivery Agent, Server Bot และหน้า server status ยังอยู่ในเกณฑ์พร้อมใช้งาน',
          tone: restartRequired ? 'warning' : 'success',
        },
        {
          title: 'โหมดแก้ค่าแบบขั้นสูง',
          body: 'ตอนนี้ยังใช้ compatibility layer',
          meta: 'หน้าใหม่นี้วางไว้เพื่อค่อยย้ายจาก raw JSON patch ไปสู่ schema-driven form ในรอบถัดไปโดยไม่ทำให้ API เดิมพัง',
          tone: 'warning',
        },
      ],
    };
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

  function renderSummaryCard(card) {
    return [
      `<article class="tdv4-kpi tdv4-tone-${escapeHtml(card.tone || 'muted')}">`,
      `<div class="tdv4-kpi-label">${escapeHtml(card.label)}</div>`,
      `<div class="tdv4-kpi-value">${escapeHtml(card.value)}</div>`,
      `<div class="tdv4-kpi-detail">${escapeHtml(card.detail)}</div>`,
      '</article>',
    ].join('');
  }

  function renderSectionItem(section, current) {
    const currentClass = current ? ' tdv4-nav-link-current' : '';
    return `<a class="tdv4-nav-link${currentClass}" href="#${escapeHtml(section.key)}">${escapeHtml(section.label)}</a>`;
  }

  function renderEditor(editor) {
    return [
      `<section class="tdv4-panel tdv4-tone-${escapeHtml(editor.tone || 'muted')}">`,
      `<div class="tdv4-section-kicker">${escapeHtml(editor.label)}</div>`,
      `<h2 class="tdv4-section-title">${escapeHtml(editor.label)}</h2>`,
      `<p class="tdv4-section-copy">${escapeHtml(editor.detail)}</p>`,
      `<label class="tdv4-editor-label" for="tdv4-editor-${escapeHtml(editor.key)}">แก้ค่าแบบ compatibility layer</label>`,
      `<textarea class="tdv4-editor" id="tdv4-editor-${escapeHtml(editor.key)}" name="${escapeHtml(editor.key)}">${escapeHtml(editor.value)}</textarea>`,
      '</section>',
    ].join('');
  }

  function renderRailCard(item) {
    return [
      `<article class="tdv4-panel tdv4-rail-card tdv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<div class="tdv4-rail-title">${escapeHtml(item.title)}</div>`,
      `<strong class="tdv4-rail-body">${escapeHtml(item.body)}</strong>`,
      `<div class="tdv4-rail-detail">${escapeHtml(item.meta)}</div>`,
      '</article>',
    ].join('');
  }

  function buildTenantServerConfigV4Html(model) {
    const safeModel = model || createTenantServerConfigV4Model({});
    return [
      '<div class="tdv4-app">',
      '<header class="tdv4-topbar">',
      '<div class="tdv4-brand-row">',
      `<div class="tdv4-brand-mark">${escapeHtml(safeModel.shell.brand)}</div>`,
      '<div class="tdv4-brand-copy">',
      `<div class="tdv4-surface-label">${escapeHtml(safeModel.shell.surfaceLabel)}</div>`,
      `<div class="tdv4-workspace-label">${escapeHtml(safeModel.shell.workspaceLabel)}</div>`,
      '</div>',
      '</div>',
      '<div class="tdv4-topbar-actions">',
      renderBadge(safeModel.shell.environmentLabel, 'info'),
      renderBadge('Config', 'warning'),
      '</div>',
      '</header>',
      '<div class="tdv4-shell tdv4-config-shell">',
      '<aside class="tdv4-sidebar">',
      `<div class="tdv4-sidebar-title">${escapeHtml(safeModel.shell.workspaceLabel)}</div>`,
      '<div class="tdv4-sidebar-copy">พื้นที่ทำงานสำหรับแก้ค่าแบบมีบริบท เห็นผลต่างก่อนบันทึก และแยกส่วนเสี่ยงออกจากค่าปกติ</div>',
      ...(Array.isArray(safeModel.shell.navGroups) ? safeModel.shell.navGroups.map(renderNavGroup) : []),
      '<section class="tdv4-nav-group">',
      '<div class="tdv4-nav-group-label">หมวดการตั้งค่า</div>',
      '<div class="tdv4-nav-items">',
      ...(Array.isArray(safeModel.sections) ? safeModel.sections.map((section, index) => renderSectionItem(section, index === 0)) : []),
      '</div>',
      '</section>',
      '</aside>',
      '<main class="tdv4-main">',
      '<section class="tdv4-pagehead tdv4-panel">',
      '<div>',
      `<h1 class="tdv4-page-title">${escapeHtml(safeModel.header.title)}</h1>`,
      `<p class="tdv4-page-subtitle">${escapeHtml(safeModel.header.subtitle)}</p>`,
      '<div class="tdv4-chip-row">',
      ...(Array.isArray(safeModel.header.statusChips) ? safeModel.header.statusChips.map((chip) => renderBadge(chip.label, chip.tone)) : []),
      '</div>',
      '</div>',
      '<div class="tdv4-pagehead-actions tdv4-pagehead-actions-stack">',
      ...(Array.isArray(safeModel.header.actions) ? safeModel.header.actions.map((action, index) => {
        const className = index === 0 ? 'tdv4-button tdv4-button-primary' : 'tdv4-button tdv4-button-secondary';
        return `<a class="${className}" href="${escapeHtml(action.href || '#')}">${escapeHtml(action.label)}</a>`;
      }) : []),
      '</div>',
      '</section>',
      '<section class="tdv4-kpi-strip tdv4-config-summary-grid">',
      ...(Array.isArray(safeModel.summaryCards) ? safeModel.summaryCards.map(renderSummaryCard) : []),
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">หมวดที่พร้อมย้ายไป form แบบมี schema</div>',
      '<h2 class="tdv4-section-title">โครงหมวดการตั้งค่า</h2>',
      '<p class="tdv4-section-copy">เริ่มจากจัดหมวดให้เข้าใจก่อน แล้วค่อยแทน raw patch ด้วย typed fields ในรอบถัดไป โดยยังใช้ patch groups เดิมเป็น compatibility layer</p>',
      '<div class="tdv4-config-section-grid">',
      ...(Array.isArray(safeModel.sections) ? safeModel.sections.map((section) => [
        `<article class="tdv4-panel tdv4-tone-${escapeHtml(section.tone || 'muted')}">`,
        `<div class="tdv4-section-kicker">${escapeHtml(section.source)}</div>`,
        `<h3 class="tdv4-section-title">${escapeHtml(section.label)}</h3>`,
        `<p class="tdv4-section-copy">${escapeHtml(section.detail)}</p>`,
        `<div class="tdv4-config-key-row">${section.keys.map((key) => renderBadge(key, 'muted')).join('')}</div>`,
        '</article>',
      ].join('')) : []),
      '</div>',
      '</section>',
      ...(Array.isArray(safeModel.editors) ? safeModel.editors.map(renderEditor) : []),
      '</main>',
      '<aside class="tdv4-rail">',
      '<div class="tdv4-rail-sticky">',
      `<div class="tdv4-rail-header">${escapeHtml(safeModel.shell.workspaceLabel)}</div>`,
      '<div class="tdv4-rail-copy">คำเตือนและบริบทที่ควรเห็นตลอดเวลา ระหว่างแก้ค่าระบบของ tenant</div>',
      ...(Array.isArray(safeModel.rightRail) ? safeModel.rightRail.map(renderRailCard) : []),
      '</div>',
      '</aside>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderTenantServerConfigV4(rootElement, source) {
    if (!rootElement) {
      throw new Error('renderTenantServerConfigV4 requires a root element');
    }
    const model = source && source.header && Array.isArray(source.sections)
      ? source
      : createTenantServerConfigV4Model(source);
    rootElement.innerHTML = buildTenantServerConfigV4Html(model);
    return model;
  }

  return {
    buildTenantServerConfigV4Html,
    createTenantServerConfigV4Model,
    renderTenantServerConfigV4,
  };
});
