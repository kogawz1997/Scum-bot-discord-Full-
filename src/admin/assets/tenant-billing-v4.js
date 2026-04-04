(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TenantBillingV4 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function firstNonEmpty(values, fallback) {
    const rows = Array.isArray(values) ? values : [values];
    for (const value of rows) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
    return fallback || '';
  }

  function asNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function formatNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat('th-TH').format(numeric) : (fallback || '0');
  }

  function formatMoney(cents, currency) {
    const amount = Number(cents || 0) / 100;
    const normalizedCurrency = String(currency || 'THB').trim().toUpperCase() || 'THB';
    try {
      return new Intl.NumberFormat('th-TH', { style: 'currency', currency: normalizedCurrency }).format(amount);
    } catch {
      return normalizedCurrency + ' ' + amount.toFixed(2);
    }
  }

  function formatDateTime(value, fallback) {
    if (!value) return fallback || 'ยังไม่มีข้อมูล';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback || 'ยังไม่มีข้อมูล';
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function normalizeSubscriptionState(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['trial', 'trialing'].includes(normalized)) return 'trial';
    if (normalized === 'active') return 'active';
    if (['expired', 'canceled', 'cancelled'].includes(normalized)) return 'expired';
    if (['suspended', 'past_due', 'failed', 'pending', 'paused', 'void', 'disputed'].includes(normalized)) return 'suspended';
    return normalized || 'unknown';
  }

  function getSubscriptionStateLabel(value) {
    const normalized = normalizeSubscriptionState(value);
    if (normalized === 'trial') return 'ช่วงทดลอง';
    if (normalized === 'active') return 'ใช้งานอยู่';
    if (normalized === 'expired') return 'หมดอายุแล้ว';
    if (normalized === 'suspended') return 'ถูกระงับ';
    return 'ยังไม่ทราบสถานะ';
  }

  function subscriptionStateTone(value) {
    const normalized = normalizeSubscriptionState(value);
    if (normalized === 'active') return 'success';
    if (normalized === 'trial') return 'info';
    if (normalized === 'expired') return 'warning';
    if (normalized === 'suspended') return 'danger';
    return 'muted';
  }

  function humanizeFeatureKey(value) {
    const key = String(value || '').trim();
    if (!key) return 'ฟีเจอร์ที่ไม่ทราบชื่อ';
    const dictionary = {
      delivery_agent: 'Delivery Agent',
      server_bot: 'Server Bot',
      bot_log: 'Sync และบันทึกเซิร์ฟเวอร์',
      bot_delivery: 'ส่งของอัตโนมัติ',
      server_hosting: 'ควบคุมเซิร์ฟเวอร์',
      server_settings: 'ตั้งค่าเซิร์ฟเวอร์',
      server_status: 'สถานะเซิร์ฟเวอร์',
      orders_module: 'คำสั่งซื้อ',
      player_module: 'ผู้เล่น',
      wallet_module: 'กระเป๋าเงิน',
      donation_module: 'โดเนต',
      analytics_module: 'สรุปข้อมูล',
      event_module: 'กิจกรรม',
      restart_announce_module: 'ประกาศก่อนรีสตาร์ต',
      sync_agent: 'สร้าง Server Bot',
      execute_agent: 'สร้าง Delivery Agent',
      staff_roles: 'ทีมงานและสิทธิ์',
      agentRuntimes: 'จำนวน runtime',
      apiKeys: 'API key',
      webhooks: 'Webhook',
      marketplaceOffers: 'รายการขาย',
      purchases30d: 'คำสั่งซื้อ 30 วัน',
    };
    if (dictionary[key]) return dictionary[key];
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (match) { return match.toUpperCase(); });
  }

  function buildQuotaRows(rawQuotas) {
    const quotas = rawQuotas && typeof rawQuotas === 'object' ? rawQuotas : {};
    return Object.entries(quotas).map(function ([key, row]) {
      const limit = asNumber(row && row.limit, null);
      const used = asNumber(row && row.used, null);
      const remaining = asNumber(row && row.remaining, null);
      const limitReached = limit != null && used != null && limit > 0 && used >= limit;
      return {
        key,
        label: humanizeFeatureKey(key),
        used: used != null ? formatNumber(used, '0') : '-',
        limit: limit != null ? formatNumber(limit, '0') : 'ไม่จำกัด',
        remaining: remaining != null ? formatNumber(Math.max(remaining, 0), '0') : '-',
        tone: limitReached ? 'warning' : 'info',
        detail: limit != null
          ? `ใช้ไป ${used != null ? formatNumber(used, '0') : '-'} จาก ${formatNumber(limit, '0')}`
          : 'แพ็กเกจนี้ยังไม่ได้กำหนดเพดานการใช้งานในหมวดนี้',
      };
    });
  }

  function renderBadge(label, tone) {
    return '<span class="tdv4-badge tdv4-badge-' + escapeHtml(tone || 'muted') + '">' + escapeHtml(label) + '</span>';
  }

  function renderNavGroup(group) {
    return [
      '<section class="tdv4-nav-group">',
      '<div class="tdv4-nav-group-label">' + escapeHtml(group.label) + '</div>',
      '<div class="tdv4-nav-items">',
      ...(Array.isArray(group.items) ? group.items.map(function (item) {
        return '<a class="tdv4-nav-link' + (item.current ? ' tdv4-nav-link-current' : '') + '" href="' + escapeHtml(item.href || '#') + '">' + escapeHtml(item.label) + '</a>';
      }) : []),
      '</div>',
      '</section>',
    ].join('');
  }

  function renderSummaryCard(item) {
    return [
      '<article class="tdv4-kpi tdv4-tone-' + escapeHtml(item.tone || 'muted') + '">',
      '<div class="tdv4-kpi-label">' + escapeHtml(item.label) + '</div>',
      '<div class="tdv4-kpi-value">' + escapeHtml(item.value) + '</div>',
      '<div class="tdv4-kpi-detail">' + escapeHtml(item.detail) + '</div>',
      '</article>',
    ].join('');
  }

  function createPlanRows(state, currentSubscription) {
    const overview = state.overview && typeof state.overview === 'object' ? state.overview : {};
    const plans = Array.isArray(overview.plans) ? overview.plans : [];
    const currentPlanId = String(currentSubscription && currentSubscription.planId || '').trim();
    return plans
      .filter(function (plan) {
        return Number(plan && plan.amountCents || 0) > 0
          && String(plan && plan.billingCycle || '').trim().toLowerCase() !== 'trial';
      })
      .map(function (plan, index) {
        const planId = String(plan && plan.id || '').trim();
        return {
          id: planId,
          name: firstNonEmpty([plan && plan.name, planId], 'แพ็กเกจ'),
          current: Boolean(currentPlanId) && currentPlanId === planId,
          recommended: index === 0,
          billingCycle: firstNonEmpty([plan && plan.billingCycle], 'monthly'),
          priceLabel: formatMoney(plan && plan.amountCents || 0, plan && plan.currency || 'THB'),
          detail: Array.isArray(plan && plan.features)
            ? plan.features.slice(0, 3).join(' • ')
            : 'ดูสิทธิ์และเพดานใช้งานก่อนตัดสินใจ',
        };
      });
  }

  function isRetryableInvoiceStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['open', 'past_due', 'failed'].includes(normalized);
  }

  function isFailedAttemptStatus(value) {
    return String(value || '').trim().toLowerCase() === 'failed';
  }

  function buildBillingOpsCenter(args) {
    const currentSubscription = args && args.currentSubscription || null;
    const subscriptionState = args && args.subscriptionState || 'unknown';
    const invoices = Array.isArray(args && args.invoices) ? args.invoices : [];
    const attempts = Array.isArray(args && args.attempts) ? args.attempts : [];
    const billingOverview = args && args.billingOverview && typeof args.billingOverview === 'object' ? args.billingOverview : {};
    const renewalAt = firstNonEmpty([args && args.renewalAt], '');
    const currentPlan = args && args.currentPlan || null;
    const openInvoices = invoices.filter(function (row) { return isRetryableInvoiceStatus(row && row.status); });
    const failedAttempts = attempts.filter(function (row) { return isFailedAttemptStatus(row && row.status); });
    const paidInvoices = invoices.filter(function (row) { return String(row && row.status || '').trim().toLowerCase() === 'paid'; });
    const collectedCents = billingOverview.summary && Number(billingOverview.summary.collectedCents || 0) || 0;
    const openInvoiceCount = Number(billingOverview.summary && billingOverview.summary.openInvoiceCount || openInvoices.length || 0);
    const retryEligible = Boolean(currentSubscription && currentPlan && (openInvoices.length > 0 || failedAttempts.length > 0 || subscriptionState === 'suspended'));
    const latestInvoice = invoices[0] || null;
    const latestAttempt = attempts[0] || null;
    const timeline = [
      {
        tone: subscriptionStateTone(subscriptionState),
        title: 'Subscription lifecycle',
        detail: getSubscriptionStateLabel(subscriptionState),
        meta: renewalAt ? `Current period ends ${formatDateTime(renewalAt, 'No renewal date yet')}` : 'No renewal date has been recorded yet',
      },
      latestInvoice
        ? {
          tone: isRetryableInvoiceStatus(latestInvoice.status) ? 'warning' : 'success',
          title: 'Latest invoice',
          detail: firstNonEmpty([latestInvoice.id], 'Invoice'),
          meta: `${firstNonEmpty([latestInvoice.status], 'unknown')} · ${formatMoney(latestInvoice.amountCents, latestInvoice.currency)}`,
        }
        : null,
      latestAttempt
        ? {
          tone: isFailedAttemptStatus(latestAttempt.status) ? 'warning' : 'info',
          title: 'Latest payment attempt',
          detail: firstNonEmpty([latestAttempt.provider, latestAttempt.id], 'Payment attempt'),
          meta: firstNonEmpty([
            latestAttempt.errorDetail,
            latestAttempt.errorCode,
            `${firstNonEmpty([latestAttempt.status], 'unknown')} · ${formatMoney(latestAttempt.amountCents, latestAttempt.currency)}`,
          ], 'No payment-attempt detail recorded yet'),
        }
        : null,
      openInvoices.length > 0
        ? {
          tone: 'warning',
          title: 'Outstanding invoices',
          detail: `${formatNumber(openInvoices.length, '0')} invoice(s) still need payment attention`,
          meta: 'Use retry payment before package access degrades further.',
        }
        : null,
      paidInvoices.length > 0
        ? {
          tone: 'success',
          title: 'Collected invoices',
          detail: `${formatNumber(paidInvoices.length, '0')} invoice(s) already paid`,
          meta: formatMoney(collectedCents, currentSubscription && currentSubscription.currency || 'THB'),
        }
        : null,
    ].filter(Boolean);

    return {
      retryEligible: retryEligible,
      retryPlanId: retryEligible ? currentPlan.id : '',
      subscriptionId: currentSubscription && currentSubscription.id || '',
      summaryCards: [
        {
          label: 'Open invoices',
          value: formatNumber(openInvoiceCount, '0'),
          detail: openInvoiceCount > 0 ? 'Invoices still waiting on payment or recovery.' : 'No open invoices need attention right now.',
          tone: openInvoiceCount > 0 ? 'warning' : 'success',
        },
        {
          label: 'Failed retries',
          value: formatNumber(failedAttempts.length, '0'),
          detail: failedAttempts.length > 0 ? 'Recent payment attempts failed and should be retried.' : 'No failed payment attempts are visible.',
          tone: failedAttempts.length > 0 ? 'warning' : 'success',
        },
        {
          label: 'Lifecycle state',
          value: getSubscriptionStateLabel(subscriptionState),
          detail: renewalAt ? `Current period ends ${formatDateTime(renewalAt, 'No renewal date yet')}` : 'No renewal date has been recorded yet.',
          tone: subscriptionStateTone(subscriptionState),
        },
        {
          label: 'Collected total',
          value: formatMoney(collectedCents, currentSubscription && currentSubscription.currency || 'THB'),
          detail: 'Paid invoices recorded in the platform billing history.',
          tone: 'success',
        },
      ],
      timeline: timeline,
    };
  }

  function createTenantBillingV4Model(source) {
    const state = source && typeof source === 'object' ? source : {};
    const subscriptions = Array.isArray(state.subscriptions) ? state.subscriptions : [];
    const billingOverview = state.billingOverview && typeof state.billingOverview === 'object' ? state.billingOverview : {};
    const invoices = Array.isArray(state.billingInvoices) ? state.billingInvoices : [];
    const attempts = Array.isArray(state.billingPaymentAttempts) ? state.billingPaymentAttempts : [];
    const quotaSnapshot = state.quota && typeof state.quota === 'object' ? state.quota : {};
    const currentSubscription = subscriptions[0] || quotaSnapshot.subscription || null;
    const currentPackage = state.overview && state.overview.tenantFeatureAccess && state.overview.tenantFeatureAccess.package
      ? state.overview.tenantFeatureAccess.package
      : quotaSnapshot.package || null;
    const subscriptionState = normalizeSubscriptionState(currentSubscription && (currentSubscription.lifecycleStatus || currentSubscription.status));
    const featureKeys = Array.isArray(quotaSnapshot.enabledFeatureKeys) && quotaSnapshot.enabledFeatureKeys.length
      ? quotaSnapshot.enabledFeatureKeys
      : Array.isArray(currentPackage && currentPackage.features)
        ? currentPackage.features
        : [];
    const features = featureKeys.map(function (key) {
      return {
        key,
        label: humanizeFeatureKey(key),
      };
    });
    const quotaRows = buildQuotaRows(quotaSnapshot.quotas);
    const lockedActions = Object.entries(state.featureEntitlements && state.featureEntitlements.actions || {})
      .filter(function (entry) { return entry[1] && entry[1].locked; })
      .map(function (entry) {
        return {
          key: entry[0],
          label: humanizeFeatureKey(entry[0]),
          reason: firstNonEmpty([entry[1].reason], 'ต้องอัปเกรดแพ็กเกจก่อนใช้งาน'),
        };
      });
    const planRows = createPlanRows(state, currentSubscription);
    const renewalAt = firstNonEmpty([
      currentSubscription && currentSubscription.currentPeriodEnd,
      currentSubscription && currentSubscription.trialEndsAt,
      currentSubscription && currentSubscription.renewsAt,
    ], '');
    const nextUpgradePlan = planRows.find(function (plan) { return !plan.current; }) || null;
    const currentPlan = planRows.find(function (plan) { return plan.current; }) || null;
    const billingOpsCenter = buildBillingOpsCenter({
      currentSubscription,
      subscriptionState,
      invoices,
      attempts,
      billingOverview,
      renewalAt,
      currentPlan,
    });

    return {
      shell: {
        brand: 'SCUM TH',
        surfaceLabel: 'Tenant admin',
        workspaceLabel: firstNonEmpty([
          state.tenantLabel,
          state.tenantConfig && state.tenantConfig.name,
          state.overview && state.overview.tenantName,
          state.me && state.me.tenantId,
          'พื้นที่จัดการผู้เช่า',
        ]),
        navGroups: Array.isArray(state.__surfaceShell && state.__surfaceShell.navGroups) ? state.__surfaceShell.navGroups : [],
      },
      header: {
        title: 'แพ็กเกจและการชำระเงิน',
        subtitle: 'ดูแพ็กเกจปัจจุบัน วันหมดอายุ สิทธิ์ที่เปิดอยู่ และตัวเลือกอัปเกรดสำหรับ tenant นี้',
        statusChips: [
          { label: firstNonEmpty([currentPackage && (currentPackage.name || currentPackage.title), currentSubscription && currentSubscription.planId], 'ยังไม่มีแพ็กเกจ'), tone: 'info' },
          { label: getSubscriptionStateLabel(subscriptionState), tone: subscriptionStateTone(subscriptionState) },
          { label: renewalAt ? ('รอบปัจจุบันถึง ' + formatDateTime(renewalAt, 'ยังไม่มีข้อมูล')) : 'ยังไม่มีวันหมดอายุ', tone: renewalAt ? 'muted' : 'warning' },
        ],
      },
      actions: {
        primary: nextUpgradePlan
          ? {
            label: 'อัปเกรดแพ็กเกจ',
            planId: nextUpgradePlan.id,
          }
          : null,
      },
      summaryStrip: [
        {
          label: 'แพ็กเกจปัจจุบัน',
          value: firstNonEmpty([currentPackage && (currentPackage.name || currentPackage.title), currentSubscription && currentSubscription.planId], 'ยังไม่ทราบ'),
          detail: currentSubscription && currentSubscription.planId
            ? 'แผนที่ backend กำลังบังคับใช้กับ tenant นี้'
            : 'ยังไม่พบแผนที่ใช้งานอยู่ในระบบ',
          tone: 'info',
        },
        {
          label: 'สถานะการสมัครใช้',
          value: getSubscriptionStateLabel(subscriptionState),
          detail: renewalAt
            ? 'รอบปัจจุบันสิ้นสุด ' + formatDateTime(renewalAt, 'ยังไม่มีข้อมูล')
            : 'ยังไม่มีวันสิ้นสุดรอบที่บันทึกไว้',
          tone: subscriptionStateTone(subscriptionState),
        },
        {
          label: 'ยอดที่รับแล้ว',
          value: formatMoney(billingOverview.summary && billingOverview.summary.collectedCents || 0, currentSubscription && currentSubscription.currency || 'THB'),
          detail: 'ยอดจากใบแจ้งหนี้ที่ชำระแล้วในระบบ',
          tone: 'success',
        },
        {
          label: 'งานที่ถูกล็อก',
          value: formatNumber(lockedActions.length, '0'),
          detail: lockedActions.length
            ? 'ยังมีบาง action ที่ต้องอัปเกรดแพ็กเกจก่อนใช้งาน'
            : 'ยังไม่พบ action ที่ถูกล็อกด้วยแพ็กเกจ',
          tone: lockedActions.length ? 'warning' : 'success',
        },
        {
          label: 'ฟีเจอร์ที่เปิดอยู่',
          value: formatNumber(features.length, '0'),
          detail: features.length
            ? 'สิทธิ์ที่ backend เปิดให้ tenant นี้ใช้งานอยู่ตอนนี้'
            : 'ยังไม่พบฟีเจอร์ที่เปิดใช้งาน',
          tone: features.length ? 'success' : 'muted',
        },
      ],
      currentSubscription,
      subscriptions: subscriptions.slice(0, 6),
      invoices: invoices.slice(0, 8),
      attempts: attempts.slice(0, 8),
      lockedActions: lockedActions.slice(0, 10),
      features: features.slice(0, 24),
      quotaRows: quotaRows.slice(0, 12),
      planRows: planRows.slice(0, 6),
      subscriptionState: subscriptionState,
      billingOpsCenter,
    };
  }

  function renderSubscriptionList(model) {
    if (!model.subscriptions.length) {
      return '<div class="tdv4-empty-state"><strong>ยังไม่มีข้อมูลการสมัครใช้</strong><p>ระบบยังไม่ส่งรายการการสมัครใช้กลับมาสำหรับ tenant นี้</p></div>';
    }
    return model.subscriptions.map(function (row) {
      const state = normalizeSubscriptionState(row.lifecycleStatus || row.status);
      const renewalAt = firstNonEmpty([row.currentPeriodEnd, row.trialEndsAt, row.renewsAt], '');
      return [
        '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(subscriptionStateTone(state)) + '">',
        '<div class="tdv4-list-main">',
        '<strong>' + escapeHtml(firstNonEmpty([row.planId, row.id], 'การสมัครใช้')) + '</strong>',
        '<p>เริ่มรอบ ' + escapeHtml(formatDateTime(row.currentPeriodStart || row.startedAt, 'ยังไม่มีข้อมูล')) + ' | สิ้นสุดรอบ ' + escapeHtml(formatDateTime(renewalAt, 'ยังไม่มีข้อมูล')) + '</p>',
        '</div>',
        '<div class="tdv4-chip-row">',
        renderBadge(getSubscriptionStateLabel(state), subscriptionStateTone(state)),
        renderBadge(formatMoney(row.amountCents, row.currency), 'success'),
        '</div>',
        '</article>',
      ].join('');
    }).join('');
  }

  function renderPlanCards(model) {
    if (!model.planRows.length) {
      return '<div class="tdv4-empty-state"><strong>ยังไม่มีตัวเลือกอัปเกรด</strong><p>ยังไม่พบแผนที่สามารถขายหรืออัปเกรดได้ในระบบตอนนี้</p></div>';
    }
    return model.planRows.map(function (plan) {
      return [
        '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(plan.current ? 'success' : (plan.recommended ? 'info' : 'muted')) + '">',
        '<div class="tdv4-list-main">',
        '<strong>' + escapeHtml(plan.name) + '</strong>',
        '<p>' + escapeHtml(plan.detail) + '</p>',
        '</div>',
        '<div class="tdv4-chip-row">',
        renderBadge(plan.priceLabel, 'success'),
        renderBadge(plan.billingCycle, 'muted'),
        plan.current
          ? renderBadge('แพ็กเกจปัจจุบัน', 'success')
          : '<button class="tdv4-button tdv4-button-primary" type="button" data-tenant-billing-checkout data-plan-id="' + escapeHtml(plan.id) + '">เลือกแพ็กเกจนี้</button>',
        '</div>',
        '</article>',
      ].join('');
    }).join('');
  }

  function renderSimpleList(items, emptyTitle, emptyCopy, mapItem) {
    if (!items.length) {
      return '<div class="tdv4-empty-state"><strong>' + escapeHtml(emptyTitle) + '</strong><p>' + escapeHtml(emptyCopy) + '</p></div>';
    }
    return items.map(mapItem).join('');
  }

  function buildTenantBillingV4Html(model) {
    const safe = model || createTenantBillingV4Model({});
    const primaryUpgrade = safe.actions.primary;
    return [
      '<div class="tdv4-app">',
      '<header class="tdv4-topbar"><div class="tdv4-brand-row"><div class="tdv4-brand-mark">' + escapeHtml(safe.shell.brand) + '</div><div class="tdv4-brand-copy"><div class="tdv4-surface-label">' + escapeHtml(safe.shell.surfaceLabel) + '</div><div class="tdv4-workspace-label">' + escapeHtml(safe.shell.workspaceLabel) + '</div></div></div></header>',
      '<div class="tdv4-shell">',
      '<aside class="tdv4-sidebar">' + safe.shell.navGroups.map(renderNavGroup).join('') + '</aside>',
      '<main class="tdv4-main tdv4-stack">',
      '<section class="tdv4-pagehead tdv4-panel">',
      '<div><h1 class="tdv4-page-title">' + escapeHtml(safe.header.title) + '</h1><p class="tdv4-page-subtitle">' + escapeHtml(safe.header.subtitle) + '</p><div class="tdv4-chip-row">' + safe.header.statusChips.map(function (chip) { return renderBadge(chip.label, chip.tone); }).join('') + '</div></div>',
      '<div class="tdv4-pagehead-actions">',
      primaryUpgrade
        ? '<button class="tdv4-button tdv4-button-primary" type="button" data-tenant-billing-checkout data-plan-id="' + escapeHtml(primaryUpgrade.planId) + '">' + escapeHtml(primaryUpgrade.label) + '</button>'
        : '',
      '<button class="tdv4-button tdv4-button-secondary" type="button" data-tenant-billing-refresh>รีเฟรชข้อมูลการเงิน</button>',
      '</div>',
      '</section>',
      '<section class="tdv4-kpi-strip">' + safe.summaryStrip.map(renderSummaryCard).join('') + '</section>',
      '<section class="tdv4-panel" data-tenant-billing-ops>',
      '<div class="tdv4-panel-head">',
      '<div class="tdv4-stack">',
      '<div class="tdv4-section-kicker">Billing / Subscription Ops Center</div>',
      '<h2 class="tdv4-section-title">Keep the package active and payment recovery moving</h2>',
      '<p class="tdv4-section-copy">Track overdue pressure, payment retries, and lifecycle milestones from one workspace before package access degrades.</p>',
      '</div>',
      '<div class="tdv4-action-list">',
      safe.billingOpsCenter && safe.billingOpsCenter.retryEligible
        ? '<button class="tdv4-button tdv4-button-primary" type="button" data-tenant-billing-checkout data-tenant-billing-retry="true" data-plan-id="' + escapeHtml(safe.billingOpsCenter.retryPlanId) + '" data-subscription-id="' + escapeHtml(safe.billingOpsCenter.subscriptionId) + '">Retry payment</button>'
        : '',
      '<button class="tdv4-button tdv4-button-secondary" type="button" data-tenant-billing-refresh>Refresh billing state</button>',
      '<a class="tdv4-button tdv4-button-secondary" href="#billing-plan-options">Review package options</a>',
      '</div>',
      '</div>',
      '<div class="tdv4-kpi-strip">' + (safe.billingOpsCenter ? safe.billingOpsCenter.summaryCards.map(renderSummaryCard).join('') : '') + '</div>',
      '<section class="tdv4-dual-grid">',
      '<section id="billing-ops-timeline" class="tdv4-panel">',
      '<div class="tdv4-section-kicker">Lifecycle timeline</div>',
      '<h3 class="tdv4-section-title">Recent billing milestones</h3>',
      renderSimpleList(
        safe.billingOpsCenter && Array.isArray(safe.billingOpsCenter.timeline) ? safe.billingOpsCenter.timeline : [],
        'No billing milestones yet',
        'The billing timeline will show lifecycle and recovery signals here as soon as the tenant starts billing.',
        function (row) {
          return '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(row.tone || 'muted') + '"><div class="tdv4-list-main"><strong>' + escapeHtml(row.title) + '</strong><p>' + escapeHtml(row.detail) + '</p></div><div class="tdv4-list-meta">' + escapeHtml(row.meta || '') + '</div></article>';
        }
      ),
      '</section>',
      '<section id="billing-recovery-context" class="tdv4-panel">',
      '<div class="tdv4-section-kicker">Recovery context</div>',
      '<h3 class="tdv4-section-title">What to do next</h3>',
      renderSimpleList(
        safe.lockedActions.slice(0, 3),
        'No package blockers',
        'No feature locks are blocking daily operations right now.',
        function (row) {
          return '<article class="tdv4-list-item tdv4-tone-warning"><div class="tdv4-list-main"><strong>' + escapeHtml(row.label) + '</strong><p>' + escapeHtml(row.reason) + '</p></div></article>';
        }
      ),
      '</section>',
      '</section>',
      '</section>',
      '<section class="tdv4-dual-grid">',
      '<section id="billing-current-state" class="tdv4-panel">',
      '<div class="tdv4-section-kicker">สถานะปัจจุบัน</div>',
      '<h2 class="tdv4-section-title">การสมัครใช้ที่กำลังมีผล</h2>',
      renderSubscriptionList(safe),
      '</section>',
      '<section id="billing-plan-options" class="tdv4-panel">',
      '<div class="tdv4-section-kicker">สิ่งที่ควรทำต่อ</div>',
      '<h2 class="tdv4-section-title">ตัวเลือกอัปเกรดแพ็กเกจ</h2>',
      '<p class="tdv4-section-copy">ใช้ส่วนนี้เมื่อฟีเจอร์ที่ถูกล็อกเริ่มกระทบงานประจำวัน หรือเมื่อเพดานการใช้งานใกล้เต็ม</p>',
      renderPlanCards(safe),
      '</section>',
      '</section>',
      '<section class="tdv4-dual-grid">',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">ฟีเจอร์ที่เปิดอยู่</div>',
      '<h2 class="tdv4-section-title">สิทธิ์จากแพ็กเกจ</h2>',
      renderSimpleList(
        safe.features,
        'ยังไม่มีรายการฟีเจอร์',
        'tenant นี้ยังไม่ส่งรายการฟีเจอร์ที่เปิดอยู่กลับมา',
        function (row) {
          return '<article class="tdv4-list-item tdv4-tone-success"><div class="tdv4-list-main"><strong>' + escapeHtml(row.label) + '</strong><p>' + escapeHtml(row.key) + '</p></div></article>';
        },
      ),
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">เพดานการใช้งาน</div>',
      '<h2 class="tdv4-section-title">ขีดจำกัดของแพ็กเกจ</h2>',
      renderSimpleList(
        safe.quotaRows,
        'ยังไม่มีข้อมูลเพดานใช้งาน',
        'ยังไม่พบโควตาที่ผูกกับ tenant นี้',
        function (row) {
          return '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(row.tone) + '"><div class="tdv4-list-main"><strong>' + escapeHtml(row.label) + '</strong><p>' + escapeHtml(row.detail) + '</p></div><div class="tdv4-chip-row">' + renderBadge('ใช้แล้ว ' + row.used, 'info') + renderBadge('เพดาน ' + row.limit, 'muted') + renderBadge('เหลือ ' + row.remaining, row.tone) + '</div></article>';
        },
      ),
      '</section>',
      '</section>',
      '<section class="tdv4-dual-grid">',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">ใบแจ้งหนี้</div>',
      '<h2 class="tdv4-section-title">ประวัติการเรียกเก็บเงิน</h2>',
      renderSimpleList(
        safe.invoices,
        'ยังไม่มีใบแจ้งหนี้',
        'ประวัติใบแจ้งหนี้จะขึ้นที่นี่เมื่อระบบการเงินเริ่มสร้างรอบชำระเงิน',
        function (row) {
          return '<article class="tdv4-list-item tdv4-tone-info"><div class="tdv4-list-main"><strong>' + escapeHtml(firstNonEmpty([row.id], 'ใบแจ้งหนี้')) + '</strong><p>ครบกำหนด ' + escapeHtml(formatDateTime(row.dueAt, 'ยังไม่มีวันครบกำหนด')) + ' | ชำระแล้ว ' + escapeHtml(formatDateTime(row.paidAt, 'ยังไม่ชำระ')) + '</p></div><div class="tdv4-chip-row">' + renderBadge(firstNonEmpty([row.status], 'unknown'), 'info') + renderBadge(formatMoney(row.amountCents, row.currency), 'success') + '</div></article>';
        },
      ),
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">สิทธิ์ที่ยังถูกล็อก</div>',
      '<h2 class="tdv4-section-title">งานที่ต้องอัปเกรดก่อน</h2>',
      renderSimpleList(
        safe.lockedActions,
        'ยังไม่มี action ที่ถูกล็อก',
        'ตอนนี้ยังไม่พบงานที่ถูกปิดไว้ด้วยแพ็กเกจ',
        function (row) {
          return '<article class="tdv4-list-item tdv4-tone-warning"><div class="tdv4-list-main"><strong>' + escapeHtml(row.label) + '</strong><p>' + escapeHtml(row.reason) + '</p></div></article>';
        },
      ),
      '</section>',
      '</section>',
      '<section class="tdv4-panel">',
      '<div class="tdv4-section-kicker">การชำระเงินล่าสุด</div>',
      '<h2 class="tdv4-section-title">ประวัติการพยายามชำระเงิน</h2>',
      renderSimpleList(
        safe.attempts,
        'ยังไม่มีประวัติการชำระเงิน',
        'ระบบจะบันทึกผลการพยายามชำระเงินไว้ที่นี่',
        function (row) {
          const tone = String(row.status || '').trim().toLowerCase() === 'failed' ? 'warning' : 'info';
          return '<article class="tdv4-list-item tdv4-tone-' + escapeHtml(tone) + '"><div class="tdv4-list-main"><strong>' + escapeHtml(firstNonEmpty([row.provider, row.id], 'การชำระเงิน')) + '</strong><p>' + escapeHtml(firstNonEmpty([row.errorDetail, row.errorCode, 'ยังไม่มีข้อความผิดพลาด'])) + '</p></div><div class="tdv4-chip-row">' + renderBadge(firstNonEmpty([row.status], 'unknown'), tone) + renderBadge(formatMoney(row.amountCents, row.currency), 'success') + '</div></article>';
        },
      ),
      '</section>',
      '</main>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderTenantBillingV4(rootElement, source) {
    if (!rootElement) throw new Error('renderTenantBillingV4 requires a root element');
    const model = source && source.header && Array.isArray(source.subscriptions)
      ? source
      : createTenantBillingV4Model(source);
    rootElement.innerHTML = buildTenantBillingV4Html(model);
    return model;
  }

  return {
    buildTenantBillingV4Html: buildTenantBillingV4Html,
    createTenantBillingV4Model: createTenantBillingV4Model,
    renderTenantBillingV4: renderTenantBillingV4,
  };
});
