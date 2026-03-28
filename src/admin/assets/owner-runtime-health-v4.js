(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.OwnerRuntimeHealthV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const NAV_GROUPS = [
    { label: 'แพลตฟอร์ม', items: [
      { label: 'ภาพรวม', href: '#overview' },
      { label: 'ผู้เช่า', href: '#tenants' },
      { label: 'แพ็กเกจ', href: '#packages' },
      { label: 'การสมัครใช้', href: '#subscriptions' },
    ] },
    { label: 'ปฏิบัติการ', items: [
      { label: 'สถานะบริการ', href: '#runtime-health', current: true },
      { label: 'เหตุการณ์', href: '#incidents' },
      { label: 'คำขอและความช้า', href: '#observability' },
      { label: 'งานรอและบอท', href: '#jobs' },
    ] },
    { label: 'ธุรกิจ', items: [
      { label: 'ซัพพอร์ต', href: '#support' },
      { label: 'ความปลอดภัย', href: '#security' },
      { label: 'หลักฐาน', href: '#audit' },
    ] },
  ];

  function normalizeRuntimeNavRoute(currentRoute) {
    const route = String(currentRoute || 'runtime-health').trim().toLowerCase() || 'runtime-health';
    if (route === 'runtime') return 'runtime-health';
    return route;
  }

  function cloneNavGroups(groups, currentRoute) {
    const route = normalizeRuntimeNavRoute(currentRoute);
    return (Array.isArray(groups) ? groups : []).map((group) => ({
      ...group,
      items: (Array.isArray(group.items) ? group.items : []).map((item) => {
        const itemRoute = String(item && item.href || '').replace(/^#/, '').trim().toLowerCase();
        return {
          ...item,
          current: itemRoute === route,
        };
      }),
    }));
  }

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
    return date ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'ยังไม่ทราบเวลา';
  }
  function firstNonEmpty(values, fallback = '') {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return fallback;
  }
  function looksLikeJsonText(value) {
    const text = String(value ?? '').trim();
    return text.startsWith('{') || text.startsWith('[');
  }
  function extractReadableText(value, fallback = '') {
    if (value == null) return fallback;
    if (typeof value === 'string') {
      const text = String(value).trim();
      if (!text) return fallback;
      if (looksLikeJsonText(text)) {
        try {
          return extractReadableText(JSON.parse(text), fallback);
        } catch {
          return text;
        }
      }
      return text;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const joined = value
        .map((item) => extractReadableText(item, ''))
        .filter(Boolean)
        .slice(0, 3)
        .join(' · ');
      return firstNonEmpty([joined], fallback);
    }
    if (typeof value === 'object') {
      return firstNonEmpty([
        value.title,
        value.label,
        value.message,
        value.detail,
        value.summary,
        value.reason,
        value.source,
        value.path,
        value.code,
      ], fallback);
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
      title: firstNonEmpty([item.title, item.label, 'การแจ้งเตือนของแพลตฟอร์ม']),
      detail: firstNonEmpty([
        extractReadableText(item.detail, ''),
        extractReadableText(item.message, ''),
        'ระบบสังเกตการณ์ตรวจพบสัญญาณที่เจ้าของระบบควรเปิดดู',
      ]),
      time: item.createdAt || item.at,
    }));
    const securityItems = (Array.isArray(state.securityEvents) ? state.securityEvents : []).map((item) => ({
      source: 'security',
      severity: item.severity || 'info',
      title: item.type || 'เหตุการณ์ด้านความปลอดภัย',
      detail: firstNonEmpty([
        extractReadableText(item.detail, ''),
        extractReadableText(item.reason, ''),
        extractReadableText(item.meta, ''),
      ]),
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
  function buildRuntimeRouteView(currentRoute, context = {}) {
    const route = normalizeRuntimeNavRoute(currentRoute);
    const feedCount = Number(context.feedCount || 0);
    const hotspotCount = Number(context.hotspotCount || 0);
    const staleAgents = Number(context.staleAgents || 0);
    const degradedRuntimeCount = Number(context.degradedRuntimeCount || 0);
    const base = {
      pageKicker: 'สถานะระบบและเหตุการณ์',
      headerTitle: 'สถานะระบบและเหตุการณ์',
      headerSubtitle: 'ดูความพร้อมของบริการ สัญญาณผิดปกติ และแรงกดดันของคำขอในมุมเดียวเพื่อให้ตัดสินใจได้เร็ว',
      primaryAction: feedCount > 0
        ? { label: 'เปิดเหตุการณ์ล่าสุด (แนะนำ)', href: '#incidents' }
        : { label: 'เปิดคำขอและความช้า', href: '#observability' },
      services: {
        kicker: 'บริการ',
        title: 'บริการที่ต้องเฝ้าดู',
        copy: 'วางบริการหลักและบริการฝั่งเครื่องรันงานไว้ในจุดเดียวเพื่อให้อ่านสภาพระบบได้เร็ว',
      },
      jobs: {
        kicker: 'บอทและเครื่องรันงาน',
        title: 'Delivery Agent และ Server Bot',
        copy: 'ให้สถานะของเครื่องที่รับงานจริงมองเห็นได้ก่อน เพื่อแยกปัญหาที่มาจากคิวกับบริการด้านหลัง',
      },
      incidents: {
        kicker: 'เหตุการณ์',
        title: 'สัญญาณที่เจ้าของระบบควรรู้ตอนนี้',
        copy: 'เริ่มจาก feed นี้ก่อนเปิดซัพพอร์ตหรือเครื่องมือ replay เพื่อไม่ให้พลาดเรื่องที่กระทบกว้างกว่า',
      },
      observability: {
        kicker: 'คำขอและความช้า',
        title: 'จุดร้อนของคำขอ',
        copy: 'สรุปคำขอแบบกะทัดรัดช่วยให้เจ้าของระบบตัดสินใจได้เร็วกว่าการมองกราฟใหญ่เต็มหน้า',
      },
      runbooks: {
        kicker: 'แนวทางปฏิบัติ',
        title: 'ควรเช็กอะไรก่อน',
      },
      blockOrder: ['services', 'jobs', 'incidents', 'observability'],
      railHeader: 'บริบทการปฏิบัติการ',
      railCopy: 'เก็บหลักฐานและงานติดตามของเจ้าของระบบไว้ใกล้มือเสมอขณะตรวจรันไทม์หรือเหตุการณ์',
    };

    if (route === 'incidents') {
      return {
        ...base,
        headerTitle: 'เหตุการณ์และสัญญาณ',
        headerSubtitle: 'เปิดดูสัญญาณใหม่และรุนแรงที่สุดก่อน เพื่อไม่ให้พลาดเรื่องที่กระทบกว้างกว่าซัพพอร์ตหนึ่งเคส',
        primaryAction: { label: 'เปิดรายการเหตุการณ์ (แนะนำ)', href: '#incidents' },
        incidents: {
          kicker: 'Incident Feed',
          title: 'สัญญาณที่ต้องเปิดดูก่อน',
          copy: 'ใช้ feed นี้แยกเหตุที่เพิ่งเกิดและกระทบหลายส่วนออกจากงานประจำวันอื่น',
        },
        observability: {
          kicker: 'ข้อมูลประกอบ',
          title: 'จุดร้อนของคำขอที่เกี่ยวข้อง',
          copy: 'ดึง request และ hotspot ขึ้นมาดูต่อทันทีเมื่อ feed เริ่มหนาแน่นผิดปกติ',
        },
        blockOrder: ['incidents', 'observability', 'services', 'jobs'],
        railHeader: 'บริบทเหตุการณ์',
        railCopy: 'เริ่มจากเหตุการณ์ก่อน แล้วค่อยดึงหลักฐานประกอบจากคำขอและสถานะบริการ',
      };
    }

    if (route === 'observability' || route === 'audit') {
      return {
        ...base,
        pageKicker: route === 'audit' ? 'หลักฐานและบันทึก' : 'คำขอและความช้า',
        headerTitle: route === 'audit' ? 'หลักฐานและบันทึก' : 'คำขอและความช้า',
        headerSubtitle: route === 'audit'
          ? 'ย้อนดูหลักฐานของคำขอ ความช้า และข้อผิดพลาดก่อนสรุปเป็นเหตุการณ์หรือใช้คุยกับทีม'
          : 'ไล่จุดร้อน ข้อผิดพลาด และความช้าของระบบก่อนตัดสินใจแก้ปัญหา',
        primaryAction: { label: route === 'audit' ? 'เปิดหลักฐานของคำขอ (แนะนำ)' : 'เปิดจุดร้อนของคำขอ (แนะนำ)', href: '#observability' },
        observability: {
          kicker: route === 'audit' ? 'หลักฐานของคำขอ' : 'คำขอและความช้า',
          title: route === 'audit' ? 'หลักฐานของคำขอและจุดร้อน' : 'จุดร้อนของคำขอ',
          copy: route === 'audit'
            ? 'ใช้ส่วนนี้เก็บบริบทของ request, latency และข้อผิดพลาดก่อนสรุปเป็น incident หรือออดิท'
            : 'เริ่มจาก route และ error ที่ร้อนที่สุด แล้วค่อยไล่ต่อไปยังบริการที่เกี่ยวข้อง',
        },
        runbooks: {
          kicker: route === 'audit' ? 'สิ่งที่ควรยืนยัน' : 'แนวทางปฏิบัติ',
          title: route === 'audit' ? 'หลักฐานที่ควรเก็บก่อนลงมือ' : 'ควรเช็กอะไรก่อน',
        },
        blockOrder: ['observability', 'incidents', 'services', 'jobs'],
        railHeader: route === 'audit' ? 'บริบทหลักฐาน' : 'บริบทคำขอ',
        railCopy: route === 'audit'
          ? 'งานรีวิวควรใช้หลักฐานของคำขอ เหตุการณ์ และบริการชุดเดียวกัน'
          : 'รวมคำขอที่ช้า ข้อผิดพลาด และแนวทางเช็กต่อไว้ในชุดเดียว',
      };
    }

    if (route === 'jobs') {
      return {
        ...base,
        headerTitle: 'งานรอและบอท',
        headerSubtitle: 'แยกงานส่งของ งานที่ล้มเหลว และรายชื่อบอทให้อ่านง่ายจากมุมเดียว',
        primaryAction: { label: 'เปิดรายชื่อบอท (แนะนำ)', href: '#jobs' },
        jobs: {
          kicker: 'รายชื่อบอท',
          title: 'Delivery Agent และ Server Bot',
          copy: 'เริ่มจากสถานะของเครื่องที่รับงานจริงก่อน แล้วค่อยไล่กลับไปดูบริการและเหตุการณ์',
        },
        services: {
          kicker: 'บริการที่เกี่ยวข้อง',
          title: 'บริการที่คิวต้องพึ่งพา',
          copy: 'ใช้มุมนี้เช็กว่าความล้มเหลวมาจากเครื่องรันงานหรือมาจากบริการที่รองรับอยู่ด้านหลัง',
        },
        blockOrder: ['jobs', 'services', 'incidents', 'observability'],
        railHeader: 'บริบทคิวงาน',
        railCopy: 'ให้สถานะของ Delivery Agent และ Server Bot มองเห็นได้ก่อนคุยเรื่อง retry หรือ replay งาน',
      };
    }

    if (route === 'support' || route === 'security') {
      return {
        ...base,
        pageKicker: route === 'security' ? 'ความปลอดภัยและหลักฐาน' : 'ซัพพอร์ตและสัญญาณ',
        headerTitle: route === 'security' ? 'ความปลอดภัยและหลักฐาน' : 'ซัพพอร์ตและสัญญาณ',
        headerSubtitle: route === 'security'
          ? 'แยกสัญญาณด้านสิทธิ์ การเข้าถึง และเหตุผิดปกติออกจากงานซัพพอร์ตทั่วไป'
          : 'ใช้หน้านี้เริ่มจากเหตุการณ์ที่กระทบผู้เช่าจริงก่อน แล้วค่อยดึงหลักฐานจากคำขอและบริการมาประกอบ',
        primaryAction: { label: 'เปิดเหตุการณ์ล่าสุด (แนะนำ)', href: '#incidents' },
        incidents: {
          kicker: route === 'security' ? 'สัญญาณด้านความปลอดภัย' : 'ฟีดเหตุการณ์',
          title: route === 'security' ? 'สัญญาณที่ต้องยืนยันสิทธิ์และหลักฐาน' : 'เหตุการณ์ที่ซัพพอร์ตรู้แล้วจะคุยง่ายขึ้น',
          copy: route === 'security'
            ? 'ใช้ feed นี้แยกเหตุด้านสิทธิ์และเหตุผิดปกติออกจากงานซัพพอร์ตทั่วไป เพื่อไม่ให้ประเด็นสำคัญหลุด'
            : 'เริ่มจากเหตุการณ์ก่อนเปิดเครื่องมือ replay หรือ diagnostics เพื่อไม่ให้หลุดบริบทของลูกค้า',
        },
        observability: {
          kicker: 'หลักฐานของคำขอ',
          title: 'คำขอและความช้าที่ควรดูต่อ',
          copy: 'รวม hotspot และ request error ที่ช่วยตอบได้ว่าเรื่องนี้เกิดจาก runtime, API หรือแรงกดดันของระบบ',
        },
        blockOrder: ['incidents', 'observability', 'jobs', 'services'],
        railHeader: route === 'security' ? 'บริบทความปลอดภัย' : 'บริบทซัพพอร์ต',
        railCopy: route === 'security'
          ? 'สิทธิ์ การเข้าถึง และหลักฐานควรอยู่ใกล้เหตุการณ์และคำขอที่เกี่ยวข้องเสมอ'
          : 'ให้ซัพพอร์ต เอกสารประกอบ และสถานะบริการอยู่ใกล้กันเพื่อคุยกับลูกค้าได้ต่อเนื่อง',
      };
    }

    return base;
  }

  function createOwnerRuntimeHealthV4Model(source, options = {}) {
    const state = source && typeof source === 'object' ? source : {};
    const currentRoute = String(options.currentRoute || 'runtime-health').trim().toLowerCase() || 'runtime-health';
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
    const routeView = buildRuntimeRouteView(currentRoute, {
      feedCount: feed.length,
      hotspotCount: hotspots.length,
      staleAgents,
      degradedRuntimeCount,
      deadLetterCount: Number(lifecycle.deadLetterCount || 0),
    });
    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'แผงเจ้าของระบบ',
        workspaceLabel: routeView.headerTitle || 'สถานะบริการ',
        environmentLabel: 'ระดับแพลตฟอร์ม',
        navGroups: cloneNavGroups(NAV_GROUPS, currentRoute),
      },
      header: {
        title: routeView.headerTitle || 'สถานะบริการและเหตุการณ์',
        subtitle: routeView.headerSubtitle || 'โต๊ะปฏิบัติการของเจ้าของระบบสำหรับไล่สัญญาณผิดปกติ ดูความพร้อมของบริการ และตัดสินใจว่าเรื่องใดต้องแก้ก่อน',
        statusChips: [
          { label: `${formatNumber(readyRuntimeCount, '0')}/${formatNumber(runtimeRows.length, '0')} บริการพร้อม`, tone: readyRuntimeCount === runtimeRows.length ? 'success' : 'warning' },
          { label: `${formatNumber(staleAgents, '0')} บอทต้องจับตา`, tone: staleAgents > 0 ? 'warning' : 'success' },
          { label: `${formatNumber(feed.length, '0')} สัญญาณที่ยังเปิดอยู่`, tone: feed.length > 0 ? 'warning' : 'muted' },
          { label: `${formatNumber(Number(state.requestLogs && state.requestLogs.metrics && state.requestLogs.metrics.slowRequests || 0), '0')} คำขอที่ช้า`, tone: Number(state.requestLogs && state.requestLogs.metrics && state.requestLogs.metrics.slowRequests || 0) > 0 ? 'warning' : 'muted' },
        ],
        primaryAction: routeView.primaryAction || { label: 'เปิดคำขอและความช้า', href: '#observability' },
      },
      summaryStrip: [
        { label: 'บริการที่พร้อม', value: formatNumber(readyRuntimeCount, '0'), detail: 'บริการที่รายงานสถานะปกติ', tone: 'success' },
        { label: 'บริการที่ต้องจับตา', value: formatNumber(degradedRuntimeCount, '0'), detail: 'บริการที่เจ้าของระบบควรเปิดดูต่อ', tone: degradedRuntimeCount > 0 ? 'warning' : 'muted' },
        { label: 'สถานะบอท', value: formatNumber(staleAgents, '0'), detail: 'ภาพรวมของ Delivery Agent และ Server Bot', tone: staleAgents > 0 ? 'danger' : 'success' },
        { label: 'งานที่ล้มเหลว', value: formatNumber(lifecycle.deadLetterCount, '0'), detail: 'คิวส่งของที่ไม่ควรปล่อยค้าง', tone: Number(lifecycle.deadLetterCount || 0) > 0 ? 'danger' : 'muted' },
      ],
      runtimeRows,
      agentRows,
      incidentFeed: feed,
      hotspots,
      routeView,
      runbooks: [
        { title: 'คิวงานเริ่มตึง', body: 'ถ้างานที่ล้มเหลวเพิ่มขึ้นหรืองานค้างหลายขั้น ให้เช็กสถานะ Delivery Agent และ Server Bot ก่อน แล้วค่อยให้ทีมผู้เช่าลอง retry หรือ replay งาน' },
        { title: 'บริการเริ่มไม่เสถียร', body: 'ถ้าบริการเริ่มไม่สดหรือเริ่มไม่เสถียร ให้ยืนยันการติดต่อครั้งล่าสุดและดูการเปลี่ยนแปลงล่าสุดก่อนแตะคิวของผู้เช่า' },
        { title: 'คำขอเริ่มผิดปกติ', body: 'ดูจุดร้อนและข้อผิดพลาดล่าสุดของคำขอก่อน เพื่อแยกว่าเป็นปัญหาจากบอท, API หรือปริมาณงานที่พุ่งขึ้นจากฝั่งเชิงพาณิชย์และซัพพอร์ต' },
      ],
      railCards: [
        { title: 'เส้นทางส่งออกหลักฐาน', body: 'ใช้รายงานคำขอและเครื่องมือวิเคราะห์ก่อนลงมือทำสิ่งที่เสี่ยง หลักฐานควรถูกพาไปกับเหตุการณ์เสมอ', meta: 'งานซัพพอร์ตและงานรีวิวความปลอดภัยควรใช้หลักฐานชุดเดียวกัน', tone: 'info' },
        { title: 'แรงกดดันปัจจุบัน', body: feed.length > 0 ? 'ตอนนี้ฟีดเหตุการณ์ยังมีรายการ ให้เริ่มจากแถวที่ใหม่และรุนแรงที่สุดก่อนเสมอ' : 'ตอนนี้ยังไม่เห็นกลุ่มสัญญาณด่วนจากข้อมูลชุดนี้', meta: hotspots.length > 0 ? `${hotspots[0].route} คือกลุ่มคำขอที่ร้อนที่สุดตอนนี้` : 'ยังไม่มีตัวอย่างจุดร้อนให้ใช้ตัดสินใจ', tone: feed.length > 0 ? 'warning' : 'success' },
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
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">ยังไม่มีข้อมูลรันไทม์ในตัวอย่างชุดนี้</div>';
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-4"><span>บริการ</span><span>สถานะ</span><span>รายละเอียด</span><span>อัปเดตล่าสุด</span></div>',
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
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">ยังไม่มีข้อมูลเอเจนต์ในตัวอย่างชุดนี้</div>';
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-5"><span>รันไทม์</span><span>บทบาท</span><span>ช่องทาง</span><span>สถานะ</span><span>เห็นล่าสุด</span></div>',
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
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">ตอนนี้ยังไม่มีรายการใน incident feed</div>';
    return items.map((item) => [
      `<article class="odv4-feed-item odv4-tone-${escapeHtml(toneForStatus(item.severity || 'warning'))}">`,
      `<div class="odv4-feed-meta"><span class="odv4-pill odv4-pill-${escapeHtml(toneForStatus(item.severity || 'warning'))}">${escapeHtml(item.source || 'สัญญาณ')}</span><span>${escapeHtml(formatDateTime(item.time))}</span></div>`,
      `<strong>${escapeHtml(item.title || 'สัญญาณ')}</strong>`,
      item.detail ? `<p>${escapeHtml(item.detail)}</p>` : '',
      '</article>',
    ].join('')).join('');
  }
  function renderHotspots(items) {
    if (!Array.isArray(items) || items.length === 0) return '<div class="odv4-empty-state">ยังไม่มีตัวอย่าง hotspot ของคำขอในตอนนี้</div>';
    return [
      '<div class="odv4-table">',
      '<div class="odv4-table-head cols-4"><span>กลุ่ม route</span><span>คำขอ</span><span>ข้อผิดพลาด</span><span>P95 latency</span></div>',
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
      '<span class="odv4-table-label">แนวทางปฏิบัติ</span>',
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
    const routeView = safeModel.routeView && typeof safeModel.routeView === 'object' ? safeModel.routeView : {};
    const servicesSection = [
      '<section class="odv4-panel"><div class="odv4-section-head">',
      `<span class="odv4-section-kicker">${escapeHtml(routeView.services && routeView.services.kicker || 'ตารางรันไทม์')}</span>`,
      `<h2 class="odv4-section-title">${escapeHtml(routeView.services && routeView.services.title || 'บริการที่ต้องเฝ้าดู')}</h2>`,
      `<p class="odv4-section-copy">${escapeHtml(routeView.services && routeView.services.copy || 'วางชั้นบริการของแพลตฟอร์มและฝั่งรันไทม์ระยะไกลไว้ในจุดเดียวเพื่อให้อ่านสภาพระบบได้เร็ว')}</p></div>`,
      renderRuntimeTable(safeModel.runtimeRows),
      '</section>',
    ].join('');
    const jobsSection = [
      '<section id="jobs" class="odv4-panel odv4-focus-target" data-owner-focus-route="jobs"><div class="odv4-section-head">',
      `<span class="odv4-section-kicker">${escapeHtml(routeView.jobs && routeView.jobs.kicker || 'รายชื่อบอท')}</span>`,
      `<h2 class="odv4-section-title">${escapeHtml(routeView.jobs && routeView.jobs.title || 'ทะเบียนเอเจนต์')}</h2>`,
      `<p class="odv4-section-copy">${escapeHtml(routeView.jobs && routeView.jobs.copy || 'ให้สถานะของ Delivery Agent และ Server Bot มองเห็นได้ตลอด โดยไม่ปนกับมุมมองงานประจำวันของผู้เช่า')}</p></div>`,
      renderAgentTable(safeModel.agentRows),
      '</section>',
    ].join('');
    const incidentsSection = [
      '<section class="odv4-panel"><div class="odv4-section-head">',
      `<span class="odv4-section-kicker">${escapeHtml(routeView.incidents && routeView.incidents.kicker || 'เหตุการณ์')}</span>`,
      `<h2 class="odv4-section-title">${escapeHtml(routeView.incidents && routeView.incidents.title || 'สัญญาณที่เจ้าของระบบควรรู้ตอนนี้')}</h2>`,
      `<p class="odv4-section-copy">${escapeHtml(routeView.incidents && routeView.incidents.copy || 'เริ่มจาก feed นี้ก่อนเปิดซัพพอร์ตหรือเครื่องมือ replay เพื่อไม่ให้พลาดเรื่องที่กระทบกว้างกว่า')}</p></div>`,
      `<div class="odv4-feed">${renderFeed(safeModel.incidentFeed)}</div>`,
      '</section>',
    ].join('');
    const observabilitySection = [
      '<section class="odv4-panel"><div class="odv4-section-head">',
      `<span class="odv4-section-kicker">${escapeHtml(routeView.observability && routeView.observability.kicker || 'คำขอและความช้า')}</span>`,
      `<h2 class="odv4-section-title">${escapeHtml(routeView.observability && routeView.observability.title || 'จุดร้อนของคำขอ')}</h2>`,
      `<p class="odv4-section-copy">${escapeHtml(routeView.observability && routeView.observability.copy || 'สรุปคำขอแบบกะทัดรัดช่วยให้เจ้าของระบบตัดสินใจได้เร็วกว่าการมองกราฟใหญ่เต็มหน้า')}</p></div>`,
      renderHotspots(safeModel.hotspots),
      `<div class="odv4-section-head" style="margin-top:16px;"><span class="odv4-section-kicker">${escapeHtml(routeView.runbooks && routeView.runbooks.kicker || 'แนวทางปฏิบัติ')}</span><h3 class="odv4-section-title">${escapeHtml(routeView.runbooks && routeView.runbooks.title || 'ควรเช็กอะไรก่อน')}</h3></div>`,
      `<div class="odv4-runbook-grid">${renderRunbooks(safeModel.runbooks)}</div></section>`,
    ].join('');
    const blockMap = {
      services: servicesSection,
      jobs: jobsSection,
      incidents: `<div id="incidents" class="odv4-focus-target" data-owner-focus-route="incidents support security">${incidentsSection}</div>`,
      observability: `<div id="observability" class="odv4-focus-target" data-owner-focus-route="observability audit">${observabilitySection}</div>`,
    };
    const blockOrder = Array.isArray(routeView.blockOrder) && routeView.blockOrder.length
      ? routeView.blockOrder
      : ['services', 'jobs', 'incidents', 'observability'];
    const orderedSections = blockOrder.map((key) => blockMap[key]).filter(Boolean);
    const contentBlocks = orderedSections
      .reduce((rows, sectionHtml, index) => {
        if (index % 2 === 0) {
          rows.push([sectionHtml]);
          return rows;
        }
        rows[rows.length - 1].push(sectionHtml);
        return rows;
      }, [])
      .map((row) => `<div class="odv4-split-grid">${row.join('')}</div>`)
      .join('');
    return [
      '<div class="odv4-app"><header class="odv4-topbar"><div class="odv4-brand-row">',
      `<div class="odv4-brand-mark">${escapeHtml(safeModel.shell.brand || 'SCUM')}</div><div class="odv4-brand-copy"><span class="odv4-surface-label">${escapeHtml(safeModel.shell.surfaceLabel || '')}</span><strong class="odv4-workspace-label">${escapeHtml(safeModel.shell.workspaceLabel || '')}</strong></div>`,
      '</div><div class="odv4-topbar-actions"><span class="odv4-badge odv4-badge-muted">ระดับแพลตฟอร์ม</span><a class="odv4-button odv4-button-secondary" href="#incidents">เหตุการณ์</a><a class="odv4-button odv4-button-secondary" href="#observability">คำขอและความช้า</a></div></header>',
      '<div class="odv4-shell"><aside class="odv4-sidebar"><div class="odv4-stack"><span class="odv4-sidebar-title">เมนูเจ้าของระบบ</span><p class="odv4-sidebar-copy">ใช้หน้านี้แยกเรื่องที่เป็นปัญหารันไทม์ออกจากแรงกดดันฝั่งซัพพอร์ตและความผิดปกติของคำขอ ก่อนตัดสินใจไล่แก้ลึกลงไป</p></div>',
      renderNavGroups(safeModel.shell.navGroups),
      '</aside><main class="odv4-main"><section id="runtime-health" class="odv4-pagehead odv4-focus-target" data-owner-focus-route="runtime runtime-health"><div class="odv4-stack"><span class="odv4-section-kicker">',
      `${escapeHtml(routeView.pageKicker || 'โต๊ะปฏิบัติการและเหตุการณ์')}</span>`,
      `<h1 class="odv4-page-title">${escapeHtml(safeModel.header.title || '')}</h1><p class="odv4-page-subtitle">${escapeHtml(safeModel.header.subtitle || '')}</p><div class="odv4-chip-row">${renderChips(safeModel.header.statusChips)}</div></div>`,
      `<div class="odv4-pagehead-actions"><a class="odv4-button odv4-button-primary" href="${escapeHtml(safeModel.header.primaryAction.href || '#')}">${escapeHtml(safeModel.header.primaryAction.label || 'ส่งออก')}</a></div></section>`,
      `<section class="odv4-kpi-strip">${renderSummaryStrip(safeModel.summaryStrip)}</section>`,
      contentBlocks,
      `</main><aside class="odv4-rail"><div class="odv4-rail-sticky"><div class="odv4-rail-header">${escapeHtml(routeView.railHeader || 'บริบทการปฏิบัติการ')}</div><p class="odv4-rail-copy">${escapeHtml(routeView.railCopy || 'เก็บหลักฐานและงานติดตามของเจ้าของระบบไว้ใกล้มือเสมอขณะตรวจรันไทม์หรือเหตุการณ์')}</p>${renderRailCards(safeModel.railCards)}</div></aside></div></div>`,
    ].join('');
  }

  function renderOwnerRuntimeHealthV4(target, source, options) {
    if (!target) throw new Error('Owner runtime health V4 target is required');
    target.innerHTML = buildOwnerRuntimeHealthV4Html(createOwnerRuntimeHealthV4Model(source, options));
    return target;
  }

  return {
    createOwnerRuntimeHealthV4Model,
    buildOwnerRuntimeHealthV4Html,
    renderOwnerRuntimeHealthV4,
  };
});
