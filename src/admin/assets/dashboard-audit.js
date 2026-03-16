/**
 * Dashboard audit/dataset helpers split out of the former dashboard monolith so tabular
 * data views, paging, and exports can evolve without growing the main file.
 */
    function renderRowsToContainer(container, rows, emptyMessage = 'ไม่มีข้อมูล') {
      if (!container) return;
      if (!rows.length) {
        container.innerHTML = `<div style="padding:12px; color:#9eb0d9;">${escapeHtml(emptyMessage)}</div>`;
        return;
      }
      const keys = Array.from(
        rows.reduce((set, row) => {
          Object.keys(row || {}).forEach((key) => set.add(key));
          return set;
        }, new Set()),
      );
      const head = '<tr>' + keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('') + '</tr>';
      const body = rows
        .slice(0, 300)
        .map((row) => '<tr>' + keys.map((key) => `<td>${toCell(row?.[key])}</td>`).join('') + '</tr>')
        .join('');
      container.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }

    function renderTable(rows) {
      renderRowsToContainer(tableWrap, rows);
    }

    function normalizeAuditTimestamp(value) {
      const time = Date.parse(value || '');
      return Number.isFinite(time) ? time : 0;
    }

    function stringifyAuditValue(value) {
      if (Array.isArray(value)) {
        return value.map((entry) => stringifyAuditValue(entry)).join(', ');
      }
      if (value && typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value ?? '');
    }

    function matchesAuditQuery(row, query) {
      const normalizedQuery = String(query || '').trim().toLowerCase();
      if (!normalizedQuery) return true;
      return Object.values(row || {}).some((value) =>
        stringifyAuditValue(value).toLowerCase().includes(normalizedQuery),
      );
    }

    function passesAuditWindow(row, windowMs, timestampKeys = ['createdAt', 'time', 'claimedAt', 'statusUpdatedAt']) {
      if (!windowMs) return true;
      const now = Date.now();
      const keys = Array.isArray(timestampKeys) ? timestampKeys : ['createdAt'];
      for (const key of keys) {
        const timestamp = normalizeAuditTimestamp(row?.[key]);
        if (timestamp > 0) {
          return timestamp >= now - windowMs;
        }
      }
      return true;
    }

    function sortByNewest(rows, key = 'createdAt') {
      return [...(Array.isArray(rows) ? rows : [])].sort(
        (left, right) => normalizeAuditTimestamp(right?.[key]) - normalizeAuditTimestamp(left?.[key]),
      );
    }

    function formatAuditMetricValue(value) {
      return typeof value === 'number' && Number.isFinite(value)
        ? value.toLocaleString()
        : String(value ?? '-');
    }

    function getAuditWindowLabel(windowMs) {
      if (!windowMs) return 'ทุกช่วงเวลา';
      if (windowMs === 24 * 60 * 60 * 1000) return '24 ชั่วโมงล่าสุด';
      if (windowMs === 7 * 24 * 60 * 60 * 1000) return '7 วันล่าสุด';
      if (windowMs === 30 * 24 * 60 * 60 * 1000) return '30 วันล่าสุด';
      return `${Math.round(windowMs / (60 * 60 * 1000))} ชั่วโมงล่าสุด`;
    }

    function mapWalletAuditRow(row) {
      return {
        เวลา: row?.createdAt || '-',
        ผู้ใช้: row?.userId || '-',
        เปลี่ยนแปลง: Number(row?.delta || 0),
        ก่อนหน้า: Number(row?.balanceBefore || 0),
        หลังทำรายการ: Number(row?.balanceAfter || 0),
        เหตุผล: row?.reason || '-',
        อ้างอิง: row?.reference || '-',
        ผู้กระทำ: row?.actor || '-',
      };
    }

    function mapRewardAuditRow(row) {
      return {
        เวลา: row?.createdAt || '-',
        ผู้ใช้: row?.userId || '-',
        รางวัล: row?.reason || '-',
        จำนวน: Number(row?.delta || 0),
        ยอดหลังรับ: Number(row?.balanceAfter || 0),
        อ้างอิง: row?.reference || '-',
        ผู้กระทำ: row?.actor || '-',
      };
    }

    function mapEventAuditRow(row) {
      return {
        ID: Number(row?.id || 0),
        ชื่อกิจกรรม: row?.name || '-',
        เวลา: row?.time || '-',
        สถานะ: row?.status || '-',
        ของรางวัล: row?.reward || '-',
        ผู้เข้าร่วม: Number(row?.participantsCount || 0),
        รายชื่อผู้เข้าร่วม: Array.isArray(row?.participants) ? row.participants.join(', ') || '-' : '-',
      };
    }

    function buildAuditData(view) {
      const rewardReasonPattern = /(daily|weekly|redeem|welcome|wheel|event_reward|reward|claim)/i;
      const normalizedView = ['wallet', 'reward', 'event'].includes(view) ? view : 'wallet';
      const walletSource = sortByNewest(snapshot?.walletLedgers || []);
      const rewardSource = walletSource.filter((row) =>
        rewardReasonPattern.test(String(row?.reason || '')),
      );
      const eventSource = sortByNewest(snapshot?.events || [], 'time');

      const sourceRows = normalizedView === 'reward'
        ? rewardSource
        : normalizedView === 'event'
          ? eventSource
          : walletSource;
      const filteredRawRows = sourceRows
        .filter((row) => passesAuditWindow(row, currentAuditWindowMs))
        .filter((row) => matchesAuditQuery(row, currentAuditQuery))
        .slice(0, 500);

      const filteredRewardRows = rewardSource
        .filter((row) => passesAuditWindow(row, currentAuditWindowMs))
        .filter((row) => matchesAuditQuery(row, currentAuditQuery));

      const tableRows = normalizedView === 'reward'
        ? filteredRawRows.map(mapRewardAuditRow)
        : normalizedView === 'event'
          ? filteredRawRows.map(mapEventAuditRow)
          : filteredRawRows.map(mapWalletAuditRow);

      const cardsByView = {
        wallet: [
          ['รายการที่ตรงเงื่อนไข', filteredRawRows.length],
          ['เครดิตรวม', filteredRawRows.filter((row) => Number(row?.delta || 0) > 0).reduce((sum, row) => sum + Number(row?.delta || 0), 0)],
          ['เดบิตรวม', filteredRawRows.filter((row) => Number(row?.delta || 0) < 0).reduce((sum, row) => sum + Math.abs(Number(row?.delta || 0)), 0)],
          ['ช่วงเวลา', getAuditWindowLabel(currentAuditWindowMs)],
        ],
        reward: [
          ['reward ledger ที่ตรงเงื่อนไข', filteredRawRows.length],
          ['เครดิต reward รวม', filteredRawRows.reduce((sum, row) => sum + Math.max(0, Number(row?.delta || 0)), 0)],
          ['ประเภทรางวัล', new Set(filteredRawRows.map((row) => String(row?.reason || '').trim()).filter(Boolean)).size],
          ['ช่วงเวลา', getAuditWindowLabel(currentAuditWindowMs)],
        ],
        event: [
          ['กิจกรรมที่ตรงเงื่อนไข', filteredRawRows.length],
          ['กิจกรรมที่ยังเปิดอยู่', filteredRawRows.filter((row) => String(row?.status || '') !== 'ended').length],
          ['event_reward ใน ledger', filteredRewardRows.filter((row) => String(row?.reason || '') === 'event_reward').length],
          ['ช่วงเวลา', getAuditWindowLabel(currentAuditWindowMs)],
        ],
      };

      return {
        view: normalizedView,
        cards: cardsByView[normalizedView] || cardsByView.wallet,
        rawRows: filteredRawRows,
        tableRows,
      };
    }

    function toCsvValue(value) {
      const text = stringifyAuditValue(value).replace(/"/g, '""');
      return `"${text}"`;
    }

    function downloadTextFile(filename, text, mimeType = 'text/plain;charset=utf-8') {
      const blob = new Blob([text], { type: mimeType });
      downloadBlob(filename, blob);
    }

    function downloadBlob(filename, blob) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }

    function buildAuditRequestQuery(extra = {}) {
      const params = new URLSearchParams();
      params.set('view', extra.view || currentAuditView);
      params.set('q', extra.query ?? currentAuditQuery ?? '');
      params.set('userId', extra.userId ?? currentAuditUser ?? '');
      params.set('actor', extra.actor ?? currentAuditActor ?? '');
      params.set('actorMode', extra.actorMode ?? currentAuditActorMode ?? 'contains');
      params.set('reason', extra.reason ?? currentAuditReason ?? '');
      params.set('reference', extra.reference ?? currentAuditReference ?? '');
      params.set('referenceMode', extra.referenceMode ?? currentAuditReferenceMode ?? 'contains');
      params.set('status', extra.status ?? currentAuditStatus ?? '');
      params.set('statusMode', extra.statusMode ?? currentAuditStatusMode ?? 'contains');
      params.set('dateFrom', extra.dateFrom ?? currentAuditDateFrom ?? '');
      params.set('dateTo', extra.dateTo ?? currentAuditDateTo ?? '');
      params.set('sortBy', extra.sortBy ?? currentAuditSortBy ?? 'timestamp');
      params.set('sortOrder', extra.sortOrder ?? currentAuditSortOrder ?? 'desc');
      params.set('windowMs', extra.windowMs ?? (currentAuditWindowMs == null ? 'all' : String(currentAuditWindowMs)));
      if (extra.cursor != null || currentAuditCursor != null) {
        const cursor = extra.cursor ?? currentAuditCursor;
        if (cursor) {
          params.set('cursor', String(cursor));
        }
      }
      params.set('page', String(extra.page || currentAuditPage || 1));
      params.set('pageSize', String(extra.pageSize || currentAuditPageSize || 50));
      return params.toString();
    }

    function resetAuditPaging() {
      currentAuditPage = 1;
      currentAuditCursor = null;
      currentAuditPrevCursor = null;
      currentAuditNextCursor = null;
      currentAuditPaginationMode = 'page';
    }

    async function exportAuditRows(format = 'csv') {
      const query = buildAuditRequestQuery({ page: 1, pageSize: 5000, cursor: '' });
      const path = `/admin/api/audit/export?${query}&format=${encodeURIComponent(format)}`;
      const { blob, filename } = await apiBlob(path);
      const fallback = `audit-${currentAuditView}-${new Date().toISOString().replace(/[:.]/g, '-')}.${format === 'csv' ? 'csv' : 'json'}`;
      downloadBlob(filename || fallback, blob);
      toast(`ส่งออก ${format.toUpperCase()} แล้ว`);
    }

    async function refreshAuditCenterData() {
      if (!isAuthed || !snapshot) {
        currentAuditExportRows = [];
        currentAuditExportPayload = {};
        currentAuditTotalPages = 1;
        currentAuditTotalRows = 0;
        return;
      }
      const requestId = ++currentAuditRequestId;
      const res = await api(`/admin/api/audit/query?${buildAuditRequestQuery()}`);
      if (requestId !== currentAuditRequestId) return;
      const data = res?.data || {};
      currentAuditPage = Math.max(1, Number(data.page || 1));
      currentAuditPageSize = Math.max(1, Number(data.pageSize || currentAuditPageSize || 50));
      currentAuditTotalPages = Math.max(1, Number(data.totalPages || 1));
      currentAuditTotalRows = Math.max(0, Number(data.total || 0));
      currentAuditPaginationMode = String(data.paginationMode || 'page');
      currentAuditCursor = String(data.cursor || '').trim() || null;
      currentAuditPrevCursor = String(data.prevCursor || '').trim() || null;
      currentAuditNextCursor = String(data.nextCursor || '').trim() || null;
      currentAuditSortBy = String(data.sortBy || data.filters?.sortBy || currentAuditSortBy || 'timestamp');
      currentAuditSortOrder = String(data.sortOrder || data.filters?.sortOrder || currentAuditSortOrder || 'desc');

      auditSummaryEl.innerHTML = (Array.isArray(data.cards) ? data.cards : [])
        .map(([key, value]) => `<div class="metric"><div class="k">${escapeHtml(String(key))}</div><div class="v">${escapeHtml(formatAuditMetricValue(value))}</div></div>`)
        .join('');
      renderRowsToContainer(
        auditTableWrap,
        Array.isArray(data.tableRows) ? data.tableRows : [],
        'ยังไม่มีข้อมูลในมุมมอง audit นี้',
      );
      currentAuditExportRows = Array.isArray(data.tableRows) ? data.tableRows : [];
      currentAuditExportPayload = data.exportPayload || {
        generatedAt: new Date().toISOString(),
        view: data.view || currentAuditView,
        rows: Array.isArray(data.rows) ? data.rows : [],
      };
      syncAuditControlsFromState();
      renderAuditPresetOptions(currentAuditPresetId);
      if (auditPageMeta) {
        auditPageMeta.textContent = `หน้า ${currentAuditPage} / ${currentAuditTotalPages} • ${currentAuditTotalRows.toLocaleString()} รายการ`;
      }
      if (auditPrevBtn) {
        auditPrevBtn.disabled = !Boolean(data.hasPrev);
      }
      if (auditNextBtn) {
        auditNextBtn.disabled = !Boolean(data.hasNext);
      }
    }

    function renderAuditCenter() {
      if (!auditSummaryEl || !auditTableWrap) return;
      const auditButtons = [
        [auditWalletBtn, 'wallet'],
        [auditRewardBtn, 'reward'],
        [auditEventBtn, 'event'],
      ];
      auditButtons.forEach(([button, view]) => {
        if (!button) return;
        button.classList.toggle('active', currentAuditView === view);
      });

      if (!snapshot) {
        auditSummaryEl.innerHTML = '<div class="metric"><div class="k">Audit</div><div class="v">ต้องเข้าสู่ระบบก่อน</div></div>';
        renderRowsToContainer(auditTableWrap, [], 'ยังไม่มีข้อมูล audit');
        currentAuditExportRows = [];
        currentAuditExportPayload = {};
        currentAuditTotalPages = 1;
        currentAuditTotalRows = 0;
        currentAuditCursor = null;
        currentAuditPrevCursor = null;
        currentAuditNextCursor = null;
        syncAuditControlsFromState();
        renderAuditPresetOptions(currentAuditPresetId);
        if (auditPageMeta) {
          auditPageMeta.textContent = 'หน้า 1 / 1 • 0 รายการ';
        }
        if (auditPrevBtn) auditPrevBtn.disabled = true;
        if (auditNextBtn) auditNextBtn.disabled = true;
        return;
      }

      const placeholders = {
        wallet: 'ค้นหา user, reason, actor, reference, purchase code',
        reward: 'ค้นหา user, reward reason, actor, reference',
        event: 'ค้นหา event name, reward, status, participant, actor',
      };
      if (auditSearchInput) {
        auditSearchInput.placeholder = placeholders[currentAuditView] || placeholders.wallet;
      }
      syncAuditControlsFromState();
      renderAuditPresetOptions(currentAuditPresetId);
      auditSummaryEl.innerHTML = '<div class="metric"><div class="k">Audit</div><div class="v">กำลังโหลด...</div></div>';
      renderRowsToContainer(auditTableWrap, [], 'กำลังโหลดข้อมูล audit...');
      void refreshAuditCenterData().catch((error) => {
        auditSummaryEl.innerHTML = '<div class="metric"><div class="k">Audit</div><div class="v">โหลดไม่สำเร็จ</div></div>';
        renderRowsToContainer(auditTableWrap, [], `โหลด audit ไม่สำเร็จ: ${String(error.message || error)}`);
      });
    }

    function renderSelectedDataset() {
      if (!snapshot) return;
      const key = datasetSelect.value;
      const rows = asRows(key, snapshot[key]);
      renderTable(rows);
      rawView.textContent = JSON.stringify(snapshot[key], null, 2);
    }
