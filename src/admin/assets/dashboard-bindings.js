/**
 * Browser-side event binding and startup wiring for the admin dashboard.
 * Extracted from the former dashboard monolith so binding/init code is isolated.
 */
logoutBtn.addEventListener('click', async () => {
      try {
        await runWithButtonState(logoutBtn, '???????????????...', async () => {
          await logout();
        });
      } catch (err) {
        toast(err.message);
      }
    });

    refreshBtn.addEventListener('click', async () => {
      if (!isAuthed) {
        return checkSession();
      }
      try {
        await runWithButtonState(refreshBtn, '???????????...', async () => {
          await refreshSnapshot({ forceCardsRefresh: true });
        });
        toast('????????????????');
      } catch (err) {
        setStatus('?????????????', '#ff6b7b');
        toast(err.message);
      }
    });

    liveIntervalSelect.addEventListener('change', () => {
      liveIntervalMs = Math.max(1000, Number(liveIntervalSelect.value || 2000));
      if (!isAuthed) return;
      if (liveEnabled) {
        startLiveUpdates();
      }
      setConnectedStatus();
    });

    liveToggleBtn.addEventListener('click', () => {
      liveEnabled = !liveEnabled;
      updateLiveToggleUi();
      if (!isAuthed) return;
      if (liveEnabled) {
        startLiveUpdates();
        setStatus(
          `LIVE ${Math.round(liveIntervalMs / 1000)}s`,
          '#43dd86',
          '???????????????????????????',
          'ok',
        );
        return;
      }
      stopLiveUpdates();
      setStatus('???????????????', '#ffb84d', '??????????????????????', 'warn');
    });

    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        const selected = applyTheme(themeSelect.value, true);
        toast(`?????????????? ${selected === 'neon' ? 'Neon Cyber' : 'Military Tactical'}`);
      });
    }

    datasetSelect.addEventListener('change', renderSelectedDataset);
    [
      [auditWalletBtn, 'wallet'],
      [auditRewardBtn, 'reward'],
      [auditEventBtn, 'event'],
    ].forEach(([button, view]) => {
      if (!button) return;
      button.addEventListener('click', () => {
        currentAuditView = view;
        resetAuditPaging();
        renderAuditCenter();
      });
    });
    if (auditSearchInput) {
      auditSearchInput.addEventListener('input', () => {
        currentAuditQuery = String(auditSearchInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditUserInput) {
      auditUserInput.addEventListener('input', () => {
        currentAuditUser = String(auditUserInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditActorInput) {
      auditActorInput.addEventListener('input', () => {
        currentAuditActor = String(auditActorInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditActorModeSelect) {
      auditActorModeSelect.addEventListener('change', () => {
        currentAuditActorMode = String(auditActorModeSelect.value || 'contains').trim().toLowerCase() === 'exact'
          ? 'exact'
          : 'contains';
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditReasonInput) {
      auditReasonInput.addEventListener('input', () => {
        currentAuditReason = String(auditReasonInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditReferenceInput) {
      auditReferenceInput.addEventListener('input', () => {
        currentAuditReference = String(auditReferenceInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditReferenceModeSelect) {
      auditReferenceModeSelect.addEventListener('change', () => {
        currentAuditReferenceMode = String(auditReferenceModeSelect.value || 'contains').trim().toLowerCase() === 'exact'
          ? 'exact'
          : 'contains';
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditStatusInput) {
      auditStatusInput.addEventListener('input', () => {
        currentAuditStatus = String(auditStatusInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditStatusModeSelect) {
      auditStatusModeSelect.addEventListener('change', () => {
        currentAuditStatusMode = String(auditStatusModeSelect.value || 'contains').trim().toLowerCase() === 'exact'
          ? 'exact'
          : 'contains';
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditDateFromInput) {
      auditDateFromInput.addEventListener('change', () => {
        currentAuditDateFrom = String(auditDateFromInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditDateToInput) {
      auditDateToInput.addEventListener('change', () => {
        currentAuditDateTo = String(auditDateToInput.value || '').trim();
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditSortBySelect) {
      auditSortBySelect.addEventListener('change', () => {
        currentAuditSortBy = String(auditSortBySelect.value || 'timestamp').trim() || 'timestamp';
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditSortOrderSelect) {
      auditSortOrderSelect.addEventListener('change', () => {
        currentAuditSortOrder = String(auditSortOrderSelect.value || 'desc').trim().toLowerCase() === 'asc'
          ? 'asc'
          : 'desc';
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditWindowSelect) {
      auditWindowSelect.addEventListener('change', () => {
        const raw = String(auditWindowSelect.value || 'all').trim().toLowerCase();
        const numeric = Number(raw);
        currentAuditWindowMs = raw === 'all' || !Number.isFinite(numeric) || numeric <= 0
          ? null
          : Math.max(60 * 1000, Math.trunc(numeric));
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditPageSizeSelect) {
      auditPageSizeSelect.addEventListener('change', () => {
        currentAuditPageSize = Math.max(10, Number(auditPageSizeSelect.value || 50));
        resetAuditPaging();
        renderAuditCenter();
      });
    }
    if (auditPrevBtn) {
      auditPrevBtn.addEventListener('click', () => {
        if (currentAuditPrevCursor) {
          currentAuditCursor = currentAuditPrevCursor;
          currentAuditPage = Math.max(1, currentAuditPage - 1);
        } else {
          currentAuditPage = Math.max(1, currentAuditPage - 1);
          currentAuditCursor = null;
        }
        renderAuditCenter();
      });
    }
    if (auditNextBtn) {
      auditNextBtn.addEventListener('click', () => {
        if (currentAuditNextCursor) {
          currentAuditCursor = currentAuditNextCursor;
          currentAuditPage = Math.min(currentAuditTotalPages, currentAuditPage + 1);
        } else {
          currentAuditPage = Math.min(currentAuditTotalPages, currentAuditPage + 1);
          currentAuditCursor = null;
        }
        renderAuditCenter();
      });
    }
    if (auditExportCsvBtn) {
      auditExportCsvBtn.addEventListener('click', async () => {
        try {
          await exportAuditRows('csv');
        } catch (error) {
          toast(error.message || '?????? CSV ?????????');
        }
      });
    }
    if (auditExportJsonBtn) {
      auditExportJsonBtn.addEventListener('click', async () => {
        try {
          await exportAuditRows('json');
        } catch (error) {
          toast(error.message || '?????? JSON ?????????');
        }
      });
    }
    if (auditPresetSelect) {
      auditPresetSelect.addEventListener('change', () => {
        const selectedId = String(auditPresetSelect.value || '').trim();
        const preset = auditPresets.find((entry) => entry.id === selectedId);
        if (auditPresetNameInput) {
          auditPresetNameInput.value = preset?.name || '';
        }
        if (preset) {
          currentAuditPresetVisibility = preset.visibility;
          currentAuditPresetSharedRole = preset.sharedRole || 'mod';
        }
        updateAuditPresetSharingControls();
        if (auditPresetApplyBtn) {
          auditPresetApplyBtn.disabled = !selectedId;
        }
        if (auditPresetDeleteBtn) {
          auditPresetDeleteBtn.disabled = !preset || preset.canDelete === false;
        }
      });
    }
    if (auditPresetVisibilitySelect) {
      auditPresetVisibilitySelect.addEventListener('change', () => {
        currentAuditPresetVisibility = String(auditPresetVisibilitySelect.value || 'public').trim().toLowerCase() || 'public';
        if (currentAuditPresetVisibility !== 'role') {
          currentAuditPresetSharedRole = 'mod';
        }
        updateAuditPresetSharingControls();
      });
    }
    if (auditPresetSharedRoleSelect) {
      auditPresetSharedRoleSelect.addEventListener('change', () => {
        currentAuditPresetSharedRole = String(auditPresetSharedRoleSelect.value || 'mod').trim().toLowerCase() || 'mod';
      });
    }
    if (auditPresetApplyBtn) {
      auditPresetApplyBtn.addEventListener('click', () => {
        try {
          applyAuditPresetById(String(auditPresetSelect?.value || '').trim());
        } catch (error) {
          toast(error.message || '??? preset ?????????');
        }
      });
    }
    if (auditPresetSaveBtn) {
      auditPresetSaveBtn.addEventListener('click', async () => {
        const draft = buildCurrentAuditPreset();
        if (!draft) {
          toast('????????????? preset ??????????');
          return;
        }
        try {
          await runWithButtonState(auditPresetSaveBtn, '??????????? preset...', async () => {
            const selectedId = String(auditPresetSelect?.value || currentAuditPresetId || '').trim();
            const selectedPreset = auditPresets.find((entry) => entry.id === selectedId);
            const res = await api('/admin/api/audit/presets', 'POST', {
              ...draft,
              id: selectedPreset && selectedPreset.canEdit === false ? undefined : (selectedId || undefined),
            });
            const saved = normalizeAuditPresetRecord(res?.data);
            currentAuditPresetId = String(saved?.id || '').trim();
            currentAuditPresetVisibility = saved?.visibility || currentAuditPresetVisibility;
            currentAuditPresetSharedRole = saved?.sharedRole || currentAuditPresetSharedRole;
            await refreshAuditPresetList(currentAuditPresetId);
            if (auditPresetNameInput) {
              auditPresetNameInput.value = saved?.name || draft.name;
            }
          });
          const savedName = String(auditPresetNameInput?.value || draft.name || '').trim();
          toast(`?????? preset: ${savedName}`);
        } catch (error) {
          toast(error.message || '?????? preset ?????????');
        }
      });
    }
    if (auditPresetDeleteBtn) {
      auditPresetDeleteBtn.addEventListener('click', async () => {
        const selectedId = String(auditPresetSelect?.value || '').trim();
        const preset = auditPresets.find((entry) => entry.id === selectedId);
        if (!preset) {
          toast('?????????? preset ??????');
          return;
        }
        if (preset.canDelete === false) {
          toast('preset ???????????????????????? owner');
          return;
        }
        if (!window.confirm(`?? preset "${preset.name}" ?`)) {
          return;
        }
        try {
          await runWithButtonState(auditPresetDeleteBtn, '??????? preset...', async () => {
            await api('/admin/api/audit/presets/delete', 'POST', { id: selectedId });
            if (currentAuditPresetId === selectedId) {
              currentAuditPresetId = '';
            }
            await refreshAuditPresetList(currentAuditPresetId);
            if (auditPresetNameInput) {
              auditPresetNameInput.value = '';
            }
          });
          toast(`?? preset: ${preset.name}`);
        } catch (error) {
          toast(error.message || '?? preset ?????????');
        }
      });
    }
    if (metricsWindowSelect) {
      metricsWindowSelect.addEventListener('change', () => {
        currentMetricsWindowMs = Math.max(
          60 * 1000,
          Number(metricsWindowSelect.value || 24 * 60 * 60 * 1000),
        );
        if (snapshot) {
          renderMetricsCharts();
        }
      });
    }
    if (metricsApplyWindowBtn) {
      metricsApplyWindowBtn.addEventListener('click', async () => {
        currentMetricsWindowMs = Math.max(
          60 * 1000,
          Number(metricsWindowSelect?.value || currentMetricsWindowMs),
        );
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(
            metricsApplyWindowBtn,
            '????????? metrics...',
            async () => {
              await refreshObservabilitySnapshot({ silent: true });
            },
          );
          toast('?????????????????????????');
        } catch (error) {
          toast(error.message || '???? metrics ?????????');
        }
      });
    }
    if (metricsExportCsvBtn) {
      metricsExportCsvBtn.addEventListener('click', async () => {
        try {
          await exportObservability('csv');
        } catch (error) {
          toast(error.message || '?????? metrics CSV ?????????');
        }
      });
    }
    if (metricsExportJsonBtn) {
      metricsExportJsonBtn.addEventListener('click', async () => {
        try {
          await exportObservability('json');
        } catch (error) {
          toast(error.message || '?????? metrics JSON ?????????');
        }
      });
    }
    window.addEventListener('resize', () => {
      if (!snapshot) return;
      renderMetricsCharts();
    });

    if (shopKindSelect) {
      shopKindSelect.addEventListener('change', () => {
        updateShopKindUi();
      });
    }

    if (shopGameItemSearchInput) {
      shopGameItemSearchInput.addEventListener('input', () => {
        scheduleGameItemCatalogFetch(shopGameItemSearchInput.value);
      });
      shopGameItemSearchInput.addEventListener('focus', () => {
        if (!shopGameItemList.innerHTML.trim()) {
          scheduleGameItemCatalogFetch(shopGameItemSearchInput.value);
        }
      });
    }

    if (shopCatalogSourceManifestBtn) {
      shopCatalogSourceManifestBtn.addEventListener('click', () => {
        setShopCatalogSource('manifest', { reload: true });
      });
    }

    if (shopCatalogSourceWeaponsBtn) {
      shopCatalogSourceWeaponsBtn.addEventListener('click', () => {
        setShopCatalogSource('weapons', { reload: true });
      });
    }

    if (shopCatalogSourceIconsBtn) {
      shopCatalogSourceIconsBtn.addEventListener('click', () => {
        setShopCatalogSource('icons', { reload: true });
      });
    }

    if (shopQuickAddBtn) {
      shopQuickAddBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(shopQuickAddBtn, '????????????????...', async () => {
            if (String(shopKindSelect?.value || 'item') !== 'item') {
              shopKindSelect.value = 'item';
              updateShopKindUi();
            }
            if (!Array.isArray(shopDeliveryItems) || shopDeliveryItems.length === 0) {
              throw new Error('???????????????????????? Wiki/?????????');
            }
            if (!String(shopAddIdInput?.value || '').trim()) {
              const selected = String(shopDeliveryItems[0]?.gameItemId || '').trim();
              const suggested = makeSuggestedItemId(selected);
              if (suggested) {
                shopAddIdInput.value = suggested;
              }
            }
            if (!String(shopAddNameInput?.value || '').trim()) {
              const selected = String(shopDeliveryItems[0]?.gameItemId || '').trim();
              const qty = normalizeBundleQty(shopDeliveryItems[0]?.quantity || 1);
              if (selected) {
                shopAddNameInput.value = `${selected} x${qty}`;
              }
            }
            if (!String(new FormData(shopAddForm).get('price') || '').trim()) {
              throw new Error('???????????????????????????????????');
            }
            await submitForm(shopAddForm);
          });
        } catch (error) {
          setStatus('???????????????', '#ff6b7b');
          toast(error.message || '????????????????????');
        }
      });
    }

    if (shopQuantityInput) {
      shopQuantityInput.addEventListener('change', () => {
        if (!String(shopAddNameInput.value || '').trim()) return;
        if (!Array.isArray(shopDeliveryItems) || shopDeliveryItems.length !== 1) return;
        const selectedId = String(shopDeliveryItems[0]?.gameItemId || '').trim();
        const qty = normalizeBundleQty(shopQuantityInput.value || 1);
        if (selectedId && String(shopAddNameInput.value || '').startsWith(selectedId)) {
          shopAddNameInput.value = `${selectedId} x${qty}`;
        }
      });
    }

    copyJsonBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawView.textContent || '');
        toast('?????? JSON ????');
      } catch {
        toast('??????????????????');
      }
    });

    if (snapshotExportBtn) {
      snapshotExportBtn.addEventListener('click', async () => {
        try {
          if (!isAuthed) {
            toast('????????????????????');
            return;
          }
          const { blob, filename } = await apiBlob('/admin/api/snapshot/export');
          downloadBlob(
            filename || `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
            blob,
          );
          toast('????????? snapshot ????');
        } catch (error) {
          toast(error.message || '????????? snapshot ?????????');
        }
      });
    }

    if (deliveryRuntimeRefreshBtn) {
      deliveryRuntimeRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(deliveryRuntimeRefreshBtn, '?????????...', async () => {
            await refreshDeliveryRuntime();
          });
          toast('?????????????????????');
        } catch (error) {
          toast(error.message || '????????????????????????');
        }
      });
    }

    if (runtimeSupervisorRefreshBtn) {
      runtimeSupervisorRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(runtimeSupervisorRefreshBtn, '?????????...', async () => {
            await refreshRuntimeSupervisor();
          });
          toast('?????? topology runtime ????');
        } catch (error) {
          toast(error.message || '???? topology runtime ?????????');
        }
      });
    }

    if (backupRestoreStateRefreshBtn) {
      backupRestoreStateRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(backupRestoreStateRefreshBtn, '?????????...', async () => {
            await refreshBackupRestoreState();
          });
          toast('??????????? restore ????');
        } catch (error) {
          toast(error.message || '????????? restore ?????????');
        }
      });
    }

    if (authSecurityRefreshBtn) {
      authSecurityRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(authSecurityRefreshBtn, '?????????...', async () => {
            await refreshSnapshot({ silent: true, syncConfigInputs: false });
          });
          toast('???????????? auth ????');
        } catch (error) {
          toast(error.message || '???????????? auth ?????????');
        }
      });
    }

    if (authFilterForm) {
      authFilterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        currentAuthSearch = String(authSearchInput?.value || '').trim();
        currentAuthEventSeverity = String(authSeveritySelect?.value || '').trim().toLowerCase();
        currentAuthEventType = String(authEventTypeInput?.value || '').trim();
        currentAuthAnomalyOnly = String(authAnomalyOnlySelect?.value || '').trim().toLowerCase() === 'true';
        updateDashboardQueryParams({
          authQ: currentAuthSearch,
          authSeverity: currentAuthEventSeverity,
          authEventType: currentAuthEventType,
          authAnomalyOnly: currentAuthAnomalyOnly ? 'true' : '',
        });
        renderAuthSecurityCenter();
        toast('?????? auth filter ????');
      });
    }

    if (authFilterResetBtn) {
      authFilterResetBtn.addEventListener('click', () => {
        resetAuthFilters();
        updateDashboardQueryParams({
          authQ: '',
          authSeverity: '',
          authEventType: '',
          authAnomalyOnly: '',
        });
        renderAuthSecurityCenter();
        toast('???? auth filter ????');
      });
    }

    if (authSecurityExportCsvBtn) {
      authSecurityExportCsvBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(authSecurityExportCsvBtn, '????? export...', async () => {
            const { blob, filename } = await apiBlob(buildAuthSecurityExportPath('csv'));
            downloadBlob(
              filename || `admin-security-events-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
              blob,
            );
          });
          toast('export security events ???? CSV ????');
        } catch (error) {
          toast(error.message || 'export security events ?????????');
        }
      });
    }

    if (authSecurityExportJsonBtn) {
      authSecurityExportJsonBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(authSecurityExportJsonBtn, '????? export...', async () => {
            const { blob, filename } = await apiBlob(buildAuthSecurityExportPath('json'));
            downloadBlob(
              filename || `admin-security-events-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
              blob,
            );
          });
          toast('export security events ???? JSON ????');
        } catch (error) {
          toast(error.message || 'export security events ?????????');
        }
      });
    }

    if (authSessionRevokeForm) {
      authSessionRevokeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const submitButton = getSubmitButton(authSessionRevokeForm, event);
        const payload = buildPayloadFromForm(authSessionRevokeForm);
        payload.current = String(payload.current || '').trim().toLowerCase() === 'true';
        const currentSessionId = getCurrentAdminSessionId();
        const revokesCurrent =
          payload.current === true
          || (!payload.sessionId && !payload.targetUser)
          || (payload.sessionId && payload.sessionId === currentSessionId)
          || (payload.targetUser && payload.targetUser === currentUserName);
        try {
          await runWithButtonState(submitButton, '????? revoke...', async () => {
            await api('/admin/api/auth/session/revoke', 'POST', payload);
          });
          if (revokesCurrent) {
            setAuthState(false);
            toast('revoke current session ???? ??????????????? login');
            window.setTimeout(() => {
              window.location.replace('/admin/login');
            }, 150);
            return;
          }
          authSessionRevokeForm.reset();
          await refreshSnapshot({ silent: true, syncConfigInputs: false });
          toast('revoke session ????');
        } catch (error) {
          toast(error.message || 'revoke session ?????????');
        }
      });
    }

    if (authSessionTableWrap) {
      authSessionTableWrap.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-auth-session-revoke]');
        if (!button) return;
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const sessionId = String(button.getAttribute('data-auth-session-revoke') || '').trim();
        const isCurrent = String(button.getAttribute('data-auth-session-current') || '').trim() === 'true';
        if (!sessionId) {
          toast('????? session ????????');
          return;
        }
        try {
          await runWithButtonState(button, '????? revoke...', async () => {
            await api('/admin/api/auth/session/revoke', 'POST', {
              sessionId,
              reason: isCurrent ? 'manual-revoke-current' : 'manual-revoke-session',
            });
          });
          if (isCurrent) {
            setAuthState(false);
            toast('revoke current session ???? ??????????????? login');
            window.setTimeout(() => {
              window.location.replace('/admin/login');
            }, 150);
            return;
          }
          await refreshSnapshot({ silent: true, syncConfigInputs: false });
          toast(`revoke session ????: ${sessionId}`);
        } catch (error) {
          toast(error.message || 'revoke session ?????????');
        }
      });
    }

    if (controlPanelRefreshBtn) {
      controlPanelRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(controlPanelRefreshBtn, '?????????...', async () => {
            await refreshSnapshot({ silent: true, syncConfigInputs: true, forceCardsRefresh: true });
          });
          toast('?????? Control Panel ????');
        } catch (error) {
          toast(error.message || '?????? Control Panel ?????????');
        }
      });
    }

    if (controlRestartNowBtn) {
      controlRestartNowBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const target = getSelectedControlRestartTarget();
        if (!target) {
          toast('????? service ?????????? restart ????');
          return;
        }
        try {
          await runWithButtonState(controlRestartNowBtn, '????? restart...', async () => {
            await restartManagedServiceSelection(target, 'runtime service');
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true, forceCardsRefresh: true });
        } catch (error) {
          toast(error.message || 'restart service ?????????');
        }
      });
    }

    document.querySelectorAll('[data-control-open-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tabKey = String(button.getAttribute('data-control-open-tab') || '').trim();
        if (tabKey) {
          activateTab(tabKey);
        }
      });
    });

    if (controlDiscordForm) {
      controlDiscordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(controlDiscordForm, event);
        const restartTarget = getSelectedControlRestartTarget();
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/config/patch', 'POST', {
              patch: buildControlDiscordPatch(),
            });
            if (hasRoleAtLeast(currentUserRole, 'owner')) {
              await api('/admin/api/control-panel/env', 'POST', {
                root: {
                  DISCORD_GUILD_ID: String(cpGuildId?.value || '').trim(),
                },
              });
              if (restartTarget) {
                await restartManagedServiceSelection(restartTarget, 'Discord / Access');
              }
            }
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????? Discord / Access ????');
        } catch (error) {
          toast(error.message || '?????? Discord / Access ?????????');
        }
      });
    }

    if (controlCommandForm) {
      controlCommandForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(controlCommandForm, event);
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/config/patch', 'POST', {
              patch: buildControlCommandPatch(),
            });
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????????????????????');
        } catch (error) {
          toast(error.message || '??????????????????????????');
        }
      });
    }

    if (controlDeliveryForm) {
      controlDeliveryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(controlDeliveryForm, event);
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/config/patch', 'POST', {
              patch: buildControlDeliveryPatch(),
            });
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????? Delivery Flow ????');
        } catch (error) {
          toast(error.message || '?????? Delivery Flow ?????????');
        }
      });
    }

    if (controlEnvRuntimeForm) {
      controlEnvRuntimeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const submitButton = getSubmitButton(controlEnvRuntimeForm, event);
        const restartTarget = getSelectedControlRestartTarget();
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/control-panel/env', 'POST', buildRuntimeEnvPatch());
            if (restartTarget) {
              await restartManagedServiceSelection(restartTarget, 'Runtime Flags');
            }
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????? Runtime Flags ????');
        } catch (error) {
          toast(error.message || '?????? Runtime Flags ?????????');
        }
      });
    }

    if (controlRconAgentForm) {
      controlRconAgentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const submitButton = getSubmitButton(controlRconAgentForm, event);
        const restartTarget = getSelectedControlRestartTarget();
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/control-panel/env', 'POST', buildRconAgentEnvPatch());
            if (restartTarget) {
              await restartManagedServiceSelection(restartTarget, 'RCON / Agent');
            }
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????? RCON / Agent ????');
        } catch (error) {
          toast(error.message || '?????? RCON / Agent ?????????');
        }
      });
    }

    if (controlWatcherForm) {
      controlWatcherForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const submitButton = getSubmitButton(controlWatcherForm, event);
        const restartTarget = getSelectedControlRestartTarget();
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/control-panel/env', 'POST', buildWatcherPortalEnvPatch());
            if (restartTarget) {
              await restartManagedServiceSelection(restartTarget, 'Watcher / Portal');
            }
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????? Watcher / Portal ????');
        } catch (error) {
          toast(error.message || '?????? Watcher / Portal ?????????');
        }
      });
    }

    if (controlAdminUserForm) {
      controlAdminUserForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        if (!hasRoleAtLeast(currentUserRole, 'owner')) {
          toast('???????????? owner');
          return;
        }
        const submitButton = getSubmitButton(controlAdminUserForm, event);
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await api('/admin/api/auth/user', 'POST', {
              username: String(cpAdminUserName?.value || '').trim(),
              role: String(cpAdminUserRole?.value || 'mod').trim() || 'mod',
              isActive: String(cpAdminUserActive?.value || 'true') === 'true',
              password: String(cpAdminUserPassword?.value || '').trim(),
            });
          });
          if (cpAdminUserPassword) {
            cpAdminUserPassword.value = '';
          }
          await refreshSnapshot({ silent: true, syncConfigInputs: true });
          toast('?????? Admin User ????');
        } catch (error) {
          toast(error.message || '?????? Admin User ?????????');
        }
      });
    }

    if (stepUpConfirmBtn) {
      stepUpConfirmBtn.addEventListener('click', () => {
        submitStepUpModal();
      });
    }

    if (stepUpCancelBtn) {
      stepUpCancelBtn.addEventListener('click', () => {
        rejectPendingStepUp();
      });
    }

    if (stepUpOtpInput) {
      stepUpOtpInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          submitStepUpModal();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          rejectPendingStepUp();
        }
      });
    }

    if (stepUpModal) {
      stepUpModal.addEventListener('click', (event) => {
        if (event.target === stepUpModal) {
          rejectPendingStepUp();
        }
      });
    }

    if (deliveryCapabilityPresetRefreshBtn) {
      deliveryCapabilityPresetRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(deliveryCapabilityPresetRefreshBtn, '?????????...', async () => {
            await refreshDeliveryCapabilities();
          });
          toast('?????? command catalog ????');
        } catch (error) {
          toast(error.message || '???? command catalog ?????????');
        }
      });
    }

    if (deliveryCapabilitySelect) {
      deliveryCapabilitySelect.addEventListener('change', () => {
        const selected = findDeliveryCapabilityById(deliveryCapabilitySelect.value, 'builtin');
        if (!selected) return;
        if (deliveryCapabilityPresetSelect) {
          deliveryCapabilityPresetSelect.value = '';
        }
        applyDeliveryCapabilityToForms(selected);
      });
    }

    if (deliveryCapabilityPresetSelect) {
      deliveryCapabilityPresetSelect.addEventListener('change', () => {
        const selected = findDeliveryCapabilityById(deliveryCapabilityPresetSelect.value, 'preset');
        if (!selected) return;
        if (deliveryCapabilitySelect) {
          deliveryCapabilitySelect.value = '';
        }
        applyDeliveryCapabilityToForms(selected);
      });
    }

    if (deliveryCapabilityPresetManageSelect) {
      deliveryCapabilityPresetManageSelect.addEventListener('change', () => {
        const selected = findDeliveryCapabilityById(deliveryCapabilityPresetManageSelect.value, 'preset');
        if (!selected) {
          if (deliveryCapabilityPresetForm) {
            deliveryCapabilityPresetForm.reset();
          }
          return;
        }
        applyDeliveryCapabilityToForms(selected);
      });
    }

    if (deliveryCapabilityPresetDeleteBtn && deliveryCapabilityPresetManageSelect) {
      deliveryCapabilityPresetDeleteBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const presetId = String(deliveryCapabilityPresetManageSelect.value || '').trim();
        if (!presetId) {
          toast('????? preset ??????');
          return;
        }
        const selected = findDeliveryCapabilityById(presetId, 'preset');
        if (!selected) {
          toast('????? preset ????????');
          return;
        }
        if (!window.confirm(`?? preset "${selected.name}" ?`)) {
          return;
        }
        try {
          await runWithButtonState(deliveryCapabilityPresetDeleteBtn, '???????...', async () => {
            await api('/admin/api/delivery/capability-preset/delete', 'POST', { presetId });
          });
          await refreshDeliveryCapabilities();
          if (deliveryCapabilityPresetForm) {
            deliveryCapabilityPresetForm.reset();
          }
          toast(`?? preset: ${selected.name}`);
        } catch (error) {
          toast(error.message || '?? preset ?????????');
        }
      });
    }

    if (adminNotificationRefreshBtn) {
      adminNotificationRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(adminNotificationRefreshBtn, '?????????...', async () => {
            await refreshAdminNotifications();
          });
          toast('?????? notification ????');
        } catch (error) {
          toast(error.message || '?????? notification ?????????');
        }
      });
    }

    if (adminNotificationAckBtn) {
      adminNotificationAckBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const selectedIds = getSelectedAdminNotificationIds();
        const ids = selectedIds.length > 0
          ? selectedIds
          : currentAdminNotifications
            .filter((row) => !row?.acknowledgedAt)
            .map((row) => String(row?.id || '').trim())
            .filter(Boolean);
        if (ids.length === 0) {
          toast('????? notification ??????????????');
          return;
        }
        try {
          await runWithButtonState(adminNotificationAckBtn, '????????????...', async () => {
            await api('/admin/api/notifications/ack', 'POST', { ids });
          });
          await refreshAdminNotifications();
          toast(`??????????? ${ids.length} ??????`);
        } catch (error) {
          toast(error.message || '??????? notification ?????????');
        }
      });
    }

    if (adminNotificationClearBtn) {
      adminNotificationClearBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(adminNotificationClearBtn, '???????...', async () => {
            await api('/admin/api/notifications/clear', 'POST', { acknowledgedOnly: true });
          });
          await refreshAdminNotifications();
          toast('?? notification ??????????????');
        } catch (error) {
          toast(error.message || '?? notification ?????????');
        }
      });
    }

    if (deliveryQueueApplyFilterBtn) {
      deliveryQueueApplyFilterBtn.addEventListener('click', () => {
        currentDeliveryQueueErrorFilter = String(deliveryQueueErrorFilterInput?.value || '').trim();
        currentDeliveryQueueSearch = String(deliveryQueueSearchInput?.value || '').trim();
        renderDeliveryQueueTable(snapshot?.deliveryQueue || []);
      });
    }

    if (deliveryDeadApplyFilterBtn) {
      deliveryDeadApplyFilterBtn.addEventListener('click', () => {
        currentDeliveryDeadErrorFilter = String(deliveryDeadErrorFilterInput?.value || '').trim();
        currentDeliveryDeadSearch = String(deliveryDeadSearchInput?.value || '').trim();
        renderDeliveryDeadLetterTable(snapshot?.deliveryDeadLetters || []);
      });
    }

    if (deliveryQueueRetryManyBtn) {
      deliveryQueueRetryManyBtn.addEventListener('click', async () => {
        const codes = getSelectedDeliveryCodes(deliveryQueueTableWrap, 'data-delivery-select');
        if (codes.length === 0) {
          toast('????????????? retry ????');
          return;
        }
        try {
          await runWithButtonState(deliveryQueueRetryManyBtn, '????? retry ??????????...', async () => {
            await api('/admin/api/delivery/retry-many', 'POST', { codes });
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: false });
          toast(`???? retry ???? ${codes.length} ??????`);
        } catch (error) {
          toast(error.message || 'retry ???????????????????');
        }
      });
    }

    if (deliveryDeadRetryManyBtn) {
      deliveryDeadRetryManyBtn.addEventListener('click', async () => {
        const codes = getSelectedDeliveryCodes(deliveryDeadLetterTableWrap, 'data-delivery-dead-select');
        if (codes.length === 0) {
          toast('??????????? dead-letter ???? requeue');
          return;
        }
        try {
          await runWithButtonState(deliveryDeadRetryManyBtn, '????? requeue ??????????...', async () => {
            await api('/admin/api/delivery/dead-letter/retry-many', 'POST', { codes });
          });
          await refreshSnapshot({ silent: true, syncConfigInputs: false });
          toast(`requeue ???? ${codes.length} ??????`);
        } catch (error) {
          toast(error.message || 'requeue ???????????????????');
        }
      });
    }

    if (deliveryPreflightForm) {
      deliveryPreflightForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliveryPreflightForm, event);
        const payload = buildPayloadFromForm(deliveryPreflightForm);
        try {
          await runWithButtonState(submitButton, '?????????...', async () => {
            await runDeliveryPreflightRequest(payload);
          });
          toast('???? preflight ????');
        } catch (error) {
          if (deliveryPreflightView) {
            deliveryPreflightView.textContent = String(error.message || error);
          }
          toast(error.message || '???? preflight ?????????');
        }
      });
    }

    if (deliveryPreviewForm) {
      deliveryPreviewForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliveryPreviewForm, event);
        const payload = buildPayloadFromForm(deliveryPreviewForm);
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            await previewDeliveryCommand(payload);
          });
          toast('?????????????????????');
        } catch (error) {
          if (deliveryPreviewView) {
            deliveryPreviewView.textContent = String(error.message || error);
          }
          toast(error.message || '?????????????????????');
        }
      });
    }

    if (deliverySimulateForm) {
      deliverySimulateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliverySimulateForm, event);
        const payload = buildPayloadFromForm(deliverySimulateForm);
        try {
          await runWithButtonState(submitButton, '??????????...', async () => {
            await simulateDelivery(payload);
          });
          toast('????? delivery plan ????');
        } catch (error) {
          if (deliverySimulateView) {
            deliverySimulateView.textContent = String(error.message || error);
          }
          toast(error.message || 'simulate delivery ?????????');
        }
      });
    }

    if (deliveryCommandTemplateLoadBtn && deliveryCommandTemplateForm) {
      deliveryCommandTemplateLoadBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const payload = buildPayloadFromForm(deliveryCommandTemplateForm);
        try {
          await runWithButtonState(deliveryCommandTemplateLoadBtn, '?????????...', async () => {
            await loadDeliveryCommandTemplate(payload);
          });
          toast('???? command template ????');
        } catch (error) {
          if (deliveryCommandTemplateView) {
            deliveryCommandTemplateView.textContent = String(error.message || error);
          }
          toast(error.message || '???? command template ?????????');
        }
      });
    }

    if (deliveryCommandTemplateDeleteBtn && deliveryCommandTemplateForm) {
      deliveryCommandTemplateDeleteBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const payload = buildPayloadFromForm(deliveryCommandTemplateForm);
        try {
          await runWithButtonState(deliveryCommandTemplateDeleteBtn, '???????...', async () => {
            const res = await api('/admin/api/delivery/command-template', 'POST', {
              ...payload,
              clear: true,
            });
            renderDeliveryCommandTemplate(res?.data || null);
          });
          await refreshAdminNotifications().catch(() => null);
          toast('?? command template override ????');
        } catch (error) {
          if (deliveryCommandTemplateView) {
            deliveryCommandTemplateView.textContent = String(error.message || error);
          }
          toast(error.message || '?? command template ?????????');
        }
      });
    }

    if (deliveryCommandTemplateForm) {
      deliveryCommandTemplateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliveryCommandTemplateForm, event);
        const payload = buildPayloadFromForm(deliveryCommandTemplateForm);
        if (payload.commands) {
          payload.commands = String(payload.commands)
            .split(/\r?\n/)
            .map((row) => row.trim())
            .filter(Boolean);
        }
        try {
          await runWithButtonState(submitButton, '???????????...', async () => {
            const res = await api('/admin/api/delivery/command-template', 'POST', payload);
            renderDeliveryCommandTemplate(res?.data || null);
          });
          await refreshAdminNotifications().catch(() => null);
          toast('?????? command template ????');
        } catch (error) {
          if (deliveryCommandTemplateView) {
            deliveryCommandTemplateView.textContent = String(error.message || error);
          }
          toast(error.message || '?????? command template ?????????');
        }
      });
    }

    if (deliveryTestSendForm) {
      deliveryTestSendForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliveryTestSendForm, event);
        const payload = buildPayloadFromForm(deliveryTestSendForm);
        try {
          await runWithButtonState(submitButton, '???????? test item...', async () => {
            const res = await api('/admin/api/delivery/test-send', 'POST', payload);
            if (deliveryTestSendView) {
              deliveryTestSendView.textContent = JSON.stringify(res?.data || {}, null, 2);
            }
          });
          if (String(payload.purchaseCode || '').trim()) {
            await loadDeliveryDetail(String(payload.purchaseCode || '').trim(), {
              silent: true,
              preserveStatus: true,
            });
          }
          await refreshSnapshot({ silent: true, syncConfigInputs: false });
          toast('??? test item ????');
        } catch (error) {
          if (deliveryTestSendView) {
            deliveryTestSendView.textContent = String(error.message || error);
          }
          toast(error.message || '??? test item ?????????');
        }
      });
    }

    if (deliveryCapabilityTestForm) {
      deliveryCapabilityTestForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliveryCapabilityTestForm, event);
        const payload = buildPayloadFromForm(deliveryCapabilityTestForm);
        payload.dryRun = String(payload.dryRun || '').toLowerCase() === 'true';
        try {
          await runWithButtonState(submitButton, payload.dryRun ? '??????????...' : '????? execute...', async () => {
            const res = await api('/admin/api/delivery/capability-test', 'POST', payload);
            renderDeliveryCapabilityResult(res?.data || null);
          });
          toast(payload.dryRun ? '????? capability dry run ????' : '??? capability test ????');
        } catch (error) {
          if (deliveryCapabilityView) {
            deliveryCapabilityView.textContent = String(error.message || error);
          }
          toast(error.message || '??? capability test ?????????');
        }
      });
    }

    if (deliveryCapabilityPresetForm) {
      deliveryCapabilityPresetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(deliveryCapabilityPresetForm, event);
        const payload = buildPayloadFromForm(deliveryCapabilityPresetForm);
        if (payload.commands) {
          payload.commands = String(payload.commands)
            .split(/\r?\n/)
            .map((row) => row.trim())
            .filter(Boolean);
        }
        if (payload.tags) {
          payload.tags = String(payload.tags)
            .split(',')
            .map((row) => row.trim())
            .filter(Boolean);
        }
        try {
          await runWithButtonState(submitButton, '??????????? preset...', async () => {
            const res = await api('/admin/api/delivery/capability-preset', 'POST', payload);
            if (deliveryCapabilityPresetView) {
              deliveryCapabilityPresetView.textContent = JSON.stringify(res?.data || {}, null, 2);
            }
          });
          await refreshDeliveryCapabilities();
          const selectedId = String(deliveryCapabilityPresetManageSelect?.value || payload.id || '').trim();
          const selected = findDeliveryCapabilityById(selectedId, 'preset');
          if (selected) {
            applyDeliveryCapabilityToForms(selected);
          }
          toast('?????? capability preset ????');
        } catch (error) {
          if (deliveryCapabilityPresetView) {
            deliveryCapabilityPresetView.textContent = String(error.message || error);
          }
          toast(error.message || '?????? capability preset ?????????');
        }
      });
    }

    if (deliveryOpsRefreshBtn) {
      deliveryOpsRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(
            deliveryOpsRefreshBtn,
            '????????????????...',
            async () => {
              await refreshSnapshot({ silent: true, syncConfigInputs: false });
            },
          );
          toast('?????????????????????');
        } catch (error) {
          toast(error.message || '??????????????????????????');
        }
      });
    }

    if (platformRefreshBtn) {
      platformRefreshBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(platformRefreshBtn, '???????????...', async () => {
            await refreshSnapshot({ silent: true, syncConfigInputs: false, forceCardsRefresh: true });
            await refreshPlatformCenter({
              forceOverview: true,
              forceReconcile: true,
              fetchOpsState: true,
            });
          });
          toast('?????? Platform Center ????');
        } catch (error) {
          toast(error.message || '?????? Platform Center ?????????');
        }
      });
    }

    if (platformRunMonitoringBtn) {
      platformRunMonitoringBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(platformRunMonitoringBtn, '????????...', async () => {
            const res = await api('/admin/api/platform/monitoring/run', 'POST', {});
            currentPlatformMonitoringReport = res?.data || null;
            await refreshSnapshot({ silent: true, syncConfigInputs: false });
            await refreshPlatformCenter({
              forceOverview: true,
              forceReconcile: true,
              fetchOpsState: true,
            });
          });
          toast('??? platform monitoring ????');
        } catch (error) {
          toast(error.message || '??? platform monitoring ?????????');
        }
      });
    }

    if (platformRunReconcileBtn) {
      platformRunReconcileBtn.addEventListener('click', async () => {
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        try {
          await runWithButtonState(platformRunReconcileBtn, '????? reconcile...', async () => {
            const res = await api('/admin/api/platform/reconcile');
            currentPlatformReconcile = res?.data || null;
            await refreshPlatformCenter({
              forceOverview: false,
              forceReconcile: false,
              fetchOpsState: true,
            });
          });
          toast('??? delivery reconcile ????');
        } catch (error) {
          toast(error.message || '??? delivery reconcile ?????????');
        }
      });
    }

    document.querySelectorAll('form[data-endpoint]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAuthed) {
          toast('????????????????????');
          return;
        }
        const submitButton = getSubmitButton(form, event);
        try {
          await runWithButtonState(submitButton, '????????...', async () => {
            await submitForm(form);
          });
        } catch (err) {
          setStatus('???????????????', '#ff6b7b');
          toast(err.message);
        }
      });
    });

    configLoadBtn.addEventListener('click', async () => {
      if (!isAuthed) {
        toast('????????????????????');
        return;
      }
      if (!snapshot) {
        await runWithButtonState(configLoadBtn, '?????????...', async () => {
          await refreshSnapshot();
        });
      }
      fillConfigEditorFromSnapshot();
      toast('???? config ????????????');
    });

    configPatchBtn.addEventListener('click', async () => {
      if (!isAuthed) {
        toast('????????????????????');
        return;
      }
      try {
        await runWithButtonState(configPatchBtn, '????? patch...', async () => {
          const patch = parseConfigEditorValue();
          await api('/admin/api/config/patch', 'POST', { patch });
        });
        toast('????????? patch ????');
        await refreshSnapshot();
      } catch (err) {
        setStatus('???????????????', '#ff6b7b');
        toast(err.message);
      }
    });

    simpleLoadBtn.addEventListener('click', async () => {
      if (!isAuthed) {
        toast('????????????????????');
        return;
      }
      await runWithButtonState(simpleLoadBtn, '?????????...', async () => {
        if (!snapshot) {
          await refreshSnapshot();
        } else {
          fillSimpleConfigFromSnapshot();
        }
      });
      toast('??????????????????????');
    });

    simpleConfigForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!isAuthed) {
        toast('????????????????????');
        return;
      }
      const submitButton = getSubmitButton(simpleConfigForm, event);
      try {
        await runWithButtonState(submitButton, '???????????...', async () => {
          const patch = buildSimpleConfigPatch();
          if (Object.keys(patch).length === 0) {
            throw new Error('??????????????????????');
          }
          await api('/admin/api/config/patch', 'POST', { patch });
        });
        toast('???????????????????????');
        await refreshSnapshot();
      } catch (err) {
        setStatus('???????????????', '#ff6b7b');
        toast(err.message);
      }
    });

    configEditorForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!isAuthed) {
        toast('????????????????????');
        return;
      }
      const submitButton = getSubmitButton(configEditorForm, event);
      try {
        await runWithButtonState(submitButton, '???????????...', async () => {
          const nextConfig = parseConfigEditorValue();
          await api('/admin/api/config/set', 'POST', { config: nextConfig });
        });
        toast('?????? config ????');
        await refreshSnapshot();
      } catch (err) {
        setStatus('???????????????', '#ff6b7b');
        toast(err.message);
      }
    });

    configResetBtn.addEventListener('click', async () => {
      if (!isAuthed) {
        toast('????????????????????');
        return;
      }
      if (!window.confirm('?????????????????????????????????????????')) {
        return;
      }
      try {
        await runWithButtonState(configResetBtn, '???????????...', async () => {
          await api('/admin/api/config/reset', 'POST', {});
        });
        toast('?????? config ????');
        await refreshSnapshot();
        fillConfigEditorFromSnapshot();
      } catch (err) {
        setStatus('???????????????', '#ff6b7b');
        toast(err.message);
      }
    });

    for (const btn of tabButtons) {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
      });
    }

    overviewTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabKey = String(btn.dataset.overviewTab || '').trim();
        if (tabKey) {
          activateTab(tabKey);
        }
      });
    });

    if (tabSearchInput) {
      tabSearchInput.addEventListener('input', () => {
        applyTabFilter(tabSearchInput.value);
      });
    }

    applyTheme(loadPreferredTheme(), false);
    syncAuthFiltersFromQueryParams();
    renderAuditPresetOptions('');
    syncAuditControlsFromState();
    activateTab(getInitialActiveTabKey());
    applyTabFilter('');
    updateLiveToggleUi();
    setShopCatalogSource('manifest', { reload: false });
    updateShopKindUi();
    setAuthState(false);
    checkSession();
  




