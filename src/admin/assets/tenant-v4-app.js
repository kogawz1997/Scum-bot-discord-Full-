(function () {
  'use strict';

  const PAGE_ALIASES = {
    '': 'dashboard',
    overview: 'dashboard',
    dashboard: 'dashboard',
    status: 'server-status',
    'server-status': 'server-status',
    config: 'server-config',
    'server-config': 'server-config',
    orders: 'orders',
    commerce: 'orders',
    transactions: 'orders',
    delivery: 'orders',
    players: 'players',
    'support-tools': 'players',
    'delivery-agents': 'delivery-agents',
    'server-bots': 'server-bots',
    actions: 'restart-control',
    'restart-control': 'restart-control',
  };

  const PAGE_TITLES = {
    dashboard: 'แดชบอร์ด',
    'server-status': 'สถานะเซิร์ฟเวอร์',
    'server-config': 'ตั้งค่าเซิร์ฟเวอร์',
    orders: 'คำสั่งซื้อและการส่งของ',
    players: 'ผู้เล่น',
    'delivery-agents': 'Delivery Agents',
    'server-bots': 'Server Bots',
    'restart-control': 'ควบคุมการรีสตาร์ต',
  };

  const state = {
    payload: null,
    refreshing: false,
    ownerTenantOptions: [],
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function root() {
    return document.getElementById('tenantV4AppRoot');
  }

  function statusNode() {
    return document.getElementById('tenantV4Status');
  }

  function selectorNode() {
    return document.getElementById('tenantOwnerScopeSelect');
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

  async function api(path, fallback) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      if (response.status === 401) {
        window.location.href = '/tenant/login';
        return fallback;
      }
      throw new Error(String(payload?.error || `Request failed (${response.status})`));
    }
    return payload?.data ?? fallback;
  }

  function currentPage() {
    const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
    return PAGE_ALIASES[raw] || 'dashboard';
  }

  function readTenantIdFromUrl() {
    const url = new URL(window.location.href);
    return String(url.searchParams.get('tenantId') || '').trim();
  }

  function readUserIdFromUrl() {
    const url = new URL(window.location.href);
    return String(url.searchParams.get('userId') || '').trim();
  }

  function readPurchaseCodeFromUrl() {
    const url = new URL(window.location.href);
    return String(url.searchParams.get('code') || '').trim();
  }

  function writeTenantIdToUrl(tenantId) {
    const url = new URL(window.location.href);
    if (tenantId) {
      url.searchParams.set('tenantId', tenantId);
    } else {
      url.searchParams.delete('tenantId');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function pickFirstPlayerId(players) {
    const rows = Array.isArray(players) ? players : [];
    const selected = rows.find((row) => String(row?.discordId || row?.userId || '').trim());
    return String(selected?.discordId || selected?.userId || '').trim();
  }

  function pickFirstPurchaseCode(purchases) {
    const rows = Array.isArray(purchases) ? purchases : [];
    const selected = rows.find((row) => String(row?.purchaseCode || row?.code || '').trim());
    return String(selected?.purchaseCode || selected?.code || '').trim();
  }

  function renderOwnerTenantSelector(me) {
    const select = selectorNode();
    const wrap = document.getElementById('tenantOwnerScopeWrap');
    if (!select || !wrap) return;
    const isOwner = String(me?.role || '').trim().toLowerCase() === 'owner';
    wrap.hidden = !isOwner;
    if (!isOwner) return;
    select.innerHTML = state.ownerTenantOptions
      .map((row) => `<option value="${escapeHtml(String(row?.id || '').trim())}">${escapeHtml(String(row?.name || row?.slug || row?.id || '').trim())}</option>`)
      .join('');
    const currentTenantId = String(state.payload?.tenantId || '').trim();
    if (currentTenantId) {
      select.value = currentTenantId;
    }
  }

  async function refreshState(options = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    if (!options.silent) {
      setStatus('กำลังโหลดข้อมูลผู้เช่า...', 'info');
      renderMessageCard('กำลังเตรียมข้อมูลผู้เช่า', 'กำลังดึงสถานะเซิร์ฟเวอร์ บอต คำสั่งซื้อ ผู้เล่น และการตั้งค่าที่เกี่ยวข้อง');
    }
    try {
      const me = await api('/admin/api/me', null);
      let scopedTenantId = String(me?.tenantId || '').trim();
      state.ownerTenantOptions = [];

      if (String(me?.role || '').trim().toLowerCase() === 'owner') {
        const tenants = await api('/admin/api/platform/tenants?limit=100', []);
        state.ownerTenantOptions = Array.isArray(tenants) ? tenants : [];
        scopedTenantId = readTenantIdFromUrl() || String(state.ownerTenantOptions[0]?.id || '').trim();
        writeTenantIdToUrl(scopedTenantId);
      }

      if (!scopedTenantId) {
        throw new Error('ยังไม่พบ tenant scope สำหรับหน้าแอดมินผู้เช่า');
      }

      const [
        overview,
        reconcile,
        quota,
        tenantConfig,
        subscriptions,
        licenses,
        apiKeys,
        webhooks,
        agents,
        dashboardCards,
        shopItems,
        queueItems,
        deadLetters,
        deliveryLifecycle,
        players,
        notifications,
        deliveryRuntime,
        purchaseStatuses,
        audit,
      ] = await Promise.all([
        api(`/admin/api/platform/overview?tenantId=${encodeURIComponent(scopedTenantId)}`, {}),
        api(`/admin/api/platform/reconcile?tenantId=${encodeURIComponent(scopedTenantId)}&windowMs=3600000&pendingOverdueMs=1200000`, {}),
        api(`/admin/api/platform/quota?tenantId=${encodeURIComponent(scopedTenantId)}`, {}),
        api(`/admin/api/platform/tenant-config?tenantId=${encodeURIComponent(scopedTenantId)}`, {}),
        api(`/admin/api/platform/subscriptions?tenantId=${encodeURIComponent(scopedTenantId)}&limit=6`, []),
        api(`/admin/api/platform/licenses?tenantId=${encodeURIComponent(scopedTenantId)}&limit=6`, []),
        api(`/admin/api/platform/apikeys?tenantId=${encodeURIComponent(scopedTenantId)}&limit=12`, []),
        api(`/admin/api/platform/webhooks?tenantId=${encodeURIComponent(scopedTenantId)}&limit=12`, []),
        api(`/admin/api/platform/agents?tenantId=${encodeURIComponent(scopedTenantId)}&limit=20`, []),
        api(`/admin/api/dashboard/cards?tenantId=${encodeURIComponent(scopedTenantId)}`, null),
        api(`/admin/api/shop/list?tenantId=${encodeURIComponent(scopedTenantId)}&limit=24`, { items: [] }),
        api(`/admin/api/delivery/queue?tenantId=${encodeURIComponent(scopedTenantId)}&limit=20`, { items: [] }),
        api(`/admin/api/delivery/dead-letter?tenantId=${encodeURIComponent(scopedTenantId)}&limit=20`, { items: [] }),
        api(`/admin/api/delivery/lifecycle?tenantId=${encodeURIComponent(scopedTenantId)}&limit=80&pendingOverdueMs=1200000`, {}),
        api(`/admin/api/player/accounts?tenantId=${encodeURIComponent(scopedTenantId)}&limit=20`, { items: [] }),
        api('/admin/api/notifications?acknowledged=false&limit=10', { items: [] }),
        api('/admin/api/delivery/runtime', {}),
        api('/admin/api/purchase/statuses', { knownStatuses: [], allowedTransitions: [] }),
        api(`/admin/api/audit/query?tenantId=${encodeURIComponent(scopedTenantId)}&limit=20`, { items: [] }),
      ]);

      const playerRows = Array.isArray(players?.items) ? players.items : [];
      const selectedUserId = readUserIdFromUrl() || pickFirstPlayerId(playerRows);
      const purchaseLookup = selectedUserId
        ? await api(`/admin/api/purchase/list?tenantId=${encodeURIComponent(scopedTenantId)}&userId=${encodeURIComponent(selectedUserId)}&limit=20`, { items: [], userId: selectedUserId, status: '' })
        : { items: [], userId: '', status: '' };
      const selectedCode = readPurchaseCodeFromUrl() || pickFirstPurchaseCode(purchaseLookup?.items);
      const deliveryCase = selectedCode
        ? await api(`/admin/api/delivery/detail?tenantId=${encodeURIComponent(scopedTenantId)}&code=${encodeURIComponent(selectedCode)}&limit=80`, null)
        : null;

      state.payload = {
        me,
        tenantId: scopedTenantId,
        overview,
        reconcile,
        quota,
        tenantConfig,
        subscriptions,
        licenses,
        apiKeys,
        webhooks,
        agents,
        dashboardCards,
        shopItems: Array.isArray(shopItems?.items) ? shopItems.items : [],
        queueItems: Array.isArray(queueItems?.items) ? queueItems.items : [],
        deadLetters: Array.isArray(deadLetters?.items) ? deadLetters.items : [],
        deliveryLifecycle,
        players: playerRows,
        notifications: Array.isArray(notifications?.items) ? notifications.items : [],
        deliveryRuntime,
        purchaseStatuses,
        audit,
        purchaseLookup,
        deliveryCase,
      };

      renderOwnerTenantSelector(me);
      renderCurrentPage();
      setStatus('พร้อมใช้งาน', 'success');
    } catch (error) {
      renderMessageCard('โหลดหน้าแอดมินผู้เช่าไม่สำเร็จ', String(error?.message || error));
      setStatus('โหลดข้อมูลไม่สำเร็จ', 'danger');
    } finally {
      state.refreshing = false;
    }
  }

  function renderCurrentPage() {
    const target = root();
    if (!target) return;
    if (!state.payload) {
      renderMessageCard('ยังไม่มีข้อมูล', 'รอให้ระบบดึงข้อมูลล่าสุดก่อน');
      return;
    }

    const page = currentPage();
    const renderers = {
      dashboard: () => window.TenantDashboardV4.renderTenantDashboardV4(target, state.payload),
      'server-status': () => window.TenantServerStatusV4.renderTenantServerStatusV4(target, state.payload),
      'server-config': () => window.TenantServerConfigV4.renderTenantServerConfigV4(target, state.payload),
      orders: () => window.TenantOrdersV4.renderTenantOrdersV4(target, state.payload),
      players: () => window.TenantPlayersV4.renderTenantPlayersV4(target, state.payload),
      'delivery-agents': () => window.TenantDeliveryAgentsV4.renderTenantDeliveryAgentsV4(target, state.payload),
      'server-bots': () => window.TenantServerBotsV4.renderTenantServerBotsV4(target, state.payload),
      'restart-control': () => window.TenantRestartControlV4.renderTenantRestartControlV4(target, state.payload),
    };
    (renderers[page] || renderers.dashboard)();
    document.title = `SCUM TH Platform | Tenant | ${PAGE_TITLES[page] || 'แดชบอร์ด'}`;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('tenantV4RefreshBtn');
    const scopeSelect = selectorNode();
    refreshButton?.addEventListener('click', () => refreshState({ silent: false }));
    scopeSelect?.addEventListener('change', () => {
      writeTenantIdToUrl(String(scopeSelect.value || '').trim());
      refreshState({ silent: false });
    });
    window.addEventListener('hashchange', renderCurrentPage);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshState({ silent: true });
    });
    window.setInterval(() => {
      if (!document.hidden) refreshState({ silent: true });
    }, 60000);
    refreshState({ silent: false });
  });
})();
