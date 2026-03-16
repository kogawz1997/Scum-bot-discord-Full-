'use strict';

function unwrapRuntimePayload(payload) {
  if (
    payload
    && typeof payload === 'object'
    && payload.data
    && typeof payload.data === 'object'
    && !Array.isArray(payload.data)
  ) {
    return payload.data;
  }
  return payload && typeof payload === 'object' ? payload : {};
}

function summarizeRuntimeReason(payload) {
  const data = unwrapRuntimePayload(payload);
  return String(
    data.reason
      || payload.reason
      || data.statusMessage
      || payload.statusMessage
      || data.error
      || payload.error
      || data.statusCode
      || payload.statusCode
      || data.status
      || payload.status
      || '',
  ).trim();
}

function classifyRuntimeStatus(payload, options = {}) {
  const required = options.required !== false;
  const allowDisabled = options.allowDisabled === true;
  const requireDiscordReady = options.requireDiscordReady === true;
  const data = unwrapRuntimePayload(payload);
  const state = String(data.status || payload?.status || '').trim().toLowerCase();
  const ready =
    typeof data.ready === 'boolean'
      ? data.ready
      : (typeof payload?.ready === 'boolean' ? payload.ready : null);
  const discordReady =
    typeof data.discordReady === 'boolean'
      ? data.discordReady
      : (typeof payload?.discordReady === 'boolean' ? payload.discordReady : null);
  const reason = summarizeRuntimeReason(payload);

  if (state === 'disabled') {
    return {
      ok: !required || allowDisabled,
      state: 'disabled',
      ready,
      discordReady,
      reason,
      payload,
    };
  }

  if (
    ready === false
    || state === 'degraded'
    || state === 'error'
    || state === 'offline'
    || state === 'not-configured'
  ) {
    return {
      ok: required === false,
      state: state || 'not-ready',
      ready,
      discordReady,
      reason,
      payload,
    };
  }

  if (requireDiscordReady && discordReady === false) {
    return {
      ok: required === false,
      state: 'discord-not-ready',
      ready,
      discordReady,
      reason: reason || 'discord-not-ready',
      payload,
    };
  }

  return {
    ok: true,
    state: 'ready',
    ready,
    discordReady,
    reason,
    payload,
  };
}

function normalizeValidationStatus(status, options = {}) {
  const fallback = options.fallback || 'pass';
  const normalized = String(status || fallback).trim().toLowerCase();
  if (['pass', 'warning', 'failed', 'skipped'].includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function createValidationCheck(name, options = {}) {
  const status = normalizeValidationStatus(
    options.status,
    { fallback: options.ok === false ? 'failed' : options.ok == null ? 'skipped' : 'pass' },
  );
  return {
    name: String(name || '').trim() || 'unnamed-check',
    status,
    ok: status !== 'failed',
    detail: String(options.detail || '').trim(),
    data: options.data && typeof options.data === 'object' ? options.data : undefined,
  };
}

function buildValidationSummary(status, checks, errors, warnings) {
  const passedChecks = checks.filter((entry) => entry.status === 'pass').length;
  const failedChecks = checks.filter((entry) => entry.status === 'failed').length;
  const skippedChecks = checks.filter((entry) => entry.status === 'skipped').length;
  const warnedChecks = checks.filter((entry) => entry.status === 'warning').length;
  const issueCounts = [];

  if (failedChecks > 0) issueCounts.push(`${failedChecks} failed`);
  if (errors.length > 0) issueCounts.push(`${errors.length} errors`);
  if (warnings.length > 0) issueCounts.push(`${warnings.length} warnings`);
  if (warnedChecks > 0) issueCounts.push(`${warnedChecks} warning-checks`);
  if (skippedChecks > 0) issueCounts.push(`${skippedChecks} skipped`);

  if (issueCounts.length > 0) {
    return `${status}: ${issueCounts.join(', ')}`;
  }

  return `${status}: ${passedChecks} checks passed`;
}

function createValidationReport(options = {}) {
  const checks = Array.isArray(options.checks)
    ? options.checks.map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return createValidationCheck('invalid-check', { status: 'failed' });
      }
      return createValidationCheck(entry.name, entry);
    })
    : [];
  const errors = Array.isArray(options.errors)
    ? options.errors.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const warnings = Array.isArray(options.warnings)
    ? options.warnings.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  let status = normalizeValidationStatus(options.status, {
    fallback: errors.length > 0 ? 'failed' : warnings.length > 0 ? 'warning' : 'pass',
  });

  if (checks.some((entry) => entry.status === 'failed') || errors.length > 0) {
    status = 'failed';
  } else if (checks.some((entry) => entry.status === 'warning') || warnings.length > 0) {
    status = 'warning';
  }

  return {
    kind: String(options.kind || 'validation').trim() || 'validation',
    ok: status !== 'failed',
    status,
    summary:
      String(options.summary || '').trim()
      || buildValidationSummary(status, checks, errors, warnings),
    checks,
    warnings,
    errors,
    data: options.data && typeof options.data === 'object' ? options.data : {},
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  classifyRuntimeStatus,
  createValidationCheck,
  createValidationReport,
  normalizeValidationStatus,
  summarizeRuntimeReason,
  unwrapRuntimePayload,
};
