'use strict';

const DEFAULT_ACTION_RATE_LIMIT_POLICIES = Object.freeze({
  'platform-agent-activate': Object.freeze({ windowMs: 10 * 60 * 1000, maxAttempts: 10 }),
  'server-config-retry': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 12 }),
  'server-config-save': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 20 }),
  'server-config-apply': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 12 }),
  'server-config-rollback': Object.freeze({ windowMs: 10 * 60 * 1000, maxAttempts: 8 }),
  'server-restart': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 8 }),
  'server-control': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 8 }),
  'server-bot-probe': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 12 }),
  'delivery-enqueue': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 12 }),
  'delivery-mutate': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 20 }),
  'delivery-preview': Object.freeze({ windowMs: 2 * 60 * 1000, maxAttempts: 20 }),
  'delivery-command-template': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 10 }),
  'delivery-capability': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 10 }),
  'delivery-test-send': Object.freeze({ windowMs: 5 * 60 * 1000, maxAttempts: 6 }),
});

function clampPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function createAdminSecurityRuntime(options = {}) {
  const {
    loginRateLimitWindowMs,
    loginRateLimitMaxAttempts,
    loginSpikeWindowMs,
    loginSpikeThreshold,
    loginSpikeIpThreshold,
    loginSpikeAlertCooldownMs,
    actionRateLimitPolicies = DEFAULT_ACTION_RATE_LIMIT_POLICIES,
    actionRateLimitAlertCooldownMs = 60 * 1000,
    discordOauthStates = null,
    ssoStateTtlMs = 0,
    getClientIp,
    publishAdminLiveUpdate,
    addAdminNotification,
    recordAdminSecurityEvent,
    logger = console,
  } = options;

  const loginAttemptsByIp = new Map();
  const loginFailureEvents = [];
  const actionAttemptsByKey = new Map();
  const actionAlertStateByKey = new Map();
  let lastLoginSpikeAlertAt = 0;

  function cleanupLoginAttempts(now = Date.now()) {
    for (const [ip, entry] of loginAttemptsByIp.entries()) {
      if (!entry || now - entry.firstAt > loginRateLimitWindowMs) {
        loginAttemptsByIp.delete(ip);
      }
    }
  }

  function cleanupLoginFailureEvents(now = Date.now()) {
    const cutoff = now - loginSpikeWindowMs;
    while (loginFailureEvents.length > 0 && loginFailureEvents[0].at < cutoff) {
      loginFailureEvents.shift();
    }
  }

  function cleanupDiscordOauthStates(now = Date.now()) {
    if (!(discordOauthStates instanceof Map) || ssoStateTtlMs <= 0) return;
    for (const [state, payload] of discordOauthStates.entries()) {
      if (!payload || now - Number(payload.createdAt || 0) > ssoStateTtlMs) {
        discordOauthStates.delete(state);
      }
    }
  }

  function cleanupActionAttempts(now = Date.now()) {
    for (const [key, entry] of actionAttemptsByKey.entries()) {
      if (!entry || now - Number(entry.firstAt || 0) > Number(entry.windowMs || 0)) {
        actionAttemptsByKey.delete(key);
      }
    }
    for (const [key, entry] of actionAlertStateByKey.entries()) {
      if (!entry || now - Number(entry.at || 0) > Number(entry.windowMs || 0)) {
        actionAlertStateByKey.delete(key);
      }
    }
  }

  function resolveActionRateLimitPolicy(actionKey, override = {}) {
    const basePolicy = actionRateLimitPolicies?.[actionKey] || null;
    const windowMs = clampPositiveInt(
      override?.windowMs,
      clampPositiveInt(basePolicy?.windowMs, 5 * 60 * 1000),
    );
    const maxAttempts = clampPositiveInt(
      override?.maxAttempts,
      clampPositiveInt(basePolicy?.maxAttempts, 10),
    );
    return {
      actionKey: String(actionKey || '').trim() || 'admin-action',
      windowMs,
      maxAttempts,
    };
  }

  function buildActionRateLimitBucket(actionKey, context = {}) {
    const tenantId = String(context.tenantId || 'global').trim() || 'global';
    const actor = String(context.actor || 'anonymous').trim() || 'anonymous';
    const ip = String(context.ip || 'unknown').trim() || 'unknown';
    const identityKey = String(context.identityKey || '').trim().toLowerCase();
    return [
      String(actionKey || 'admin-action').trim() || 'admin-action',
      `tenant:${tenantId}`,
      `actor:${actor}`,
      `ip:${ip}`,
      identityKey ? `identity:${identityKey}` : '',
    ].filter(Boolean).join('|');
  }

  function maybeAlertActionRateLimit(actionState, context = {}) {
    const now = Number(actionState?.now || Date.now());
    const existingAlert = actionAlertStateByKey.get(actionState.key);
    if (existingAlert && now - Number(existingAlert.at || 0) < actionRateLimitAlertCooldownMs) {
      return;
    }
    actionAlertStateByKey.set(actionState.key, {
      at: now,
      windowMs: actionState.windowMs,
    });

    recordAdminSecuritySignal('admin-action-rate-limited', {
      severity: 'warn',
      actor: context.actor || null,
      targetUser: context.targetUser || null,
      ip: context.ip || null,
      path: context.path || null,
      reason: 'too-many-requests',
      detail: `${actionState.actionKey} was rate limited`,
      notify: true,
      title: 'Sensitive action rate limited',
      data: {
        actionKey: actionState.actionKey,
        tenantId: context.tenantId || null,
        retryAfterMs: actionState.retryAfterMs,
        maxAttempts: actionState.maxAttempts,
        windowMs: actionState.windowMs,
      },
    });
  }

  function consumeActionRateLimit(actionKey, context = {}) {
    const normalizedActionKey = String(actionKey || '').trim() || 'admin-action';
    const policy = resolveActionRateLimitPolicy(normalizedActionKey, context.policy);
    const now = Date.now();
    cleanupActionAttempts(now);

    const key = buildActionRateLimitBucket(normalizedActionKey, context);
    const existing = actionAttemptsByKey.get(key);

    if (!existing || now - Number(existing.firstAt || 0) > policy.windowMs) {
      actionAttemptsByKey.set(key, {
        count: 1,
        firstAt: now,
        lastAt: now,
        windowMs: policy.windowMs,
      });
      return {
        limited: false,
        actionKey: normalizedActionKey,
        key,
        retryAfterMs: 0,
        maxAttempts: policy.maxAttempts,
        windowMs: policy.windowMs,
      };
    }

    if (existing.count >= policy.maxAttempts) {
      const retryAfterMs = Math.max(0, policy.windowMs - (now - Number(existing.firstAt || now)));
      const state = {
        limited: true,
        now,
        actionKey: normalizedActionKey,
        key,
        retryAfterMs,
        maxAttempts: policy.maxAttempts,
        windowMs: policy.windowMs,
      };
      maybeAlertActionRateLimit(state, context);
      return state;
    }

    actionAttemptsByKey.set(key, {
      ...existing,
      count: Number(existing.count || 0) + 1,
      lastAt: now,
      windowMs: policy.windowMs,
    });
    return {
      limited: false,
      actionKey: normalizedActionKey,
      key,
      retryAfterMs: 0,
      maxAttempts: policy.maxAttempts,
      windowMs: policy.windowMs,
    };
  }

  function getLoginFailureMetrics(now = Date.now()) {
    cleanupLoginFailureEvents(now);
    const byIp = new Map();
    for (const event of loginFailureEvents) {
      const ip = event?.ip || 'unknown';
      byIp.set(ip, (byIp.get(ip) || 0) + 1);
    }
    const hotIps = Array.from(byIp.entries())
      .filter(([, count]) => count >= loginSpikeIpThreshold)
      .sort((a, b) => b[1] - a[1])
      .map(([ip, count]) => ({ ip, count }));
    return {
      windowMs: loginSpikeWindowMs,
      failures: loginFailureEvents.length,
      threshold: loginSpikeThreshold,
      perIpThreshold: loginSpikeIpThreshold,
      hotIps,
    };
  }

  function buildSecurityNotificationMessage(event = {}) {
    const parts = [
      event.detail || event.type || 'security-event',
      event.actor ? `actor=${event.actor}` : '',
      event.targetUser ? `target=${event.targetUser}` : '',
      event.ip ? `ip=${event.ip}` : '',
      event.reason ? `reason=${event.reason}` : '',
    ].filter(Boolean);
    return parts.join(' | ');
  }

  function recordAdminSecuritySignal(type, optionsArg = {}) {
    const normalizedType = String(type || 'security-event').trim() || 'security-event';
    const severity =
      String(optionsArg.severity || (optionsArg.notify ? 'warn' : 'info')).trim() || 'info';
    const shouldNotify = optionsArg.suppressNotification === true
      ? false
      : optionsArg.notify === true || severity === 'warn' || severity === 'error';
    const event = recordAdminSecurityEvent({
      type: normalizedType,
      severity,
      actor: optionsArg.actor || null,
      targetUser: optionsArg.targetUser || null,
      role: optionsArg.role || null,
      authMethod: optionsArg.authMethod || null,
      sessionId: optionsArg.sessionId || null,
      ip: optionsArg.ip || null,
      path: optionsArg.path || null,
      reason: optionsArg.reason || null,
      detail: optionsArg.detail || null,
      data: optionsArg.data || null,
    });
    publishAdminLiveUpdate('admin-security', event);
    if (shouldNotify) {
      addAdminNotification({
        type: 'security',
        source: 'admin-auth',
        kind: normalizedType,
        severity,
        title: optionsArg.title || 'Admin Security Event',
        message: buildSecurityNotificationMessage(event),
        entityKey: event.sessionId || event.targetUser || null,
        data: event,
      });
    }
    return event;
  }

  function maybeAlertLoginFailureSpike(now = Date.now()) {
    const metrics = getLoginFailureMetrics(now);
    const hasGlobalSpike = metrics.failures >= loginSpikeThreshold;
    const hasIpSpike = metrics.hotIps.length > 0;
    if (!hasGlobalSpike && !hasIpSpike) return;
    if (now - lastLoginSpikeAlertAt < loginSpikeAlertCooldownMs) return;
    lastLoginSpikeAlertAt = now;

    const payload = {
      source: 'admin-login',
      kind: hasGlobalSpike ? 'global-spike' : 'ip-spike',
      windowMs: metrics.windowMs,
      failures: metrics.failures,
      threshold: metrics.threshold,
      hotIps: metrics.hotIps.slice(0, 5),
    };
    logger.warn(
      `[admin-web][alert] login failure spike: failures=${metrics.failures} windowMs=${metrics.windowMs}`,
    );
    publishAdminLiveUpdate('ops-alert', payload);
  }

  function getLoginRateLimitState(req) {
    const now = Date.now();
    cleanupLoginAttempts(now);
    const ip = getClientIp(req);
    const entry = loginAttemptsByIp.get(ip);
    if (!entry) {
      return { limited: false, ip, retryAfterMs: 0 };
    }

    if (entry.count >= loginRateLimitMaxAttempts) {
      const retryAfterMs = Math.max(0, loginRateLimitWindowMs - (now - entry.firstAt));
      return { limited: retryAfterMs > 0, ip, retryAfterMs };
    }

    return { limited: false, ip, retryAfterMs: 0 };
  }

  function recordLoginAttempt(req, success) {
    const now = Date.now();
    cleanupLoginAttempts(now);
    cleanupLoginFailureEvents(now);
    const ip = getClientIp(req);

    if (success) {
      loginAttemptsByIp.delete(ip);
      recordAdminSecuritySignal('login-succeeded', {
        actor: String(req?.__pendingAdminUser || '').trim() || 'unknown',
        targetUser: String(req?.__pendingAdminUser || '').trim() || 'unknown',
        authMethod: String(req?.__pendingAdminAuthMethod || 'password'),
        ip,
        path: '/admin/api/login',
        detail: 'Admin login succeeded',
      });
      return;
    }

    loginFailureEvents.push({ at: now, ip });
    recordAdminSecuritySignal('login-failed', {
      severity: 'warn',
      actor: String(req?.__pendingAdminUser || '').trim() || 'unknown',
      targetUser: String(req?.__pendingAdminUser || '').trim() || 'unknown',
      authMethod: String(req?.__pendingAdminAuthMethod || 'password'),
      ip,
      path: '/admin/api/login',
      reason: String(req?.__pendingAdminFailureReason || 'invalid-credentials'),
      detail: 'Admin login failed',
      notify: true,
    });
    maybeAlertLoginFailureSpike(now);

    const existing = loginAttemptsByIp.get(ip);
    if (!existing || now - existing.firstAt > loginRateLimitWindowMs) {
      loginAttemptsByIp.set(ip, { count: 1, firstAt: now });
      return;
    }

    loginAttemptsByIp.set(ip, {
      count: existing.count + 1,
      firstAt: existing.firstAt,
    });
  }

  return {
    cleanupDiscordOauthStates,
    consumeActionRateLimit,
    getLoginFailureMetrics,
    getLoginRateLimitState,
    recordAdminSecuritySignal,
    recordLoginAttempt,
  };
}

module.exports = {
  createAdminSecurityRuntime,
};
