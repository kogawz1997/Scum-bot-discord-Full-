'use strict';

function sendRedirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
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
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function badge(label, tone = 'muted') {
  return `<span class="site-badge tone-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function renderPublicTable(columns, rows, emptyText) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    return `<div class="public-server-empty">${escapeHtml(emptyText)}</div>`;
  }
  return [
    '<div class="public-server-table-wrap"><table class="public-server-table"><thead><tr>',
    columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join(''),
    '</tr></thead><tbody>',
    safeRows.map((row) => `<tr>${columns.map((column) => `<td>${column.render(row)}</td>`).join('')}</tr>`).join(''),
    '</tbody></table></div>',
  ].join('');
}

function matchPublicServerPage(pathname) {
  const match = /^\/s\/([^/]+)(?:\/(stats|shop|events|donate))?\/?$/.exec(String(pathname || ''));
  if (!match) return null;
  try {
    return {
      slug: decodeURIComponent(match[1]),
      section: match[2] || null,
    };
  } catch {
    return {
      slug: match[1],
      section: match[2] || null,
    };
  }
}

function renderPublicServerPage(snapshot, section) {
  const tenant = snapshot?.tenant || {};
  const featureAccess = snapshot?.featureAccess || {};
  const sections = featureAccess.sections || {};
  const servers = Array.isArray(snapshot?.servers) ? snapshot.servers : [];
  const shopItems = Array.isArray(snapshot?.shopItems) ? snapshot.shopItems : [];
  const leaderboard = Array.isArray(snapshot?.leaderboard) ? snapshot.leaderboard : [];
  const killfeed = Array.isArray(snapshot?.killfeed) ? snapshot.killfeed : [];
  const raidWindows = Array.isArray(snapshot?.raidWindows) ? snapshot.raidWindows : [];
  const raidSummaries = Array.isArray(snapshot?.raidSummaries) ? snapshot.raidSummaries : [];
  const donations = snapshot?.donations || {};
  const supporters = Array.isArray(snapshot?.supporters) ? snapshot.supporters : [];
  const summary = donations.summary || {};
  const currentSection = ['stats', 'shop', 'events', 'donate'].includes(section) ? section : 'stats';
  const sectionEnabled = sections[currentSection]?.enabled !== false;
  const sectionMeta = {
    stats: {
      title: 'สถิติชุมชน',
      subtitle: 'ดูอันดับ การต่อสู้ล่าสุด และภาพรวมการเล่นของเซิร์ฟเวอร์นี้',
    },
    shop: {
      title: 'ร้านค้าชุมชน',
      subtitle: 'ดูรายการที่เปิดขายและแพ็กเกจที่ใช้ในชุมชนนี้ได้ก่อนล็อกอิน',
    },
    events: {
      title: 'กิจกรรมและช่วงเวลาเรด',
      subtitle: 'รวมตารางกิจกรรม สรุปผล และความเคลื่อนไหวที่ผู้เล่นควรรู้',
    },
    donate: {
      title: 'สนับสนุนเซิร์ฟเวอร์',
      subtitle: 'ดูแพ็กเกจสนับสนุน ความเคลื่อนไหวล่าสุด และภาพรวมผู้สนับสนุนของชุมชนนี้',
    },
  };

  let bodyHtml = '';
  if (!sectionEnabled) {
    bodyHtml = [
      '<section class="public-server-card public-server-card-hero">',
      '<div class="public-server-stack">',
      `<span class="public-server-kicker">ยังไม่เปิดใช้งาน</span><h1>${escapeHtml(sectionMeta[currentSection].title)}</h1>`,
      '<p>ส่วนนี้ยังไม่เปิดในแพ็กเกจปัจจุบันของเซิร์ฟเวอร์นี้ แต่คุณยังดูส่วนอื่นของชุมชนได้ตามปกติ</p>',
      `<div class="public-server-actions"><a class="site-button" href="/s/${encodeURIComponent(tenant.slug || '')}/stats">กลับไปหน้าสถิติ</a><a class="site-button site-button-primary" href="/signup">สร้างพื้นที่ของคุณเอง</a></div>`,
      '</div></section>',
    ].join('');
  } else if (currentSection === 'stats') {
    bodyHtml = [
      '<section class="public-server-metrics">',
      `<article class="public-server-metric"><span>เซิร์ฟเวอร์</span><strong>${formatNumber(servers.length, '0')}</strong><small>รายการที่ผูกกับ tenant นี้</small></article>`,
      `<article class="public-server-metric"><span>ผู้เล่นในอันดับ</span><strong>${formatNumber(leaderboard.length, '0')}</strong><small>อ่านจากข้อมูลสถิติที่มีอยู่ตอนนี้</small></article>`,
      `<article class="public-server-metric"><span>การต่อสู้ล่าสุด</span><strong>${formatNumber(killfeed.length, '0')}</strong><small>รายการจาก killfeed ล่าสุด</small></article>`,
      `<article class="public-server-metric"><span>อัปเดต</span><strong>${escapeHtml(formatDateTime(snapshot.generatedAt))}</strong><small>เวลาที่สร้างหน้าสาธารณะนี้</small></article>`,
      '</section>',
      '<section class="public-server-grid">',
      `<article class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">อันดับ</span><h2>ผู้เล่นเด่นของชุมชน</h2></div>${renderPublicTable([
        { label: 'ผู้เล่น', render: (row) => escapeHtml(row.userId || '-') },
        { label: 'Kills', render: (row) => escapeHtml(formatNumber(row.kills, '0')) },
        { label: 'Deaths', render: (row) => escapeHtml(formatNumber(row.deaths, '0')) },
        { label: 'KD', render: (row) => escapeHtml(Number(row.kd || 0).toFixed(2)) },
      ], leaderboard, 'ยังไม่มีข้อมูลอันดับสำหรับเซิร์ฟเวอร์นี้')}</article>`,
      `<article class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">การต่อสู้ล่าสุด</span><h2>Killfeed ล่าสุด</h2></div>${renderPublicTable([
        { label: 'ผู้ชนะ', render: (row) => escapeHtml(row.killerName || '-') },
        { label: 'เป้าหมาย', render: (row) => escapeHtml(row.victimName || '-') },
        { label: 'อาวุธ', render: (row) => escapeHtml(row.weapon || '-') },
        { label: 'เวลา', render: (row) => escapeHtml(formatDateTime(row.occurredAt)) },
      ], killfeed.slice(0, 10), 'ยังไม่มีรายการการต่อสู้ล่าสุด')}</article>`,
      '</section>',
    ].join('');
  } else if (currentSection === 'shop') {
    bodyHtml = [
      '<section class="public-server-metrics">',
      `<article class="public-server-metric"><span>ของที่เปิดขาย</span><strong>${formatNumber(shopItems.length, '0')}</strong><small>รายการที่เปิดให้ผู้เล่นเห็นตอนนี้</small></article>`,
      `<article class="public-server-metric"><span>แพ็กเกจสนับสนุน</span><strong>${formatNumber(summary.supporterPackages, '0')}</strong><small>ผู้เล่นช่วยพยุงชุมชนผ่านแพ็กเกจนี้ได้</small></article>`,
      `<article class="public-server-metric"><span>ยอดสนับสนุนล่าสุด</span><strong>${formatNumber(summary.supporterPurchases30d, '0')}</strong><small>นับจากรายการสนับสนุนในช่วงล่าสุด</small></article>`,
      `<article class="public-server-metric"><span>CTA</span><strong>ล็อกอิน</strong><small>ซื้อและติดตามคำสั่งซื้อจาก Player Portal</small></article>`,
      '</section>',
      `<section class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">ร้านค้า</span><h2>รายการที่เปิดขาย</h2><p>หน้าสาธารณะนี้ไว้ให้ผู้เล่นดูแคตตาล็อกก่อนเข้าพอร์ทัลจริง</p></div>${renderPublicTable([
        { label: 'รายการ', render: (row) => escapeHtml(row.name || row.id || '-') },
        { label: 'ประเภท', render: (row) => escapeHtml(row.kind || 'item') },
        { label: 'ราคา', render: (row) => escapeHtml(formatNumber(row.price, '0')) },
        { label: 'รายละเอียด', render: (row) => escapeHtml(row.description || '-') },
      ], shopItems.slice(0, 12), 'ยังไม่มีรายการร้านค้าที่เปิดขายในตอนนี้')}<div class="public-server-actions"><a class="site-button" href="/player/login">เข้า Player Portal</a><a class="site-button site-button-primary" href="/signup">สร้างเซิร์ฟเวอร์ของคุณ</a></div></section>`,
    ].join('');
  } else if (currentSection === 'events') {
    bodyHtml = [
      '<section class="public-server-metrics">',
      `<article class="public-server-metric"><span>ช่วงเวลาเรด</span><strong>${formatNumber(raidWindows.length, '0')}</strong><small>หน้าต่างเวลาที่กำหนดไว้</small></article>`,
      `<article class="public-server-metric"><span>สรุปกิจกรรม</span><strong>${formatNumber(raidSummaries.length, '0')}</strong><small>ผลกิจกรรมหรือการเรดล่าสุด</small></article>`,
      `<article class="public-server-metric"><span>Killfeed</span><strong>${formatNumber(killfeed.length, '0')}</strong><small>ความเคลื่อนไหวที่เกิดขึ้นจริงในเกม</small></article>`,
      `<article class="public-server-metric"><span>เซิร์ฟเวอร์</span><strong>${escapeHtml(servers[0]?.name || tenant.name || '-')}</strong><small>เครื่องหลักของชุมชนนี้</small></article>`,
      '</section>',
      '<section class="public-server-grid">',
      `<article class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">ช่วงเวลา</span><h2>Raid windows</h2></div>${renderPublicTable([
        { label: 'ชื่อช่วง', render: (row) => escapeHtml(row.title || '-') },
        { label: 'เริ่ม', render: (row) => escapeHtml(formatDateTime(row.startsAt)) },
        { label: 'จบ', render: (row) => escapeHtml(formatDateTime(row.endsAt)) },
        { label: 'สถานะ', render: (row) => badge(row.status || '-', row.status === 'live' ? 'success' : 'info') },
      ], raidWindows.slice(0, 8), 'ยังไม่มีช่วงเวลาเรดที่เปิดเผยในตอนนี้')}</article>`,
      `<article class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">สรุปผล</span><h2>กิจกรรมล่าสุด</h2></div>${renderPublicTable([
        { label: 'ผลลัพธ์', render: (row) => escapeHtml(row.outcome || '-') },
        { label: 'หมายเหตุ', render: (row) => escapeHtml(row.notes || '-') },
        { label: 'เวลา', render: (row) => escapeHtml(formatDateTime(row.createdAt)) },
      ], raidSummaries.slice(0, 8), 'ยังไม่มีสรุปกิจกรรมล่าสุด')}</article>`,
      '</section>',
    ].join('');
  } else {
    bodyHtml = [
      '<section class="public-server-metrics">',
      `<article class="public-server-metric"><span>แพ็กเกจสนับสนุน</span><strong>${formatNumber(summary.supporterPackages, '0')}</strong><small>แพ็กเกจที่ผู้เล่นใช้สนับสนุนชุมชนได้</small></article>`,
      `<article class="public-server-metric"><span>ผู้สนับสนุนที่ใช้งานอยู่</span><strong>${formatNumber(summary.activeSupporters30d, '0')}</strong><small>นับจากรายการที่ส่งสำเร็จล่าสุด</small></article>`,
      `<article class="public-server-metric"><span>รายได้จากการสนับสนุน</span><strong>${formatNumber(summary.supporterRevenueCoins30d, '0')}</strong><small>เหรียญรวมในหน้าต่างเวลารายงาน</small></article>`,
      `<article class="public-server-metric"><span>อัปเดตล่าสุด</span><strong>${escapeHtml(formatDateTime(summary.lastPurchaseAt || snapshot.generatedAt))}</strong><small>รายการล่าสุดที่ระบบมองเห็นได้</small></article>`,
      '</section>',
      '<section class="public-server-grid">',
      `<article class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">แพ็กเกจ</span><h2>แพ็กเกจสนับสนุนยอดนิยม</h2></div>${renderPublicTable([
        { label: 'แพ็กเกจ', render: (row) => escapeHtml(row.name || row.id || '-') },
        { label: 'ซื้อ', render: (row) => escapeHtml(formatNumber(row.purchases30d, '0')) },
        { label: 'รายได้', render: (row) => escapeHtml(formatNumber(row.revenueCoins30d, '0')) },
        { label: 'สถานะล่าสุด', render: (row) => badge(row.latestStatus || '-', row.latestStatus === 'delivered' ? 'success' : 'info') },
      ], donations.topPackages || [], 'ยังไม่มีข้อมูลแพ็กเกจสนับสนุน')}</article>`,
      `<article class="public-server-card"><div class="public-server-card-head"><span class="public-server-kicker">ผู้สนับสนุน</span><h2>ชุมชนที่ช่วยพยุงเซิร์ฟเวอร์นี้</h2></div>${renderPublicTable([
        { label: 'ผู้สนับสนุน', render: (row) => escapeHtml(row.label || '-') },
        { label: 'แพ็กเกจล่าสุด', render: (row) => escapeHtml(row.latestPackage || '-') },
        { label: 'สถานะ', render: (row) => badge(row.latestStatus || '-', row.latestStatus === 'delivered' ? 'success' : 'info') },
        { label: 'ล่าสุดเมื่อ', render: (row) => escapeHtml(formatDateTime(row.lastPurchaseAt)) },
      ], supporters, 'ยังไม่มีรายชื่อผู้สนับสนุนที่เปิดเผยในตอนนี้')}<div class="public-server-actions"><a class="site-button" href="/player/login">เข้า Player Portal</a><a class="site-button site-button-primary" href="/signup">เปิดระบบของคุณเอง</a></div></article>`,
      '</section>',
    ].join('');
  }

  return [
    '<!doctype html><html lang="th"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>SCUM TH Platform | ${escapeHtml(sectionMeta[currentSection].title)} | ${escapeHtml(tenant.name || 'SCUM')}</title>`,
    '<link rel="stylesheet" href="/player/assets/ui/platform-site-v3.css?v=20260327-live-1">',
    '<style>',
    '.public-server-main{padding:32px 24px 56px;display:grid;gap:24px;max-width:1280px;margin:0 auto;}',
    '.public-server-card,.public-server-metric{border:1px solid var(--site-border);background:var(--site-surface);border-radius:24px;box-shadow:var(--site-shadow);}',
    '.public-server-card{padding:24px;display:grid;gap:16px;}',
    '.public-server-card-hero{padding:28px;}',
    '.public-server-card-head{display:grid;gap:8px;}',
    '.public-server-kicker{color:var(--site-text-muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;}',
    '.public-server-card h1,.public-server-card h2{margin:0;font-size:clamp(1.35rem,2vw,2.25rem);}',
    '.public-server-card p{margin:0;color:var(--site-text-soft);line-height:1.6;}',
    '.public-server-stack{display:grid;gap:10px;}',
    '.public-server-actions{display:flex;flex-wrap:wrap;gap:12px;}',
    '.public-server-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;}',
    '.public-server-metric{padding:20px;display:grid;gap:8px;}',
    '.public-server-metric span{color:var(--site-text-muted);font-size:.84rem;}',
    '.public-server-metric strong{font-size:1.6rem;}',
    '.public-server-metric small{color:var(--site-text-soft);line-height:1.5;}',
    '.public-server-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;}',
    '.public-server-table-wrap{overflow:auto;}',
    '.public-server-table{width:100%;border-collapse:collapse;}',
    '.public-server-table th,.public-server-table td{padding:12px 10px;border-top:1px solid var(--site-border);text-align:left;vertical-align:top;}',
    '.public-server-table th{color:var(--site-text-muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;}',
    '.public-server-empty{padding:16px;border:1px dashed var(--site-border);border-radius:18px;color:var(--site-text-soft);}',
    '.site-badge{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;border:1px solid var(--site-border);font-size:.78rem;font-weight:700;}',
    '.site-badge.tone-success{background:rgba(135,187,133,.16);color:var(--site-success);}',
    '.site-badge.tone-info{background:rgba(138,167,213,.16);color:var(--site-info);}',
    '.site-badge.tone-warning{background:rgba(217,173,103,.16);color:var(--site-warning);}',
    '.site-badge.tone-muted{background:rgba(255,255,255,.04);color:var(--site-text-soft);}',
    '.public-server-chip-row{display:flex;flex-wrap:wrap;gap:10px;}',
    '@media (max-width: 720px){.public-server-main{padding:20px 14px 40px}.site-topbar{padding:14px}.public-server-card,.public-server-metric{border-radius:20px}}',
    '</style></head><body class="public-v3"><div class="site-shell">',
    '<header class="site-topbar"><div class="site-topbar-main">',
    `<a class="site-brand" href="/s/${encodeURIComponent(tenant.slug || '')}/stats"><span class="site-brand-mark">SCUM</span><span class="site-brand-copy"><span class="site-brand-title">${escapeHtml(tenant.name || 'SCUM community')}</span><span class="site-brand-detail">พอร์ทัลสาธารณะของเซิร์ฟเวอร์</span></span></a>`,
    '<nav class="site-nav">',
    `<a class="site-nav-link${currentSection === 'stats' ? ' is-active' : ''}" href="/s/${encodeURIComponent(tenant.slug || '')}/stats">สถิติ</a>`,
    `<a class="site-nav-link${currentSection === 'shop' ? ' is-active' : ''}" href="/s/${encodeURIComponent(tenant.slug || '')}/shop">ร้านค้า</a>`,
    `<a class="site-nav-link${currentSection === 'events' ? ' is-active' : ''}" href="/s/${encodeURIComponent(tenant.slug || '')}/events">กิจกรรม</a>`,
    `<a class="site-nav-link${currentSection === 'donate' ? ' is-active' : ''}" href="/s/${encodeURIComponent(tenant.slug || '')}/donate">สนับสนุน</a>`,
    '</nav></div><div class="site-topbar-tools"><a class="site-button" href="/player/login">เข้า Player Portal</a><a class="site-button site-button-primary" href="/signup">สร้างพื้นที่ของคุณ</a></div></header>',
    `<main class="public-server-main"><section class="public-server-card public-server-card-hero"><div class="public-server-stack"><span class="public-server-kicker">${escapeHtml(tenant.slug || '-')}</span><h1>${escapeHtml(sectionMeta[currentSection].title)}</h1><p>${escapeHtml(sectionMeta[currentSection].subtitle)}</p><div class="public-server-chip-row">${badge(tenant.status || 'active', tenant.status === 'active' ? 'success' : 'warning')}${badge(`${formatNumber(servers.length, '0')} servers`, 'info')}${badge(`อัปเดต ${formatDateTime(snapshot.generatedAt)}`, 'muted')}</div></div></section>${bodyHtml}</main>`,
    '</div></body></html>',
  ].join('');
}

function createPortalPageRoutes(deps) {
  const {
    allowCaptureAuth,
    captureAuthToken,
    createCaptureSession,
    buildSessionCookie,
    tryServePortalStaticAsset,
    tryServeStaticScumIcon,
    buildAdminProductUrl,
    buildLegacyAdminUrl,
    getCanonicalRedirectUrl,
    readJsonBody,
    sendJson,
    sendHtml,
    sendFavicon,
    buildHealthPayload,
    tryServePublicDoc,
    getLandingHtml,
    getDashboardHtml,
    getPricingHtml,
    getSignupHtml,
    getForgotPasswordHtml,
    getVerifyEmailHtml,
    getCheckoutHtml,
    getPaymentResultHtml,
    getPreviewHtml,
    getShowcaseHtml,
    getTrialHtml,
    getPlayerHtml,
    getLegacyPlayerHtml,
    getPlatformPublicOverview,
    isDiscordStartPath,
    isDiscordCallbackPath,
    handleDiscordStart,
    handleDiscordCallback,
    getSession,
    getPreviewSession,
    getAuthLoginHtml,
    renderPlayerLoginPage,
    getPublicServerPortalSnapshot,
  } = deps;
  const servePortalStaticAsset = typeof tryServePortalStaticAsset === 'function'
    ? tryServePortalStaticAsset
    : async () => false;
  const serveLegacyPlayerHtml = typeof getLegacyPlayerHtml === 'function'
    ? getLegacyPlayerHtml
    : getPlayerHtml;
  const readBody = typeof readJsonBody === 'function'
    ? readJsonBody
    : async () => ({});

  return async function handlePortalPageRoute(context) {
    const {
      req,
      res,
      urlObj,
      pathname,
      method,
    } = context;

    if (await servePortalStaticAsset(req, res, pathname)) {
      return true;
    }

    if (await tryServeStaticScumIcon(req, res, pathname)) {
      return true;
    }

    if (pathname.startsWith('/admin')) {
      const target = buildLegacyAdminUrl(pathname, urlObj.search);
      if (!target) {
        sendJson(res, 503, {
          ok: false,
          error: 'Legacy admin URL is invalid',
        });
        return true;
      }
      sendRedirect(res, target);
      return true;
    }

    const canonicalRedirectUrl = getCanonicalRedirectUrl(req);
    if (canonicalRedirectUrl && (method === 'GET' || method === 'HEAD')) {
      sendRedirect(res, canonicalRedirectUrl);
      return true;
    }

    if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
      sendFavicon(res);
      return true;
    }

    if (allowCaptureAuth && pathname === '/player/capture-auth' && method === 'POST') {
      const body = await readBody(req);
      const token = String(body?.token || '').trim();
      if (!token || token !== String(captureAuthToken || '').trim()) {
        sendJson(res, 403, {
          ok: false,
          error: 'Capture auth token is invalid',
        });
        return true;
      }
      const sessionId = createCaptureSession();
      res.writeHead(302, {
        Location: '/player',
        'Set-Cookie': buildSessionCookie(sessionId, req),
      });
      res.end();
      return true;
    }

    if (pathname === '/healthz' && method === 'GET') {
      sendJson(res, 200, buildHealthPayload());
      return true;
    }

    if (method === 'GET' && tryServePublicDoc(pathname, res)) {
      return true;
    }

    if (pathname === '/') {
      sendRedirect(res, '/landing');
      return true;
    }

    if (pathname === '/showcase/' && method === 'GET') {
      sendRedirect(res, '/showcase');
      return true;
    }

    if (pathname === '/landing/' && method === 'GET') {
      sendRedirect(res, '/landing');
      return true;
    }

    if (pathname === '/landing' && method === 'GET') {
      sendHtml(res, 200, getLandingHtml());
      return true;
    }

    if (pathname === '/dashboard/' && method === 'GET') {
      sendRedirect(res, '/pricing');
      return true;
    }

    if (pathname === '/dashboard' && method === 'GET') {
      sendRedirect(res, '/pricing');
      return true;
    }

    if (pathname === '/pricing/' && method === 'GET') {
      sendRedirect(res, '/pricing');
      return true;
    }

    if (pathname === '/pricing' && method === 'GET') {
      sendHtml(res, 200, getPricingHtml());
      return true;
    }

    if (pathname === '/signup/' && method === 'GET') {
      sendRedirect(res, '/signup');
      return true;
    }

    if (pathname === '/signup' && method === 'GET') {
      sendHtml(res, 200, getSignupHtml());
      return true;
    }

    if (pathname === '/forgot-password/' && method === 'GET') {
      sendRedirect(res, '/forgot-password');
      return true;
    }

    if (pathname === '/forgot-password' && method === 'GET') {
      sendHtml(res, 200, getForgotPasswordHtml());
      return true;
    }

    if (pathname === '/verify-email/' && method === 'GET') {
      sendRedirect(res, '/verify-email');
      return true;
    }

    if (pathname === '/verify-email' && method === 'GET') {
      sendHtml(res, 200, getVerifyEmailHtml());
      return true;
    }

    if (pathname === '/checkout/' && method === 'GET') {
      sendRedirect(res, '/checkout');
      return true;
    }

    if (pathname === '/checkout' && method === 'GET') {
      sendHtml(res, 200, getCheckoutHtml());
      return true;
    }

    if (pathname === '/payment-result/' && method === 'GET') {
      sendRedirect(res, '/payment-result');
      return true;
    }

    if (pathname === '/payment-result' && method === 'GET') {
      sendHtml(res, 200, getPaymentResultHtml());
      return true;
    }

    if (pathname === '/preview/' && method === 'GET') {
      const target = typeof buildAdminProductUrl === 'function'
        ? buildAdminProductUrl('/tenant/onboarding')
        : '/tenant/onboarding';
      sendRedirect(res, target);
      return true;
    }

    if (pathname === '/preview' && method === 'GET') {
      const target = typeof buildAdminProductUrl === 'function'
        ? buildAdminProductUrl('/tenant/onboarding')
        : '/tenant/onboarding';
      sendRedirect(res, target);
      return true;
    }

    if (pathname === '/showcase' && method === 'GET') {
      sendRedirect(res, '/pricing');
      return true;
    }

    const publicServerPage = matchPublicServerPage(pathname);
    if (publicServerPage && method === 'GET') {
      if (!publicServerPage.section) {
        sendRedirect(res, `/s/${encodeURIComponent(publicServerPage.slug)}/stats`);
        return true;
      }
      if (typeof getPublicServerPortalSnapshot !== 'function') {
        sendHtml(res, 503, '<!doctype html><html><body>Public server pages are unavailable.</body></html>');
        return true;
      }
      const snapshot = await getPublicServerPortalSnapshot(publicServerPage.slug);
      if (!snapshot?.tenant?.id) {
        sendHtml(res, 404, '<!doctype html><html><body>Public server not found.</body></html>');
        return true;
      }
      sendHtml(res, 200, renderPublicServerPage(snapshot, publicServerPage.section));
      return true;
    }

    if (pathname === '/trial/' && method === 'GET') {
      sendRedirect(res, '/pricing');
      return true;
    }

    if (pathname === '/trial' && method === 'GET') {
      sendRedirect(res, '/pricing');
      return true;
    }

    if (pathname === '/api/platform/public/overview' && method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        data: await getPlatformPublicOverview(),
      });
      return true;
    }

    if (pathname === '/player/') {
      sendRedirect(res, '/player');
      return true;
    }

    if (pathname === '/player/legacy/' && method === 'GET') {
      sendRedirect(res, '/player/legacy');
      return true;
    }

    if (pathname === '/player/login/') {
      sendRedirect(res, '/player/login');
      return true;
    }

    if (isDiscordStartPath(pathname) && method === 'GET') {
      await handleDiscordStart(req, res);
      return true;
    }

    if (isDiscordCallbackPath(pathname) && method === 'GET') {
      await handleDiscordCallback(req, res, urlObj);
      return true;
    }

    if (pathname === '/login' && method === 'GET') {
      sendHtml(res, 200, getAuthLoginHtml());
      return true;
    }

    if (pathname === '/player/login' && method === 'GET') {
      const session = getSession(req);
      if (session) {
        sendRedirect(res, '/player');
        return true;
      }
      sendHtml(
        res,
        200,
        renderPlayerLoginPage(String(urlObj.searchParams.get('error') || '')),
      );
      return true;
    }

    if (
      (pathname === '/player' || pathname.startsWith('/player/'))
      && pathname !== '/player/login'
      && pathname !== '/player/legacy'
      && !pathname.startsWith('/player/api/')
      && method === 'GET'
    ) {
      const session = getSession(req);
      if (!session) {
        sendRedirect(res, '/player/login');
        return true;
      }
      sendHtml(res, 200, getPlayerHtml());
      return true;
    }

    if (pathname === '/player/legacy' && method === 'GET') {
      const session = getSession(req);
      if (!session) {
        sendRedirect(res, '/player/login');
        return true;
      }
      sendHtml(res, 200, serveLegacyPlayerHtml());
      return true;
    }

    return false;
  };
}

module.exports = {
  createPortalPageRoutes,
};
