'use strict';

/**
 * Shared tenant-scope helpers for admin routes.
 * Keep them pure so tenant-boundary behavior is easy to test without HTTP wiring.
 */

function getAuthTenantId(auth = null) {
  return String(auth?.tenantId || '').trim() || null;
}

function resolveTenantScope({ auth = null, requestedTenantId = '', required = false } = {}) {
  const authTenantId = getAuthTenantId(auth);
  const normalizedRequested = String(requestedTenantId || '').trim() || null;

  if (!authTenantId) {
    if (!normalizedRequested && required === true) {
      return {
        ok: false,
        statusCode: 400,
        error: 'tenantId is required',
        tenantId: null,
      };
    }
    return {
      ok: true,
      tenantId: normalizedRequested,
    };
  }

  if (normalizedRequested && normalizedRequested !== authTenantId) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Forbidden: tenant scope mismatch',
      tenantId: authTenantId,
    };
  }

  return {
    ok: true,
    tenantId: authTenantId,
  };
}

function filterRowsByTenantScope(rows, auth = null, options = {}) {
  const authTenantId = getAuthTenantId(auth);
  if (!authTenantId) return Array.isArray(rows) ? rows : [];

  const keys = Array.isArray(options.keys) && options.keys.length > 0
    ? options.keys
    : ['tenantId', 'id'];

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const matchValue = keys
      .map((key) => String(row?.[key] || '').trim() || null)
      .find(Boolean);
    return matchValue === authTenantId;
  });
}

module.exports = {
  filterRowsByTenantScope,
  getAuthTenantId,
  resolveTenantScope,
};
