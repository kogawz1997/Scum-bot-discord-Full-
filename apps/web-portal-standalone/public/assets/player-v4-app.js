(function () {
  'use strict';

  const PAGE_ALIASES = {
    '': 'home',
    home: 'home',
    player: 'home',
    shop: 'commerce',
    wallet: 'commerce',
    orders: 'commerce',
    delivery: 'commerce',
    commerce: 'commerce',
    stats: 'stats',
    leaderboards: 'stats',
    activity: 'stats',
    events: 'stats',
    support: 'stats',
    profile: 'stats',
  };

  const PAGE_TITLES = {
    home: 'หน้าหลัก',
    commerce: 'ร้านค้า กระเป๋าเงิน และคำสั่งซื้อ',
    stats: 'สถิติ กิจกรรม และซัพพอร์ต',
  };

  const state = {
    payload: null,
    refreshing: false,
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
    return document.getElementById('playerV4AppRoot');
  }

  function statusNode() {
    return document.getElementById('playerV4Status');
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
        window.location.href = '/player/login';
        return fallback;
      }
      throw new Error(String(payload?.error || `Request failed (${response.status})`));
    }
    return payload?.data ?? fallback;
  }

  function currentPage() {
    const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
    return PAGE_ALIASES[raw] || 'home';
  }

  async function refreshState(options = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    if (!options.silent) {
      setStatus('กำลังโหลดข้อมูลพอร์ทัลผู้เล่น...', 'info');
      renderMessageCard('กำลังเตรียมข้อมูลผู้เล่น', 'กำลังดึงร้านค้า กระเป๋าเงิน คำสั่งซื้อ สถิติ และข้อมูลชุมชนล่าสุด');
    }
    try {
      const [
        me,
        dashboard,
        serverInfo,
        walletLedger,
        shopItems,
        cart,
        orders,
        redeemHistory,
        profile,
        steamLink,
        linkHistory,
        notifications,
        stats,
        leaderboard,
        missions,
        bounties,
        wheelState,
        party,
      ] = await Promise.all([
        api('/player/api/me', {}),
        api('/player/api/dashboard', {}),
        api('/player/api/server/info', {}),
        api('/player/api/wallet/ledger?limit=20', { wallet: {}, items: [] }),
        api('/player/api/shop/list?limit=80', []),
        api('/player/api/cart', {}),
        api('/player/api/purchase/list?limit=25&includeHistory=1', []),
        api('/player/api/redeem/history?limit=20', []),
        api('/player/api/profile', {}),
        api('/player/api/linksteam/me', {}),
        api('/player/api/linksteam/history', { items: [] }),
        api('/player/api/notifications?limit=10', []),
        api('/player/api/stats/me', {}),
        api('/player/api/leaderboard?type=kills&limit=20', {}),
        api('/player/api/missions', {}),
        api('/player/api/bounty/list?limit=10', { items: [] }),
        api('/player/api/wheel/state?limit=10', {}),
        api('/player/api/party', {}),
      ]);

      state.payload = {
        me,
        dashboard,
        serverInfo,
        walletLedger,
        shopItems: Array.isArray(shopItems?.items) ? shopItems.items : (Array.isArray(shopItems) ? shopItems : []),
        cart,
        orders: Array.isArray(orders?.items) ? orders.items : (Array.isArray(orders) ? orders : []),
        redeemHistory: Array.isArray(redeemHistory?.items) ? redeemHistory.items : (Array.isArray(redeemHistory) ? redeemHistory : []),
        profile,
        steamLink,
        linkHistory,
        notifications: Array.isArray(notifications?.items) ? notifications.items : (Array.isArray(notifications) ? notifications : []),
        stats,
        leaderboard,
        missions,
        bounties,
        wheelState,
        party,
        lastRefreshedAt: new Date().toISOString(),
      };
      renderCurrentPage();
      setStatus('พร้อมใช้งาน', 'success');
    } catch (error) {
      renderMessageCard('โหลดพอร์ทัลผู้เล่นไม่สำเร็จ', String(error?.message || error));
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
    if (page === 'commerce') {
      window.PlayerCommerceV4.renderPlayerCommerceV4(target, state.payload);
    } else if (page === 'stats') {
      window.PlayerStatsEventsSupportV4.renderPlayerStatsEventsSupportV4(target, state.payload);
    } else {
      window.PlayerHomeV4.renderPlayerHomeV4(target, state.payload);
    }
    document.title = `SCUM TH Platform | Player | ${PAGE_TITLES[page] || 'หน้าหลัก'}`;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('playerV4RefreshBtn');
    refreshButton?.addEventListener('click', () => refreshState({ silent: false }));
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
