(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantDeliveryAgentsV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const FALLBACK_NAV_GROUPS = [
    {
      label: 'ภาพรวม',
      items: [
        { label: 'แดชบอร์ด', href: '#dashboard' },
        { label: 'สถานะเซิร์ฟเวอร์', href: '#server-status' },
        { label: 'รีสตาร์ต', href: '#restart-control' },
      ],
    },
    {
      label: 'งานประจำวัน',
      items: [
        { label: 'คำสั่งซื้อ', href: '#orders' },
        { label: 'ผู้เล่น', href: '#players' },
      ],
    },
    {
      label: 'เครื่องมือ',
      items: [
        { label: 'Delivery Agent', href: '#delivery-agents', current: true },
        { label: 'Server Bot', href: '#server-bots' },
        { label: 'ตั้งค่าเซิร์ฟเวอร์', href: '#server-config' },
      ],
    },
  ];

  const EXECUTE_SIGNALS = ['execute', 'delivery', 'dispatch', 'command', 'console-agent', 'announce', 'write'];

  function trimText(value, maxLen = 300) {
    const text = String(value ?? '').trim();
    return !text ? '' : text.slice(0, maxLen);
  }

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
      const text = trimText(value, 240);
      if (text) return text;
    }
    return fallback;
  }

  function formatNumber(value, fallback = '0') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat('th-TH').format(numeric) : fallback;
  }

  function formatDateTime(value, fallback = 'ยังไม่เห็นการเชื่อมต่อ') {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? fallback
      : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function statusTone(status) {
    const text = trimText(status, 80).toLowerCase();
    if (['online', 'ready', 'healthy', 'active'].includes(text)) return 'success';
    if (['pending_activation', 'pending-activation', 'draft', 'provisioned', 'degraded', 'stale'].includes(text)) return 'warning';
    if (['offline', 'revoked', 'outdated', 'error', 'failed'].includes(text)) return 'danger';
    return 'muted';
  }

  function normalizeCapabilities(value) {
    const raw = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[,\n]+/g)
        : [];
    return raw.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean);
  }

  function isDeliveryAgent(row) {
    const meta = row?.meta && typeof row.meta === 'object' ? row.meta : {};
    const role = trimText(meta.agentRole || meta.role || row.role, 80).toLowerCase();
    const scope = trimText(meta.agentScope || meta.scope || row.scope, 80).toLowerCase();
    if (role === 'execute' || ['execute_only', 'execute-only', 'executeonly'].includes(scope)) return true;
    const text = [
      row?.runtimeKey,
      row?.channel,
      row?.name,
      row?.status,
      row?.role,
      row?.scope,
      meta.agentRole,
      meta.agentScope,
      ...normalizeCapabilities(meta.capabilities || meta.features),
    ]
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter(Boolean)
      .join(' ');
    return EXECUTE_SIGNALS.some((token) => text.includes(token));
  }

  function renderBadge(label, tone) {
    return `<span class="tdv4-badge tdv4-badge-${escapeHtml(tone || 'muted')}">${escapeHtml(label)}</span>`;
  }

  function renderNavGroup(group) {
    return `<section class="tdv4-nav-group"><div class="tdv4-nav-group-label">${escapeHtml(group.label)}</div><div class="tdv4-nav-items">${(Array.isArray(group.items) ? group.items : []).map((item) => `<a class="tdv4-nav-link${item.current ? ' tdv4-nav-link-current' : ''}" href="${escapeHtml(item.href || '#')}">${escapeHtml(item.label)}</a>`).join('')}</div></section>`;
  }

  function getAgentId(row) {
    return firstNonEmpty([row?.meta?.agentId, row?.agentId], '');
  }

  function getServerId(row) {
    return firstNonEmpty([row?.meta?.serverId, row?.serverId, row?.tenantServerId], '');
  }

  function getRuntimeKey(row) {
    return firstNonEmpty([row?.runtimeKey, row?.meta?.runtimeKey], '');
  }

  function matchesRuntimeEntry(entry, runtimeRow) {
    const runtimeAgentId = getAgentId(runtimeRow);
    const runtimeServerId = getServerId(runtimeRow);
    const runtimeKey = getRuntimeKey(runtimeRow);
    const entryAgentId = trimText(entry?.agentId, 120);
    const entryServerId = trimText(entry?.serverId, 120);
    const entryRuntimeKey = trimText(entry?.runtimeKey, 160);

    if (runtimeAgentId && entryAgentId && runtimeAgentId === entryAgentId) {
      return !runtimeServerId || !entryServerId || runtimeServerId === entryServerId;
    }
    if (runtimeKey && entryRuntimeKey && runtimeKey === entryRuntimeKey) {
      return !runtimeServerId || !entryServerId || runtimeServerId === entryServerId;
    }
    return false;
  }

  function renderRuntimeActions(kind, row) {
    const buttons = [];
    if (row.apiKeyId) {
      buttons.push(
        `<button class="tdv4-button tdv4-button-secondary" type="button" data-runtime-action-kind="${escapeHtml(kind)}" data-runtime-action="rotate-token" data-runtime-api-key-id="${escapeHtml(row.apiKeyId)}" data-runtime-name="${escapeHtml(row.name)}">ออกคีย์ใช้งานใหม่</button>`,
      );
      buttons.push(
        `<button class="tdv4-button tdv4-button-secondary" type="button" data-runtime-action-kind="${escapeHtml(kind)}" data-runtime-action="revoke-token" data-runtime-api-key-id="${escapeHtml(row.apiKeyId)}" data-runtime-name="${escapeHtml(row.name)}">ปิดคีย์ใช้งาน</button>`,
      );
    }
    if (row.deviceId) {
      buttons.push(
        `<button class="tdv4-button tdv4-button-secondary" type="button" data-runtime-action-kind="${escapeHtml(kind)}" data-runtime-action="revoke-device" data-runtime-device-id="${escapeHtml(row.deviceId)}" data-runtime-name="${escapeHtml(row.name)}">ยกเลิกการผูกเครื่อง</button>`,
      );
    }
    if (!buttons.length) {
      return '<div class="tdv4-runtime-inline-note">รอให้เครื่องเชื่อมต่อและรับคีย์ใช้งานก่อน จึงจะจัดการจากหน้านี้ได้</div>';
    }
    return `<div class="tdv4-runtime-inline-note">${escapeHtml(row.issue)}</div><div class="tdv4-runtime-action-row">${buttons.join('')}</div>`;
  }

  function renderProvisioningActions(kind, row) {
    return [
      `<button class="tdv4-button tdv4-button-secondary" type="button" data-runtime-action-kind="${escapeHtml(kind)}" data-runtime-action="reissue-provision" data-runtime-token-id="${escapeHtml(row.tokenId)}" data-runtime-server-id-value="${escapeHtml(row.serverId)}" data-runtime-display-name-value="${escapeHtml(row.name)}" data-runtime-runtime-key-value="${escapeHtml(row.runtimeKey)}">ออกโทเค็นติดตั้งใหม่</button>`,
      `<button class="tdv4-button tdv4-button-secondary" type="button" data-runtime-action-kind="${escapeHtml(kind)}" data-runtime-action="revoke-provision" data-runtime-token-id="${escapeHtml(row.tokenId)}" data-runtime-name="${escapeHtml(row.name)}">ปิดโทเค็นติดตั้ง</button>`,
    ].join('');
  }

  function buildResultPanel(result) {
    if (!result?.instructions) return '';
    const instructions = result.instructions;
    const tone = trimText(instructions.tone, 40) || 'success';
    const command = trimText(instructions.command, 4000);
    return [
      `<article class="tdv4-panel tdv4-runtime-result tdv4-tone-${escapeHtml(tone)}">`,
      `<div class="tdv4-section-kicker">${escapeHtml(command ? 'พร้อมใช้งาน' : 'อัปเดตล่าสุด')}</div>`,
      `<h3 class="tdv4-section-title">${escapeHtml(instructions.title || 'ผลลัพธ์ล่าสุด')}</h3>`,
      `<p class="tdv4-section-copy">${escapeHtml(instructions.detail || '')}</p>`,
      command ? `<textarea class="tdv4-editor tdv4-runtime-command" readonly>${escapeHtml(command)}</textarea>` : '',
      '</article>',
    ].join('');
  }

  function buildEmptyState(kind, title, detail, actionLabel, actionHref) {
    return {
      kind: trimText(kind, 80) || 'general',
      title: firstNonEmpty([title], ''),
      detail: firstNonEmpty([detail], ''),
      actionLabel: firstNonEmpty([actionLabel], ''),
      actionHref: firstNonEmpty([actionHref], '#delivery-agents'),
    };
  }

  function createTenantDeliveryAgentsV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const runtimeRows = (Array.isArray(state.agents) ? state.agents : []).filter(isDeliveryAgent);
    const provisioning = Array.isArray(state.agentProvisioning) ? state.agentProvisioning.filter(isDeliveryAgent) : [];
    const devices = Array.isArray(state.agentDevices) ? state.agentDevices : [];
    const credentials = Array.isArray(state.agentCredentials) ? state.agentCredentials : [];
    const online = runtimeRows.filter((row) => statusTone(row.status) === 'success').length;
    const selectedServerId = String(state?.activeServer?.id || state?.servers?.[0]?.id || '').trim();
    const queueCount = Array.isArray(state.queueItems) ? state.queueItems.length : 0;
    const failedCount = Array.isArray(state.deadLetters) ? state.deadLetters.length : 0;
    const result = state?.__provisioningResult?.['delivery-agents'] || null;
    const hasServers = Array.isArray(state.servers) && state.servers.length > 0;

    const rows = runtimeRows.map((row) => {
      const device = devices.find((entry) => matchesRuntimeEntry(entry, row) && String(entry?.status || '').trim() !== 'revoked') || null;
      const credential = credentials.find((entry) => matchesRuntimeEntry(entry, row) && String(entry?.status || '').trim() !== 'revoked') || null;
      return {
        name: firstNonEmpty([row?.meta?.agentLabel, row?.runtimeKey, row?.name, 'Delivery Agent']),
        server: firstNonEmpty([row?.meta?.serverId, row?.serverId, row?.tenantServerId, 'ยังไม่ผูกเซิร์ฟเวอร์']),
        machine: firstNonEmpty([device?.hostname, row?.hostname, row?.meta?.hostname, row?.meta?.machineFingerprint, 'ยังไม่เห็นชื่อเครื่อง']),
        status: firstNonEmpty([row?.status, 'unknown']),
        lastSeenAt: formatDateTime(row?.lastSeenAt),
        version: firstNonEmpty([row?.version, row?.meta?.version, '-']),
        issue: firstNonEmpty([row?.reason, row?.meta?.warning, row?.meta?.lastError, 'พร้อมรับงานส่งของแล้ว']),
        deviceId: trimText(device?.id, 160),
        apiKeyId: trimText(credential?.apiKeyId || credential?.id, 160),
      };
    });

    const tokens = provisioning.slice(0, 8).map((row) => ({
      tokenId: trimText(row?.id, 160),
      serverId: trimText(row?.serverId, 160),
      name: firstNonEmpty([row?.displayName, row?.name, row?.runtimeKey, 'Delivery Agent']),
      expiresAt: formatDateTime(row?.expiresAt, 'ยังไม่กำหนดเวลา'),
      status: firstNonEmpty([row?.status, 'pending_activation']),
      runtimeKey: firstNonEmpty([row?.runtimeKey, row?.agentId, '-']),
    }));
    const selectedServerTokens = tokens.filter((row) => !selectedServerId || row.serverId === selectedServerId);
    const createEmptyState = hasServers
      ? null
      : buildEmptyState(
          'missing-server',
          'ยังไม่มีเซิร์ฟเวอร์',
          'สร้างเซิร์ฟเวอร์ก่อน แล้วค่อยออกโทเค็นเพื่อติดตั้ง Delivery Agent บนเครื่องที่ใช้ส่งของในเกม',
          'ไปหน้าเซิร์ฟเวอร์',
          '#server-status',
        );
    const listEmptyState = rows.length
      ? null
      : selectedServerTokens.length
        ? buildEmptyState(
            'pending-install',
            'กำลังรอติดตั้ง Delivery Agent',
            'ตอนนี้มีโทเค็นติดตั้งแล้ว ให้นำคำสั่งจากแผงด้านขวาไปรันบนเครื่องจริง แล้วรีเฟรชหน้านี้อีกครั้ง',
            'ดูโทเค็นที่รอติดตั้ง',
            '#delivery-agents',
          )
        : hasServers
          ? buildEmptyState(
              'create-first',
              'ยังไม่มี Delivery Agent',
              'กด “สร้าง Delivery Agent” เพื่อออกโทเค็นและคำสั่งติดตั้งสำหรับเครื่องที่เปิด SCUM client',
              'สร้าง Delivery Agent',
              '#delivery-agents-provision',
            )
          : createEmptyState;

    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'แผงผู้เช่า',
        workspaceLabel: firstNonEmpty([
          state?.tenantLabel,
          state?.tenantConfig?.name,
          state?.overview?.tenantName,
          state?.me?.tenantId,
          'Tenant Workspace',
        ]),
        navGroups: Array.isArray(state?.__surfaceShell?.navGroups) ? state.__surfaceShell.navGroups : FALLBACK_NAV_GROUPS,
      },
      header: {
        title: 'Delivery Agent',
        subtitle: 'เครื่องที่ใช้ส่งของและสั่งงานที่ต้องทำบนเครื่องเกม',
        chips: [
          { label: `${formatNumber(online)} ออนไลน์`, tone: online ? 'success' : 'muted' },
          { label: `${formatNumber(rows.length - online)} ออฟไลน์`, tone: rows.length > online ? 'warning' : 'muted' },
          { label: `${formatNumber(tokens.length)} รอติดตั้ง`, tone: tokens.length ? 'warning' : 'muted' },
        ],
      },
      summary: [
        {
          label: 'พร้อมส่งของ',
          value: formatNumber(online),
          detail: online ? 'มีเครื่องที่พร้อมรับงานแล้ว' : 'ยังไม่มีเครื่องที่ออนไลน์',
          tone: online ? 'success' : 'warning',
        },
        {
          label: 'งานรอทำ',
          value: formatNumber(queueCount),
          detail: queueCount ? 'มีงานที่ยังรอส่งของ' : 'ไม่มีงานค้างในคิว',
          tone: queueCount ? 'warning' : 'success',
        },
        {
          label: 'งานล้มเหลว',
          value: formatNumber(failedCount),
          detail: failedCount ? 'ควรเคลียร์งานที่ล้มเหลวก่อนลองใหม่' : 'ยังไม่มีงานล้มเหลว',
          tone: failedCount ? 'danger' : 'muted',
        },
      ],
      servers: Array.isArray(state.servers) ? state.servers : [],
      selectedServerId,
      rows,
      tokens,
      result,
      createEmptyState,
      listEmptyState,
    };
  }

  function buildTenantDeliveryAgentsV4Html(model) {
    const safe = model && typeof model === 'object' ? model : createTenantDeliveryAgentsV4Model({});
    const serverOptions = safe.servers
      .map((server) => `<option value="${escapeHtml(server.id)}"${server.id === safe.selectedServerId ? ' selected' : ''}>${escapeHtml(firstNonEmpty([server.name, server.slug, server.id]))}</option>`)
      .join('');
    const createPanelBody = safe.createEmptyState
      ? [
          `<div class="tdv4-empty-state" data-runtime-empty-kind="${escapeHtml(safe.createEmptyState.kind)}">`,
          `<strong>${escapeHtml(safe.createEmptyState.title)}</strong>`,
          `<p>${escapeHtml(safe.createEmptyState.detail)}</p>`,
          `<div class="tdv4-pagehead-actions"><a class="tdv4-button tdv4-button-primary" data-runtime-empty-action="delivery-agents" href="${escapeHtml(safe.createEmptyState.actionHref)}">${escapeHtml(safe.createEmptyState.actionLabel)}</a></div>`,
          '</div>',
        ].join('')
      : [
          '<div class="tdv4-runtime-form"><div class="tdv4-runtime-form-fields">',
          '<label class="tdv4-basic-field"><div class="tdv4-basic-field-copy"><div class="tdv4-basic-field-label">เซิร์ฟเวอร์</div><div class="tdv4-basic-field-detail">ผูกเครื่องนี้กับเซิร์ฟเวอร์ที่ต้องรับงานส่งของ</div></div>',
          `<select class="tdv4-basic-input" data-runtime-server-id="delivery-agents">${serverOptions || '<option value=\"\">ยังไม่มีเซิร์ฟเวอร์</option>'}</select></label>`,
          '<label class="tdv4-basic-field"><div class="tdv4-basic-field-copy"><div class="tdv4-basic-field-label">ชื่อที่ใช้เรียก</div><div class="tdv4-basic-field-detail">ชื่อนี้จะแสดงในหน้ารายการเครื่องที่เชื่อมอยู่</div></div>',
          '<input class="tdv4-basic-input" type="text" data-runtime-display-name="delivery-agents" value="Delivery Agent"></label>',
          '<label class="tdv4-basic-field"><div class="tdv4-basic-field-copy"><div class="tdv4-basic-field-label">รหัสอ้างอิง</div><div class="tdv4-basic-field-detail">ใช้แยกเครื่องนี้ออกจากเครื่องอื่นในระบบ</div></div>',
          '<input class="tdv4-basic-input" type="text" data-runtime-runtime-key="delivery-agents" value="delivery-agent"></label>',
          '</div><div class="tdv4-action-list">',
          `<button class="tdv4-button tdv4-button-primary" type="button" data-runtime-provision-button="delivery-agents"${safe.servers.length ? '' : ' disabled'}>สร้าง Delivery Agent</button>`,
          '</div></div>',
        ].join('');
    const listEmptyState = safe.listEmptyState || buildEmptyState(
      'create-first',
      'ยังไม่มี Delivery Agent',
      'กด “สร้าง Delivery Agent” เพื่อออกโทเค็นและคำสั่งติดตั้งบนเครื่องจริง',
      'สร้าง Delivery Agent',
      '#delivery-agents-provision',
    );

    return [
      '<div class="tdv4-app"><div class="tdv4-topbar"><div class="tdv4-brand-row">',
      `<div class="tdv4-brand-mark">${escapeHtml(safe.shell.brand)}</div>`,
      '<div class="tdv4-brand-copy">',
      `<div class="tdv4-surface-label">${escapeHtml(safe.shell.surfaceLabel)}</div>`,
      `<div class="tdv4-workspace-label">${escapeHtml(safe.shell.workspaceLabel)}</div>`,
      '</div></div></div>',
      '<div class="tdv4-shell tdv4-runtime-shell">',
      `<aside class="tdv4-sidebar">${(Array.isArray(safe.shell.navGroups) ? safe.shell.navGroups : []).map(renderNavGroup).join('')}</aside>`,
      '<main class="tdv4-main tdv4-stack">',
      '<section class="tdv4-pagehead"><div>',
      `<h1 class="tdv4-page-title">${escapeHtml(safe.header.title)}</h1>`,
      `<p class="tdv4-page-subtitle">${escapeHtml(safe.header.subtitle)}</p>`,
      `<div class="tdv4-chip-row">${safe.header.chips.map((chip) => renderBadge(chip.label, chip.tone)).join('')}</div>`,
      '</div><div class="tdv4-pagehead-actions">',
      '<a class="tdv4-button tdv4-button-primary" href="#delivery-agents-provision">สร้าง Delivery Agent</a>',
      '</div></section>',
      `<section class="tdv4-kpi-strip tdv4-runtime-summary-strip">${safe.summary.map((item) => `<article class="tdv4-kpi tdv4-tone-${escapeHtml(item.tone)}"><div class="tdv4-kpi-label">${escapeHtml(item.label)}</div><div class="tdv4-kpi-value">${escapeHtml(item.value)}</div><div class="tdv4-kpi-detail">${escapeHtml(item.detail)}</div></article>`).join('')}</section>`,
      '<section class="tdv4-dual-grid tdv4-runtime-main-grid">',
      '<article class="tdv4-panel" id="delivery-agents-provision">',
      '<div class="tdv4-section-kicker">ติดตั้งใหม่</div>',
      '<h2 class="tdv4-section-title">สร้าง Delivery Agent</h2>',
      '<p class="tdv4-section-copy">เลือกเซิร์ฟเวอร์ ตั้งชื่อ แล้วออกโทเค็นสำหรับติดตั้งบนเครื่องที่ใช้ส่งของในเกม</p>',
      createPanelBody,
      buildResultPanel(safe.result),
      '</article>',
      '<article class="tdv4-panel">',
      '<div class="tdv4-section-kicker">ที่เชื่อมอยู่ตอนนี้</div>',
      '<h2 class="tdv4-section-title">รายการ Delivery Agent</h2>',
      '<p class="tdv4-section-copy">ดูว่าเครื่องใดพร้อมรับงาน เครื่องใดต้องออกคีย์ใหม่ และเครื่องใดควรรีเซ็ตการผูกเครื่อง</p>',
      safe.rows.length
        ? `<div class="tdv4-data-table"><div class="tdv4-data-header"><span>ชื่อ</span><span>เซิร์ฟเวอร์</span><span>เครื่อง</span><span>สถานะ</span><span>ล่าสุด</span><span>เวอร์ชัน</span><span>จัดการ</span></div>${safe.rows.map((row, index) => `<article class="tdv4-data-row${index === 0 ? ' tdv4-data-row-current' : ''}"><div class="tdv4-data-main"><strong>${escapeHtml(row.name)}</strong><span class="tdv4-kpi-detail">${escapeHtml(row.server)}</span></div><span>${escapeHtml(row.server)}</span><span>${escapeHtml(row.machine)}</span><span>${renderBadge(row.status, statusTone(row.status))}</span><span>${escapeHtml(row.lastSeenAt)}</span><span>${escapeHtml(row.version)}</span><div class="tdv4-runtime-manage-cell">${renderRuntimeActions('delivery-agents', row)}</div></article>`).join('')}</div>`
        : `<div class="tdv4-empty-state" data-runtime-empty-kind="${escapeHtml(listEmptyState.kind)}"><strong>${escapeHtml(listEmptyState.title)}</strong><p>${escapeHtml(listEmptyState.detail)}</p><div class="tdv4-pagehead-actions"><a class="tdv4-button tdv4-button-primary" data-runtime-empty-action="delivery-agents" href="${escapeHtml(listEmptyState.actionHref)}">${escapeHtml(listEmptyState.actionLabel)}</a></div></div>`,
      '</article></section>',
      '</main>',
      '<aside class="tdv4-rail"><div class="tdv4-rail-sticky">',
      '<article class="tdv4-panel tdv4-rail-card tdv4-tone-info"><div class="tdv4-rail-title">วิธีเริ่มใช้งาน</div><strong class="tdv4-rail-body">สร้าง · ติดตั้ง · เชื่อมต่อ</strong><div class="tdv4-rail-detail">หลังออกโทเค็นแล้ว ให้นำคำสั่งไปใช้บนเครื่องเกม จากนั้นรอให้ระบบเห็นการเชื่อมต่อกลับมา</div></article>',
      '<article class="tdv4-panel tdv4-rail-card tdv4-tone-warning"><div class="tdv4-rail-title">โทเค็นที่ยังไม่ได้ใช้</div>',
      safe.tokens.length
        ? safe.tokens.map((row) => `<div class="tdv4-list-item"><div class="tdv4-list-main"><strong>${escapeHtml(row.name)}</strong><p>รหัสอ้างอิง: ${escapeHtml(row.runtimeKey)}</p><p>หมดอายุ: ${escapeHtml(row.expiresAt)}</p></div><div class="tdv4-list-item-actions">${renderProvisioningActions('delivery-agents', row)}</div></div>`).join('')
        : '<div class="tdv4-empty-state"><strong>ยังไม่มีโทเค็นค้าง</strong><p>เมื่อสร้างโทเค็นใหม่ ระบบจะแสดงไว้ที่นี่จนกว่าจะถูกใช้งาน</p></div>',
      '</article></div></aside>',
      '</div></div>',
    ].join('');
  }

  function renderTenantDeliveryAgentsV4(rootElement, source) {
    if (!rootElement) throw new Error('renderTenantDeliveryAgentsV4 requires a root element');
    const model = source && source.header && Array.isArray(source.rows)
      ? source
      : createTenantDeliveryAgentsV4Model(source);
    rootElement.innerHTML = buildTenantDeliveryAgentsV4Html(model);
    return model;
  }

  return {
    buildTenantDeliveryAgentsV4Html,
    createTenantDeliveryAgentsV4Model,
    renderTenantDeliveryAgentsV4,
  };
});
