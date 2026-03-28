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

  const PAGE_TITLE_KEYS = {
    home: 'player.app.page.home',
    commerce: 'player.app.page.commerce',
    stats: 'player.app.page.stats',
  };

  const state = {
    payload: null,
    refreshing: false,
  };

  function t(key, fallback, params) {
    return window.PortalUiI18n?.t?.(key, fallback, params) || fallback || key;
  }

  function applyI18n(rootNode = document) {
    window.PortalUiI18n?.apply?.(rootNode);
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
    const raw = getRawHashRoute();
    return PAGE_ALIASES[raw] || 'home';
  }

  function getRawHashRoute() {
    return String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  }

  function navigatePlayerHash(nextHash) {
    const hashValue = String(nextHash || '').trim();
    if (!hashValue || hashValue === '#') return;
    const normalizedHash = hashValue.startsWith('#') ? hashValue : `#${hashValue}`;
    if (window.location.hash !== normalizedHash) {
      window.location.hash = normalizedHash;
      return;
    }
    const surfaceState = renderCurrentPage();
    if (surfaceState?.notice) {
      setStatus(surfaceState.notice.detail, surfaceState.notice.tone || 'warning');
    } else if (state.payload && !state.refreshing) {
      setStatus(t('player.app.status.ready', 'Ready'), 'success');
    }
  }

  function isSectionEnabled(featureAccess, key) {
    return Boolean(featureAccess?.sections?.[key]?.enabled);
  }

  function buildPlayerSurfaceState(featureAccess, requestedPage) {
    const pages = featureAccess?.pages || {};
    const pageAccess = {
      home: {
        enabled: true,
        locked: false,
      },
      commerce: {
        enabled: Boolean(pages.commerce?.enabled),
        locked: !pages.commerce?.enabled,
      },
      stats: {
        enabled: Boolean(pages.stats?.enabled),
        locked: !pages.stats?.enabled,
      },
    };

    const resolvedPage = pageAccess[requestedPage]?.enabled ? requestedPage : 'home';
    const navGroups = [
      {
        label: t('player.nav.group.start', 'Overview'),
        items: [
          {
            label: t('player.nav.home', 'Overview'),
            href: '#home',
            current: resolvedPage === 'home',
          },
        ],
      },
      {
        label: t('player.nav.group.commerce', 'Store and wallet'),
        items: [
          {
            label: pageAccess.commerce.locked
              ? t('player.nav.commerceLocked', 'Store, Wallet & Orders (Locked)')
              : t('player.nav.commerce', 'Store, Wallet & Orders'),
            href: '#shop',
            current: resolvedPage === 'commerce',
          },
        ],
      },
      {
        label: t('player.nav.group.community', 'Community and stats'),
        items: [
          {
            label: pageAccess.stats.locked
              ? t('player.nav.statsLocked', 'Stats, Events & Support (Locked)')
              : t('player.nav.stats', 'Stats, Events & Support'),
            href: '#stats',
            current: resolvedPage === 'stats',
          },
        ],
      },
    ];
    const notice = resolvedPage !== requestedPage
      ? {
          tone: 'warning',
          title: t('player.notice.lockedTitle', 'This server has not opened this area yet'),
          detail: t(
            'player.notice.lockedDetail',
            'This area is not included in the current server package yet, so the portal returned you to a page that is available now.',
          ),
        }
      : null;

    return {
      resolvedPage,
      pageAccess,
      navGroups,
      notice,
    };
  }

  async function refreshState(options = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    if (!options.silent) {
      setStatus(t('player.app.status.loading', 'Loading player data...'), 'info');
      renderMessageCard(
        t('player.app.card.loadingTitle', 'Preparing player data'),
        t('player.app.card.loadingDetail', 'Loading account, store, orders, and community updates.'),
      );
    }
    try {
      const [
        me,
        featureAccess,
        dashboard,
        serverInfo,
        profile,
        steamLink,
        linkHistory,
        notifications,
        party,
      ] = await Promise.all([
        api('/player/api/me', {}),
        api('/player/api/feature-access', {
          enabledFeatureKeys: [],
          sections: {},
          pages: {},
        }),
        api('/player/api/dashboard', {}),
        api('/player/api/server/info', {}),
        api('/player/api/profile', {}),
        api('/player/api/linksteam/me', {}),
        api('/player/api/linksteam/history', { items: [] }),
        api('/player/api/notifications?limit=10', []),
        api('/player/api/party', {}),
      ]);

      const [
        walletLedger,
        shopItems,
        cart,
        orders,
        redeemHistory,
        stats,
        leaderboard,
        missions,
        bounties,
        wheelState,
      ] = await Promise.all([
        isSectionEnabled(featureAccess, 'wallet')
          ? api('/player/api/wallet/ledger?limit=20', { wallet: {}, items: [] })
          : Promise.resolve({ wallet: {}, items: [], locked: true }),
        isSectionEnabled(featureAccess, 'shop')
          ? api('/player/api/shop/list?limit=80', [])
          : Promise.resolve({ items: [], locked: true }),
        isSectionEnabled(featureAccess, 'shop')
          ? api('/player/api/cart', {})
          : Promise.resolve({ rows: [], missingItemIds: [], totalUnits: 0, totalPrice: 0, locked: true }),
        isSectionEnabled(featureAccess, 'orders')
          ? api('/player/api/purchase/list?limit=25&includeHistory=1', [])
          : Promise.resolve({ items: [], locked: true }),
        isSectionEnabled(featureAccess, 'orders')
          ? api('/player/api/redeem/history?limit=20', [])
          : Promise.resolve({ items: [], locked: true }),
        isSectionEnabled(featureAccess, 'ranking')
          ? api('/player/api/stats/me', {})
          : Promise.resolve({ locked: true }),
        isSectionEnabled(featureAccess, 'ranking')
          ? api('/player/api/leaderboard?type=kills&limit=20', {})
          : Promise.resolve({ items: [], locked: true }),
        isSectionEnabled(featureAccess, 'events')
          ? api('/player/api/missions', {})
          : Promise.resolve({ missions: [], locked: true }),
        isSectionEnabled(featureAccess, 'events')
          ? api('/player/api/bounty/list?limit=10', { items: [] })
          : Promise.resolve({ items: [], locked: true }),
        isSectionEnabled(featureAccess, 'events')
          ? api('/player/api/wheel/state?limit=10', {})
          : Promise.resolve({ enabled: false, history: [], locked: true }),
      ]);

      state.payload = {
        me,
        featureAccess,
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
      const surfaceState = renderCurrentPage();
      if (surfaceState?.notice) {
        setStatus(surfaceState.notice.detail, surfaceState.notice.tone || 'warning');
      } else {
        setStatus(t('player.app.status.ready', 'Ready'), 'success');
      }
    } catch (error) {
      renderMessageCard(
        t('player.app.card.loadFailedTitle', 'Could not load player portal'),
        String(error?.message || error),
      );
      setStatus(t('player.app.status.loadFailed', 'Load failed'), 'danger');
    } finally {
      state.refreshing = false;
    }
  }

  function renderCurrentPage() {
    const target = root();
    if (!target) return null;
    if (!state.payload) {
      renderMessageCard(
        t('player.app.card.emptyTitle', 'No player data yet'),
        t('player.app.card.emptyDetail', 'Wait for the latest player data to load.'),
      );
      return null;
    }

    const requestedPage = currentPage();
    const surfaceState = buildPlayerSurfaceState(state.payload.featureAccess, requestedPage);
    const renderState = {
      ...state.payload,
      __surfaceShell: {
        navGroups: surfaceState.navGroups,
      },
      __surfaceNotice: surfaceState.notice,
    };
    const page = surfaceState.resolvedPage;
    if (page === 'commerce') {
      window.PlayerCommerceV4.renderPlayerCommerceV4(target, renderState);
    } else if (page === 'stats') {
      window.PlayerStatsEventsSupportV4.renderPlayerStatsEventsSupportV4(target, renderState);
    } else {
      window.PlayerHomeV4.renderPlayerHomeV4(target, renderState);
    }
    applyI18n(target);
    document.title = `SCUM TH Platform | Player | ${t(PAGE_TITLE_KEYS[page] || 'player.app.page.home', 'Home')}`;
    return surfaceState;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('playerV4RefreshBtn');
    refreshButton?.addEventListener('click', () => refreshState({ silent: false }));
    document.addEventListener('click', (event) => {
      const link = event.target instanceof Element
        ? event.target.closest('a[href^="#"]')
        : null;
      if (!link) return;
      const hash = String(link.getAttribute('href') || '').trim();
      if (!hash || hash === '#') return;
      navigatePlayerHash(hash);
      event.preventDefault();
    });
    window.addEventListener('hashchange', () => {
      const surfaceState = renderCurrentPage();
      if (surfaceState?.notice) {
        setStatus(surfaceState.notice.detail, surfaceState.notice.tone || 'warning');
      } else if (state.payload && !state.refreshing) {
        setStatus(t('player.app.status.ready', 'Ready'), 'success');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshState({ silent: true });
    });
    window.addEventListener('ui-language-change', () => {
      const surfaceState = renderCurrentPage();
      if (surfaceState?.notice) {
        setStatus(surfaceState.notice.detail, surfaceState.notice.tone || 'warning');
      } else if (state.payload && !state.refreshing) {
        setStatus(t('player.app.status.ready', 'Ready'), 'success');
      }
    });
    window.setInterval(() => {
      if (!document.hidden) refreshState({ silent: true });
    }, 60000);
    refreshState({ silent: false });
  });
})();
