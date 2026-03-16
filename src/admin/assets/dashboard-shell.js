/**
 * Dashboard shell/runtime helpers split from the former dashboard monolith so auth, live
 * refresh, step-up, and request plumbing stay reviewable.
 */
    function normalizeThemeName(value) {
      const raw = String(value || '').trim().toLowerCase();
      if (SUPPORTED_THEMES.has(raw)) return raw;
      return 'military';
    }

    function applyTheme(themeName, persist = true) {
      const resolved = normalizeThemeName(themeName);
      document.documentElement.setAttribute('data-theme', resolved);
      if (themeSelect) {
        themeSelect.value = resolved;
      }
      if (persist) {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
        } catch {}
      }
      return resolved;
    }

    function loadPreferredTheme() {
      let fromStorage = '';
      try {
        fromStorage = String(window.localStorage.getItem(THEME_STORAGE_KEY) || '');
      } catch {
        fromStorage = '';
      }
      const queryTheme = normalizeThemeName(new URLSearchParams(window.location.search).get('theme'));
      if (new URLSearchParams(window.location.search).has('theme')) {
        return queryTheme;
      }
      return normalizeThemeName(fromStorage);
    }

    function setStatus(text, color, detail = '', state = null) {
      if (statusMain) {
        statusMain.textContent = text;
      } else {
        statusPill.textContent = text;
      }
      if (statusSub) {
        statusSub.textContent = detail || '';
      }
      statusPill.style.color = color || '#9eb0d9';
      let resolvedState = state;
      if (!resolvedState) {
        if (color === '#43dd86') {
          resolvedState = 'ok';
        } else if (color === '#ff6b7b') {
          resolvedState = 'error';
        } else if (color === '#ffb84d') {
          resolvedState = 'warn';
        } else {
          resolvedState = 'warn';
        }
      }
      statusPill.classList.remove('state-ok', 'state-warn', 'state-error', 'state-busy');
      if (resolvedState) {
        statusPill.classList.add(`state-${resolvedState}`);
      }
    }

    function toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 2600);
    }

    function updateLiveToggleUi() {
      liveToggleBtn.classList.toggle('active', liveEnabled);
      if (!liveEnabled) {
        liveToggleBtn.textContent = 'อัปเดตสด: ปิด';
        return;
      }
      liveToggleBtn.textContent = liveStreamConnected ? 'อัปเดตสด: เปิด (SSE)' : 'อัปเดตสด: เปิด';
    }

    function setConnectedStatus() {
      if (!isAuthed) return;
      const roleText = currentUserRole ? `สิทธิ์: ${currentUserRole}` : '';
      if (!liveEnabled) {
        setStatus('เชื่อมต่อแล้ว', '#43dd86', `${roleText} | ระบบอัปเดตสดถูกปิดไว้`, 'ok');
        return;
      }
      const streamText = liveStreamConnected ? 'เชื่อมต่อ SSE แล้ว' : 'กำลังเชื่อมต่อ SSE ใหม่';
      setStatus(
        `สดทุก ${Math.round(liveIntervalMs / 1000)} วินาที`,
        liveStreamConnected ? '#43dd86' : '#ffb84d',
        `${roleText} | ${streamText} | ใช้ polling สำรอง`,
        liveStreamConnected ? 'ok' : 'warn',
      );
    }

    function closeLiveStream() {
      if (!liveEventSource) return;
      try {
        liveEventSource.close();
      } catch {}
      liveEventSource = null;
      liveStreamConnected = false;
      updateLiveToggleUi();
    }

    async function runRealtimeRefresh() {
      const reason = realtimeRefreshReason || 'update';
      realtimeRefreshReason = null;
      realtimeRefreshTimer = null;
      if (!isAuthed || !liveEnabled) return;
      if (refreshInFlight) {
        scheduleRealtimeRefresh(reason);
        return;
      }
      try {
        await refreshSnapshot({ silent: true, syncConfigInputs: false });
        setStatus('อัปเดตเรียลไทม์', '#43dd86', `ได้รับ event: ${reason}`, 'ok');
      } catch (error) {
        setStatus('อัปเดตสดผิดพลาด', '#ff6b7b', String(error.message || error), 'error');
      }
    }

    function scheduleRealtimeRefresh(reason = 'update') {
      realtimeRefreshReason = reason;
      if (realtimeRefreshTimer) return;
      realtimeRefreshTimer = setTimeout(() => {
        void runRealtimeRefresh();
      }, 240);
    }

    function attachLiveEvent(source, name) {
      source.addEventListener(name, (evt) => {
        let parsed = null;
        try {
          parsed = evt?.data ? JSON.parse(evt.data) : null;
        } catch {
          parsed = null;
        }
        if (name === 'connected') {
          liveStreamConnected = true;
          updateLiveToggleUi();
          setConnectedStatus();
          return;
        }
        if (name === 'heartbeat') {
          if (!liveStreamConnected) {
            liveStreamConnected = true;
            updateLiveToggleUi();
            setConnectedStatus();
          }
          return;
        }
        const reason = parsed?.type || name;
        scheduleRealtimeRefresh(reason);
      });
    }

    function connectLiveStream() {
      closeLiveStream();
      if (!isAuthed || !liveEnabled) return;
      if (typeof window.EventSource !== 'function') {
        setStatus('สตรีมอัปเดตสดใช้งานไม่ได้', '#ffb84d', 'เบราว์เซอร์ไม่รองรับ EventSource', 'warn');
        return;
      }
      const source = new EventSource('/admin/api/live');
      liveEventSource = source;
      liveStreamConnected = false;
      updateLiveToggleUi();

      const events = [
        'connected',
        'heartbeat',
        'admin-action',
        'platform-event',
        'scum-status',
        'scum-player',
        'scum-kill',
        'scum-restart',
        'delivery-queue',
        'delivery-dead-letter',
        'ops-alert',
      ];
      for (const evtName of events) {
        attachLiveEvent(source, evtName);
      }

      source.onerror = () => {
        if (liveEventSource !== source) return;
        liveStreamConnected = false;
        updateLiveToggleUi();
        setStatus(
          `LIVE ${Math.round(liveIntervalMs / 1000)}s`,
          '#ffb84d',
          'SSE หลุดชั่วคราว, ใช้ polling สำรอง',
          'warn',
        );
        closeLiveStream();
        setTimeout(() => {
          if (!isAuthed || !liveEnabled) return;
          connectLiveStream();
        }, 1600);
      };
    }

    function stopLiveUpdates() {
      if (liveTimer) {
        clearInterval(liveTimer);
        liveTimer = null;
      }
      if (realtimeRefreshTimer) {
        clearTimeout(realtimeRefreshTimer);
        realtimeRefreshTimer = null;
      }
      realtimeRefreshReason = null;
      closeLiveStream();
    }

    function startLiveUpdates() {
      stopLiveUpdates();
      if (!isAuthed || !liveEnabled) return;
      connectLiveStream();
      liveTimer = setInterval(async () => {
        if (document.hidden) return;
        if (liveStreamConnected) return;
        if (refreshInFlight) return;
        try {
          await refreshSnapshot({ silent: true, syncConfigInputs: false });
        } catch (error) {
          setStatus('อัปเดตสดผิดพลาด', '#ff6b7b', String(error.message || error), 'error');
          console.error('[admin-live] refresh error:', error);
        }
      }, liveIntervalMs);
    }

    function getSubmitButton(form, event) {
      if (event?.submitter instanceof HTMLButtonElement) return event.submitter;
      return form.querySelector('button[type="submit"], button:not([type])');
    }

    function startButtonBusy(button, pendingText) {
      if (!button) return () => {};
      const originalText = button.textContent;
      const originalDisabled = button.disabled;
      button.disabled = true;
      button.textContent = pendingText || 'กำลังทำงาน...';
      return () => {
        button.disabled = originalDisabled;
        button.textContent = originalText;
      };
    }

    async function runWithButtonState(button, pendingText, fn) {
      const endBusy = startButtonBusy(button, pendingText);
      setStatus('กำลังประมวลผล...', '#ffb84d', pendingText || 'ระบบกำลังทำงาน', 'busy');
      try {
        const result = await fn();
        setStatus('ดำเนินการสำเร็จ', '#43dd86', 'ระบบตอบกลับแล้ว', 'ok');
        return result;
      } catch (error) {
        setStatus('ดำเนินการไม่สำเร็จ', '#ff6b7b', String(error.message || error), 'error');
        throw error;
      } finally {
        endBusy();
      }
    }

    function activateTab(tabKey) {
      for (const btn of tabButtons) {
        btn.classList.toggle('active', btn.dataset.tab === tabKey);
      }
      for (const panel of tabPanels) {
        panel.classList.toggle('active', panel.dataset.tabPanel === tabKey);
      }
      updateDashboardQueryParams({
        tab: String(tabKey || '').trim() === 'economy' ? '' : tabKey,
      });
    }

    function applyTabFilter(queryText) {
      const query = String(queryText || '').trim().toLowerCase();
      for (const btn of tabButtons) {
        const label = String(btn.dataset.tabLabel || '').toLowerCase();
        const text = String(btn.textContent || '').toLowerCase();
        const visible = !query || label.includes(query) || text.includes(query);
        btn.classList.toggle('hidden-by-filter', !visible);
      }
    }

    function normalizeRole(role) {
      const raw = String(role || '').trim().toLowerCase();
      if (raw === 'owner') return 'owner';
      if (raw === 'admin') return 'admin';
      return 'mod';
    }

    function hasRoleAtLeast(actualRole, requiredRole) {
      const actual = ROLE_LEVEL[normalizeRole(actualRole)] || 0;
      const required = ROLE_LEVEL[normalizeRole(requiredRole)] || 0;
      return actual >= required;
    }

    function minRoleForEndpoint(endpoint) {
      const path = String(endpoint || '').trim();
      if (!path) return 'mod';
      const ownerOnly = new Set([
        '/admin/api/config/set',
        '/admin/api/config/reset',
        '/admin/api/welcome/clear',
        '/admin/api/rentbike/reset-now',
        '/admin/api/backup/create',
        '/admin/api/backup/restore',
        '/admin/api/platform/tenant',
        '/admin/api/platform/subscription',
        '/admin/api/platform/license',
        '/admin/api/platform/license/accept-legal',
        '/admin/api/platform/apikey',
        '/admin/api/platform/webhook',
        '/admin/api/platform/marketplace',
      ]);
      const modAllowed = new Set([
        '/admin/api/ticket/claim',
        '/admin/api/ticket/close',
        '/admin/api/moderation/add',
        '/admin/api/stats/add-kill',
        '/admin/api/stats/add-death',
        '/admin/api/stats/add-playtime',
        '/admin/api/scum/status',
        '/admin/api/platform/reconcile',
        '/admin/api/platform/monitoring/run',
      ]);
      if (ownerOnly.has(path)) return 'owner';
      if (modAllowed.has(path)) return 'mod';
      return 'admin';
    }

    function applyRolePermissions() {
      if (!isAuthed) return;
      const forms = Array.from(document.querySelectorAll('form[data-endpoint]'));
      for (const form of forms) {
        const endpoint = String(form.dataset.endpoint || '').trim();
        const required = String(form.dataset.minRole || minRoleForEndpoint(endpoint));
        const allowed = hasRoleAtLeast(currentUserRole, required);
        for (const el of form.querySelectorAll('input,select,textarea,button')) {
          if ('disabled' in el) {
            el.disabled = !allowed;
          }
        }
        form.style.opacity = allowed ? '1' : '0.45';
      }

      const gatedControls = Array.from(document.querySelectorAll('[data-min-role]'));
      for (const control of gatedControls) {
        const required = String(control.dataset.minRole || 'mod');
        const allowed = hasRoleAtLeast(currentUserRole, required);
        if ('disabled' in control) {
          control.disabled = !allowed;
        }
      }

      if (configEditorForm) {
        const submitButton = configEditorForm.querySelector('button[type="submit"]');
        const allowed = submitButton
          ? hasRoleAtLeast(currentUserRole, submitButton.dataset.minRole || 'owner')
          : false;
        configEditorForm.style.opacity = allowed ? '1' : '0.45';
      }
    }

    function setAuthState(authed) {
      isAuthed = authed;
      logoutBtn.disabled = !authed;

      for (const el of protectedControls) {
        if ('disabled' in el) {
          el.disabled = !authed;
        }
      }

      const main = document.querySelector('main');
      if (main) {
        main.style.opacity = authed ? '1' : '0.42';
      }

      if (!authed) {
        rejectPendingStepUp();
        resetAuthFilters();
        currentUserRole = 'mod';
        currentUserName = '';
        currentDashboardCards = null;
        currentRuntimeSupervisor = null;
        currentBackupRestoreState = null;
        currentRestorePreviewData = null;
        currentDeliveryRuntime = null;
        currentDeliveryCapabilities = { builtin: [], presets: [] };
        currentDeliveryCapabilityResult = null;
        controlPanelSettings = null;
        auditPresets = [];
        currentAuditPresetId = '';
        currentAuditPresetVisibility = 'public';
        currentAuditPresetSharedRole = 'mod';
        stopLiveUpdates();
        setStatus('ยังไม่ยืนยันตัวตน', '#ffb84d', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warn');
        summaryEl.innerHTML = '<div class="metric"><div class="k">สถานะ</div><div class="v">ต้องเข้าสู่ระบบก่อน</div></div>';
        tableWrap.innerHTML = '<div style="padding:12px; color:#9eb0d9;">กำลังนำไปหน้าเข้าสู่ระบบ...</div>';
        rawView.textContent = '';
        if (deliveryPreviewView) {
          deliveryPreviewView.textContent = 'ยังไม่มีผลพรีวิวคำสั่ง';
        }
        renderRuntimeSupervisor(null);
        renderBackupRestoreState(null);
        renderDeliveryPreflight(null);
        renderDeliverySimulation(null);
        renderDeliveryCommandTemplate(null);
        renderDeliveryCapabilityResult(null);
        currentAdminNotifications = [];
        if (adminNotificationSummary) {
          adminNotificationSummary.innerHTML =
            '<div class="metric"><div class="k">Notifications</div><div class="v">ต้องเข้าสู่ระบบก่อน</div></div>';
        }
        if (adminNotificationList) {
          adminNotificationList.innerHTML =
            '<div style="padding:12px; color:#9eb0d9;">กำลังนำไปหน้าเข้าสู่ระบบ...</div>';
        }
        if (deliveryTestSendView) {
          deliveryTestSendView.textContent = 'ยังไม่มีผล test send';
        }
        if (deliveryQueueTableWrap) {
          deliveryQueueTableWrap.innerHTML = '<div style="padding:12px; color:#9eb0d9;">กำลังนำไปหน้าเข้าสู่ระบบ...</div>';
        }
        if (deliveryDeadLetterTableWrap) {
          deliveryDeadLetterTableWrap.innerHTML = '<div style="padding:12px; color:#9eb0d9;">กำลังนำไปหน้าเข้าสู่ระบบ...</div>';
        }
        currentDeliveryDetailCode = '';
        currentDeliveryDetailData = null;
        renderDeliveryRuntime(null);
        renderDeliveryDetail(null);
        renderRowsToContainer(controlAdminUsersWrap, [], 'กำลังนำไปหน้าเข้าสู่ระบบ...');
        if (controlCommandWrap) {
          controlCommandWrap.innerHTML = '<div style="padding:12px; color:#9eb0d9;">กำลังนำไปหน้าเข้าสู่ระบบ...</div>';
        }
        if (controlPanelSummary) {
          controlPanelSummary.innerHTML =
            '<div class="metric"><div class="k">Control Panel</div><div class="v">ต้องเข้าสู่ระบบก่อน</div></div>';
        }
        renderAuditPresetOptions('');
        if (auditPresetNameInput) auditPresetNameInput.value = '';
        updateAuditPresetSharingControls();
        renderAuditCenter();
        renderAuthSecurityCenter();
        renderOverviewPanel();
      } else {
        syncAuthFilterInputs();
        updateShopKindUi();
        if (shopKindSelect && String(shopKindSelect.value || 'item') === 'item') {
          scheduleGameItemCatalogFetch(shopGameItemSearchInput.value || '');
        }
        applyRolePermissions();
        setConnectedStatus();
        startLiveUpdates();
      }
    }

    function closeStepUpModal() {
      if (!stepUpModal) return;
      stepUpModal.hidden = true;
      if (stepUpOtpInput) {
        stepUpOtpInput.value = '';
      }
      if (stepUpConfirmBtn) {
        stepUpConfirmBtn.disabled = false;
      }
    }

    function resolvePendingStepUp(otp) {
      const resolver = pendingStepUpResolver;
      pendingStepUpResolver = null;
      pendingStepUpRejecter = null;
      closeStepUpModal();
      if (typeof resolver === 'function') {
        resolver(String(otp || '').trim());
      }
    }

    function rejectPendingStepUp(message = 'ยกเลิกการยืนยันตัวตนเพิ่ม') {
      const rejecter = pendingStepUpRejecter;
      pendingStepUpResolver = null;
      pendingStepUpRejecter = null;
      closeStepUpModal();
      if (typeof rejecter === 'function') {
        rejecter(new Error(message));
      }
    }

    function submitStepUpModal() {
      const otp = String(stepUpOtpInput?.value || '').trim();
      if (!otp) {
        stepUpOtpInput?.focus();
        return;
      }
      resolvePendingStepUp(otp);
    }

    function openStepUpModal(message = '') {
      const promptMessage = String(message || 'งานนี้ต้องใช้รหัส 2FA เพิ่มอีกครั้งก่อนดำเนินการ').trim();
      if (!stepUpModal || !stepUpOtpInput) {
        const otp = String(window.prompt(promptMessage, '') || '').trim();
        if (!otp) {
          return Promise.reject(new Error(promptMessage));
        }
        return Promise.resolve(otp);
      }
      if (pendingStepUpRejecter) {
        rejectPendingStepUp('มีคำขอยืนยันตัวตนรายการใหม่เข้ามาแทนที่');
      }
      stepUpModal.hidden = false;
      if (stepUpModalTitle) {
        stepUpModalTitle.textContent = 'ยืนยันตัวตนเพิ่ม';
      }
      if (stepUpModalMessage) {
        stepUpModalMessage.textContent = promptMessage;
      }
      if (stepUpOtpInput) {
        stepUpOtpInput.value = '';
      }
      if (stepUpConfirmBtn) {
        stepUpConfirmBtn.disabled = false;
      }
      return new Promise((resolve, reject) => {
        pendingStepUpResolver = resolve;
        pendingStepUpRejecter = reject;
        window.setTimeout(() => {
          stepUpOtpInput?.focus();
          stepUpOtpInput?.select();
        }, 0);
      });
    }

    function buildAdminApiPath(path) {
      const rawPath = String(path || '').trim();
      if (!rawPath) return rawPath;
      const currentUrl = new URL(window.location.href);
      const token = String(currentUrl.searchParams.get('token') || '').trim();
      if (!token) return rawPath;
      const requestUrl = new URL(rawPath, window.location.origin);
      if (!requestUrl.searchParams.has('token')) {
        requestUrl.searchParams.set('token', token);
      }
      return `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
    }

    async function api(path, method = 'GET', body = null, options = {}) {
      const headers = {};
      let payload;
      if (body != null) {
        headers['content-type'] = 'application/json';
        payload = JSON.stringify(body);
      }
      const res = await fetch(buildAdminApiPath(path), {
        method,
        headers,
        body: payload,
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({ ok: false, error: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง' }));
      if (!res.ok || data.ok === false) {
        if (
          data?.requiresStepUp
          && options.stepUpRetried !== true
          && String(method || 'GET').toUpperCase() !== 'GET'
        ) {
          const otp = await openStepUpModal(
            data?.error || 'ยืนยันตัวตนเพิ่มสำหรับงานเสี่ยงนี้ด้วยรหัส 2FA',
          );
          const nextBody =
            body && typeof body === 'object' && !Array.isArray(body)
              ? { ...body, stepUpOtp: otp }
              : { stepUpOtp: otp };
          return api(path, method, nextBody, { ...options, stepUpRetried: true });
        }
        throw new Error(data.error || `คำขอล้มเหลว (${res.status})`);
      }
      return data;
    }

    async function apiBlob(path) {
      const res = await fetch(buildAdminApiPath(path), {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ ok: false, error: `คำขอล้มเหลว (${res.status})` }));
        throw new Error(data.error || `คำขอล้มเหลว (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = String(res.headers.get('content-disposition') || '');
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      return {
        blob,
        filename: match?.[1] || null,
      };
    }

    function asRows(key, value) {
      if (key === 'welcomeClaims' && Array.isArray(value)) {
        return value.map((userId) => ({ userId }));
      }
      if (key === 'stats' && Array.isArray(value)) {
        return [...value].sort((a, b) => Number(b?.kills || 0) - Number(a?.kills || 0));
      }
      if (key === 'weaponStats' && Array.isArray(value)) {
        return [...value].sort(
          (a, b) => Number(b?.kills || b?.count || 0) - Number(a?.kills || a?.count || 0),
        );
      }
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') return [value];
      if (value == null) return [];
      return [{ value }];
    }

    function toCell(v) {
      if (v == null) return '';
      if (typeof v === 'object') {
        return '<code>' + escapeHtml(JSON.stringify(v)) + '</code>';
      }
      if (typeof v === 'string') {
        const text = String(v).trim();
        if (looksLikeImageUrl(text)) {
          return `<span class="img-inline"><img src="${escapeHtml(text)}" alt="icon"><code>${escapeHtml(text)}</code></span>`;
        }
      }
      return escapeHtml(String(v));
    }

    function looksLikeImageUrl(value) {
      const text = String(value || '').trim();
      if (!/^https?:\/\//i.test(text)) return false;
      return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(text)
        || /icons8\.com\//i.test(text)
        || /scum_items\//i.test(text);
    }

    function escapeHtml(text) {
      return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
