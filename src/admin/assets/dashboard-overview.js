/**
 * Dashboard overview/runtime/restore UI helpers split out of the former dashboard monolith
 * so the landing and runtime summary flows are easier to review.
 */    function buildFallbackSummaryCards() {
      if (!snapshot) return [];
      return [
        ['จำนวนกิลด์', (snapshot.guilds || []).length],
        ['จำนวนกระเป๋าเหรียญ', (snapshot.wallets || []).length],
        ['จำนวนสินค้า', (snapshot.shopItems || []).length],
        ['จำนวนคำสั่งซื้อ', (snapshot.purchases || []).length],
        ['จำนวนทิคเก็ต', (snapshot.tickets || []).length],
        ['จำนวนกิจกรรม', (snapshot.events || []).length],
        ['จำนวนค่าหัว', (snapshot.bounties || []).length],
        ['จำนวนลิงก์ Steam/Discord', (snapshot.links || []).length],
        ['จำนวน VIP', (snapshot.memberships || []).length],
        ['จำนวนโค้ดแลกรางวัล', (snapshot.redeemCodes || []).length],
        ['จำนวนสถิติ', (snapshot.stats || []).length],
        ['จำนวนสถิติอาวุธ', (snapshot.weaponStats || []).length],
        ['จำนวนโควต้าเช่ารายวัน', (snapshot.dailyRents || []).length],
        ['จำนวนรถเช่า', (snapshot.rentalVehicles || []).length],
        ['จำนวนคิวส่งของ', (snapshot.deliveryQueue || []).length],
        ['จำนวน dead-letter ส่งของ', (snapshot.deliveryDeadLetters || []).length],
        ['จำนวนบันทึกส่งของ', (snapshot.deliveryAudit || []).length],
        ['จำนวน auth security events', (snapshot.adminSecurityEvents || []).length],
        ['จำนวน admin sessions', (snapshot.adminSessions || []).length],
        ['จำนวน tenant', (snapshot.platformTenants || []).length],
        ['จำนวน subscription', (snapshot.platformSubscriptions || []).length],
        ['จำนวน license', (snapshot.platformLicenses || []).length],
        ['จำนวน marketplace offer', (snapshot.platformMarketplaceOffers || []).length],
      ];
    }

    function getDashboardMetricValue(key, fallback = 0) {
      const direct = Number(currentDashboardCards?.metrics?.[key]);
      if (Number.isFinite(direct)) {
        return direct;
      }
      const fallbackNumber = Number(fallback);
      return Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
    }

    function getSnapshotCount(key) {
      const rows = snapshot?.[key];
      return Array.isArray(rows) ? rows.length : 0;
    }

    function formatOverviewNumber(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '-';
      return numeric.toLocaleString();
    }

    function renderOverviewCards(container, cards = [], emptyMessage = 'ยังไม่มีข้อมูลภาพรวม') {
      if (!container) return;
      const items = Array.isArray(cards) ? cards : [];
      if (items.length === 0) {
        container.innerHTML = `<article class="overview-card"><p>${escapeHtml(emptyMessage)}</p></article>`;
        return;
      }
      container.innerHTML = items.map((card) => {
        const tags = Array.isArray(card?.tags) ? card.tags.filter(Boolean) : [];
        const bullets = Array.isArray(card?.bullets) ? card.bullets.filter(Boolean) : [];
        return [
          '<article class="overview-card">',
          card?.kicker ? `<div class="overview-kicker">${escapeHtml(String(card.kicker))}</div>` : '',
          card?.value ? `<div class="overview-value">${escapeHtml(String(card.value))}</div>` : '',
          card?.title ? `<h3>${escapeHtml(String(card.title))}</h3>` : '',
          card?.description ? `<p>${escapeHtml(String(card.description))}</p>` : '',
          bullets.length
            ? `<ul class="overview-list">${bullets.map((item) => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul>`
            : '',
          tags.length
            ? `<div class="overview-tags">${tags.map((tag) => `<span class="overview-tag">${escapeHtml(String(tag))}</span>`).join('')}</div>`
            : '',
          '</article>',
        ].join('');
      }).join('');
    }

    // Build a concise overview from live runtime data for the landing section.
    function buildOverviewHeroCards() {
      if (!snapshot && !currentRuntimeSupervisor && !currentDeliveryRuntime) {
        return [
          {
            kicker: 'Control Plane',
            value: 'ล็อกอิน',
            title: 'ยืนยันตัวตนเพื่อดูสถานะจริงทั้งระบบ',
            description: 'เมื่อเข้าสู่ระบบแล้ว ส่วนนี้จะสรุป topology, delivery runtime, player portal, guardrails และ operational evidence ให้ในหน้าเดียว',
            tags: ['RBAC', 'Delivery', 'Restore', 'Audit'],
          },
        ];
      }

      const runtime = currentRuntimeSupervisor || snapshot?.runtimeSupervisor || null;
      const runtimeCounts = runtime?.counts || {};
      const deliveryRuntime = currentDeliveryRuntime || snapshot?.deliveryRuntime || null;
      const deliveryMode = String(deliveryRuntime?.executionMode || 'unknown').toUpperCase();
      const verifyMode = deliveryRuntime?.settings?.verifyMode || deliveryRuntime?.verifyMode || '-';
      const restoreState = currentBackupRestoreState || snapshot?.backupRestore || null;
      const analytics = currentPlatformOverview?.analytics || {};
      const { builtin, presets } = getCombinedDeliveryCapabilities();
      const unackedNotifications = currentAdminNotifications.filter((row) => !row?.acknowledgedAt).length;

      return [
        {
          kicker: 'Runtime Topology',
          value: runtime
            ? `${formatOverviewNumber(runtimeCounts.ready || 0)}/${formatOverviewNumber(runtimeCounts.required || 0)}`
            : '-',
          title: 'required runtimes พร้อมทำงาน',
          description: 'ติดตาม bot, worker, watcher, admin web, player portal และ console-agent จาก supervisor ตัวเดียว พร้อมแยก ready / degraded / offline',
          tags: [
            `overall ${runtime?.overall || 'unknown'}`,
            `offline ${formatOverviewNumber(runtimeCounts.offline || 0)}`,
            `degraded ${formatOverviewNumber(runtimeCounts.degraded || 0)}`,
          ],
        },
        {
          kicker: 'Delivery Runtime',
          value: deliveryMode,
          title: 'pipeline ส่งของพร้อมใช้งาน',
          description: 'queue, worker, retry, dead-letter, timeline และ verification policy ถูกรวมให้ดูได้จาก landing panel เดียว',
          tags: [
            `queue ${formatOverviewNumber(deliveryRuntime?.queueLength || getDashboardMetricValue('deliveryQueueCount', getSnapshotCount('deliveryQueue')))}`,
            `dead ${formatOverviewNumber(deliveryRuntime?.deadLetterCount || getDashboardMetricValue('deliveryDeadLetterCount', getSnapshotCount('deliveryDeadLetters')))}`,
            `verify ${verifyMode}`,
          ],
        },
        {
          kicker: 'Command Lab',
          value: formatOverviewNumber(builtin.length + presets.length),
          title: 'capability tests + presets',
          description: 'แอดมิน preview, preflight, simulate และทดสอบคำสั่งจริงสำหรับ announce / teleport / spawn ได้จากหน้าเดียว',
          tags: [
            `${formatOverviewNumber(builtin.length)} builtin`,
            `${formatOverviewNumber(presets.length)} preset`,
            'dry-run + live test',
          ],
        },
        {
          kicker: 'Platform Layer',
          value: formatOverviewNumber(getSnapshotCount('platformTenants')),
          title: 'tenant / billing / legal / API',
          description: 'มี Platform Center แยกสำหรับ multi-tenant, subscription, license, public API, webhook, marketplace และ agent version management',
          tags: [
            `tenants ${formatOverviewNumber(analytics?.tenants?.total || getSnapshotCount('platformTenants'))}`,
            `subs ${formatOverviewNumber(analytics?.subscriptions?.active || getSnapshotCount('platformSubscriptions'))}`,
            `offers ${formatOverviewNumber(analytics?.marketplace?.offers || getSnapshotCount('platformMarketplaceOffers'))}`,
          ],
        },
        {
          kicker: 'Player Surface',
          value: formatOverviewNumber(getDashboardMetricValue('walletCount', getSnapshotCount('wallets'))),
          title: 'wallets บน player portal',
          description: 'ผู้เล่นเข้าดู wallet, purchase history, redeem, profile และ steam binding ได้โดยไม่ต้องผ่านหน้าแอดมิน',
          tags: [
            `purchases ${formatOverviewNumber(getDashboardMetricValue('purchaseCount', getSnapshotCount('purchases')))}`,
            `links ${formatOverviewNumber(getDashboardMetricValue('linkCount', getSnapshotCount('links')))}`,
            `vip ${formatOverviewNumber(getDashboardMetricValue('membershipCount', getSnapshotCount('memberships')))}`,
          ],
        },
        {
          kicker: 'Safety Net',
          value: restoreState?.active ? 'LOCKED' : 'READY',
          title: 'backup / restore guardrails',
          description: 'มี dry-run diff, confirmation, maintenance gate, rollback backup และ restore status ช่วยกันความเสียหายจากงาน restore',
          tags: [
            `status ${restoreState?.status || 'idle'}`,
            `backup ${restoreState?.backup || '-'}`,
            `alerts ${formatOverviewNumber(unackedNotifications)} open`,
          ],
        },
        {
          kicker: 'Operational Evidence',
          value: formatOverviewNumber(getDashboardMetricValue('deliveryAuditCount', getSnapshotCount('deliveryAudit'))),
          title: 'delivery audit records',
          description: 'ทุก order มี timeline, status history, audit และ dead-letter trail ให้ไล่ปัญหาเป็นขั้นแทนการเดาจาก log กระจัดกระจาย',
          tags: [
            `queue ${formatOverviewNumber(getDashboardMetricValue('deliveryQueueCount', getSnapshotCount('deliveryQueue')))}`,
            `dead ${formatOverviewNumber(getDashboardMetricValue('deliveryDeadLetterCount', getSnapshotCount('deliveryDeadLetters')))}`,
            'timeline + step log',
          ],
        },
      ];
    }

    function buildOverviewModuleCards() {
      const runtime = currentRuntimeSupervisor || snapshot?.runtimeSupervisor || null;
      const deliveryRuntime = currentDeliveryRuntime || snapshot?.deliveryRuntime || null;
      const restoreState = currentBackupRestoreState || snapshot?.backupRestore || null;
      const { builtin, presets } = getCombinedDeliveryCapabilities();
      const unackedNotifications = currentAdminNotifications.filter((row) => !row?.acknowledgedAt).length;
      const queueDepth = deliveryRuntime?.queueLength || getDashboardMetricValue('deliveryQueueCount', getSnapshotCount('deliveryQueue'));

      return [
        {
          kicker: 'Module 01',
          title: 'Economy + Commerce',
          description: 'ชั้นธุรกรรมหลักสำหรับร้าน, wallet และ purchase lifecycle ที่ผู้เล่นใช้งานทุกวัน',
          bullets: [
            'wallet / ledger / transfer / gift พร้อม purchase log',
            'shop / cart / inventory / VIP / redeem / refund',
            'รองรับ welcome, daily, weekly, wheel และ reward flow',
          ],
          tags: [
            `${formatOverviewNumber(getDashboardMetricValue('shopItemCount', getSnapshotCount('shopItems')))} items`,
            `${formatOverviewNumber(getDashboardMetricValue('purchaseCount', getSnapshotCount('purchases')))} purchases`,
            `${formatOverviewNumber(getDashboardMetricValue('walletCount', getSnapshotCount('wallets')))} wallets`,
          ],
        },
        {
          kicker: 'Module 02',
          title: 'Delivery + SCUM Ops',
          description: 'เส้นทางส่งของจริงที่ต่อจาก queue ไปถึง SCUM command execution พร้อมเครื่องมือวิเคราะห์รายออเดอร์',
          bullets: [
            'queue + retry + dead-letter + watchdog + per-order timeline',
            'preflight, simulator, capability tester และ command override',
            'รองรับ RCON และ agent mode พร้อม teleport / spawn / multi-item / verify',
          ],
          tags: [
            `mode ${deliveryRuntime?.executionMode || '-'}`,
            `queue ${formatOverviewNumber(queueDepth)}`,
            `verify ${deliveryRuntime?.settings?.verifyMode || deliveryRuntime?.verifyMode || '-'}`,
          ],
        },
        {
          kicker: 'Module 03',
          title: 'Runtime + Observability',
          description: 'คุมระบบแยก process ให้พังยากขึ้นและจับอาการ topology เสียแบบเงียบได้เร็วขึ้น',
          bullets: [
            'runtime supervisor, watcher freshness และ queue backlog checks',
            'health endpoints, dashboard cards, metrics export และ readiness tooling',
            'notification center สรุป incident ที่ต้องเห็นจากหน้าแอดมิน',
          ],
          tags: [
            `overall ${runtime?.overall || 'unknown'}`,
            `${formatOverviewNumber(runtime?.counts?.required || 0)} required`,
            `${formatOverviewNumber(unackedNotifications)} open alerts`,
          ],
        },
        {
          kicker: 'Module 04',
          title: 'Admin Control Plane',
          description: 'หน้าแอดมินไม่ใช่แค่ dashboard แต่เป็น cockpit สำหรับ config, incident response และ delivery operations',
          bullets: [
            'RBAC owner / admin / mod พร้อม DB login, Discord SSO และ 2FA baseline',
            'config editor, backup, restore, snapshot export และ audit center',
            'delivery runtime, detail, capability preset และ item command editor',
          ],
          tags: [
            'RBAC + SSO',
            restoreState?.active ? 'maintenance active' : 'maintenance ready',
            'audit + restore',
          ],
        },
        {
          kicker: 'Module 05',
          title: 'Player Portal',
          description: 'แยกหน้าผู้เล่นออกจากหน้าผู้ดูแลเพื่อลดการปะปนของสิทธิ์และเส้นทางใช้งาน',
          bullets: [
            'Discord login, dashboard, wallet, purchase history และ shop',
            'redeem, profile, steam link และ player-only mode แยกจาก admin',
            'เชื่อมกับ delivery และ reward stack เดียวกับหลังบ้าน',
          ],
          tags: [
            `${formatOverviewNumber(getDashboardMetricValue('linkCount', getSnapshotCount('links')))} bindings`,
            `${formatOverviewNumber(getDashboardMetricValue('membershipCount', getSnapshotCount('memberships')))} vip`,
            '/player',
          ],
        },
        {
          kicker: 'Module 06',
          title: 'Safety + Deployment',
          description: 'รวม guardrails ที่ช่วยให้ deploy, restore และเปลี่ยนค่า production ได้อย่างมีวินัยมากขึ้น',
          bullets: [
            'security-check, doctor, topology doctor, readiness และ smoke post-deploy',
            'rotate secrets, PM2 runtime split และ Windows helper scripts',
            'restore maintenance gate + auto rollback backup สำหรับงานเสี่ยง',
          ],
          tags: [
            'doctor + readiness',
            'PM2 + helper',
            restoreState?.rollbackBackup ? 'rollback armed' : 'rollback ready',
          ],
        },
      ];
    }

    function buildOverviewFlowSteps() {
      const deliveryRuntime = currentDeliveryRuntime || snapshot?.deliveryRuntime || null;
      const mode = String(deliveryRuntime?.executionMode || 'agent').toUpperCase();
      const verifyMode = deliveryRuntime?.settings?.verifyMode || deliveryRuntime?.verifyMode || 'basic';
      return [
        {
          index: 'Step 01',
          title: 'Discord / Player Portal',
          detail: 'ผู้เล่นซื้อของ, redeem หรือแอดมินยิง test-send จากหน้าเว็บ โดยทุกคำขอถูกผูกเข้ากับ identity และ order code',
        },
        {
          index: 'Step 02',
          title: 'Queue + Audit',
          detail: 'ระบบสร้าง queue job, status history และ audit trail ตั้งแต่ queued เพื่อให้ไล่ย้อนหลังได้รายออเดอร์',
        },
        {
          index: 'Step 03',
          title: 'Worker Pickup',
          detail: 'worker ตัวเดียวรับงาน, ทำ preflight readiness, และตัดสินใจว่าจะวิ่งผ่าน RCON หรือ agent runtime',
        },
        {
          index: 'Step 04',
          title: `${mode} Command Plan`,
          detail: 'คำสั่งจริงถูก resolve จาก item profile, command template, fallback catalogs และ simulator ก่อนยิงจริง',
        },
        {
          index: 'Step 05',
          title: 'Teleport + Spawn',
          detail: 'ใน agent mode flow จะวิ่ง announce -> teleport -> spawn -> multi-item ตาม profile และ teleport target ของสินค้า',
        },
        {
          index: 'Step 06',
          title: `Verify + Timeline (${verifyMode})`,
          detail: 'ผลลัพธ์ถูกปิดงานด้วย post-spawn verification, timeline, step log, dead-letter handling และ notification ถ้าเกิด incident',
        },
      ];
    }

    function renderOverviewFlow() {
      if (!overviewFlowEl) return;
      const steps = buildOverviewFlowSteps();
      if (!steps.length) {
        overviewFlowEl.innerHTML = '<div class="overview-flow-head"><h3>Observed Flow</h3><p>ยังไม่มีข้อมูล flow</p></div>';
        return;
      }
      overviewFlowEl.innerHTML = [
        '<div class="overview-flow-head">',
        '<h3>Observed Flow</h3>',
        '<p>เส้นทางหลักที่ระบบบันทึกและแสดงจาก runtime ปัจจุบันตั้งแต่ผู้เล่นกดซื้อจนถึงการตรวจสถานะและปิดงาน</p>',
        '</div>',
        `<div class="overview-flow-steps">${steps.map((step) => [
          '<article class="overview-step">',
          `<div class="idx">${escapeHtml(String(step.index || '-'))}</div>`,
          `<strong>${escapeHtml(String(step.title || '-'))}</strong>`,
          `<span>${escapeHtml(String(step.detail || '-'))}</span>`,
          '</article>',
        ].join('')).join('')}</div>`,
      ].join('');
    }

    function renderOverviewPanel() {
      renderOverviewCards(overviewHeroEl, buildOverviewHeroCards(), 'ยังไม่มีข้อมูลระบบ');
      renderOverviewCards(overviewModulesEl, buildOverviewModuleCards(), 'ยังไม่มีข้อมูล module');
      renderOverviewFlow();
    }

    function renderSummary() {
      const metrics = Array.isArray(currentDashboardCards?.cards) && currentDashboardCards.cards.length > 0
        ? currentDashboardCards.cards
        : buildFallbackSummaryCards();
      if (!metrics.length) {
        summaryEl.innerHTML = '<div class="metric"><div class="k">Summary</div><div class="v">ไม่มีข้อมูล</div></div>';
        renderOverviewPanel();
        return;
      }
      summaryEl.innerHTML = metrics
        .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
        .join('');
      renderOverviewPanel();
    }

    function renderDeliveryRuntime(data = null) {
      if (!deliveryRuntimeSummary || !deliveryRuntimeView) return;
      const runtime = data && typeof data === 'object'
        ? data
        : snapshot?.deliveryRuntime && typeof snapshot.deliveryRuntime === 'object'
          ? snapshot.deliveryRuntime
          : null;
      currentDeliveryRuntime = runtime;
      if (!runtime) {
        deliveryRuntimeSummary.innerHTML = '<div class="metric"><div class="k">Delivery</div><div class="v">ไม่มีข้อมูล</div></div>';
        deliveryRuntimeView.textContent = 'ยังไม่มีข้อมูล runtime ส่งของ';
        renderOverviewPanel();
        return;
      }

      const metrics = [
        ['โหมด', runtime.executionMode || '-'],
        ['เปิดใช้งาน', runtime.enabled ? 'yes' : 'no'],
        ['Queue', Number(runtime.queueLength || 0).toLocaleString()],
        ['Dead-Letter', Number(runtime.deadLetterCount || 0).toLocaleString()],
        ['กำลังส่ง', Number(runtime.inFlightCount || 0).toLocaleString()],
        ['Worker', runtime.workerStarted ? (runtime.workerBusy ? 'busy' : 'running') : 'stopped'],
        ['Readiness', runtime.readiness?.ready ? 'ready' : `degraded${runtime.readiness?.reason ? `: ${runtime.readiness.reason}` : ''}`],
      ];

      if (runtime.executionMode === 'agent') {
        metrics.push([
          'Agent',
          runtime.agent?.health?.reachable
            ? `online (${runtime.agent?.backend || runtime.agent?.health?.backend || 'agent'})`
            : `offline${runtime.agent?.health?.error ? `: ${runtime.agent.health.error}` : ''}`,
        ]);
        metrics.push([
          'Preflight',
          runtime.agent?.preflight?.ok
            ? 'ok'
            : `fail${runtime.agent?.preflight?.errorCode ? `: ${runtime.agent.preflight.errorCode}` : ''}`,
        ]);
      } else {
        metrics.push([
          'RCON',
          runtime.rcon?.host && runtime.rcon?.port
            ? `${runtime.rcon.host}:${runtime.rcon.port}`
            : 'not-configured',
        ]);
      }

      deliveryRuntimeSummary.innerHTML = metrics
        .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
        .join('');

      const detail = {
        executionMode: runtime.executionMode || null,
        enabled: Boolean(runtime.enabled),
        workerStarted: Boolean(runtime.workerStarted),
        workerBusy: Boolean(runtime.workerBusy),
        queueLength: Number(runtime.queueLength || 0),
        deadLetterCount: Number(runtime.deadLetterCount || 0),
        inFlightCount: Number(runtime.inFlightCount || 0),
        recentSuccessCount: Number(runtime.recentSuccessCount || 0),
        settings: runtime.settings || {},
        headJob: runtime.headJob || null,
        metrics: runtime.metrics || {},
        agent: runtime.agent || null,
        rcon: runtime.rcon || null,
        latestAudit: Array.isArray(runtime.latestAudit) ? runtime.latestAudit.slice(0, 5) : [],
      };
      deliveryRuntimeView.textContent = JSON.stringify(detail, null, 2);
      renderOverviewPanel();
    }

    function renderRuntimeSupervisor(data = null) {
      if (!runtimeSupervisorSummary || !runtimeSupervisorView) return;
      const runtime = data && typeof data === 'object'
        ? data
        : snapshot?.runtimeSupervisor && typeof snapshot.runtimeSupervisor === 'object'
          ? snapshot.runtimeSupervisor
          : null;
      currentRuntimeSupervisor = runtime;
      if (!runtime) {
        runtimeSupervisorSummary.innerHTML = '<div class="metric"><div class="k">Topology</div><div class="v">ไม่มีข้อมูล</div></div>';
        if (runtimeSupervisorTable) {
          runtimeSupervisorTable.innerHTML = '<div style="padding:12px; color:#9eb0d9;">ยังไม่มีข้อมูล runtime topology</div>';
        }
        runtimeSupervisorView.textContent = 'ยังไม่มีข้อมูล runtime topology';
        renderOverviewPanel();
        return;
      }

      const counts = runtime.counts || {};
      const metrics = [
        ['Overall', runtime.overall || '-'],
        ['Required', Number(counts.required || 0).toLocaleString()],
        ['Ready', Number(counts.ready || 0).toLocaleString()],
        ['Degraded', Number(counts.degraded || 0).toLocaleString()],
        ['Offline', Number(counts.offline || 0).toLocaleString()],
      ];
      runtimeSupervisorSummary.innerHTML = metrics
        .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
        .join('');
      renderRowsToContainer(
        runtimeSupervisorTable,
        Array.isArray(runtime.items)
          ? runtime.items.map((row) => ({
            runtime: row?.label || row?.key || '-',
            status: row?.status || '-',
            required: row?.required ? 'yes' : 'no',
            reachable: row?.reachable ? 'yes' : 'no',
            ready: row?.ready == null ? '-' : row.ready ? 'yes' : 'no',
            reason: row?.reason || '-',
            latencyMs: row?.latencyMs == null ? '-' : Number(row.latencyMs).toLocaleString(),
            url: row?.url || '-',
          }))
          : [],
        'ยังไม่มีข้อมูล runtime topology',
      );
      runtimeSupervisorView.textContent = JSON.stringify(runtime, null, 2);
      renderOverviewPanel();
    }

    async function refreshRuntimeSupervisor() {
      const res = await api('/admin/api/runtime/supervisor?refresh=1');
      currentRuntimeSupervisor = res?.data || null;
      renderRuntimeSupervisor(currentRuntimeSupervisor);
      return currentRuntimeSupervisor;
    }

    function renderBackupRestoreState(data = null) {
      if (!backupRestoreStateSummary || !backupRestoreStateView) return;
      const restoreState = data && typeof data === 'object'
        ? data
        : snapshot?.backupRestore && typeof snapshot.backupRestore === 'object'
          ? snapshot.backupRestore
          : null;
      if (
        currentRestorePreviewData
        && restoreState
        && restoreState.previewToken
        && currentRestorePreviewData.previewToken !== restoreState.previewToken
      ) {
        currentRestorePreviewData = null;
      }
      currentBackupRestoreState = restoreState;
      if (!restoreState) {
        backupRestoreStateSummary.innerHTML =
          '<div class="metric"><div class="k">Restore</div><div class="v">ไม่มีข้อมูล</div></div>';
        if (backupRestorePreviewMeta) {
          backupRestorePreviewMeta.innerHTML = '';
        }
        backupRestoreStateView.textContent = 'ยังไม่มีข้อมูล restore';
        renderOverviewPanel();
        return;
      }

      const metrics = [
        ['Status', restoreState.status || '-'],
        ['Active', restoreState.active ? 'yes' : 'no'],
        ['Backup', restoreState.backup || '-'],
        ['Rollback', restoreState.rollbackBackup || '-'],
        ['Last Error', restoreState.lastError || '-'],
      ];
      backupRestoreStateSummary.innerHTML = metrics
        .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
        .join('');
      const preview = currentRestorePreviewData && typeof currentRestorePreviewData === 'object'
        ? currentRestorePreviewData
        : null;
      if (backupRestorePreviewMeta) {
        if (!preview) {
          backupRestorePreviewMeta.innerHTML = '';
        } else {
          const previewMetrics = [
            ['Preview backup', preview.backup || restoreState.previewBackup || '-'],
            ['Schema', preview.schemaVersion == null ? '-' : String(preview.schemaVersion)],
            ['Compatibility', preview.compatibilityMode || '-'],
            ['Changed collections', Number(preview.diff?.summary?.changedCollections || 0).toLocaleString()],
            ['Preview token', preview.previewToken ? `${String(preview.previewToken).slice(0, 10)}...` : '-'],
            ['Expires', preview.previewExpiresAt ? formatDeliveryTime(preview.previewExpiresAt) : '-'],
          ];
          backupRestorePreviewMeta.innerHTML = previewMetrics
            .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
            .join('');
        }
      }
      backupRestoreStateView.textContent = JSON.stringify(preview || restoreState, null, 2);
      renderOverviewPanel();
    }

    async function refreshBackupRestoreState() {
      const res = await api('/admin/api/backup/restore/status');
      currentBackupRestoreState = res?.data || null;
      renderBackupRestoreState(currentBackupRestoreState);
      return currentBackupRestoreState;
    }

    function syncAuthFilterInputs() {
      if (authSearchInput) authSearchInput.value = currentAuthSearch;
      if (authSeveritySelect) authSeveritySelect.value = currentAuthEventSeverity;
      if (authEventTypeInput) authEventTypeInput.value = currentAuthEventType;
      if (authAnomalyOnlySelect) authAnomalyOnlySelect.value = currentAuthAnomalyOnly ? 'true' : '';
    }

    function resetAuthFilters() {
      currentAuthSearch = '';
      currentAuthEventSeverity = '';
      currentAuthEventType = '';
      currentAuthAnomalyOnly = false;
      syncAuthFilterInputs();
    }

    function syncAuthFiltersFromQueryParams(params = new URLSearchParams(window.location.search)) {
      currentAuthSearch = String(params.get('authQ') || '').trim();
      currentAuthEventSeverity = String(params.get('authSeverity') || '').trim().toLowerCase();
      currentAuthEventType = String(params.get('authEventType') || '').trim();
      currentAuthAnomalyOnly = String(params.get('authAnomalyOnly') || '').trim().toLowerCase() === 'true';
      syncAuthFilterInputs();
    }

    function updateDashboardQueryParams(nextValues = {}) {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const entries = Object.entries(nextValues || {});
      for (const [key, value] of entries) {
        const normalized = String(value ?? '').trim();
        if (!normalized) {
          params.delete(key);
        } else {
          params.set(key, normalized);
        }
      }
      const nextSearch = params.toString();
      const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash || ''}`;
      window.history.replaceState(null, '', nextUrl);
    }

    function getInitialActiveTabKey() {
      const tabKey = String(new URLSearchParams(window.location.search).get('tab') || '').trim();
      if (tabButtons.some((button) => String(button.dataset.tab || '').trim() === tabKey)) {
        return tabKey;
      }
      return 'economy';
    }

    function serializeForSearch(value) {
      if (Array.isArray(value)) {
        return value.map((entry) => serializeForSearch(entry)).join(' ');
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

    function matchesSearchQuery(row, query) {
      const normalizedQuery = String(query || '').trim().toLowerCase();
      if (!normalizedQuery) return true;
      return Object.values(row || {}).some((value) =>
        serializeForSearch(value).toLowerCase().includes(normalizedQuery),
      );
    }

    function isSecurityAnomaly(row = {}) {
      const severity = String(row?.severity || row?.level || '').trim().toLowerCase();
      if (severity === 'warn' || severity === 'error') return true;
      const type = String(row?.type || row?.title || '').trim().toLowerCase();
      return /fail|anomaly|mismatch|revoked|denied|blocked|expired/.test(type);
    }

    function filterAuthEvents(rows = []) {
      return (Array.isArray(rows) ? rows : []).filter((row) => {
        if (currentAuthEventSeverity) {
          const severity = String(row?.severity || row?.level || '').trim().toLowerCase();
          if (severity !== currentAuthEventSeverity) return false;
        }
        if (currentAuthEventType) {
          const type = String(row?.type || '').trim().toLowerCase();
          if (!type.includes(String(currentAuthEventType || '').trim().toLowerCase())) return false;
        }
        if (currentAuthAnomalyOnly && !isSecurityAnomaly(row)) return false;
        return matchesSearchQuery(row, currentAuthSearch);
      });
    }

    function filterAuthSessions(rows = []) {
      return (Array.isArray(rows) ? rows : []).filter((row) => matchesSearchQuery(row, currentAuthSearch));
    }

    function filterAuthPermissions(rows = []) {
      return (Array.isArray(rows) ? rows : []).filter((row) => matchesSearchQuery(row, currentAuthSearch));
    }

    function getCurrentAdminSessionId() {
      const sessions = Array.isArray(snapshot?.adminSessions) ? snapshot.adminSessions : [];
      const currentSession = sessions.find((row) => row?.current === true);
      return String(currentSession?.id || '').trim();
    }

    function renderAuthSessionTable(rows = []) {
      if (!authSessionTableWrap) return;
      if (!hasRoleAtLeast(currentUserRole, 'owner')) {
        authSessionTableWrap.innerHTML =
          '<div style="padding:12px; color:#9eb0d9;">ต้องใช้สิทธิ owner เพื่อดูและ revoke admin sessions</div>';
        return;
      }
      const sessions = Array.isArray(rows) ? rows : [];
      if (sessions.length === 0) {
        authSessionTableWrap.innerHTML =
          '<div style="padding:12px; color:#9eb0d9;">ยังไม่มี active session ที่บันทึกอยู่</div>';
        return;
      }
      const head = [
        '<tr>',
        '<th>User</th>',
        '<th>Role</th>',
        '<th>Method</th>',
        '<th>Created / Expire</th>',
        '<th>Step-up / Source</th>',
        '<th>Session</th>',
        '<th>Actions</th>',
        '</tr>',
      ].join('');
      const body = sessions.slice(0, 200).map((row) => {
        const userBadges = [
          row?.current ? '<span class="auth-badge">current</span>' : '',
          row?.current !== true && row?.role === 'owner' ? '<span class="auth-badge warn">owner</span>' : '',
        ].filter(Boolean).join(' ');
        const stepUpBadges = [
          row?.stepUpActive ? '<span class="auth-badge">step-up active</span>' : '<span class="auth-badge warn">step-up idle</span>',
          row?.authSource ? `<span class="auth-badge">${escapeHtml(String(row.authSource))}</span>` : '',
        ].filter(Boolean).join(' ');
        const sessionMeta = [
          row?.id ? `<code>${escapeHtml(String(row.id))}</code>` : '-',
          row?.ip ? `IP: ${escapeHtml(String(row.ip))}` : '',
        ].filter(Boolean).join('<br>');
        return [
          '<tr>',
          `<td><strong>${escapeHtml(String(row?.user || '-'))}</strong>${userBadges ? `<div class="auth-session-meta">${userBadges}</div>` : ''}</td>`,
          `<td>${escapeHtml(String(row?.role || '-'))}</td>`,
          `<td>${escapeHtml(String(row?.authMethod || '-'))}</td>`,
          `<td><div>${escapeHtml(formatDeliveryTime(row?.createdAt || ''))}</div><div class="auth-session-meta">หมดอายุ ${escapeHtml(formatDeliveryTime(row?.expiresAt || ''))}</div></td>`,
          `<td><div>${stepUpBadges || '<span class="auth-badge warn">ไม่มีข้อมูล</span>'}</div><div class="auth-session-meta">ล่าสุด ${escapeHtml(formatDeliveryTime(row?.stepUpVerifiedAt || row?.lastSeenAt || ''))}</div></td>`,
          `<td>${sessionMeta || '-'}</td>`,
          `<td class="row-actions"><button type="button" class="danger" data-auth-session-revoke="${escapeHtml(String(row?.id || ''))}" data-auth-session-current="${row?.current ? 'true' : 'false'}">Revoke</button></td>`,
          '</tr>',
        ].join('');
      }).join('');
      authSessionTableWrap.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }

    function renderAuthRoleMatrix(data = null) {
      if (authRoleMatrixSummary) {
        if (!data) {
          authRoleMatrixSummary.innerHTML =
            '<div class="metric"><div class="k">Role Matrix</div><div class="v">ยังไม่มีข้อมูล</div></div>';
        } else {
          const summary = data.summary || {};
          const visiblePermissions = Array.isArray(data.permissions) ? data.permissions.length : 0;
          const roleSummary = Array.isArray(summary.roles)
            ? summary.roles
                .map((row) => `${row.role}:${Number(row.permissionCount || 0).toLocaleString()}`)
                .join(' | ')
            : '-';
          const metrics = [
            ['Permissions', Number(summary.totalPermissions || 0).toLocaleString()],
            ['Visible', Number(visiblePermissions || 0).toLocaleString()],
            ['Step-up routes', Number(summary.stepUpPermissions || 0).toLocaleString()],
            ['Categories', Number((summary.categories || []).length || 0).toLocaleString()],
            ['Role coverage', roleSummary || '-'],
          ];
          authRoleMatrixSummary.innerHTML = metrics
            .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
            .join('');
        }
      }
      const rows = Array.isArray(data?.permissions)
        ? data.permissions.map((entry) => ({
          category: entry?.category || '-',
          permission: entry?.permission || '-',
          minRole: entry?.minRole || '-',
          stepUp: entry?.stepUp ? 'yes' : 'no',
          path: entry?.path || '-',
          description: entry?.description || '-',
        }))
        : [];
      renderRowsToContainer(authRoleMatrixTableWrap, rows, 'ยังไม่มีข้อมูล role matrix');
    }

    function renderAuthSecurityCenter() {
      if (!hasRoleAtLeast(currentUserRole, 'admin') && isAuthed) {
        if (authSecuritySummary) {
          authSecuritySummary.innerHTML =
            '<div class="metric"><div class="k">Auth</div><div class="v">ต้องใช้สิทธิ admin ขึ้นไป</div></div>';
        }
        if (authSessionTableWrap) {
          authSessionTableWrap.innerHTML =
            '<div style="padding:12px; color:#9eb0d9;">ต้องใช้สิทธิ admin/owner เพื่อดู auth security center</div>';
        }
        renderTimelineCards(authSecurityEventList, [], 'ต้องใช้สิทธิ admin ขึ้นไป');
        renderAuthRoleMatrix(null);
        return;
      }
      const providers = snapshot?.adminAuthProviders && typeof snapshot.adminAuthProviders === 'object'
        ? snapshot.adminAuthProviders
        : null;
      const securityEvents = Array.isArray(snapshot?.adminSecurityEvents) ? snapshot.adminSecurityEvents : [];
      const sessions = Array.isArray(snapshot?.adminSessions) ? snapshot.adminSessions : [];
      const roleMatrix = snapshot?.adminRoleMatrix && typeof snapshot.adminRoleMatrix === 'object'
        ? snapshot.adminRoleMatrix
        : null;
      const filteredSecurityEvents = filterAuthEvents(securityEvents);
      const filteredSessions = filterAuthSessions(sessions);
      const filteredPermissions = filterAuthPermissions(Array.isArray(roleMatrix?.permissions) ? roleMatrix.permissions : []);

      if (!isAuthed) {
        if (authSecuritySummary) {
          authSecuritySummary.innerHTML =
            '<div class="metric"><div class="k">Auth</div><div class="v">ต้องเข้าสู่ระบบก่อน</div></div>';
        }
        renderAuthSessionTable([]);
        renderTimelineCards(authSecurityEventList, [], 'ต้องเข้าสู่ระบบก่อน');
        renderAuthRoleMatrix(null);
        return;
      }

      const warnCount = securityEvents.filter((entry) => String(entry?.severity || '').trim().toLowerCase() === 'warn').length;
      const errorCount = securityEvents.filter((entry) => String(entry?.severity || '').trim().toLowerCase() === 'error').length;
      const latestAnomaly = securityEvents.find((entry) => ['warn', 'error'].includes(String(entry?.severity || '').trim().toLowerCase()));
      const activeFilterTokens = [
        currentAuthSearch ? `search:${currentAuthSearch}` : '',
        currentAuthEventSeverity ? `severity:${currentAuthEventSeverity}` : '',
        currentAuthEventType ? `type:${currentAuthEventType}` : '',
        currentAuthAnomalyOnly ? 'anomaly-only' : '',
      ].filter(Boolean);
      const metrics = [
        ['Current user', currentUserName || '-'],
        ['Current role', currentUserRole || '-'],
        ['2FA', providers?.twoFactor ? 'enabled' : 'disabled'],
        ['Step-up', providers?.stepUp?.enabled ? `enabled (${Number(providers.stepUp.ttlMinutes || 0).toLocaleString()}m)` : 'disabled'],
        ['SSO', providers?.discordSso ? 'enabled' : 'disabled'],
        ['Security events', Number(securityEvents.length || 0).toLocaleString()],
        ['Visible events', Number(filteredSecurityEvents.length || 0).toLocaleString()],
        ['Warn / Error', `${Number(warnCount || 0).toLocaleString()} / ${Number(errorCount || 0).toLocaleString()}`],
        ['Active sessions', hasRoleAtLeast(currentUserRole, 'owner') ? `${Number(filteredSessions.length || 0).toLocaleString()} / ${Number(sessions.length || 0).toLocaleString()}` : 'owner only'],
        ['Visible permissions', Number(filteredPermissions.length || 0).toLocaleString()],
        ['Filters', activeFilterTokens.join(' | ') || 'none'],
        ['Last anomaly', latestAnomaly ? `${latestAnomaly.type || '-'} @ ${formatDeliveryTime(latestAnomaly.at || '')}` : 'none'],
      ];
      if (authSecuritySummary) {
        authSecuritySummary.innerHTML = metrics
          .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
          .join('');
      }

      renderAuthSessionTable(filteredSessions);
      renderTimelineCards(
        authSecurityEventList,
        filteredSecurityEvents.map((entry) => ({
          title: entry?.type || 'security-event',
          at: entry?.at || '',
          status: String(entry?.severity || '').trim().toLowerCase() === 'error'
            ? 'failed'
            : /succeeded|created/i.test(String(entry?.type || ''))
              ? 'completed'
              : 'pending',
          level: entry?.severity || 'info',
          stage: entry?.severity || 'info',
          source: [entry?.actor, entry?.role].filter(Boolean).join(' / ') || '-',
          errorCode: entry?.reason || '',
          message: entry?.detail || entry?.reason || entry?.path || '-',
          commandSummary: [entry?.targetUser ? `target=${entry.targetUser}` : '', entry?.sessionId ? `session=${entry.sessionId}` : '', entry?.ip ? `ip=${entry.ip}` : '']
            .filter(Boolean)
            .join(' • '),
        })),
        activeFilterTokens.length > 0 ? 'ไม่พบ security events ที่ตรงกับ filter' : 'ยังไม่มี security events',
      );
      renderAuthRoleMatrix(roleMatrix ? {
        ...roleMatrix,
        permissions: filteredPermissions,
      } : null);
    }

    function renderDatalistOptions(container, values = []) {
      if (!container) return;
      const unique = Array.from(new Set(
        (Array.isArray(values) ? values : [])
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ));
      container.innerHTML = unique
        .slice(0, 500)
        .map((value) => `<option value="${escapeHtml(value)}"></option>`)
        .join('');
    }

    function syncPlatformLookupOptions() {
      const tenantValues = Array.isArray(snapshot?.platformTenants)
        ? snapshot.platformTenants.flatMap((row) => [
          String(row?.id || '').trim(),
          String(row?.slug || '').trim(),
          String(row?.name || '').trim(),
        ])
        : [];
      const planValues = Array.isArray(currentPlatformOverview?.plans)
        ? currentPlatformOverview.plans.flatMap((row) => [
          String(row?.id || '').trim(),
          String(row?.name || '').trim(),
        ])
        : [];
      const licenseValues = Array.isArray(snapshot?.platformLicenses)
        ? snapshot.platformLicenses.map((row) => String(row?.id || '').trim())
        : [];
      renderDatalistOptions(platformTenantOptions, tenantValues);
      renderDatalistOptions(platformPlanOptions, planValues);
      renderDatalistOptions(platformLicenseOptions, licenseValues);
    }

    function renderPlatformCenter() {
      syncPlatformLookupOptions();
      const overview = currentPlatformOverview && typeof currentPlatformOverview === 'object'
        ? currentPlatformOverview
        : null;
      const analytics = overview?.analytics || {};
      const publicOverview = overview?.publicOverview || {};
      const opsState = snapshot?.platformOpsState && typeof snapshot.platformOpsState === 'object'
        ? snapshot.platformOpsState
        : overview?.opsState && typeof overview.opsState === 'object'
          ? overview.opsState
          : null;
      const reconcile = currentPlatformReconcile && typeof currentPlatformReconcile === 'object'
        ? currentPlatformReconcile
        : null;
      const monitoring = currentPlatformMonitoringReport && typeof currentPlatformMonitoringReport === 'object'
        ? currentPlatformMonitoringReport
        : null;

      if (platformOverviewSummary) {
        const metrics = overview
          ? [
              ['Tenants', Number(analytics?.tenants?.total || 0).toLocaleString()],
              ['MRR', `${Number(analytics?.subscriptions?.mrrCents || 0).toLocaleString()} cents`],
              ['Active Subs', Number(analytics?.subscriptions?.active || 0).toLocaleString()],
              ['Active Licenses', Number(analytics?.licenses?.active || 0).toLocaleString()],
              ['API Keys', Number(analytics?.api?.apiKeys || 0).toLocaleString()],
              ['Webhooks', Number(analytics?.api?.webhooks || 0).toLocaleString()],
              ['Outdated Agents', Number(analytics?.agent?.outdated || 0).toLocaleString()],
              ['Marketplace', Number(analytics?.marketplace?.offers || 0).toLocaleString()],
            ]
          : [['Platform', 'ยังไม่ได้โหลด overview']];
        platformOverviewSummary.innerHTML = metrics
          .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
          .join('');
      }

      if (platformOpsSummary) {
        const metrics = [
          ['Last Monitoring', opsState?.lastMonitoringAt ? formatDeliveryTime(opsState.lastMonitoringAt) : '-'],
          ['Last Auto Backup', opsState?.lastAutoBackupAt ? formatDeliveryTime(opsState.lastAutoBackupAt) : '-'],
          ['Last Reconcile', opsState?.lastReconcileAt ? formatDeliveryTime(opsState.lastReconcileAt) : '-'],
          ['Tracked Alerts', Number(Object.keys(opsState?.lastAlertAtByKey || {}).length || 0).toLocaleString()],
          ['Reconcile Anomalies', Number(reconcile?.summary?.anomalies || 0).toLocaleString()],
          ['Abuse Findings', Number(reconcile?.summary?.abuseFindings || 0).toLocaleString()],
          ['Monitoring Alerts', Number(monitoring?.alerts?.length || 0).toLocaleString()],
          ['Backups', Number((snapshot?.backups || []).length || 0).toLocaleString()],
        ];
        platformOpsSummary.innerHTML = metrics
          .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
          .join('');
      }

      if (platformOverviewView) {
        platformOverviewView.textContent = JSON.stringify({
          overview,
          brand: publicOverview?.brand || null,
          trial: publicOverview?.trial || null,
          legal: publicOverview?.legal || null,
          localization: publicOverview?.localization || null,
        }, null, 2);
      }
      if (platformOpsView) {
        platformOpsView.textContent = JSON.stringify({
          opsState,
          monitoring,
          reconcile,
        }, null, 2);
      }

      renderRowsToContainer(
        platformPermissionTableWrap,
        Array.isArray(overview?.permissionCatalog)
          ? overview.permissionCatalog.map((row) => ({
            key: row?.key || '-',
            title: row?.title || '-',
            scopes: Array.isArray(row?.scopes) ? row.scopes.join(', ') : '-',
          }))
          : [],
        'ยังไม่มี permission catalog',
      );
      renderRowsToContainer(
        platformTenantTableWrap,
        Array.isArray(snapshot?.platformTenants)
          ? snapshot.platformTenants.map((row) => ({
            id: row?.id || '-',
            slug: row?.slug || '-',
            name: row?.name || '-',
            type: row?.type || '-',
            status: row?.status || '-',
            locale: row?.locale || '-',
            owner: row?.ownerEmail || row?.ownerName || '-',
            parentTenantId: row?.parentTenantId || '-',
            updatedAt: row?.updatedAt || '-',
          }))
          : [],
        'ยังไม่มี tenant',
      );
      renderRowsToContainer(
        platformSubscriptionTableWrap,
        Array.isArray(snapshot?.platformSubscriptions)
          ? snapshot.platformSubscriptions.map((row) => ({
            id: row?.id || '-',
            tenantId: row?.tenantId || '-',
            planId: row?.planId || '-',
            status: row?.status || '-',
            billingCycle: row?.billingCycle || '-',
            amount: `${Number(row?.amountCents || 0).toLocaleString()} ${row?.currency || ''}`.trim(),
            renewsAt: row?.renewsAt || '-',
            externalRef: row?.externalRef || '-',
          }))
          : [],
        'ยังไม่มี subscription',
      );
      renderRowsToContainer(
        platformLicenseTableWrap,
        Array.isArray(snapshot?.platformLicenses)
          ? snapshot.platformLicenses.map((row) => ({
            id: row?.id || '-',
            tenantId: row?.tenantId || '-',
            status: row?.status || '-',
            licenseKey: row?.licenseKey || '-',
            seats: row?.seats == null ? '-' : Number(row.seats).toLocaleString(),
            legalDocVersion: row?.legalDocVersion || '-',
            legalAcceptedAt: row?.legalAcceptedAt || '-',
            expiresAt: row?.expiresAt || '-',
          }))
          : [],
        'ยังไม่มี license',
      );
      renderRowsToContainer(
        platformMarketplaceTableWrap,
        Array.isArray(snapshot?.platformMarketplaceOffers)
          ? snapshot.platformMarketplaceOffers.map((row) => ({
            id: row?.id || '-',
            tenantId: row?.tenantId || '-',
            title: row?.title || '-',
            kind: row?.kind || '-',
            price: `${Number(row?.priceCents || 0).toLocaleString()} ${row?.currency || ''}`.trim(),
            status: row?.status || '-',
            locale: row?.locale || '-',
            updatedAt: row?.updatedAt || '-',
          }))
          : [],
        'ยังไม่มี marketplace offer',
      );
      renderRowsToContainer(
        platformApiKeyTableWrap,
        Array.isArray(snapshot?.platformApiKeys)
          ? snapshot.platformApiKeys.map((row) => ({
            id: row?.id || '-',
            tenantId: row?.tenantId || '-',
            name: row?.name || '-',
            keyPrefix: row?.keyPrefix || '-',
            status: row?.status || '-',
            scopes: Array.isArray(row?.scopes) ? row.scopes.join(', ') : '-',
            lastUsedAt: row?.lastUsedAt || '-',
            updatedAt: row?.updatedAt || '-',
          }))
          : [],
        'ยังไม่มี API key',
      );
      renderRowsToContainer(
        platformWebhookTableWrap,
        Array.isArray(snapshot?.platformWebhookEndpoints)
          ? snapshot.platformWebhookEndpoints.map((row) => ({
            id: row?.id || '-',
            tenantId: row?.tenantId || '-',
            name: row?.name || '-',
            eventType: row?.eventType || '-',
            enabled: row?.enabled ? 'yes' : 'no',
            targetUrl: row?.targetUrl || '-',
            secret: row?.secretValue || '-',
            lastSuccessAt: row?.lastSuccessAt || '-',
            lastFailureAt: row?.lastFailureAt || '-',
            lastError: row?.lastError || '-',
          }))
          : [],
        'ยังไม่มี webhook endpoint',
      );
      renderRowsToContainer(
        platformAgentTableWrap,
        Array.isArray(snapshot?.platformAgentRuntimes)
          ? snapshot.platformAgentRuntimes.map((row) => ({
            tenantId: row?.tenantId || '-',
            runtimeKey: row?.runtimeKey || '-',
            channel: row?.channel || '-',
            version: row?.version || '-',
            minRequiredVersion: row?.minRequiredVersion || '-',
            status: row?.status || '-',
            lastSeenAt: row?.lastSeenAt || '-',
          }))
          : [],
        'ยังไม่มี agent runtime',
      );

      const reconcileRows = [];
      if (Array.isArray(reconcile?.anomalies)) {
        reconcile.anomalies.forEach((row) => {
          reconcileRows.push({
            bucket: 'anomaly',
            code: row?.code || '-',
            type: row?.type || '-',
            severity: row?.severity || '-',
            detail: row?.detail || '-',
          });
        });
      }
      if (Array.isArray(reconcile?.abuseFindings)) {
        reconcile.abuseFindings.forEach((row) => {
          reconcileRows.push({
            bucket: 'anti-abuse',
            code: row?.userId || row?.itemId || '-',
            type: row?.type || '-',
            severity: 'warn',
            detail: `count=${row?.count || 0} threshold=${row?.threshold || 0}`,
          });
        });
      }
      renderRowsToContainer(
        platformReconcileTableWrap,
        reconcileRows,
        'ยังไม่มี reconcile / anti-abuse finding',
      );
      renderOverviewPanel();
    }

    async function refreshPlatformCenter(options = {}) {
      const {
        forceOverview = false,
        forceReconcile = false,
        fetchOpsState = false,
      } = options;
      if (!isAuthed) return null;

      const tasks = [];
      if (forceOverview || !currentPlatformOverview) {
        tasks.push(
          api('/admin/api/platform/overview').then((res) => {
            currentPlatformOverview = res?.data || null;
          }),
        );
      }
      if (forceReconcile || !currentPlatformReconcile) {
        tasks.push(
          api('/admin/api/platform/reconcile').then((res) => {
            currentPlatformReconcile = res?.data || null;
          }),
        );
      }
      if (fetchOpsState || !snapshot?.platformOpsState) {
        tasks.push(
          api('/admin/api/platform/ops-state').then((res) => {
            if (snapshot && typeof snapshot === 'object') {
              snapshot.platformOpsState = res?.data || null;
            }
          }),
        );
      }
      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
      renderPlatformCenter();
      return {
        overview: currentPlatformOverview,
        reconcile: currentPlatformReconcile,
        opsState: snapshot?.platformOpsState || null,
      };
    }

    async function refreshDeliveryRuntime() {
      const res = await api('/admin/api/delivery/runtime');
      currentDeliveryRuntime = res?.data || null;
      renderDeliveryRuntime(currentDeliveryRuntime);
      return currentDeliveryRuntime;
    }

    async function previewDeliveryCommand(payload) {
      const res = await api('/admin/api/delivery/preview', 'POST', payload);
      if (deliveryPreviewView) {
        deliveryPreviewView.textContent = JSON.stringify(res?.data || {}, null, 2);
      }
      return res?.data || null;
    }

    function buildPayloadFromForm(form) {
      const payload = {};
      for (const [key, value] of new FormData(form).entries()) {
        const trimmed = String(value || '').trim();
        if (trimmed) payload[key] = trimmed;
      }
      return payload;
    }

    function renderTimelineCards(container, rows = [], emptyMessage = 'ยังไม่มี timeline') {
      if (!container) return;
      const items = Array.isArray(rows) ? rows : [];
      if (items.length === 0) {
        container.innerHTML = `<div style="padding:12px; color:#9eb0d9;">${escapeHtml(emptyMessage)}</div>`;
        return;
      }
      container.innerHTML = `<div class="timeline-list">${items.map((row) => {
        const status = String(row?.status || '').trim().toLowerCase();
        const severity = status === 'failed' || String(row?.level || '').trim() === 'error'
          ? 'is-failed'
          : status === 'completed'
            ? 'is-completed'
            : '';
        const badges = [
          row?.stage ? `<span class="timeline-badge">${escapeHtml(String(row.stage))}</span>` : '',
          row?.source ? `<span class="timeline-badge">${escapeHtml(String(row.source))}</span>` : '',
          row?.errorCode ? `<span class="timeline-badge">${escapeHtml(String(row.errorCode))}</span>` : '',
        ].filter(Boolean).join('');
        const detail = row?.command || row?.recoveryHint || row?.commandSummary || '';
        return [
          `<article class="timeline-card ${severity}">`,
          `<div class="delivery-cell-main"><strong>${escapeHtml(String(row?.title || row?.step || row?.action || '-'))}</strong><span class="delivery-cell-sub">${escapeHtml(formatDeliveryTime(row?.at || ''))}</span></div>`,
          `<div class="timeline-meta"><span>${escapeHtml(String(row?.message || '-'))}</span></div>`,
          badges ? `<div class="timeline-meta">${badges}</div>` : '',
          detail ? `<div class="delivery-cell-sub">${escapeHtml(String(detail))}</div>` : '',
          '</article>',
        ].join('');
      }).join('')}</div>`;
    }

    function renderDeliveryPreflight(report = null) {
      if (deliveryPreflightSummary) {
        if (!report) {
          deliveryPreflightSummary.innerHTML =
            '<div class="metric"><div class="k">Preflight</div><div class="v">ยังไม่ได้ตรวจ</div></div>';
        } else {
          const metrics = [
            ['พร้อมส่ง', report.ready ? 'yes' : 'no'],
            ['Mode', report.mode || '-'],
            ['Failures', Number(report.failures?.length || 0).toLocaleString()],
            ['Warnings', Number(report.warnings?.length || 0).toLocaleString()],
          ];
          deliveryPreflightSummary.innerHTML = metrics
            .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
            .join('');
        }
      }
      renderRowsToContainer(
        deliveryPreflightChecks,
        Array.isArray(report?.checks)
          ? report.checks.map((row) => ({
            key: row?.key || '-',
            ok: row?.ok === true ? 'ok' : 'fail',
            required: row?.required === false ? 'optional' : 'required',
            scope: row?.scope || '-',
            detail: row?.detail || '-',
            code: row?.code || '-',
          }))
          : [],
        'ยังไม่มีผล preflight',
      );
      if (deliveryPreflightView) {
        deliveryPreflightView.textContent = JSON.stringify(report || {}, null, 2);
      }
    }

    async function runDeliveryPreflightRequest(payload) {
      const res = await api('/admin/api/delivery/preflight', 'POST', payload);
      const data = res?.data || null;
      renderDeliveryPreflight(data);
      return data;
    }

    function renderDeliverySimulation(data = null) {
      if (deliverySimulateSummary) {
        if (!data) {
          deliverySimulateSummary.innerHTML =
            '<div class="metric"><div class="k">Simulator</div><div class="v">ยังไม่ได้จำลอง</div></div>';
        } else {
          const metrics = [
            ['พร้อมยิงจริง', data.ready ? 'yes' : 'blocked'],
            ['Commands', Number(data.summary?.commandCount || 0).toLocaleString()],
            ['Items', Number(data.summary?.itemCount || 0).toLocaleString()],
            ['Source', data.summary?.commandSource || '-'],
          ];
          deliverySimulateSummary.innerHTML = metrics
            .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
            .join('');
        }
      }
      renderTimelineCards(
        deliverySimulateTimeline,
        Array.isArray(data?.timeline) ? data.timeline : [],
        'ยังไม่มีแผนจำลอง',
      );
      if (deliverySimulateView) {
        deliverySimulateView.textContent = JSON.stringify(data || {}, null, 2);
      }
    }

    async function simulateDelivery(payload) {
      const res = await api('/admin/api/delivery/simulate', 'POST', payload);
      const data = res?.data || null;
      renderDeliverySimulation(data);
      return data;
    }

    function renderDeliveryCommandTemplate(data = null) {
      if (deliveryCommandTemplateView) {
        deliveryCommandTemplateView.textContent = JSON.stringify(data || {}, null, 2);
      }
      if (deliveryCommandTemplateForm && data && Array.isArray(data.commandTemplates)) {
        const commandsInput = deliveryCommandTemplateForm.elements.namedItem('commands');
        const lookupInput = deliveryCommandTemplateForm.elements.namedItem('lookupKey');
        const itemIdInput = deliveryCommandTemplateForm.elements.namedItem('itemId');
        const gameItemIdInput = deliveryCommandTemplateForm.elements.namedItem('gameItemId');
        if (commandsInput) commandsInput.value = data.commandTemplates.join('\n');
        if (lookupInput && !String(lookupInput.value || '').trim()) lookupInput.value = String(data.lookupKey || '');
        if (itemIdInput && !String(itemIdInput.value || '').trim()) itemIdInput.value = String(data.lookupKey || '');
        if (gameItemIdInput && !String(gameItemIdInput.value || '').trim()) gameItemIdInput.value = String(data.lookupKey || '');
      }
    }

    async function loadDeliveryCommandTemplate(payload) {
      const params = new URLSearchParams();
      if (payload.lookupKey) params.set('lookupKey', payload.lookupKey);
      if (payload.itemId) params.set('itemId', payload.itemId);
      if (payload.gameItemId) params.set('gameItemId', payload.gameItemId);
      const suffix = params.toString();
      const res = await api(`/admin/api/delivery/command-template${suffix ? `?${suffix}` : ''}`);
      const data = res?.data || null;
      renderDeliveryCommandTemplate(data);
      return data;
    }

    function normalizeDeliveryCapabilityRecord(entry, source = 'builtin') {
      const id = String(entry?.id || '').trim();
      const name = String(entry?.name || '').trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        description: String(entry?.description || '').trim(),
        commandTemplates: Array.isArray(entry?.commandTemplates)
          ? entry.commandTemplates.map((line) => String(line || '').trim()).filter(Boolean)
          : [],
        defaults: entry?.defaults && typeof entry.defaults === 'object' ? entry.defaults : {},
        tags: Array.isArray(entry?.tags) ? entry.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
        source,
        builtin: source === 'builtin',
      };
    }

    function getCombinedDeliveryCapabilities() {
      const builtin = Array.isArray(currentDeliveryCapabilities?.builtin)
        ? currentDeliveryCapabilities.builtin.map((entry) => normalizeDeliveryCapabilityRecord(entry, 'builtin')).filter(Boolean)
        : [];
      const presets = Array.isArray(currentDeliveryCapabilities?.presets)
        ? currentDeliveryCapabilities.presets.map((entry) => normalizeDeliveryCapabilityRecord(entry, 'preset')).filter(Boolean)
        : [];
      return { builtin, presets };
    }

    function renderDeliveryCapabilityOptions() {
      const { builtin, presets } = getCombinedDeliveryCapabilities();
      if (deliveryCapabilitySelect) {
        deliveryCapabilitySelect.innerHTML = '<option value="">เลือก capability</option>';
        builtin.forEach((entry) => {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = entry.name;
          deliveryCapabilitySelect.appendChild(option);
        });
      }
      const presetSelects = [deliveryCapabilityPresetSelect, deliveryCapabilityPresetManageSelect].filter(Boolean);
      presetSelects.forEach((select) => {
        const emptyLabel = select === deliveryCapabilityPresetManageSelect ? 'สร้าง preset ใหม่' : 'เลือก preset';
        select.innerHTML = `<option value="">${emptyLabel}</option>`;
        presets.forEach((entry) => {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = entry.name;
          select.appendChild(option);
        });
      });
      if (deliveryCapabilityPresetView) {
        deliveryCapabilityPresetView.textContent = JSON.stringify(currentDeliveryCapabilities || {}, null, 2);
      }
    }

    function findDeliveryCapabilityById(capabilityId, source = '') {
      const targetId = String(capabilityId || '').trim();
      if (!targetId) return null;
      const collections = getCombinedDeliveryCapabilities();
      if (source === 'builtin') {
        return collections.builtin.find((entry) => entry.id === targetId) || null;
      }
      if (source === 'preset') {
        return collections.presets.find((entry) => entry.id === targetId) || null;
      }
      return collections.builtin.find((entry) => entry.id === targetId)
        || collections.presets.find((entry) => entry.id === targetId)
        || null;
    }

    function applyDeliveryCapabilityToForms(entry) {
      if (!entry) return;
      const defaults = entry.defaults && typeof entry.defaults === 'object' ? entry.defaults : {};
      if (deliveryCapabilityTestForm) {
        if (deliveryCapabilitySelect && entry.source === 'builtin') {
          deliveryCapabilitySelect.value = entry.id;
        }
        if (deliveryCapabilityPresetSelect && entry.source === 'preset') {
          deliveryCapabilityPresetSelect.value = entry.id;
        }
        const fieldMap = {
          announceText: defaults.announceText,
          steamId: defaults.steamId,
          gameItemId: defaults.gameItemId,
          quantity: defaults.quantity,
          teleportTarget: defaults.teleportTarget,
          returnTarget: defaults.returnTarget,
          inGameName: defaults.inGameName,
        };
        for (const [name, value] of Object.entries(fieldMap)) {
          const input = deliveryCapabilityTestForm.elements.namedItem(name);
          if (input && value != null && String(input.value || '').trim() === '') {
            input.value = String(value);
          }
        }
      }
      if (deliveryCapabilityPresetForm) {
        const commandsInput = deliveryCapabilityPresetForm.elements.namedItem('commands');
        const nameInput = deliveryCapabilityPresetForm.elements.namedItem('name');
        const descriptionInput = deliveryCapabilityPresetForm.elements.namedItem('description');
        const tagsInput = deliveryCapabilityPresetForm.elements.namedItem('tags');
        if (deliveryCapabilityPresetManageSelect && entry.source === 'preset') {
          deliveryCapabilityPresetManageSelect.value = entry.id;
        }
        if (commandsInput) commandsInput.value = entry.commandTemplates.join('\n');
        if (nameInput) nameInput.value = entry.name;
        if (descriptionInput) descriptionInput.value = entry.description || '';
        if (tagsInput) tagsInput.value = Array.isArray(entry.tags) ? entry.tags.join(', ') : '';
        const presetFields = {
          announceText: defaults.announceText,
          steamId: defaults.steamId,
          gameItemId: defaults.gameItemId,
          quantity: defaults.quantity,
          teleportTarget: defaults.teleportTarget,
          returnTarget: defaults.returnTarget,
          inGameName: defaults.inGameName,
          itemName: defaults.itemName,
        };
        Object.entries(presetFields).forEach(([name, value]) => {
          const input = deliveryCapabilityPresetForm.elements.namedItem(name);
          if (input) input.value = value == null ? '' : String(value);
        });
      }
    }

    async function refreshDeliveryCapabilities() {
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


