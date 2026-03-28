(function () {
  'use strict';

  const PAGE_ALIASES = {
    '': 'dashboard',
    overview: 'dashboard',
    dashboard: 'dashboard',
    tenants: 'tenants',
    packages: 'tenants',
    subscriptions: 'tenants',
    billing: 'tenants',
    commercial: 'tenants',
    quota: 'tenants',
    fleet: 'runtime',
    'fleet-assets': 'runtime',
    incidents: 'runtime',
    observability: 'runtime',
    jobs: 'runtime',
    audit: 'runtime',
    security: 'runtime',
    support: 'runtime',
    control: 'runtime',
    access: 'runtime',
    recovery: 'runtime',
    runtime: 'runtime',
    'runtime-health': 'runtime',
    settings: 'dashboard',
    diagnostics: 'runtime',
  };

  const PAGE_TITLE_KEYS = {
    dashboard: 'owner.app.page.dashboard',
    tenants: 'owner.app.page.tenants',
    runtime: 'owner.app.page.runtime',
  };

  const ROUTE_TITLE_FALLBACKS = {
    dashboard: 'ภาพรวมระบบ',
    overview: 'ภาพรวมระบบ',
    tenants: 'ผู้เช่าและแพ็กเกจ',
    packages: 'แพ็กเกจและสิทธิ์ใช้งาน',
    subscriptions: 'การสมัครใช้และการต่ออายุ',
    billing: 'การเงินและการต่ออายุ',
    runtime: 'สถานะระบบและเหตุการณ์',
    'runtime-health': 'สถานะระบบและเหตุการณ์',
    incidents: 'เหตุการณ์และสัญญาณ',
    observability: 'คำขอและความช้า',
    jobs: 'งานรอและบอท',
    support: 'ซัพพอร์ต',
    security: 'ความปลอดภัย',
    audit: 'หลักฐานและบันทึก',
    settings: 'ตั้งค่า',
  };

  const OWNER_ROUTE_PRESENTATION = {
    overview: {
      workspaceLabel: 'ศูนย์ควบคุมแพลตฟอร์ม',
      kicker: 'ศูนย์ควบคุมเจ้าของระบบ',
      title: 'ภาพรวมเจ้าของระบบ',
      subtitle: 'ดูผู้เช่า รายได้ สุขภาพระบบ และเรื่องที่ควรจัดการก่อนจากหน้าเดียว',
      primaryAction: { label: 'เปิดรายชื่อผู้เช่า', href: '#tenants' },
      railHeader: 'บริบทเจ้าของระบบ',
      railCopy: 'ดูรายได้ ซัพพอร์ต และจุดเสี่ยงได้จากด้านขวา',
    },
    settings: {
      workspaceLabel: 'ตั้งค่าและนโยบาย',
      kicker: 'ตั้งค่าและนโยบาย',
      title: 'ตั้งค่าและนโยบาย',
      subtitle: 'ทบทวนกติกา สิทธิ์ และมาตรฐานที่ต้องใช้ตรงกันทั้งแพลตฟอร์ม',
      primaryAction: { label: 'เปิดบันทึกออดิท', href: '#audit' },
      railHeader: 'บริบทนโยบาย',
      railCopy: 'เก็บเรื่องสิทธิ์ หลักฐาน และแนวทางดูแลผู้เช่าไว้ในมุมเดียวกัน',
      sectionTitles: {
        settings: {
          title: 'นโยบายและเครื่องมือที่ควรเปิดต่อ',
          copy: 'เริ่มจากกติกาที่กระทบผู้เช่าหลายรายก่อน แล้วค่อยไล่งานเชิงปฏิบัติการ',
        },
      },
    },
    tenants: {
      workspaceLabel: 'ทะเบียนผู้เช่า',
      kicker: 'ทะเบียนงานลูกค้าและผู้เช่า',
      title: 'ผู้เช่าและสถานะเชิงพาณิชย์',
      subtitle: 'ดูแพ็กเกจ การต่ออายุ โควตา และบริบทลูกค้าจากหน้าเดียว',
      primaryAction: { label: 'สร้างผู้เช่ารายใหม่', href: '#create-tenant' },
      railHeader: 'บริบทเจ้าของระบบ',
      railCopy: 'เก็บงานซัพพอร์ตและงานเชิงพาณิชย์ไว้ใกล้ทะเบียนผู้เช่า',
    },
    packages: {
      workspaceLabel: 'แพ็กเกจและสิทธิ์ใช้งาน',
      kicker: 'แพ็กเกจและสิทธิ์ใช้งาน',
      title: 'แพ็กเกจและสิทธิ์ใช้งาน',
      subtitle: 'ทบทวนว่าผู้เช่าแต่ละรายอยู่แผนใด และได้สิทธิ์อะไรบ้างก่อนเปลี่ยนแพ็กเกจ',
      primaryAction: { label: 'ดูการสมัครใช้', href: '#subscriptions' },
      railHeader: 'บริบทแพ็กเกจ',
      railCopy: 'เริ่มจากแผนที่ใช้อยู่จริง แล้วค่อยตามเรื่องการต่ออายุและโควตา',
      sectionTitles: {
        packages: {
          title: 'รายชื่อผู้เช่าตามแพ็กเกจ',
          copy: 'เปิดดูจากทะเบียนเดียวกันได้เลยว่าผู้เช่ารายไหนอยู่แผนใด และควรย้ายหรือคงแผนเดิม',
        },
      },
    },
    subscriptions: {
      workspaceLabel: 'การสมัครใช้และการต่ออายุ',
      kicker: 'การสมัครใช้และการต่ออายุ',
      title: 'การสมัครใช้และการต่ออายุ',
      subtitle: 'โฟกัสรายการที่ใกล้ต่ออายุ หมดอายุ หรือเสี่ยงสะดุดบริการก่อนเรื่องอื่น',
      primaryAction: { label: 'ดูรายการใกล้ต่ออายุ', href: '#subscriptions' },
      railHeader: 'บริบทการต่ออายุ',
      railCopy: 'เริ่มจากผู้เช่าที่ใกล้หมดอายุก่อน เพื่อไม่ให้ทีมซัพพอร์ตรับแรงกระแทก',
      sectionTitles: {
        packages: {
          title: 'รายชื่อผู้เช่าที่ต้องตามเรื่องการสมัครใช้',
          copy: 'ใช้ตารางนี้คัดรายที่ต้องทบทวนเรื่องการต่ออายุ แพ็กเกจ และสิทธิ์ใช้งานในรอบเดียว',
        },
      },
    },
    billing: {
      workspaceLabel: 'การเงินและการต่ออายุ',
      kicker: 'การเงินและการต่ออายุ',
      title: 'การเงินและการต่ออายุ',
      subtitle: 'รวมรายการที่กระทบรายได้ การต่ออายุ และโควตาไว้ในมุมเดียว',
      primaryAction: { label: 'เปิดรายการเสี่ยงรายได้', href: '#billing' },
      railHeader: 'บริบทการเงิน',
      railCopy: 'มุมนี้ใช้ตัดสินใจเรื่องต่ออายุ รายได้ และผู้เช่าที่เริ่มชนขอบความเสี่ยง',
      sectionTitles: {
        billing: {
          title: 'เริ่มจากเรื่องที่กระทบรายได้ก่อน',
          copy: 'โฟกัสกับรายที่หมดอายุ ใกล้ต่ออายุ หรือเริ่มชนโควตาก่อนงานเชิงสำรวจอื่น',
        },
      },
    },
    'create-tenant': {
      workspaceLabel: 'สร้างผู้เช่ารายใหม่',
      kicker: 'สร้างผู้เช่ารายใหม่',
      title: 'สร้างผู้เช่ารายใหม่',
      subtitle: 'เริ่มจากข้อมูลหลักของผู้เช่า แล้วค่อยผูกแพ็กเกจ การสมัครใช้ และงานซัพพอร์ตต่อ',
      primaryAction: { label: 'กลับไปดูทะเบียนผู้เช่า', href: '#tenants' },
      railHeader: 'บริบทการเริ่มต้นใช้งาน',
      railCopy: 'เมื่อสร้างผู้เช่าเสร็จ ให้ตามด้วยแพ็กเกจ การสมัครใช้ และการตั้งค่าที่จำเป็น',
    },
    support: {
      workspaceLabel: 'ซัพพอร์ตแพลตฟอร์ม',
      kicker: 'ซัพพอร์ตแพลตฟอร์ม',
      title: 'ซัพพอร์ตแพลตฟอร์ม',
      subtitle: 'เริ่มจากผู้เช่าและเรื่องที่กำลังคุยอยู่ แล้วค่อยไล่หลักฐานและบริบทระบบต่อ',
      primaryAction: { label: 'เปิดเหตุการณ์ล่าสุด', href: '#incidents' },
      railHeader: 'บริบทงานซัพพอร์ต',
      railCopy: 'เก็บบริบทของผู้เช่า หลักฐาน และเรื่องเชิงพาณิชย์ไว้ใกล้กันเพื่อให้คุยกับลูกค้าได้ต่อเนื่อง',
      sectionTitles: {
        incidents: {
          title: 'เคสซัพพอร์ตและสัญญาณล่าสุด',
          copy: 'เริ่มจาก feed นี้ก่อนเปิดเครื่องมือ replay หรือ diagnostics เพื่อไม่ให้พลาดเรื่องที่กระทบกว้างกว่า',
        },
      },
    },
    security: {
      workspaceLabel: 'ความปลอดภัยแพลตฟอร์ม',
      kicker: 'ความปลอดภัยแพลตฟอร์ม',
      title: 'ความปลอดภัยแพลตฟอร์ม',
      subtitle: 'ทบทวนสิทธิ์ การเข้าถึง และสัญญาณที่ต้องยืนยันก่อนลงมือ',
      primaryAction: { label: 'เปิดบันทึกออดิท', href: '#audit' },
      railHeader: 'บริบทความปลอดภัย',
      railCopy: 'งานด้านสิทธิ์ การเข้าถึง และหลักฐานควรถูกวางคู่กับบริบทของเหตุการณ์เสมอ',
      sectionTitles: {
        incidents: {
          title: 'สัญญาณด้านความปลอดภัยและซัพพอร์ต',
          copy: 'ใช้ feed นี้แยกเรื่องสิทธิ์และเหตุผิดปกติออกจากงานซัพพอร์ตทั่วไป เพื่อไม่ให้ประเด็นสำคัญหลุด',
        },
      },
    },
    runtime: {
      workspaceLabel: 'สถานะระบบ',
      kicker: 'โต๊ะปฏิบัติการและเหตุการณ์',
      title: 'สถานะระบบและเหตุการณ์',
      subtitle: 'ดูความพร้อมของบริการ สัญญาณผิดปกติ และแรงกดดันของคำขอในมุมเดียว',
      primaryAction: { label: 'เปิดคำขอและความช้า', href: '#observability' },
      railHeader: 'บริบทการปฏิบัติการ',
      railCopy: 'เก็บหลักฐานและงานติดตามของเจ้าของระบบไว้ใกล้มือเสมอขณะตรวจรันไทม์หรือเหตุการณ์',
    },
    'runtime-health': {
      workspaceLabel: 'สถานะระบบ',
      kicker: 'โต๊ะปฏิบัติการและเหตุการณ์',
      title: 'สถานะบริการ',
      subtitle: 'ดูว่าบริการใดพร้อม บริการใดยังต้องจับตา และบอทตัวใดเริ่มไม่เสถียร',
      primaryAction: { label: 'เปิดคำขอและความช้า', href: '#observability' },
      railHeader: 'บริบทการปฏิบัติการ',
      railCopy: 'เก็บหลักฐานและงานติดตามของเจ้าของระบบไว้ใกล้มือเสมอขณะตรวจรันไทม์หรือเหตุการณ์',
    },
    incidents: {
      workspaceLabel: 'เหตุการณ์และสัญญาณ',
      kicker: 'เหตุการณ์และสัญญาณ',
      title: 'เหตุการณ์และสัญญาณ',
      subtitle: 'เปิดดูสัญญาณที่ใหม่และรุนแรงที่สุดก่อน เพื่อไม่ให้พลาดเรื่องที่กระทบกว้างกว่า',
      primaryAction: { label: 'เปิดรายการเหตุการณ์', href: '#incidents' },
      railHeader: 'บริบทเหตุการณ์',
      railCopy: 'ให้เหตุการณ์ หลักฐาน และบริการที่เกี่ยวกันอยู่ในมุมเดียวเพื่อช่วยตัดสินใจได้เร็ว',
      sectionTitles: {
        incidents: {
          title: 'สัญญาณที่เจ้าของระบบควรรู้ตอนนี้',
          copy: 'เริ่มจาก feed นี้ก่อนเปิดซัพพอร์ตหรือเครื่องมือ replay เพื่อไม่ให้พลาดเรื่องที่กระทบกว้างกว่า',
        },
      },
    },
    observability: {
      workspaceLabel: 'คำขอและความช้า',
      kicker: 'คำขอและความช้า',
      title: 'คำขอและความช้า',
      subtitle: 'ไล่จุดร้อน ข้อผิดพลาด และความช้าของระบบก่อนตัดสินใจแก้ปัญหา',
      primaryAction: { label: 'เปิดจุดร้อนของคำขอ', href: '#observability' },
      railHeader: 'บริบทคำขอ',
      railCopy: 'รวมคำขอที่ช้า ข้อผิดพลาด และแนวทางเช็กต่อไว้ในชุดเดียว',
      sectionTitles: {
        observability: {
          title: 'จุดร้อนของคำขอ',
          copy: 'สรุปคำขอแบบกะทัดรัดช่วยให้เจ้าของระบบตัดสินใจได้เร็วกว่าการมองกราฟใหญ่เต็มหน้า',
        },
      },
    },
    jobs: {
      workspaceLabel: 'งานรอและบอท',
      kicker: 'งานรอและบอท',
      title: 'งานรอและบอท',
      subtitle: 'แยกงานส่งของ งานที่ล้มเหลว และรายชื่อบอทให้ดูง่ายจากมุมเดียว',
      primaryAction: { label: 'เปิดรายชื่อบอท', href: '#jobs' },
      railHeader: 'บริบทงานคิว',
      railCopy: 'ให้สถานะของ Delivery Agent และ Server Bot มองเห็นได้ตลอด โดยไม่ปนกับมุมมองงานประจำวันของผู้เช่า',
      sectionTitles: {
        jobs: {
          title: 'ทะเบียนเอเจนต์และคิวที่ต้องตามต่อ',
          copy: 'ให้สถานะของ Delivery Agent และ Server Bot มองเห็นได้ตลอด โดยไม่ปนกับมุมมองงานประจำวันของผู้เช่า',
        },
      },
    },
    audit: {
      workspaceLabel: 'หลักฐานและบันทึก',
      kicker: 'หลักฐานและบันทึก',
      title: 'หลักฐานและบันทึก',
      subtitle: 'ย้อนดูหลักฐาน คำขอ และสัญญาณที่ต้องเก็บไว้ก่อนลงมือทำเรื่องเสี่ยง',
      primaryAction: { label: 'เปิดคำขอและความช้า', href: '#observability' },
      railHeader: 'บริบทหลักฐาน',
      railCopy: 'งานซัพพอร์ตและงานรีวิวความปลอดภัยควรใช้หลักฐานชุดเดียวกัน',
      sectionTitles: {
        observability: {
          title: 'หลักฐานของคำขอและจุดร้อน',
          copy: 'ใช้ส่วนนี้เก็บบริบทของ request, latency และข้อผิดพลาดก่อนสรุปเป็น incident หรือออดิท',
        },
      },
    },
  };

  const state = {
    payload: null,
    refreshing: false,
    timerId: null,
    requestId: 0,
  };

  const OWNER_OVERVIEW_FALLBACK = {
    analytics: {
      tenants: { total: 0, active: 0, trialing: 0, reseller: 0 },
      subscriptions: { total: 0, active: 0, mrrCents: 0 },
      delivery: { queueDepth: 0, failedJobs: 0, failureRatePct: 0, lastSyncAt: null },
    },
    publicOverview: null,
    permissionCatalog: [],
    plans: [],
    packages: [],
    features: [],
    tenantFeatureAccess: null,
    opsState: null,
    automationState: null,
    automationConfig: null,
    tenantConfig: null,
  };

  function t(key, fallback, params) {
    return window.AdminUiI18n?.t?.(key, fallback, params) || fallback || key;
  }

  function applyI18n(rootNode = document) {
    window.AdminUiI18n?.apply?.(rootNode);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function root() {
    return document.getElementById('ownerV4AppRoot');
  }

  function statusNode() {
    return document.getElementById('ownerV4Status');
  }

  function setStatus(message, tone) {
    const node = statusNode();
    if (!node) return;
    node.textContent = String(message || '').trim();
    node.dataset.tone = tone || 'muted';
  }

  function renderMessageCard(title, detail) {
    const target = root();
    if (!target) return;
    target.innerHTML = [
      '<section style="padding:32px;border:1px solid rgba(212,186,113,.18);border-radius:24px;background:rgba(13,17,14,.92);box-shadow:0 24px 56px rgba(0,0,0,.28)">',
      `<h1 style="margin:0 0 12px;font:700 32px/1.05 'IBM Plex Sans Thai','Segoe UI',sans-serif;color:#f4efe4">${escapeHtml(title)}</h1>`,
      `<p style="margin:0;color:rgba(244,239,228,.74);font:400 15px/1.7 'IBM Plex Sans Thai','Segoe UI',sans-serif">${escapeHtml(detail)}</p>`,
      '</section>',
    ].join('');
  }

  async function api(path, fallback, options = {}) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 && controller
      ? window.setTimeout(() => controller.abort(), options.timeoutMs)
      : null;
    try {
      const response = await fetch(path, {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
        signal: controller ? controller.signal : undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        if (response.status === 401) {
          window.location.href = '/owner/login';
          return fallback;
        }
        throw new Error(String(payload?.error || `Request failed (${response.status})`));
      }
      return payload?.data ?? fallback;
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      if (aborted && options.allowTimeoutFallback) {
        return fallback;
      }
      throw error;
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  function getRawHashRoute() {
    return String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  }

  function resolveOwnerPage(rawRoute) {
    const raw = String(rawRoute || '').trim().toLowerCase();
    if (!raw) return 'dashboard';
    if (PAGE_ALIASES[raw]) return PAGE_ALIASES[raw];
    if (raw === 'create-tenant' || raw.startsWith('tenant-') || raw.startsWith('support-')) {
      return 'tenants';
    }
    return 'dashboard';
  }

  function routeTargetSelector(route) {
    const normalized = String(route || '').trim().toLowerCase();
    if (!normalized) return '';
    const escaped = normalized
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `#${escaped}, [data-owner-focus-route~="${escaped}"]`;
  }

  function focusCurrentRoute(rawRoute, page) {
    const route = String(rawRoute || '').trim().toLowerCase() || (page === 'runtime' ? 'runtime-health' : page === 'tenants' ? 'tenants' : 'overview');
    const selector = routeTargetSelector(route);
    if (!selector) return;
    const node = document.querySelector(selector);
    if (!node) return;
    window.requestAnimationFrame(() => {
      node.classList.remove('odv4-focus-target-active');
      node.classList.add('odv4-focus-target-active');
      node.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      window.setTimeout(() => {
        node.classList.remove('odv4-focus-target-active');
      }, 1600);
    });
  }

  function routePresentationFor(rawRoute, page) {
    const normalizedRoute = String(rawRoute || '').trim().toLowerCase();
    if (normalizedRoute.startsWith('tenant-')) {
      return {
        ...(OWNER_ROUTE_PRESENTATION.tenants || {}),
        workspaceLabel: 'รายละเอียดผู้เช่า',
        kicker: 'รายละเอียดผู้เช่า',
        title: 'รายละเอียดผู้เช่า',
        subtitle: 'ใช้บริบทของผู้เช่ารายนี้ต่อเพื่อดูสถานะเชิงพาณิชย์ ซัพพอร์ต และโควตาในหน้าเดียว',
        primaryAction: { label: 'เปิดซัพพอร์ตของผู้เช่ารายนี้', href: `#support-${normalizedRoute.slice('tenant-'.length)}` },
      };
    }
    if (normalizedRoute.startsWith('support-')) {
      return {
        ...(OWNER_ROUTE_PRESENTATION.support || {}),
        workspaceLabel: 'เคสซัพพอร์ต',
        kicker: 'เคสซัพพอร์ต',
        title: 'เคสซัพพอร์ต',
        subtitle: 'ใช้บริบทของผู้เช่ารายนี้เพื่อคุยกับลูกค้า ดูหลักฐาน และตามงานต่อโดยไม่หลุดบริบท',
        primaryAction: { label: 'กลับไปดูผู้เช่ารายนี้', href: `#tenant-${normalizedRoute.slice('support-'.length)}` },
      };
    }
    if (normalizedRoute && OWNER_ROUTE_PRESENTATION[normalizedRoute]) {
      return OWNER_ROUTE_PRESENTATION[normalizedRoute];
    }
    return OWNER_ROUTE_PRESENTATION[page] || OWNER_ROUTE_PRESENTATION.overview;
  }

  function applyRouteSectionPresentation(route, presentation) {
    const sectionUpdates = presentation && presentation.sectionTitles && typeof presentation.sectionTitles === 'object'
      ? presentation.sectionTitles
      : {};
    Object.entries(sectionUpdates).forEach(([sectionId, config]) => {
      const section = document.getElementById(sectionId);
      if (!section || !config) return;
      const titleNode = section.querySelector('.odv4-section-title');
      const copyNode = section.querySelector('.odv4-section-copy');
      if (titleNode && config.title) {
        titleNode.textContent = String(config.title || '').trim();
      }
      if (copyNode && config.copy) {
        copyNode.textContent = String(config.copy || '').trim();
      }
    });
  }

  function applyOwnerRoutePresentation(rawRoute, page) {
    const presentation = routePresentationFor(rawRoute, page);
    const workspaceNode = document.querySelector('.odv4-workspace-label');
    const kickerNode = document.querySelector('.odv4-pagehead .odv4-section-kicker');
    const titleNode = document.querySelector('.odv4-page-title');
    const subtitleNode = document.querySelector('.odv4-page-subtitle');
    const primaryActionNode = document.querySelector('.odv4-pagehead-actions .odv4-button-primary');
    const railHeaderNode = document.querySelector('.odv4-rail-header');
    const railCopyNode = document.querySelector('.odv4-rail-copy');

    if (workspaceNode && presentation.workspaceLabel) {
      workspaceNode.textContent = String(presentation.workspaceLabel || '').trim();
    }
    if (kickerNode && presentation.kicker) {
      kickerNode.textContent = String(presentation.kicker || '').trim();
    }
    if (titleNode && presentation.title) {
      titleNode.textContent = String(presentation.title || '').trim();
    }
    if (subtitleNode && presentation.subtitle) {
      subtitleNode.textContent = String(presentation.subtitle || '').trim();
    }
    if (primaryActionNode && presentation.primaryAction) {
      primaryActionNode.textContent = String(presentation.primaryAction.label || '').trim();
      primaryActionNode.setAttribute('href', String(presentation.primaryAction.href || '#').trim() || '#');
    }
    if (railHeaderNode && presentation.railHeader) {
      railHeaderNode.textContent = String(presentation.railHeader || '').trim();
    }
    if (railCopyNode && presentation.railCopy) {
      railCopyNode.textContent = String(presentation.railCopy || '').trim();
    }
    applyRouteSectionPresentation(rawRoute, presentation);
  }

  function navigateOwnerHash(nextHash) {
    const hashValue = String(nextHash || '').trim();
    if (!hashValue) return;
    const normalizedHash = hashValue.startsWith('#') ? hashValue : `#${hashValue}`;
    const rawRoute = normalizedHash.replace(/^#/, '').trim().toLowerCase();
    const page = resolveOwnerPage(rawRoute);
    if (window.location.hash !== normalizedHash) {
      window.location.hash = normalizedHash;
      return;
    }
    renderCurrentPage();
    focusCurrentRoute(rawRoute, page);
  }

  async function loadQuotaSnapshots(rows) {
    const tenants = Array.isArray(rows) ? rows : [];
    const selected = tenants.slice(0, 12);
    const snapshots = await Promise.all(selected.map(async (row) => {
      const tenantId = String(row?.id || '').trim();
      if (!tenantId) return null;
      try {
        return await api(`/admin/api/platform/quota?tenantId=${encodeURIComponent(tenantId)}`, null);
      } catch {
        return null;
      }
    }));
    return snapshots.filter(Boolean);
  }

  async function refreshState(options = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    const requestId = Date.now();
    state.requestId = requestId;
    if (!options.silent) {
      setStatus(t('owner.app.status.loading', 'Loading owner data...'), 'info');
      renderMessageCard(
        t('owner.app.card.loadingTitle', 'Preparing owner data'),
        t('owner.app.card.loadingDetail', 'Loading tenants, runtime health, and current incidents for the owner workspace.'),
      );
    }
    try {
      const me = await api('/admin/api/me', null);
      if (me?.tenantId) {
        window.location.href = '/tenant';
        return;
      }
      const [
        overview,
        tenants,
        subscriptions,
        licenses,
        billingOverview,
        billingInvoices,
        billingPaymentAttempts,
        agents,
        notifications,
        securityEvents,
        runtimeSupervisor,
        requestLogs,
        deliveryLifecycle,
      ] = await Promise.all([
        api('/admin/api/platform/overview', OWNER_OVERVIEW_FALLBACK, {
          timeoutMs: 2500,
          allowTimeoutFallback: true,
        }),
        api('/admin/api/platform/tenants?limit=50', []),
        api('/admin/api/platform/subscriptions?limit=50', []),
        api('/admin/api/platform/licenses?limit=50', []),
        api('/admin/api/platform/billing/overview', null),
        api('/admin/api/platform/billing/invoices?limit=50', []),
        api('/admin/api/platform/billing/payment-attempts?limit=50', []),
        api('/admin/api/platform/agents?limit=50', []),
        api('/admin/api/notifications?acknowledged=false&limit=20', { items: [] }),
        api('/admin/api/auth/security-events?limit=20', []),
        api('/admin/api/runtime/supervisor', null),
        api('/admin/api/observability/requests?limit=20&onlyErrors=true', { metrics: {}, items: [] }),
        api('/admin/api/delivery/lifecycle?limit=80&pendingOverdueMs=1200000', {}),
      ]);

      state.payload = {
        me,
        overview,
        tenants,
        subscriptions,
        licenses,
        billingOverview,
        billingInvoices,
        billingPaymentAttempts,
        agents,
        notifications: Array.isArray(notifications?.items) ? notifications.items : [],
        securityEvents,
        runtimeSupervisor,
        requestLogs,
        deliveryLifecycle,
        tenantQuotaSnapshots: [],
      };
      renderCurrentPage();
      setStatus(t('owner.app.status.deepLoading', 'Loading tenant details...'), 'info');

      loadQuotaSnapshots(tenants)
        .then((tenantQuotaSnapshots) => {
          if (state.requestId !== requestId || !state.payload) return;
          state.payload = {
            ...state.payload,
            tenantQuotaSnapshots,
          };
          renderCurrentPage();
          setStatus(t('owner.app.status.ready', 'Ready'), 'success');
        })
        .catch(() => {
          if (state.requestId !== requestId) return;
          setStatus(t('owner.app.status.ready', 'Ready'), 'success');
        });
    } catch (error) {
      renderMessageCard(
        t('owner.app.card.loadFailedTitle', 'Could not load owner workspace'),
        String(error?.message || error),
      );
      setStatus(t('owner.app.status.loadFailed', 'Load failed'), 'danger');
    } finally {
      state.refreshing = false;
    }
  }

  function renderCurrentPage() {
    const target = root();
    if (!target) return;
    if (!state.payload) {
      renderMessageCard(
        t('owner.app.card.emptyTitle', 'No data yet'),
        t('owner.app.card.emptyDetail', 'Wait for the latest owner data to load.'),
      );
      return;
    }

    const rawRoute = getRawHashRoute();
    const page = resolveOwnerPage(rawRoute);
    const renderOptions = { currentRoute: rawRoute, currentPage: page };
    if (page === 'tenants') {
      window.OwnerTenantsV4.renderOwnerTenantsV4(target, state.payload, renderOptions);
    } else if (page === 'runtime') {
      window.OwnerRuntimeHealthV4.renderOwnerRuntimeHealthV4(target, state.payload, renderOptions);
    } else {
      window.OwnerDashboardV4.renderOwnerDashboardV4(target, state.payload, renderOptions);
    }
    applyI18n(target);
    applyOwnerRoutePresentation(rawRoute, page);
    focusCurrentRoute(rawRoute, page);
    const presentation = routePresentationFor(rawRoute, page);
    const titleFallback = presentation.title || ROUTE_TITLE_FALLBACKS[rawRoute] || ROUTE_TITLE_FALLBACKS[page] || 'Platform overview';
    document.title = `SCUM TH Platform | Owner | ${titleFallback}`;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('ownerV4RefreshBtn');
    refreshButton?.addEventListener('click', () => refreshState({ silent: false }));
    window.addEventListener('hashchange', renderCurrentPage);
    document.addEventListener('click', (event) => {
      const link = event.target instanceof Element
        ? event.target.closest('a[href^="#"]')
        : null;
      if (!link) return;
      const hash = String(link.getAttribute('href') || '').trim();
      if (!hash || hash === '#') return;
      navigateOwnerHash(hash);
      event.preventDefault();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshState({ silent: true });
    });
    state.timerId = window.setInterval(() => {
      if (!document.hidden) refreshState({ silent: true });
    }, 60000);
    window.addEventListener('ui-language-change', () => {
      renderCurrentPage();
      if (state.payload && !state.refreshing) {
        setStatus(t('owner.app.status.ready', 'Ready'), 'success');
      }
    });
    refreshState({ silent: false });
  });
})();
