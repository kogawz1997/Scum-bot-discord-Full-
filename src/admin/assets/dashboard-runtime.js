/**
 * Dashboard runtime helpers split out of the former dashboard monolith so snapshot refresh,
 * session bootstrap, audit preset state, and generic form submission are
 * reviewable without loading the full browser event-binding monolith.
 */
    function normalizeAuditPresetRecord(entry) {
      const name = String(entry?.name || '').trim();
      if (!name) return null;
      const visibility = ['private', 'public', 'role'].includes(String(entry?.visibility || '').trim().toLowerCase())
        ? String(entry.visibility).trim().toLowerCase()
        : 'public';
      const sharedRole = ['mod', 'admin', 'owner'].includes(String(entry?.sharedRole || '').trim().toLowerCase())
        ? String(entry.sharedRole).trim().toLowerCase()
        : 'mod';
      const createdByUser = String(entry?.createdByUser || '').trim();
      const scopeLabel = visibility === 'private'
        ? 'private'
        : visibility === 'role'
          ? `role:${sharedRole}`
          : 'public';
      return {
        id: String(entry?.id || `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name,
        view: ['wallet', 'reward', 'event'].includes(String(entry?.view || '').trim())
          ? String(entry.view).trim()
          : 'wallet',
        visibility,
        sharedRole,
        query: String(entry?.query || ''),
        userId: String(entry?.userId || ''),
        actor: String(entry?.actor || ''),
        actorMode: String(entry?.actorMode || '').trim().toLowerCase() === 'exact' ? 'exact' : 'contains',
        reason: String(entry?.reason || ''),
        reference: String(entry?.reference || ''),
        referenceMode: String(entry?.referenceMode || '').trim().toLowerCase() === 'exact' ? 'exact' : 'contains',
        status: String(entry?.status || ''),
        statusMode: String(entry?.statusMode || '').trim().toLowerCase() === 'exact' ? 'exact' : 'contains',
        dateFrom: String(entry?.dateFrom || ''),
        dateTo: String(entry?.dateTo || ''),
        sortBy: String(entry?.sortBy || 'timestamp') || 'timestamp',
        sortOrder: String(entry?.sortOrder || '').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
        windowMs: entry?.windowMs == null || String(entry.windowMs).trim().toLowerCase() === 'all'
          ? null
          : Math.max(60 * 1000, Number(entry.windowMs) || 0),
        pageSize: Math.max(10, Number(entry?.pageSize || 50)),
        createdByUser,
        updatedByUser: String(entry?.updatedByUser || '').trim(),
        isOwner: Boolean(entry?.isOwner),
        canEdit: entry?.canEdit !== false,
        canDelete: entry?.canDelete !== false,
        canView: entry?.canView !== false,
        scopeLabel,
        updatedAt: String(entry?.updatedAt || new Date().toISOString()),
      };
    }

    function updateAuditPresetSharingControls() {
      const visibility = String(currentAuditPresetVisibility || 'public').trim().toLowerCase();
      if (auditPresetVisibilitySelect) {
        auditPresetVisibilitySelect.value = visibility;
      }
      if (auditPresetSharedRoleSelect) {
        auditPresetSharedRoleSelect.value = String(currentAuditPresetSharedRole || 'mod').trim().toLowerCase() || 'mod';
        auditPresetSharedRoleSelect.style.display = visibility === 'role' ? '' : 'none';
      }
    }

    async function refreshAuditPresetList(selectedId = '') {
      if (!isAuthed) {
        auditPresets = [];
        currentAuditPresetId = '';
        renderAuditPresetOptions('');
        updateAuditPresetSharingControls();
        return;
      }
      const res = await api('/admin/api/audit/presets');
      auditPresets = (Array.isArray(res?.data) ? res.data : [])
        .map(normalizeAuditPresetRecord)
        .filter(Boolean)
        .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
      const targetId = String(selectedId || currentAuditPresetId || '').trim();
      currentAuditPresetId = targetId && auditPresets.some((preset) => preset.id === targetId)
        ? targetId
        : '';
      renderAuditPresetOptions(currentAuditPresetId);
      updateAuditPresetSharingControls();
    }

    function renderAuditPresetOptions(selectedId = '') {
      if (!auditPresetSelect) return;
      const selected = String(selectedId || '').trim();
      const currentValue = selected || currentAuditPresetId || '';
      auditPresetSelect.innerHTML = '<option value=\"\">Saved presets</option>';
      auditPresets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        const ownerSuffix = preset.createdByUser ? ` • by ${preset.createdByUser}` : '';
        option.textContent = `${preset.name} • ${preset.scopeLabel}${ownerSuffix}`;
        auditPresetSelect.appendChild(option);
      });
      auditPresetSelect.value = currentValue && auditPresets.some((preset) => preset.id === currentValue)
        ? currentValue
        : '';
      const selectedPreset = auditPresets.find((preset) => preset.id === auditPresetSelect.value);
      if (auditPresetDeleteBtn) {
        auditPresetDeleteBtn.disabled = !selectedPreset || selectedPreset.canDelete === false;
      }
      if (auditPresetApplyBtn) {
        auditPresetApplyBtn.disabled = !selectedPreset;
      }
    }

    function buildCurrentAuditPreset() {
      return normalizeAuditPresetRecord({
        id: currentAuditPresetId || undefined,
        name: String(auditPresetNameInput?.value || '').trim(),
        view: currentAuditView,
        query: currentAuditQuery,
        userId: currentAuditUser,
        actor: currentAuditActor,
        actorMode: currentAuditActorMode,
        reason: currentAuditReason,
        reference: currentAuditReference,
        referenceMode: currentAuditReferenceMode,
        status: currentAuditStatus,
        statusMode: currentAuditStatusMode,
        dateFrom: currentAuditDateFrom,
        dateTo: currentAuditDateTo,
        sortBy: currentAuditSortBy,
        sortOrder: currentAuditSortOrder,
        windowMs: currentAuditWindowMs,
        pageSize: currentAuditPageSize,
        visibility: currentAuditPresetVisibility,
        sharedRole: currentAuditPresetSharedRole,
        updatedAt: new Date().toISOString(),
      });
    }

    function syncAuditControlsFromState() {
      if (auditSearchInput) auditSearchInput.value = currentAuditQuery;
      if (auditUserInput) auditUserInput.value = currentAuditUser;
      if (auditActorInput) auditActorInput.value = currentAuditActor;
      if (auditActorModeSelect) auditActorModeSelect.value = currentAuditActorMode;
      if (auditReasonInput) auditReasonInput.value = currentAuditReason;
      if (auditReferenceInput) auditReferenceInput.value = currentAuditReference;
      if (auditReferenceModeSelect) auditReferenceModeSelect.value = currentAuditReferenceMode;
      if (auditStatusInput) auditStatusInput.value = currentAuditStatus;
      if (auditStatusModeSelect) auditStatusModeSelect.value = currentAuditStatusMode;
      if (auditDateFromInput) auditDateFromInput.value = currentAuditDateFrom;
      if (auditDateToInput) auditDateToInput.value = currentAuditDateTo;
      if (auditSortBySelect) auditSortBySelect.value = currentAuditSortBy;
      if (auditSortOrderSelect) auditSortOrderSelect.value = currentAuditSortOrder;
      if (auditWindowSelect) auditWindowSelect.value = currentAuditWindowMs == null ? 'all' : String(currentAuditWindowMs);
      if (auditPageSizeSelect) auditPageSizeSelect.value = String(currentAuditPageSize);
      updateAuditPresetSharingControls();
      const selectedPreset = auditPresets.find((entry) => entry.id === String(auditPresetSelect?.value || currentAuditPresetId || '').trim());
      if (auditPresetDeleteBtn) auditPresetDeleteBtn.disabled = !selectedPreset || selectedPreset.canDelete === false;
      if (auditPresetApplyBtn) auditPresetApplyBtn.disabled = !String(auditPresetSelect?.value || '').trim();
    }

    function applyAuditPresetById(presetId) {
      const normalizedId = String(presetId || '').trim();
      const preset = auditPresets.find((entry) => entry.id === normalizedId);
      if (!preset) {
        throw new Error('ไม่พบ preset ที่เลือก');
      }
      currentAuditPresetId = preset.id;
      currentAuditView = preset.view;
      currentAuditQuery = preset.query;
      currentAuditUser = preset.userId;
      currentAuditActor = preset.actor;
      currentAuditActorMode = preset.actorMode;
      currentAuditReason = preset.reason;
      currentAuditReference = preset.reference;
      currentAuditReferenceMode = preset.referenceMode;
      currentAuditStatus = preset.status;
      currentAuditStatusMode = preset.statusMode;
      currentAuditDateFrom = preset.dateFrom;
      currentAuditDateTo = preset.dateTo;
      currentAuditSortBy = preset.sortBy;
      currentAuditSortOrder = preset.sortOrder;
      currentAuditWindowMs = preset.windowMs;
      currentAuditPageSize = preset.pageSize;
      currentAuditPresetVisibility = preset.visibility;
      currentAuditPresetSharedRole = preset.sharedRole || 'mod';
      if (auditPresetNameInput) {
        auditPresetNameInput.value = preset.name;
      }
      resetAuditPaging();
      renderAuditPresetOptions(currentAuditPresetId);
      syncAuditControlsFromState();
      renderAuditCenter();
      toast(`ใช้ preset: ${preset.name}`);
    }

    async function refreshSnapshot(options = {}) {
      const { silent = false, syncConfigInputs = false, forceCardsRefresh = false } = options;
      if (refreshInFlight) return;

      refreshInFlight = true;
      try {
        if (!silent) {
          setStatus('กำลังโหลดข้อมูล...', '#ffb84d', 'กำลังดึง snapshot ล่าสุด', 'busy');
        }
        const [snapshotRes, dashboardCardsRes] = await Promise.all([
          api('/admin/api/snapshot'),
          api(`/admin/api/dashboard/cards${forceCardsRefresh ? '?refresh=1' : ''}`).catch(() => null),
        ]);
        snapshot = snapshotRes.data;
        if (hasRoleAtLeast(currentUserRole, 'admin')) {
          const [securityEventsRes, roleMatrixRes, sessionsRes, providersRes] = await Promise.all([
            api('/admin/api/auth/security-events?limit=80').catch(() => null),
            api('/admin/api/auth/role-matrix').catch(() => null),
            hasRoleAtLeast(currentUserRole, 'owner')
              ? api('/admin/api/auth/sessions').catch(() => null)
              : Promise.resolve(null),
            api('/admin/api/auth/providers').catch(() => null),
          ]);
          snapshot.adminSecurityEvents = securityEventsRes?.data || snapshot.adminSecurityEvents || [];
          snapshot.adminRoleMatrix = roleMatrixRes?.data || snapshot.adminRoleMatrix || null;
          snapshot.adminSessions = sessionsRes?.data || [];
          snapshot.adminAuthProviders = providersRes?.data || snapshot.adminAuthProviders || null;
        } else {
          snapshot.adminSecurityEvents = [];
          snapshot.adminRoleMatrix = null;
          snapshot.adminSessions = [];
          snapshot.adminAuthProviders = null;
        }
        await refreshControlPanel({ silent: true }).catch(() => null);
        currentDashboardCards = dashboardCardsRes?.data || null;
        renderSummary();
        renderRuntimeSupervisor(snapshot?.runtimeSupervisor || null);
        renderBackupRestoreState(snapshot?.backupRestore || null);
        renderAuthSecurityCenter();
        renderPlatformCenter();
        renderDeliveryRuntime(snapshot?.deliveryRuntime || null);
        renderDeliveryOpsTables();
        await refreshPlatformCenter({
          forceOverview: !currentPlatformOverview,
          forceReconcile: !currentPlatformReconcile,
          fetchOpsState: !snapshot?.platformOpsState,
        }).catch(() => {
          renderPlatformCenter();
        });
        await refreshDeliveryCapabilities().catch(() => null);
        await refreshAdminNotifications().catch(() => null);
        renderSelectedDataset();
        renderAuditCenter();
        renderMetricsCharts();
        if (currentDeliveryDetailCode) {
          await loadDeliveryDetail(currentDeliveryDetailCode, {
            silent: true,
            preserveStatus: true,
          });
        } else {
          renderDeliveryDetail(null);
        }
        if (syncConfigInputs) {
          fillSimpleConfigFromSnapshot();
          if (!String(configJsonInput?.value || '').trim()) {
            fillConfigEditorFromSnapshot();
          }
        }
        if (!silent) {
          setConnectedStatus();
        }
      } finally {
        refreshInFlight = false;
      }
    }

    async function logout() {
      await api('/admin/api/logout', 'POST', {});
      snapshot = null;
      currentPlatformOverview = null;
      currentPlatformReconcile = null;
      currentPlatformMonitoringReport = null;
      setAuthState(false);
      toast('ออกจากระบบแล้ว');
    }

    async function checkSession() {
      try {
        const me = await api('/admin/api/me');
        currentUserRole = normalizeRole(me?.data?.role || 'mod');
        currentUserName = String(me?.data?.user || '').trim();
        setAuthState(true);
        await refreshAuditPresetList();
        await refreshSnapshot();
      } catch {
        setAuthState(false);
        window.location.replace('/admin/login');
      }
    }

    async function submitForm(form) {
      const payload = {};
      for (const [key, value] of new FormData(form).entries()) {
        const trimmed = String(value).trim();
        if (trimmed !== '') payload[key] = trimmed;
      }

      if (form === shopAddForm) {
        const kind = String(payload.kind || 'item').toLowerCase() === 'vip' ? 'vip' : 'item';
        payload.kind = kind;
        if (kind === 'item') {
          const deliveryItems = Array.isArray(shopDeliveryItems)
            ? shopDeliveryItems
                .map((entry) => ({
                  gameItemId: String(entry.gameItemId || '').trim(),
                  quantity: normalizeBundleQty(entry.quantity),
                  iconUrl: String(entry.iconUrl || '').trim() || null,
                }))
                .filter((entry) => entry.gameItemId)
            : [];

          if (deliveryItems.length === 0) {
            throw new Error('กรุณาเลือกไอเทมในเกมอย่างน้อย 1 รายการ');
          }
          payload.deliveryItems = deliveryItems;
          payload.gameItemId = deliveryItems[0].gameItemId;
          payload.quantity = deliveryItems[0].quantity;
          payload.iconUrl = deliveryItems[0].iconUrl || null;
        } else {
          delete payload.gameItemId;
          delete payload.iconUrl;
          delete payload.quantity;
          delete payload.deliveryItems;
        }
      }

      if (form.dataset.endpoint === '/admin/api/backup/restore') {
        payload.dryRun = String(payload.dryRun || '').toLowerCase() === 'true';
        payload.confirmBackup = String(payload.confirmBackup || '').trim();
        payload.previewToken = String(payload.previewToken || '').trim();
        if (!payload.dryRun && !payload.confirmBackup) {
          throw new Error('กรุณาพิมพ์ชื่อ backup ซ้ำอีกครั้งก่อน restore จริง');
        }
      }

      const response = await api(form.dataset.endpoint, form.dataset.method || 'POST', payload);
      if (form.dataset.endpoint === '/admin/api/platform/apikey' && platformApiKeyCreateView) {
        platformApiKeyCreateView.textContent = JSON.stringify(response?.data || {}, null, 2);
      }
      if (form.dataset.endpoint === '/admin/api/platform/webhook' && platformWebhookCreateView) {
        platformWebhookCreateView.textContent = JSON.stringify(response?.data || {}, null, 2);
      }
      if (form === shopAddForm) {
        form.reset();
        shopDeliveryItems = [];
        shopSelectedItem.hidden = true;
        if (shopQuantityInput) {
          shopQuantityInput.value = '1';
        }
        updateShopKindUi();
      }
      if (form.dataset.endpoint === '/admin/api/backup/restore') {
        const previewTokenInput = form.elements.namedItem('previewToken');
        const confirmBackupInput = form.elements.namedItem('confirmBackup');
        if (payload.dryRun) {
          currentRestorePreviewData = response?.data || null;
          if (previewTokenInput) {
            previewTokenInput.value = String(response?.data?.previewToken || '');
          }
          if (confirmBackupInput && !String(confirmBackupInput.value || '').trim()) {
            confirmBackupInput.value = String(response?.data?.confirmBackup || '');
          }
        } else {
          currentRestorePreviewData = null;
          if (previewTokenInput) {
            previewTokenInput.value = '';
          }
        }
      }
      toast(
        form.dataset.endpoint === '/admin/api/backup/restore' && payload.dryRun
          ? 'สร้าง restore preview แล้ว'
          : 'บันทึกแล้ว',
      );
      await refreshSnapshot();
      if (String(form.dataset.endpoint || '').startsWith('/admin/api/platform/')) {
        await refreshPlatformCenter({
          forceOverview: true,
          forceReconcile: false,
          fetchOpsState: true,
        }).catch(() => null);
      }
      if (form.dataset.endpoint === '/admin/api/backup/restore') {
        renderBackupRestoreState(currentBackupRestoreState || snapshot?.backupRestore || null);
      }
      setStatus(
        'บันทึกสำเร็จ',
        '#43dd86',
        form.dataset.endpoint === '/admin/api/backup/restore' && payload.dryRun
          ? 'สร้าง restore preview สำเร็จ'
          : `คำสั่ง ${form.dataset.endpoint || 'api'} สำเร็จ`,
        'ok',
      );
    }
