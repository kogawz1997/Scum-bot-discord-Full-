(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantDashboardV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const DEFAULT_NAV_GROUPS = [
    {
      label: 'ภาพรวมงานหลัก',
      items: [
        { label: 'แดชบอร์ด', href: '#dashboard', current: true },
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
        { label: 'ตั้งค่าเซิร์ฟเวอร์', href: '#server-config' },
        { label: 'Server Bot', href: '#server-bots' },
        { label: 'Delivery Agent', href: '#delivery-agents' },
        { label: 'บันทึกและหลักฐาน', href: '#audit' },
      ],
    },
  ];

  const DEFAULT_TASK_GROUPS = [
    {
      tone: 'success',
      tag: 'เริ่มจากตรงนี้',
      title: 'เซิร์ฟเวอร์และสุขภาพระบบ',
      detail: 'ใช้เมื่อคุณต้องเช็กสถานะเซิร์ฟเวอร์ ดูการเชื่อมต่อของบอต หรือเปิดงานแก้ปัญหาที่ค้างอยู่',
      actions: [
        { label: 'ดูสถานะเซิร์ฟเวอร์', href: '#server-status', primary: true },
        { label: 'เปิดกล่องเหตุขัดข้อง', href: '#incidents' },
        { label: 'เปิดหน้าควบคุมรีสตาร์ต', href: '#restart-control' },
      ],
    },
    {
      tone: 'warning',
      tag: 'ซัพพอร์ตผู้เล่น',
      title: 'คำสั่งซื้อและปัญหาที่ผู้เล่นพบ',
      detail: 'เปิดงานประจำวันให้เร็วขึ้น เช่น ค้นหาคำสั่งซื้อ ตรวจสถานะส่งของ หรือดูข้อมูลผู้เล่นที่กำลังมีปัญหา',
      actions: [
        { label: 'ดูคำสั่งซื้อล่าสุด', href: '#orders', primary: true },
        { label: 'ดูสถานะการส่งของ', href: '#delivery' },
        { label: 'เปิดข้อมูลผู้เล่น', href: '#players' },
      ],
    },
    {
      tone: 'info',
      tag: 'หลักฐานและการตั้งค่า',
      title: 'ตรวจค่า ใช้หลักฐาน และคุมความเสี่ยง',
      detail: 'ใช้ก่อนเปลี่ยนค่าระบบหรือเมื่อคุณต้องย้อนดูหลักฐานการทำงานของทีมและของรันไทม์',
      actions: [
        { label: 'เปิดหน้าตั้งค่าเซิร์ฟเวอร์', href: '#server-config', primary: true },
        { label: 'เปิดบันทึกและหลักฐาน', href: '#audit' },
        { label: 'ดูสถานะบอตและเอเจนต์', href: '#server-bots' },
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

  function parseDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDateTime(value) {
    const date = parseDate(value);
    if (!date) return 'ไม่ทราบเวลา';
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function formatRelative(value) {
    const date = parseDate(value);
    if (!date) return 'ยังไม่มีข้อมูล';
    const deltaMs = Date.now() - date.getTime();
    const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));
    if (deltaMinutes < 60) return `${formatNumber(deltaMinutes)} นาทีที่แล้ว`;
    const deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) return `${formatNumber(deltaHours)} ชั่วโมงที่แล้ว`;
    const deltaDays = Math.round(deltaHours / 24);
    return `${formatNumber(deltaDays)} วันที่แล้ว`;
  }

  function normalizeStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'unknown';
    if (['online', 'ready', 'healthy', 'active'].includes(raw)) return 'online';
    if (['warning', 'degraded', 'slow', 'stale'].includes(raw)) return 'degraded';
    if (['offline', 'stopped', 'failed', 'error', 'revoked'].includes(raw)) return 'offline';
    if (['provisioned', 'pending', 'pending_activation', 'draft'].includes(raw)) return 'pending';
    return raw;
  }

  function statusLabel(value) {
    const normalized = normalizeStatus(value);
    if (normalized === 'online') return 'พร้อมใช้งาน';
    if (normalized === 'degraded') return 'ต้องจับตา';
    if (normalized === 'offline') return 'ไม่พร้อมใช้งาน';
    if (normalized === 'pending') return 'รอดำเนินการ';
    return 'ยังไม่มีข้อมูล';
  }

  function toneForStatus(value) {
    const normalized = normalizeStatus(value);
    if (normalized === 'online') return 'success';
    if (normalized === 'degraded') return 'warning';
    if (normalized === 'offline') return 'danger';
    return 'muted';
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

  function findAgentStatus(agents, matcher) {
    const rows = Array.isArray(agents) ? agents : [];
    const found = rows.find((item) => matcher(String(item?.role || item?.kind || item?.type || '').trim().toLowerCase()));
    return found ? normalizeStatus(found.status || found.state) : 'unknown';
  }

  function extractPackageName(legacyState) {
    const subscriptions = Array.isArray(legacyState?.subscriptions) ? legacyState.subscriptions : [];
    const activeSubscription = subscriptions.find((item) => String(item?.status || '').toLowerCase() === 'active') || subscriptions[0];
    return firstNonEmpty([
      activeSubscription?.packageName,
      activeSubscription?.planName,
      legacyState?.dashboardCards?.packageName,
      legacyState?.overview?.packageName,
      legacyState?.overview?.planName,
      'PREVIEW',
    ]);
  }

  function extractLastSync(legacyState) {
    return firstNonEmpty([
      legacyState?.deliveryRuntime?.lastSyncAt,
      legacyState?.overview?.analytics?.delivery?.lastSyncAt,
      legacyState?.reconcile?.lastRunAt,
      legacyState?.notifications?.[0]?.createdAt,
    ]);
  }

  function buildIssues(legacyState) {
    const issues = [];
    const deadLetters = listCount(legacyState?.deadLetters);
    const queueDepth = listCount(legacyState?.queueItems);
    const anomalyCount = Number(legacyState?.reconcile?.summary?.anomalies || 0);
    const abuseCount = Number(legacyState?.reconcile?.summary?.abuseFindings || 0);
    const notifications = Array.isArray(legacyState?.notifications) ? legacyState.notifications.slice(0, 3) : [];
    const serverStatus = normalizeStatus(
      legacyState?.overview?.serverStatus
      || legacyState?.dashboardCards?.serverStatus
      || legacyState?.deliveryRuntime?.serverStatus,
    );

    if (serverStatus !== 'online') {
      issues.push({
        tone: 'danger',
        title: 'สถานะเซิร์ฟเวอร์ยังไม่พร้อม',
        detail: 'ควรเปิดหน้าสถานะเซิร์ฟเวอร์ก่อน เพื่อดูว่าปัญหาอยู่ที่ Server Bot การเชื่อมต่อ หรือขั้นตอนรีสตาร์ตล่าสุด',
        meta: statusLabel(serverStatus),
      });
    }
    if (deadLetters > 0) {
      issues.push({
        tone: 'danger',
        title: 'มีรายการส่งของตกค้างใน dead-letter',
        detail: 'ควรตรวจรายการที่ล้มเหลวและยืนยันสาเหตุ ก่อนตัดสินใจ replay หรือคืนสถานะให้ผู้เล่น',
        meta: `${formatNumber(deadLetters)} รายการ`,
      });
    }
    if (queueDepth > 5) {
      issues.push({
        tone: 'warning',
        title: 'คิวส่งของเริ่มสะสม',
        detail: 'ดูภาระงานของ Delivery Agent และตรวจว่ามีคำสั่งซื้อใดติดอยู่ระหว่างรอประมวลผลนานผิดปกติหรือไม่',
        meta: `${formatNumber(queueDepth)} รายการ`,
      });
    }
    if (anomalyCount > 0 || abuseCount > 0) {
      issues.push({
        tone: anomalyCount > 0 ? 'warning' : 'danger',
        title: 'พบสัญญาณผิดปกติจากงานตรวจสอบ',
        detail: 'หน้า Audit และ Diagnostics มีรายละเอียดเหตุผิดปกติที่ควรยืนยันก่อนเปิดงานต่อกับผู้เล่นหรือทีมดูแลเซิร์ฟเวอร์',
        meta: `anomalies ${formatNumber(anomalyCount)} · abuse ${formatNumber(abuseCount)}`,
      });
    }

    notifications.forEach((item) => {
      issues.push({
        tone: toneForStatus(item?.severity || item?.tone || 'degraded'),
        title: firstNonEmpty([item?.title, item?.label, 'การแจ้งเตือนล่าสุด']),
        detail: firstNonEmpty([item?.detail, item?.message, 'ตรวจข้อความแจ้งเตือนล่าสุดจากระบบ']),
        meta: formatRelative(item?.createdAt),
      });
    });

    return issues.slice(0, 5);
  }

  function buildContextBlocks(legacyState) {
    const quota = legacyState?.quota?.quotas || {};
    const apiKeysUsed = quota?.apiKeys ? `${formatNumber(quota.apiKeys.used)}/${formatNumber(quota.apiKeys.limit, 'ไม่จำกัด')}` : 'ยังไม่มีข้อมูล';
    const hooksUsed = quota?.webhooks ? `${formatNumber(quota.webhooks.used)}/${formatNumber(quota.webhooks.limit, 'ไม่จำกัด')}` : 'ยังไม่มีข้อมูล';
    const runtimesUsed = quota?.agentRuntimes ? `${formatNumber(quota.agentRuntimes.used)}/${formatNumber(quota.agentRuntimes.limit, 'ไม่จำกัด')}` : 'ยังไม่มีข้อมูล';
    const agents = Array.isArray(legacyState?.agents) ? legacyState.agents : [];
    const executeOnline = findAgentStatus(agents, (role) => role.includes('execute') || role.includes('delivery') || role.includes('console'));
    const syncOnline = findAgentStatus(agents, (role) => role.includes('sync') || role.includes('server') || role.includes('watcher'));

    return [
      {
        label: 'สถานะแพ็กเกจ',
        value: extractPackageName(legacyState),
        detail: 'สรุปสิทธิ์ใช้งานและโมดูลที่เปิดอยู่ใน tenant นี้ เพื่อช่วยตัดสินใจว่าต้องเปิดงานเพิ่มหรืออัปเกรดแพ็กเกจก่อนหรือไม่',
        tone: 'info',
      },
      {
        label: 'โควตาที่ต้องจับตา',
        value: `คีย์ ${apiKeysUsed}`,
        detail: `เว็บฮุก ${hooksUsed} · รันไทม์ ${runtimesUsed}`,
        tone: 'warning',
      },
      {
        label: 'การเชื่อมต่อของรันไทม์',
        value: `Delivery Agent ${statusLabel(executeOnline)}`,
        detail: `Server Bot ${statusLabel(syncOnline)}`,
        tone: executeOnline === 'online' && syncOnline === 'online' ? 'success' : 'warning',
      },
    ];
  }

  function buildHighlights(legacyState) {
    const analytics = legacyState?.overview?.analytics || {};
    const delivery = analytics?.delivery || {};
    const linkedPlayers = (Array.isArray(legacyState?.players) ? legacyState.players : []).filter((item) => item?.steamId || item?.steam_id || item?.steam?.id).length;
    return [
      {
        title: 'ประสิทธิภาพการส่งของ',
        value: `${formatNumber(delivery.successRate, '0')}%`,
        detail: `${formatNumber(delivery.purchaseCount30d, '0')} คำสั่งซื้อในช่วงล่าสุด`,
      },
      {
        title: 'ผู้เล่นที่ผูกบัญชีแล้ว',
        value: formatNumber(linkedPlayers, '0'),
        detail: `${formatNumber(listCount(legacyState?.players), '0')} โปรไฟล์ผู้เล่นที่รู้จักในระบบ`,
      },
      {
        title: 'รายการสินค้าในร้าน',
        value: formatNumber(listCount(legacyState?.shopItems), '0'),
        detail: 'ใช้ยืนยันว่าหน้าร้านพร้อมเปิดขายและมีข้อมูลให้ผู้เล่นเห็นครบ',
      },
    ];
  }

  function buildRailCards(legacyState, issues) {
    const notifications = Array.isArray(legacyState?.notifications) ? legacyState.notifications : [];
    const nextStep = issues[0]
      ? {
          title: 'สิ่งที่ควรทำต่อ',
          body: issues[0].title,
          meta: issues[0].detail,
          tone: issues[0].tone,
        }
      : {
          title: 'สิ่งที่ควรทำต่อ',
          body: 'ภาพรวมวันนี้อยู่ในเกณฑ์พร้อมใช้งาน',
          meta: 'ถัดไปให้ตรวจคำสั่งซื้อใหม่และยืนยันว่า Server Bot ยัง sync ตามเวลาปกติ',
          tone: 'success',
        };

    return [
      nextStep,
      {
        title: 'การแจ้งเตือนล่าสุด',
        body: notifications.length > 0 ? `${formatNumber(notifications.length)} รายการที่ต้องอ่าน` : 'ยังไม่มีแจ้งเตือนใหม่',
        meta: notifications[0]
          ? `${firstNonEmpty([notifications[0].title, notifications[0].label, 'แจ้งเตือน'])} · ${formatRelative(notifications[0].createdAt)}`
          : 'เมื่อมีการแจ้งเตือนจากระบบ จะขึ้นตรงนี้เพื่อให้คุณไม่พลาดงานที่ต้องตามต่อ',
        tone: notifications.length > 0 ? 'warning' : 'muted',
      },
      {
        title: 'สถานะแพ็กเกจ',
        body: extractPackageName(legacyState),
        meta: 'แพ็กเกจนี้เป็นฐานของ feature gate, สิทธิ์ใช้โมดูล และขีดจำกัดบางอย่างของ tenant นี้',
        tone: 'info',
      },
    ];
  }

  function buildActivity(legacyState) {
    const notifications = Array.isArray(legacyState?.notifications) ? legacyState.notifications : [];
    const auditItems = Array.isArray(legacyState?.audit?.items) ? legacyState.audit.items : [];
    const feed = [];

    notifications.slice(0, 3).forEach((item) => {
      feed.push({
        tone: toneForStatus(item?.severity || item?.tone || 'degraded'),
        title: firstNonEmpty([item?.title, item?.label, 'การแจ้งเตือนระบบ']),
        detail: firstNonEmpty([item?.detail, item?.message, 'ติดตามเหตุล่าสุดจาก tenant นี้']),
        meta: formatDateTime(item?.createdAt),
      });
    });

    auditItems.slice(0, 3).forEach((item) => {
      feed.push({
        tone: 'muted',
        title: firstNonEmpty([item?.action, item?.title, 'กิจกรรมของผู้ดูแล']),
        detail: firstNonEmpty([item?.detail, item?.summary, item?.actor, 'มีการเปลี่ยนแปลงจากฝั่งผู้ดูแล']),
        meta: formatDateTime(item?.createdAt || item?.timestamp),
      });
    });

    if (feed.length === 0) {
      feed.push({
        tone: 'muted',
        title: 'ยังไม่มีกิจกรรมใหม่',
        detail: 'เมื่อมีการเปลี่ยนแปลงจากระบบหรือผู้ดูแล หน้านี้จะช่วยให้เห็นลำดับเหตุการณ์ได้เร็วขึ้น',
        meta: 'พร้อมสำหรับข้อมูลจริง',
      });
    }

    return feed.slice(0, 6);
  }

  function createTenantDashboardV4Model(legacyState) {
    const state = legacyState && typeof legacyState === 'object' ? legacyState : {};
    const tenantName = firstNonEmpty([
      state?.tenantConfig?.name,
      state?.overview?.tenantName,
      state?.me?.tenantId,
      'Tenant Workspace',
    ]);
    const serverStatus = normalizeStatus(
      state?.overview?.serverStatus
      || state?.dashboardCards?.serverStatus
      || state?.deliveryRuntime?.serverStatus,
    );
    const executeStatus = findAgentStatus(
      state?.agents,
      (role) => role.includes('execute') || role.includes('delivery') || role.includes('console'),
    );
    const syncStatus = findAgentStatus(
      state?.agents,
      (role) => role.includes('sync') || role.includes('server') || role.includes('watcher'),
    );
    const lastSyncAt = extractLastSync(state);
    const issues = buildIssues(state);

    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Tenant Admin V4 Preview',
        workspaceLabel: tenantName,
        environmentLabel: 'Parallel V4',
        navGroups: DEFAULT_NAV_GROUPS,
      },
      header: {
        title: tenantName,
        subtitle: 'ศูนย์งานประจำวันของผู้ดูแลเซิร์ฟเวอร์ จัดลำดับงานที่ต้องทำก่อนและพาไปหน้าที่เกี่ยวข้องทันที',
        statusChips: [
          { label: extractPackageName(state), tone: 'info' },
          { label: `เซิร์ฟเวอร์ ${statusLabel(serverStatus)}`, tone: toneForStatus(serverStatus) },
          { label: `Delivery Agent ${statusLabel(executeStatus)}`, tone: toneForStatus(executeStatus) },
          { label: `Server Bot ${statusLabel(syncStatus)}`, tone: toneForStatus(syncStatus) },
          { label: `sync ล่าสุด ${formatRelative(lastSyncAt)}`, tone: 'muted' },
        ],
        primaryAction: {
          label: serverStatus === 'online' ? 'ดูสถานะเซิร์ฟเวอร์' : 'ตั้งค่า runtime',
          href: serverStatus === 'online' ? '#server-status' : '#server-bots',
        },
      },
      kpis: [
        {
          label: 'แพ็กเกจปัจจุบัน',
          value: extractPackageName(state),
          detail: 'สิทธิ์ใช้งานหลักของ tenant นี้',
          tone: 'info',
        },
        {
          label: 'สถานะเซิร์ฟเวอร์',
          value: statusLabel(serverStatus),
          detail: 'พร้อมใช้งานสำหรับงานประจำวันหรือไม่',
          tone: toneForStatus(serverStatus),
        },
        {
          label: 'Delivery Agent',
          value: statusLabel(executeStatus),
          detail: 'ตัวส่งของในเกม',
          tone: toneForStatus(executeStatus),
        },
        {
          label: 'Server Bot',
          value: statusLabel(syncStatus),
          detail: 'ตัวอ่าน log และคุมเซิร์ฟเวอร์',
          tone: toneForStatus(syncStatus),
        },
        {
          label: 'sync ล่าสุด',
          value: formatRelative(lastSyncAt),
          detail: formatDateTime(lastSyncAt),
          tone: 'muted',
        },
        {
          label: 'คำสั่งซื้อรอดำเนินการ',
          value: formatNumber(listCount(state?.queueItems), '0'),
          detail: `${formatNumber(listCount(state?.deadLetters), '0')} รายการอยู่ใน dead-letter`,
          tone: listCount(state?.deadLetters) > 0 ? 'warning' : 'success',
        },
      ],
      taskGroups: DEFAULT_TASK_GROUPS,
      issues,
      contextBlocks: buildContextBlocks(state),
      highlights: buildHighlights(state),
      railCards: buildRailCards(state, issues),
      activity: buildActivity(state),
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

  function renderKpi(item) {
    return [
      `<article class="tdv4-kpi tdv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      `<div class="tdv4-kpi-label">${escapeHtml(item.label)}</div>`,
      `<div class="tdv4-kpi-value">${escapeHtml(item.value)}</div>`,
      `<div class="tdv4-kpi-detail">${escapeHtml(item.detail)}</div>`,
      '</article>',
    ].join('');
  }

  function renderTaskGroup(group) {
    return [
      `<section class="tdv4-panel tdv4-task-group tdv4-tone-${escapeHtml(group.tone || 'muted')}">`,
      `<div class="tdv4-task-tag">${escapeHtml(group.tag)}</div>`,
      `<h3 class="tdv4-section-title">${escapeHtml(group.title)}</h3>`,
      `<p class="tdv4-section-copy">${escapeHtml(group.detail)}</p>`,
      '<div class="tdv4-action-list">',
      ...(Array.isArray(group.actions) ? group.actions.map((action) => {
        const className = action.primary ? 'tdv4-button tdv4-button-primary' : 'tdv4-button tdv4-button-secondary';
        return `<a class="${className}" href="${escapeHtml(action.href || '#')}">${escapeHtml(action.label)}</a>`;
      }) : []),
      '</div>',
      '</section>',
    ].join('');
  }

  function renderIssue(issue) {
    return [
      `<article class="tdv4-list-item tdv4-tone-${escapeHtml(issue.tone || 'muted')}">`,
      '<div class="tdv4-list-main">',
      `<strong>${escapeHtml(issue.title)}</strong>`,
      `<p>${escapeHtml(issue.detail)}</p>`,
      '</div>',
      `<div class="tdv4-list-meta">${escapeHtml(issue.meta)}</div>`,
      '</article>',
    ].join('');
  }

  function renderContextBlock(block) {
    return [
      `<article class="tdv4-panel tdv4-context-block tdv4-tone-${escapeHtml(block.tone || 'muted')}">`,
      `<div class="tdv4-context-label">${escapeHtml(block.label)}</div>`,
      `<div class="tdv4-context-value">${escapeHtml(block.value)}</div>`,
      `<div class="tdv4-context-detail">${escapeHtml(block.detail)}</div>`,
      '</article>',
    ].join('');
  }

  function renderHighlight(item) {
    return [
      '<article class="tdv4-highlight">',
      `<div class="tdv4-highlight-title">${escapeHtml(item.title)}</div>`,
      `<div class="tdv4-highlight-value">${escapeHtml(item.value)}</div>`,
      `<div class="tdv4-highlight-detail">${escapeHtml(item.detail)}</div>`,
      '</article>',
    ].join('');
  }

  function renderRailCard(card) {
    return [
      `<article class="tdv4-panel tdv4-rail-card tdv4-tone-${escapeHtml(card.tone || 'muted')}">`,
      `<div class="tdv4-rail-title">${escapeHtml(card.title)}</div>`,
      `<strong class="tdv4-rail-body">${escapeHtml(card.body)}</strong>`,
      `<div class="tdv4-rail-detail">${escapeHtml(card.meta)}</div>`,
      '</article>',
    ].join('');
  }

  function renderActivity(item) {
    return [
      `<article class="tdv4-list-item tdv4-tone-${escapeHtml(item.tone || 'muted')}">`,
      '<div class="tdv4-list-main">',
      `<strong>${escapeHtml(item.title)}</strong>`,
      `<p>${escapeHtml(item.detail)}</p>`,
      '</div>',
      `<div class="tdv4-list-meta">${escapeHtml(item.meta)}</div>`,
      '</article>',
    ].join('');
  }

  function buildTenantDashboardV4Html(model) {
    const safeModel = model || createTenantDashboardV4Model({});
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
      renderBadge('Preview', 'warning'),
      '</div>',
      '</header>',
      '<div class="tdv4-shell">',
      '<aside class="tdv4-sidebar">',
      `<div class="tdv4-sidebar-title">${escapeHtml(safeModel.shell.workspaceLabel)}</div>`,
      '<div class="tdv4-sidebar-copy">จัดระเบียบงานประจำวันให้เห็นว่าอะไรต้องทำก่อน และควรไปหน้าต่อไปที่ไหน</div>',
      ...(Array.isArray(safeModel.shell.navGroups) ? safeModel.shell.navGroups.map(renderNavGroup) : []),
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
      '<div class="tdv4-pagehead-actions">',
      `<a class="tdv4-button tdv4-button-primary" href="${escapeHtml(safeModel.header.primaryAction.href || '#')}">${escapeHtml(safeModel.header.primaryAction.label)}</a>`,
      '</div>',
      '</section>',
      '<section class="tdv4-kpi-strip">',
      ...(Array.isArray(safeModel.kpis) ? safeModel.kpis.map(renderKpi) : []),
      '</section>',
      '<section class="tdv4-task-grid">',
      ...(Array.isArray(safeModel.taskGroups) ? safeModel.taskGroups.map(renderTaskGroup) : []),
      '</section>',
      '<section class="tdv4-dual-grid">',
      '<div class="tdv4-stack">',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">กล่องเหตุที่ต้องจัดการก่อน</div>',
      '<h2 class="tdv4-section-title">ปัญหาที่กระทบงานประจำวัน</h2>',
      '<p class="tdv4-section-copy">เริ่มจากตรงนี้เมื่อคุณต้องตัดสินใจว่าเรื่องใดควรเปิดทำก่อน เพื่อไม่ให้ผู้เล่นหรือรันไทม์ค้างงานต่อ</p>',
      '<div class="tdv4-list">',
      ...(Array.isArray(safeModel.issues) ? safeModel.issues.map(renderIssue) : []),
      '</div>',
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">สัญญาณแพลตฟอร์ม</div>',
      '<h2 class="tdv4-section-title">บริบทของ tenant ตอนนี้</h2>',
      '<p class="tdv4-section-copy">ช่วยให้รู้ว่าควรแก้เรื่องสิทธิ์ใช้ โควตา หรือการเชื่อมต่อก่อนลงไปทำงานย่อย</p>',
      '<div class="tdv4-context-grid">',
      ...(Array.isArray(safeModel.contextBlocks) ? safeModel.contextBlocks.map(renderContextBlock) : []),
      '</div>',
      '</section>',
      '</div>',
      '<div class="tdv4-stack">',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">มุมมองผลกระทบ</div>',
      '<h2 class="tdv4-section-title">ตัวเลขที่ต้องเห็นก่อนเปิดงานต่อ</h2>',
      '<p class="tdv4-section-copy">ใช้ยืนยันว่าการส่งของ ร้านค้า และฐานผู้เล่นยังอยู่ในสภาพที่พร้อมใช้งาน</p>',
      '<div class="tdv4-highlight-grid">',
      ...(Array.isArray(safeModel.highlights) ? safeModel.highlights.map(renderHighlight) : []),
      '</div>',
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">กิจกรรมล่าสุด</div>',
      '<h2 class="tdv4-section-title">ลำดับเหตุการณ์ที่เกี่ยวข้องกับ tenant นี้</h2>',
      '<p class="tdv4-section-copy">เมื่อมีการเปลี่ยนแปลงจากระบบหรือผู้ดูแล คุณจะเห็นภาพรวมแบบอ่านเร็วได้จากจุดนี้</p>',
      '<div class="tdv4-list">',
      ...(Array.isArray(safeModel.activity) ? safeModel.activity.map(renderActivity) : []),
      '</div>',
      '</section>',
      '</div>',
      '</section>',
      '</main>',
      '<aside class="tdv4-rail">',
      '<div class="tdv4-rail-sticky">',
      `<div class="tdv4-rail-header">${escapeHtml(safeModel.shell.workspaceLabel)}</div>`,
      '<div class="tdv4-rail-copy">บริบทสั้น ๆ ที่ช่วยตัดสินใจได้เร็ว โดยไม่แย่งพื้นที่จากหน้าทำงานหลัก</div>',
      ...(Array.isArray(safeModel.railCards) ? safeModel.railCards.map(renderRailCard) : []),
      '</div>',
      '</aside>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderTenantDashboardV4(rootElement, source) {
    if (!rootElement) {
      throw new Error('renderTenantDashboardV4 requires a root element');
    }
    const model = source && source.header && Array.isArray(source.kpis)
      ? source
      : createTenantDashboardV4Model(source);
    rootElement.innerHTML = buildTenantDashboardV4Html(model);
    return model;
  }

  return {
    buildTenantDashboardV4Html,
    createTenantDashboardV4Model,
    renderTenantDashboardV4,
  };
});
