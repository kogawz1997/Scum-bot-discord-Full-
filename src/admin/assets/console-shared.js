(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getI18n() {
    return window.AdminUiI18n || null;
  }

  function t(key, fallback, params) {
    return getI18n()?.t?.(key, fallback, params) ?? fallback ?? key;
  }

  async function api(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const response = await fetch(path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
    });
    if (response.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }
    const text = await response.text();
    let parsed = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { ok: response.ok, error: text || response.statusText };
    }
    if (!response.ok || parsed.ok === false) {
      throw new Error(parsed.error || response.statusText || 'Request failed');
    }
    return parsed.data;
  }

  function formatNumber(value, fallback = '-') {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString(getI18n()?.getLocale?.() || 'en-US') : fallback;
  }

  function formatDateTime(value, fallback = '-') {
    const text = String(value || '').trim();
    if (!text) return fallback;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return text;
    return parsed.toLocaleString(getI18n()?.getLocale?.() || 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function formatStatusTone(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return 'neutral';
    if (['active', 'ready', 'ok', 'healthy', 'delivered', 'success', 'connected', 'owner', 'enabled'].includes(text)) {
      return 'success';
    }
    if (['warn', 'warning', 'trialing', 'degraded', 'pending', 'delivering', 'stale', 'queued', 'review'].includes(text)) {
      return 'warning';
    }
    if (['error', 'failed', 'offline', 'inactive', 'suspended', 'delivery_failed', 'danger'].includes(text)) {
      return 'danger';
    }
    return 'info';
  }

  function makePill(label, tone) {
    const resolvedTone = tone || formatStatusTone(label);
    return `<span class="pill pill-${escapeHtml(resolvedTone)}">${escapeHtml(label || '-')}</span>`;
  }

  function renderStats(container, cards) {
    if (!container) return;
    const rows = Array.isArray(cards) ? cards.filter(Boolean) : [];
    container.innerHTML = rows.length
      ? rows.map((card) => [
          '<article class="stat-card">',
          `<span class="stat-kicker">${escapeHtml(card.kicker || '')}</span>`,
          `<strong class="stat-value">${escapeHtml(card.value || '-')}</strong>`,
          `<h3 class="stat-title">${escapeHtml(card.title || '')}</h3>`,
          card.detail ? `<p class="stat-detail">${escapeHtml(card.detail)}</p>` : '',
          Array.isArray(card.tags) && card.tags.length
            ? `<div class="tag-row">${card.tags.map((tag) => makePill(tag)).join('')}</div>`
            : '',
          '</article>',
        ].join('')).join('')
      : `<div class="empty-state">${escapeHtml(t('shared.emptySummary', 'No summary available.'))}</div>`;
  }

  function renderTable(container, options = {}) {
    if (!container) return;
    const columns = Array.isArray(options.columns) ? options.columns : [];
    const rows = Array.isArray(options.rows) ? options.rows : [];
    if (!columns.length || !rows.length) {
      container.innerHTML = `<div class="empty-state">${escapeHtml(options.emptyText || t('shared.emptyData', 'No data found.'))}</div>`;
      return;
    }
    const shellClass = ['table-shell', options.shellClass || ''].filter(Boolean).join(' ');
    const tableClass = String(options.tableClass || '').trim();
    container.innerHTML = [
      `<div class="${escapeHtml(shellClass)}"><table${tableClass ? ` class="${escapeHtml(tableClass)}"` : ''}>`,
      '<thead><tr>',
      columns.map((column) => {
        const headerClass = String(column.headerClass || '').trim();
        return `<th${headerClass ? ` class="${escapeHtml(headerClass)}"` : ''}>${escapeHtml(column.label || '')}</th>`;
      }).join(''),
      '</tr></thead>',
      '<tbody>',
      rows.map((row) => [
        '<tr>',
        columns.map((column) => {
          const raw = typeof column.render === 'function' ? column.render(row) : row?.[column.key];
          const cellClass = String(column.cellClass || '').trim();
          return `<td${cellClass ? ` class="${escapeHtml(cellClass)}"` : ''}>${raw == null ? '' : raw}</td>`;
        }).join(''),
        '</tr>',
      ].join('')).join(''),
      '</tbody></table></div>',
    ].join('');
  }

  function renderList(container, items, renderer, emptyText) {
    if (!container) return;
    const rows = Array.isArray(items) ? items : [];
    container.innerHTML = rows.length
      ? rows.map((item) => renderer(item)).join('')
      : `<div class="empty-state">${escapeHtml(emptyText || t('shared.emptyEntries', 'No entries yet.'))}</div>`;
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = String(text || '');
    }
  }

  function setBusy(button, busy, pendingLabel) {
    if (!button) return;
    if (!button.dataset.idleLabel) {
      button.dataset.idleLabel = button.textContent || '';
    }
    button.disabled = Boolean(busy);
    button.textContent = busy ? String(pendingLabel || t('shared.working', 'Working...')) : button.dataset.idleLabel;
  }

  function ensureToastStack() {
    let stack = document.getElementById('consoleToastStack');
    if (stack) return stack;
    stack = document.createElement('div');
    stack.id = 'consoleToastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
    return stack;
  }

  function showToast(message, tone = 'info') {
    const stack = ensureToastStack();
    const toast = document.createElement('article');
    toast.className = `toast toast-${tone}`;
    toast.innerHTML = `<strong>${escapeHtml(String(message || 'Done'))}</strong>`;
    stack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('toast-exit');
      window.setTimeout(() => {
        toast.remove();
      }, 240);
    }, 2800);
  }

  function wireCommandPalette(options = {}) {
    const {
      openButtonId,
      panelId,
      searchId,
      listId,
      emptyId,
      closeButtonId,
      getActions,
    } = options;
    const panel = document.getElementById(panelId);
    const searchInput = document.getElementById(searchId);
    const list = document.getElementById(listId);
    const empty = document.getElementById(emptyId);
    const openButton = openButtonId ? document.getElementById(openButtonId) : null;
    const closeButton = closeButtonId ? document.getElementById(closeButtonId) : null;
    if (!panel || !searchInput || !list || typeof getActions !== 'function') {
      return {
        open() {},
        close() {},
        refresh() {},
      };
    }

    let actions = [];
    let activeIndex = 0;

    function render() {
      const query = String(searchInput.value || '').trim().toLowerCase();
      const filtered = actions.filter((item) => {
        if (!query) return true;
        return `${item.label || ''} ${item.meta || ''}`.toLowerCase().includes(query);
      });
      activeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
      list.innerHTML = filtered.map((item, index) => [
        `<button type="button" class="palette-item${index === activeIndex ? ' active' : ''}" data-index="${index}">`,
        `<span class="palette-title">${escapeHtml(item.label || 'Action')}</span>`,
        item.meta ? `<span class="palette-meta">${escapeHtml(item.meta)}</span>` : '',
        '</button>',
      ].join('')).join('');
      empty.hidden = filtered.length > 0;
      Array.from(list.querySelectorAll('.palette-item')).forEach((button) => {
        button.addEventListener('click', () => {
          const index = Number(button.dataset.index || 0);
          filtered[index]?.run?.();
          close();
        });
      });
      return filtered;
    }

    function refresh() {
      actions = getActions().filter(Boolean);
      return render();
    }

    function open() {
      refresh();
      panel.hidden = false;
      panel.removeAttribute('hidden');
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('palette-open');
      window.setTimeout(() => {
        searchInput.focus();
        searchInput.select();
      }, 0);
    }

    function close() {
      panel.hidden = true;
      panel.setAttribute('hidden', 'hidden');
      panel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('palette-open');
      searchInput.value = '';
    }

    searchInput.addEventListener('input', () => {
      activeIndex = 0;
      render();
    });

    searchInput.addEventListener('keydown', (event) => {
      const filtered = render();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex = Math.min(activeIndex + 1, Math.max(filtered.length - 1, 0));
        render();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        filtered[activeIndex]?.run?.();
        close();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });

    panel.addEventListener('click', (event) => {
      if (event.target === panel) {
        close();
      }
    });

    if (openButton) openButton.addEventListener('click', open);
    if (closeButton) {
      closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      });
      closeButton.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      });
    }

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (panel.hidden) {
          open();
        } else {
          close();
        }
        return;
      }
      if (!typing && event.key === '/') {
        event.preventDefault();
        open();
        return;
      }
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        close();
      }
    });

    refresh();
    return { open, close, refresh };
  }

  // Each console is now page-mode rather than one long dashboard.
  // This controller owns which owner/tenant page is visible and keeps the
  // sidebar, summary block, and current-page state in sync.
  function wireWorkspaceSwitcher(options = {}) {
    const {
      switchId,
      summaryId,
      hintId,
      navListId,
      defaultWorkspace,
      workspaces = [],
      sectionsByWorkspace = {},
    } = options;
    const switchRoot = switchId ? document.getElementById(switchId) : null;
    const summaryRoot = summaryId ? document.getElementById(summaryId) : null;
    const hintRoot = hintId ? document.getElementById(hintId) : null;
    const navList = navListId ? document.getElementById(navListId) : null;
    const sectionWorkspace = new Map();
    Object.entries(sectionsByWorkspace).forEach(([workspaceKey, sectionIds]) => {
      (Array.isArray(sectionIds) ? sectionIds : []).forEach((sectionId) => {
        sectionWorkspace.set(sectionId, workspaceKey);
      });
    });
    const workspaceList = Array.isArray(workspaces) ? workspaces.filter((item) => item?.key) : [];
    let currentWorkspace = workspaceList.some((item) => item.key === defaultWorkspace)
      ? defaultWorkspace
      : (workspaceList[0]?.key || '');
    let currentSectionId = ((sectionsByWorkspace[currentWorkspace] || []).find((sectionId) => document.getElementById(sectionId)) || '');

    function getSectionLabel(sectionId) {
      if (!navList || !sectionId) return sectionId;
      const link = navList.querySelector(`a[href="#${sectionId}"]`);
      return String(link?.textContent || '').trim() || sectionId;
    }

    function renderSummary() {
      const active = workspaceList.find((item) => item.key === currentWorkspace);
      if (hintRoot) {
        hintRoot.textContent = String(
          active?.sidebarHint
          || active?.description
          || active?.summary
          || ''
        );
      }
      if (!summaryRoot || !active) return;
      const sectionCount = (sectionsByWorkspace[active.key] || []).length;
      const tags = [
        currentSectionId ? `<span class="pill pill-success">${escapeHtml(getSectionLabel(currentSectionId))}</span>` : '',
        active.tag ? `<span class="pill pill-info">${escapeHtml(active.tag)}</span>` : '',
        sectionCount ? `<span class="pill pill-neutral">${escapeHtml(`${sectionCount} sections`)}</span>` : '',
      ].filter(Boolean).join('');
      summaryRoot.innerHTML = [
        `<div class="workspace-summary-copy">`,
        `<span class="section-kicker">${escapeHtml(active.label || active.title || 'Workspace')}</span>`,
        `<strong>${escapeHtml(active.title || active.label || active.key)}</strong>`,
        currentSectionId ? `<p class="muted">${escapeHtml(t('shared.currentPage', 'Current page: {page}', { page: getSectionLabel(currentSectionId) }))}</p>` : '',
        active.description ? `<p class="muted">${escapeHtml(active.description)}</p>` : '',
        `</div>`,
        tags ? `<div class="tag-row">${tags}</div>` : '',
      ].join('');
    }

    function renderSwitch() {
      if (!switchRoot) return;
      switchRoot.innerHTML = workspaceList.map((workspace) => [
        `<button type="button" class="workspace-tab${workspace.key === currentWorkspace ? ' active' : ''}" data-workspace="${escapeHtml(workspace.key)}" aria-pressed="${workspace.key === currentWorkspace ? 'true' : 'false'}">`,
        `<span class="workspace-tab-label">${escapeHtml(workspace.label || workspace.title || workspace.key)}</span>`,
        workspace.short ? `<span class="workspace-tab-meta">${escapeHtml(workspace.short)}</span>` : '',
        '</button>',
      ].join('')).join('');
      Array.from(switchRoot.querySelectorAll('[data-workspace]')).forEach((button) => {
        button.addEventListener('click', () => {
          setWorkspace(button.dataset.workspace, { focus: true });
        });
      });
    }

    function applyWorkspace() {
      document.body.dataset.currentWorkspace = currentWorkspace || '';
      document.body.dataset.currentSection = currentSectionId || '';
      sectionWorkspace.forEach((workspaceKey, sectionId) => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        const isActive = !(Boolean(currentWorkspace) && (workspaceKey !== currentWorkspace || sectionId !== currentSectionId));
        section.hidden = !isActive;
        section.classList.toggle('surface-section-active', isActive);
      });
      if (navList) {
        Array.from(navList.querySelectorAll('a[href^="#"]')).forEach((link) => {
          const sectionId = String(link.getAttribute('href') || '').replace(/^#/, '');
          const workspaceKey = sectionWorkspace.get(sectionId);
          link.dataset.workspace = workspaceKey || '';
          link.hidden = Boolean(workspaceKey) && workspaceKey !== currentWorkspace;
          const isActive = sectionId === currentSectionId;
          link.classList.toggle('nav-link-active', isActive);
          if (isActive) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }
      renderSummary();
      renderSwitch();
    }

    function setWorkspace(workspaceKey, options = {}) {
      if (!workspaceList.some((item) => item.key === workspaceKey)) {
        return;
      }
      currentWorkspace = workspaceKey;
      if (!currentSectionId || sectionWorkspace.get(currentSectionId) !== workspaceKey) {
        currentSectionId = (sectionsByWorkspace[currentWorkspace] || []).find((sectionId) => document.getElementById(sectionId)) || '';
      }
      applyWorkspace();
      if (options.focus !== false) {
        const firstSectionId = (sectionsByWorkspace[currentWorkspace] || []).find((sectionId) => document.getElementById(sectionId));
        if (firstSectionId) {
          openSection(firstSectionId, { block: 'start' });
        }
      }
    }

    function openSection(sectionId, options = {}) {
      const workspaceKey = sectionWorkspace.get(sectionId);
      currentSectionId = sectionId;
      if (workspaceKey && workspaceKey !== currentWorkspace) {
        currentWorkspace = workspaceKey;
        applyWorkspace();
      } else {
        applyWorkspace();
      }
      const targetId = options.targetId || sectionId;
      const block = options.block || 'start';
      if (!options.skipHash) {
        window.history.replaceState(null, '', `#${sectionId}`);
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.getElementById(targetId)?.scrollIntoView({
            behavior: 'smooth',
            block,
          });
        });
      });
    }

    if (navList) {
      navList.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const sectionId = String(link.getAttribute('href') || '').replace(/^#/, '');
        if (!sectionId) return;
        event.preventDefault();
        openSection(sectionId, { block: 'start' });
      });
    }

    renderSwitch();
    applyWorkspace();
    const initialHash = String(window.location.hash || '').replace(/^#/, '');
    if (initialHash && sectionWorkspace.has(initialHash)) {
      openSection(initialHash, { block: 'start' });
    }

    return {
      getWorkspace() {
        return currentWorkspace;
      },
      getSection() {
        return currentSectionId;
      },
      setWorkspace,
      openSection,
      refresh: applyWorkspace,
    };
  }

  // Shared sidebar shell for owner/tenant consoles.
  // Use this if you want to change how the left menu collapses on desktop or
  // behaves like a drawer on smaller screens.
  function wireSidebarShell(options = {}) {
    const {
      body = document.body,
      sidebarId,
      navListId,
      toggleButtonId,
      backdropId,
      mobileBreakpoint = 1180,
    } = options;
    const sidebar = sidebarId ? document.getElementById(sidebarId) : null;
    const navList = navListId ? document.getElementById(navListId) : null;
    const toggleButton = toggleButtonId ? document.getElementById(toggleButtonId) : null;
    const backdrop = backdropId ? document.getElementById(backdropId) : null;
    if (!body || !sidebar || !toggleButton) {
      return {
        open() {},
        close() {},
        refresh() {},
      };
    }

    function isMobileLayout() {
      return window.innerWidth <= mobileBreakpoint;
    }

    function syncBackdrop() {
      if (!backdrop) return;
      backdrop.hidden = !(isMobileLayout() && body.classList.contains('sidebar-open'));
    }

    function syncToggleState() {
      const expanded = isMobileLayout()
        ? body.classList.contains('sidebar-open')
        : !body.classList.contains('sidebar-collapsed');
      toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function open() {
      if (isMobileLayout()) {
        body.classList.add('sidebar-open');
      } else {
        body.classList.remove('sidebar-collapsed');
      }
      syncBackdrop();
      syncToggleState();
    }

    function close() {
      if (isMobileLayout()) {
        body.classList.remove('sidebar-open');
      } else {
        body.classList.add('sidebar-collapsed');
      }
      syncBackdrop();
      syncToggleState();
    }

    function toggle() {
      if (isMobileLayout()) {
        if (body.classList.contains('sidebar-open')) {
          close();
        } else {
          open();
        }
        return;
      }
      body.classList.toggle('sidebar-collapsed');
      syncBackdrop();
      syncToggleState();
    }

    function refresh() {
      if (!isMobileLayout()) {
        body.classList.remove('sidebar-open');
      }
      syncBackdrop();
      syncToggleState();
    }

    toggleButton.addEventListener('click', toggle);
    backdrop?.addEventListener('click', close);
    navList?.addEventListener('click', () => {
      if (isMobileLayout()) {
        close();
      }
    });
    window.addEventListener('resize', refresh);
    refresh();

    return { open, close, refresh };
  }

  function connectLiveStream(options = {}) {
    const {
      url = '/admin/api/live',
      events = [],
      onEvent,
      onOpen,
      onError,
    } = options;
    if (typeof window.EventSource !== 'function') {
      return { close() {} };
    }
    const source = new EventSource(url);
    source.addEventListener('open', () => {
      if (typeof onOpen === 'function') onOpen();
    });
    events.forEach((name) => {
      source.addEventListener(name, (event) => {
        let payload = null;
        try {
          payload = event?.data ? JSON.parse(event.data) : null;
        } catch {
          payload = { raw: event.data };
        }
        if (typeof onEvent === 'function') {
          onEvent(name, payload);
        }
      });
    });
    source.onerror = () => {
      if (typeof onError === 'function') onError();
    };
    return {
      close() {
        source.close();
      },
    };
  }

  // Shared UI helpers consumed by owner-console.js and tenant-console.js.
  window.ConsoleSurface = {
    api,
    connectLiveStream,
    escapeHtml,
    formatDateTime,
    formatNumber,
    formatStatusTone,
    makePill,
    renderList,
    renderStats,
    renderTable,
    setBusy,
    setText,
    showToast,
    wireCommandPalette,
    wireSidebarShell,
    wireWorkspaceSwitcher,
  };
})();
