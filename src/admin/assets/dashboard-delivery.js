/**
 * Dashboard delivery and notification UI helpers split out of the former dashboard monolith
 * so the admin control panel runtime is easier to review without changing behavior.
 */    async function refreshDeliveryCapabilities() {
      const res = await api('/admin/api/delivery/capabilities');
      currentDeliveryCapabilities = res?.data && typeof res.data === 'object'
        ? res.data
        : { builtin: [], presets: [] };
      renderDeliveryCapabilityOptions();
      renderOverviewPanel();
      return currentDeliveryCapabilities;
    }

    function renderDeliveryCapabilityResult(data = null) {
      currentDeliveryCapabilityResult = data && typeof data === 'object' ? data : null;
      if (deliveryCapabilitySummary) {
        const metrics = currentDeliveryCapabilityResult
          ? [
              ['Ready', currentDeliveryCapabilityResult.ready ? 'yes' : 'no'],
              ['Dry-run', currentDeliveryCapabilityResult.dryRun ? 'yes' : 'no'],
              ['Commands', Number(currentDeliveryCapabilityResult.summary?.commandCount || 0).toLocaleString()],
              ['Mode', currentDeliveryCapabilityResult.summary?.executionMode || '-'],
              ['Verify', currentDeliveryCapabilityResult.summary?.verificationMode || '-'],
            ]
          : [['Capability', 'ยังไม่มีข้อมูล']];
        deliveryCapabilitySummary.innerHTML = metrics
          .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
          .join('');
      }
      renderTimelineCards(
        deliveryCapabilityTimeline,
        Array.isArray(currentDeliveryCapabilityResult?.timeline) ? currentDeliveryCapabilityResult.timeline : [],
        'ยังไม่มีผล capability test',
      );
      if (deliveryCapabilityView) {
        deliveryCapabilityView.textContent = JSON.stringify(currentDeliveryCapabilityResult || {}, null, 2);
      }
    }

    async function refreshAdminNotifications() {
      const res = await api('/admin/api/notifications?limit=80');
      currentAdminNotifications = Array.isArray(res?.data?.items) ? res.data.items : [];
      if (adminNotificationSummary) {
        const unacked = currentAdminNotifications.filter((row) => !row?.acknowledgedAt).length;
        const metrics = [
          ['ทั้งหมด', currentAdminNotifications.length.toLocaleString()],
          ['ยังไม่รับทราบ', unacked.toLocaleString()],
          ['Severity สูง', currentAdminNotifications.filter((row) => String(row?.severity || '').toLowerCase() === 'error').length.toLocaleString()],
        ];
        adminNotificationSummary.innerHTML = metrics
          .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
          .join('');
      }
      if (adminNotificationList) {
        if (currentAdminNotifications.length === 0) {
          adminNotificationList.innerHTML = '<div style="padding:12px; color:#9eb0d9;">ยังไม่มี notification</div>';
        } else {
          adminNotificationList.innerHTML = `<div class="notification-list">${currentAdminNotifications.map((row) => {
            const severity = String(row?.severity || '').trim().toLowerCase();
            return [
              `<article class="notification-card ${severity === 'error' ? 'is-error' : severity === 'warn' ? 'is-warn' : ''}">`,
              `<label class="row-actions"><input type="checkbox" data-admin-notification-select="${escapeHtml(String(row?.id || ''))}"><strong>${escapeHtml(String(row?.title || row?.kind || 'Notification'))}</strong></label>`,
              `<div class="delivery-cell-sub">${escapeHtml(String(row?.message || '-'))}</div>`,
              `<div class="timeline-meta"><span>${escapeHtml(formatDeliveryTime(row?.createdAt || ''))}</span><span>${escapeHtml(String(row?.type || '-'))}</span><span>${escapeHtml(String(row?.severity || '-'))}</span><span>${escapeHtml(String(row?.acknowledgedAt ? `acked by ${row.acknowledgedBy || 'unknown'}` : 'unacked'))}</span></div>`,
              '</article>',
            ].join('');
          }).join('')}</div>`;
        }
      }
      renderOverviewPanel();
      return currentAdminNotifications;
    }

    function getSelectedAdminNotificationIds() {
      if (!adminNotificationList) return [];
      return Array.from(adminNotificationList.querySelectorAll('input[data-admin-notification-select]:checked'))
        .map((input) => String(input.getAttribute('data-admin-notification-select') || '').trim())
        .filter(Boolean);
    }

    function formatDeliveryTime(value) {
      const text = String(value || '').trim();
      if (!text) return '-';
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return text;
      return date.toLocaleString('th-TH', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
    }

    function summarizeDeliveryItems(row) {
      const items = Array.isArray(row?.deliveryItems) ? row.deliveryItems : [];
      if (items.length > 0) {
        const joined = items
          .slice(0, 3)
          .map((entry) => {
            const gameItemId = String(entry?.gameItemId || '').trim() || '-';
            const quantity = Math.max(1, Number(entry?.quantity || 1));
            return `${gameItemId} x${quantity}`;
          })
          .join(', ');
        return items.length > 3 ? `${joined} +${items.length - 3}` : joined;
      }
      const gameItemId = String(row?.gameItemId || '').trim();
      const quantity = Math.max(1, Number(row?.quantity || 1));
      if (gameItemId) {
        return `${gameItemId} x${quantity}`;
      }
      return String(row?.itemName || row?.itemId || '-').trim() || '-';
    }

    function getSelectedDeliveryCodes(container, attributeName) {
      if (!container) return [];
      return Array.from(container.querySelectorAll(`input[${attributeName}]:checked`))
        .map((input) => String(input.getAttribute(attributeName) || '').trim())
        .filter(Boolean);
    }

    function renderDeliveryStepLog(stepRows = []) {
      renderTimelineCards(
        deliveryDetailStepLog,
        Array.isArray(stepRows) ? stepRows : [],
        'ยังไม่มี step log',
      );
    }

    function prefillDeliveryFormsFromDetail(detail) {
      const preview = detail?.preview && typeof detail.preview === 'object'
        ? detail.preview
        : null;
      const purchase = detail?.purchase && typeof detail.purchase === 'object'
        ? detail.purchase
        : null;
      const link = detail?.link && typeof detail.link === 'object'
        ? detail.link
        : null;
      const itemId = String(preview?.itemId || purchase?.itemId || '').trim();
      const gameItemId = String(preview?.gameItemId || purchase?.gameItemId || '').trim();
      const itemName = String(preview?.itemName || purchase?.itemName || '').trim();
      const quantity = Math.max(
        1,
        Number(
          preview?.quantity
            || purchase?.quantity
            || preview?.deliveryItems?.[0]?.quantity
            || 1,
        ),
      );
      const steamId = String(link?.steamId || '').trim();
      const purchaseCode = String(detail?.purchaseCode || purchase?.code || '').trim();

      if (deliveryPreviewForm) {
        const itemIdInput = deliveryPreviewForm.elements.namedItem('itemId');
        const gameItemIdInput = deliveryPreviewForm.elements.namedItem('gameItemId');
        const itemNameInput = deliveryPreviewForm.elements.namedItem('itemName');
        const quantityInput = deliveryPreviewForm.elements.namedItem('quantity');
        const steamIdInput = deliveryPreviewForm.elements.namedItem('steamId');
        if (itemIdInput) itemIdInput.value = itemId;
        if (gameItemIdInput) gameItemIdInput.value = gameItemId;
        if (itemNameInput) itemNameInput.value = itemName;
        if (quantityInput) quantityInput.value = String(quantity);
        if (steamIdInput) steamIdInput.value = steamId;
      }

      if (deliveryPreflightForm) {
        const itemIdInput = deliveryPreflightForm.elements.namedItem('itemId');
        const gameItemIdInput = deliveryPreflightForm.elements.namedItem('gameItemId');
        const steamIdInput = deliveryPreflightForm.elements.namedItem('steamId');
        const inGameNameInput = deliveryPreflightForm.elements.namedItem('inGameName');
        if (itemIdInput) itemIdInput.value = itemId;
        if (gameItemIdInput) gameItemIdInput.value = gameItemId;
        if (steamIdInput) steamIdInput.value = steamId;
        if (inGameNameInput) inGameNameInput.value = String(link?.inGameName || '').trim();
      }

      if (deliverySimulateForm) {
        const itemIdInput = deliverySimulateForm.elements.namedItem('itemId');
        const gameItemIdInput = deliverySimulateForm.elements.namedItem('gameItemId');
        const itemNameInput = deliverySimulateForm.elements.namedItem('itemName');
        const quantityInput = deliverySimulateForm.elements.namedItem('quantity');
        const steamIdInput = deliverySimulateForm.elements.namedItem('steamId');
        if (itemIdInput) itemIdInput.value = itemId;
        if (gameItemIdInput) gameItemIdInput.value = gameItemId;
        if (itemNameInput) itemNameInput.value = itemName;
        if (quantityInput) quantityInput.value = String(quantity);
        if (steamIdInput) steamIdInput.value = steamId;
      }

      if (deliveryCommandTemplateForm) {
        const lookupKeyInput = deliveryCommandTemplateForm.elements.namedItem('lookupKey');
        const itemIdInput = deliveryCommandTemplateForm.elements.namedItem('itemId');
        const gameItemIdInput = deliveryCommandTemplateForm.elements.namedItem('gameItemId');
        if (lookupKeyInput && !String(lookupKeyInput.value || '').trim()) {
          lookupKeyInput.value = itemId || gameItemId;
        }
        if (itemIdInput && !String(itemIdInput.value || '').trim()) itemIdInput.value = itemId;
        if (gameItemIdInput && !String(gameItemIdInput.value || '').trim()) gameItemIdInput.value = gameItemId;
      }

      if (deliveryTestSendForm) {
        const itemIdInput = deliveryTestSendForm.elements.namedItem('itemId');
        const gameItemIdInput = deliveryTestSendForm.elements.namedItem('gameItemId');
        const quantityInput = deliveryTestSendForm.elements.namedItem('quantity');
        const steamIdInput = deliveryTestSendForm.elements.namedItem('steamId');
        const purchaseCodeInput = deliveryTestSendForm.elements.namedItem('purchaseCode');
        if (itemIdInput) itemIdInput.value = itemId;
        if (gameItemIdInput) gameItemIdInput.value = gameItemId;
        if (quantityInput) quantityInput.value = String(quantity);
        if (steamIdInput) steamIdInput.value = steamId;
        if (purchaseCodeInput) purchaseCodeInput.value = purchaseCode;
      }
    }

    function renderDeliveryDetail(detail = null) {
      currentDeliveryDetailData = detail || null;
      if (!deliveryDetailSummary || !deliveryDetailView) return;
      if (!detail) {
        deliveryDetailSummary.innerHTML =
          '<div class="metric"><div class="k">Delivery Detail</div><div class="v">ยังไม่ได้เลือก purchase code</div></div>';
        renderDeliveryStepLog([]);
        deliveryDetailView.textContent = 'ยังไม่ได้เลือก purchase code';
        return;
      }

      if (detail?.error) {
        deliveryDetailSummary.innerHTML =
          `<div class="metric"><div class="k">Purchase Code</div><div class="v">${escapeHtml(String(detail.purchaseCode || '-'))}</div></div>` +
          `<div class="metric"><div class="k">สถานะ</div><div class="v">โหลดไม่สำเร็จ</div></div>`;
        renderDeliveryStepLog([]);
        deliveryDetailView.textContent = String(detail.error || 'โหลด delivery detail ไม่สำเร็จ');
        return;
      }

      const purchase = detail.purchase || null;
      const queueJob = detail.queueJob || null;
      const deadLetter = detail.deadLetter || null;
      const latestOutputs = Array.isArray(detail.latestOutputs) ? detail.latestOutputs : [];
      const evidence = detail.evidence && typeof detail.evidence === 'object' ? detail.evidence : null;
      const timeline = Array.isArray(detail.timeline) && detail.timeline.length > 0
        ? detail.timeline
        : Array.isArray(detail.stepLog)
          ? detail.stepLog
          : [];
      const metrics = [
        ['Purchase Code', detail.purchaseCode || '-'],
        ['สถานะคำสั่งซื้อ', purchase?.status || '-'],
        ['SteamID', detail.link?.steamId || '-'],
        ['Queue', queueJob ? `attempt ${Number(queueJob.attempts || 0)}` : '-'],
        ['Dead-Letter', deadLetter ? (deadLetter.reason || 'yes') : '-'],
        ['Audit Rows', Number(detail.auditRows?.length || 0).toLocaleString()],
        ['Timeline', Number(timeline.length || 0).toLocaleString()],
        ['Command Outputs', Number(latestOutputs.length || 0).toLocaleString()],
        ['Evidence Events', Number(evidence?.events?.length || 0).toLocaleString()],
      ];
      deliveryDetailSummary.innerHTML = metrics
        .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
        .join('');
      renderDeliveryStepLog(timeline);

      deliveryDetailView.textContent = JSON.stringify(
        {
          purchaseCode: detail.purchaseCode || null,
          purchase,
          queueJob,
          deadLetter,
          link: detail.link || null,
          statusHistory: Array.isArray(detail.statusHistory) ? detail.statusHistory : [],
          timeline,
          stepLog: Array.isArray(detail.stepLog) ? detail.stepLog : [],
          latestCommandSummary: detail.latestCommandSummary || null,
          latestOutputs,
          evidence,
          preview: detail.preview || null,
          auditRows: Array.isArray(detail.auditRows) ? detail.auditRows : [],
        },
        null,
        2,
      );
      prefillDeliveryFormsFromDetail(detail);
    }

    async function loadDeliveryDetail(code, options = {}) {
      const normalizedCode = String(code || '').trim();
      const { silent = false, preserveStatus = false } = options;
      if (!normalizedCode) {
        currentDeliveryDetailCode = '';
        renderDeliveryDetail(null);
        return null;
      }
      try {
        const res = await api(
          `/admin/api/delivery/detail?code=${encodeURIComponent(normalizedCode)}&limit=50`,
          'GET',
        );
        currentDeliveryDetailCode = normalizedCode;
        renderDeliveryDetail(res?.data || null);
        if (!silent) {
          toast(`โหลด command log: ${normalizedCode}`);
        }
        return res?.data || null;
      } catch (error) {
        currentDeliveryDetailCode = normalizedCode;
        renderDeliveryDetail({
          purchaseCode: normalizedCode,
          error: String(error.message || error),
        });
        if (!preserveStatus) {
          setStatus('โหลด command log ไม่สำเร็จ', '#ff6b7b', String(error.message || error), 'error');
        }
        if (!silent) {
          toast(error.message || 'โหลด command log ไม่สำเร็จ');
        }
        return null;
      }
    }

    async function performDeliveryRowAction(
      button,
      endpoint,
      payload,
      pendingText,
      successText,
      detailCode = '',
    ) {
      await runWithButtonState(button, pendingText, async () => {
        await api(endpoint, 'POST', payload);
      });
      await refreshSnapshot({ silent: true, syncConfigInputs: false });
      const code =
        String(detailCode || payload?.code || payload?.purchaseCode || '').trim();
      if (code) {
        await loadDeliveryDetail(code, { silent: true, preserveStatus: true });
      }
      toast(successText);
    }

    function renderDeliveryQueueTable(rows = []) {
      if (!deliveryQueueTableWrap) return;
      const list = (Array.isArray(rows) ? rows : []).filter((row) => {
        const errorCode = String(currentDeliveryQueueErrorFilter || '').trim().toUpperCase();
        const searchText = String(currentDeliveryQueueSearch || '').trim().toLowerCase();
        if (errorCode && String(row?.lastErrorCode || '').trim().toUpperCase() !== errorCode) {
          return false;
        }
        if (searchText) {
          const haystack = [
            row?.purchaseCode,
            row?.itemId,
            row?.itemName,
            row?.gameItemId,
            row?.userId,
            row?.lastError,
            row?.lastErrorCode,
          ]
            .map((entry) => String(entry || '').toLowerCase())
            .join(' ');
          if (!haystack.includes(searchText)) return false;
        }
        return true;
      });
      if (list.length === 0) {
        deliveryQueueTableWrap.innerHTML =
          '<div style="padding:12px; color:#9eb0d9;">ไม่มีงานคิวส่งของค้างอยู่</div>';
        return;
      }

      const canAdmin = hasRoleAtLeast(currentUserRole, 'admin');
      const body = list
        .slice(0, 100)
        .map((row) => {
          const code = String(row?.purchaseCode || '').trim();
          const itemText = summarizeDeliveryItems(row);
          const nextAttempt = formatDeliveryTime(
            row?.nextAttemptAt || row?.updatedAt || row?.createdAt,
          );
          const attemptText = `attempt ${Number(row?.attempts || 0)}`;
          const lastError = String(row?.lastError || '').trim();
          const lastErrorCode = String(row?.lastErrorCode || '').trim();
          return [
            '<tr>',
            `<td><input type="checkbox" data-delivery-select="${escapeHtml(code)}"></td>`,
            `<td><div class="delivery-cell-main"><strong>${escapeHtml(code || '-')}</strong></div><div class="delivery-cell-sub">${escapeHtml(String(row?.userId || '-'))}</div></td>`,
            `<td><div class="delivery-cell-main">${escapeHtml(itemText)}</div><div class="delivery-cell-sub">${escapeHtml(String(row?.itemName || row?.itemId || row?.gameItemId || '-'))}</div></td>`,
            `<td><div class="delivery-cell-main">${escapeHtml(attemptText)}</div><div class="delivery-cell-sub">${escapeHtml(nextAttempt)}</div></td>`,
            `<td><div class="delivery-cell-main">${escapeHtml(lastErrorCode || 'READY')}</div><div class="delivery-cell-sub">${escapeHtml(lastError || 'พร้อมส่ง')}</div></td>`,
            `<td><div class="row-actions"><button type="button" data-delivery-detail="${escapeHtml(code)}">ดู log</button><button type="button" data-delivery-retry="${escapeHtml(code)}" ${canAdmin ? '' : 'disabled'}>Retry</button><button type="button" data-delivery-cancel="${escapeHtml(code)}" ${canAdmin ? '' : 'disabled'}>Cancel</button></div></td>`,
            '</tr>',
          ].join('');
        })
        .join('');

      deliveryQueueTableWrap.innerHTML = [
        '<table><thead><tr>',
        '<th></th>',
        '<th>Purchase</th>',
        '<th>Item</th>',
        '<th>สถานะคิว</th>',
        '<th>Error</th>',
        '<th>Actions</th>',
        '</tr></thead><tbody>',
        body,
        '</tbody></table>',
      ].join('');

      Array.from(deliveryQueueTableWrap.querySelectorAll('[data-delivery-detail]')).forEach((button) => {
        button.addEventListener('click', async () => {
          const code = String(button.dataset.deliveryDetail || '').trim();
          if (!code) return;
          await loadDeliveryDetail(code);
        });
      });

      Array.from(deliveryQueueTableWrap.querySelectorAll('[data-delivery-retry]')).forEach((button) => {
        button.addEventListener('click', async () => {
          const code = String(button.dataset.deliveryRetry || '').trim();
          if (!code) return;
          try {
            await performDeliveryRowAction(
              button,
              '/admin/api/delivery/retry',
              { code },
              'กำลัง retry...',
              `สั่ง retry แล้ว: ${code}`,
              code,
            );
          } catch (error) {
            toast(error.message || 'retry queue ไม่สำเร็จ');
          }
        });
      });

      Array.from(deliveryQueueTableWrap.querySelectorAll('[data-delivery-cancel]')).forEach((button) => {
        button.addEventListener('click', async () => {
          const code = String(button.dataset.deliveryCancel || '').trim();
          if (!code) return;
          const reason = String(window.prompt('เหตุผลที่ยกเลิกคิวส่งของ', 'manual-cancel') || '').trim();
          if (!reason) return;
          try {
            await performDeliveryRowAction(
              button,
              '/admin/api/delivery/cancel',
              { code, reason },
              'กำลังยกเลิก...',
              `ยกเลิกคิวแล้ว: ${code}`,
              code,
            );
          } catch (error) {
            toast(error.message || 'ยกเลิกคิวไม่สำเร็จ');
          }
        });
      });
    }

    function renderDeliveryDeadLetterTable(rows = []) {
      if (!deliveryDeadLetterTableWrap) return;
      const list = (Array.isArray(rows) ? rows : []).filter((row) => {
        const errorCode = String(currentDeliveryDeadErrorFilter || '').trim().toUpperCase();
        const searchText = String(currentDeliveryDeadSearch || '').trim().toLowerCase();
        if (errorCode && String(row?.lastErrorCode || '').trim().toUpperCase() !== errorCode) {
          return false;
        }
        if (searchText) {
          const haystack = [
            row?.purchaseCode,
            row?.itemId,
            row?.itemName,
            row?.userId,
            row?.reason,
            row?.lastError,
            row?.lastErrorCode,
          ]
            .map((entry) => String(entry || '').toLowerCase())
            .join(' ');
          if (!haystack.includes(searchText)) return false;
        }
        return true;
      });
      if (list.length === 0) {
        deliveryDeadLetterTableWrap.innerHTML =
          '<div style="padding:12px; color:#9eb0d9;">ยังไม่มี dead-letter</div>';
        return;
      }

      const canAdmin = hasRoleAtLeast(currentUserRole, 'admin');
      const body = list
        .slice(0, 100)
        .map((row) => {
          const code = String(row?.purchaseCode || '').trim();
          const itemText = summarizeDeliveryItems(row);
          const createdAt = formatDeliveryTime(row?.createdAt || row?.updatedAt);
          const lastErrorCode = String(row?.lastErrorCode || '').trim();
          return [
            '<tr>',
            `<td><input type="checkbox" data-delivery-dead-select="${escapeHtml(code)}"></td>`,
            `<td><div class="delivery-cell-main"><strong>${escapeHtml(code || '-')}</strong></div><div class="delivery-cell-sub">${escapeHtml(String(row?.userId || '-'))}</div></td>`,
            `<td><div class="delivery-cell-main">${escapeHtml(itemText)}</div><div class="delivery-cell-sub">${escapeHtml(String(row?.itemName || row?.itemId || row?.gameItemId || '-'))}</div></td>`,
            `<td><div class="delivery-cell-main">${escapeHtml(String(row?.reason || '-'))}</div><div class="delivery-cell-sub">${escapeHtml(createdAt)}</div></td>`,
            `<td><div class="delivery-cell-main">${escapeHtml(lastErrorCode || '-')}</div><div class="delivery-cell-sub">${escapeHtml(String(row?.lastError || '-'))}</div></td>`,
            `<td><div class="row-actions"><button type="button" data-delivery-detail="${escapeHtml(code)}">ดู log</button><button type="button" data-delivery-dead-retry="${escapeHtml(code)}" ${canAdmin ? '' : 'disabled'}>Retry</button><button type="button" data-delivery-dead-delete="${escapeHtml(code)}" ${canAdmin ? '' : 'disabled'}>Delete</button></div></td>`,
            '</tr>',
          ].join('');
        })
        .join('');

      deliveryDeadLetterTableWrap.innerHTML = [
        '<table><thead><tr>',
        '<th></th>',
        '<th>Purchase</th>',
        '<th>Item</th>',
        '<th>Reason</th>',
        '<th>Error</th>',
        '<th>Actions</th>',
        '</tr></thead><tbody>',
        body,
        '</tbody></table>',
      ].join('');

      Array.from(deliveryDeadLetterTableWrap.querySelectorAll('[data-delivery-detail]')).forEach((button) => {
        button.addEventListener('click', async () => {
          const code = String(button.dataset.deliveryDetail || '').trim();
          if (!code) return;
          await loadDeliveryDetail(code);
        });
      });

      Array.from(deliveryDeadLetterTableWrap.querySelectorAll('[data-delivery-dead-retry]')).forEach((button) => {
        button.addEventListener('click', async () => {
          const code = String(button.dataset.deliveryDeadRetry || '').trim();
          if (!code) return;
          try {
            await performDeliveryRowAction(
              button,
              '/admin/api/delivery/dead-letter/retry',
              { code },
              'กำลัง retry dead-letter...',
              `สั่ง retry dead-letter แล้ว: ${code}`,
              code,
            );
          } catch (error) {
            toast(error.message || 'retry dead-letter ไม่สำเร็จ');
          }
        });
      });

      Array.from(deliveryDeadLetterTableWrap.querySelectorAll('[data-delivery-dead-delete]')).forEach((button) => {
        button.addEventListener('click', async () => {
          const code = String(button.dataset.deliveryDeadDelete || '').trim();
          if (!code) return;
          if (!window.confirm(`ลบ dead-letter ${code} ?`)) return;
          try {
            await performDeliveryRowAction(
              button,
              '/admin/api/delivery/dead-letter/delete',
              { code },
              'กำลังลบ dead-letter...',
              `ลบ dead-letter แล้ว: ${code}`,
              currentDeliveryDetailCode === code ? code : '',
            );
          } catch (error) {
            toast(error.message || 'ลบ dead-letter ไม่สำเร็จ');
          }
        });
      });
    }

    function renderDeliveryOpsTables() {
      renderDeliveryQueueTable(snapshot?.deliveryQueue || []);
      renderDeliveryDeadLetterTable(snapshot?.deliveryDeadLetters || []);
    }


