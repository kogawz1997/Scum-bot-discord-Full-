'use strict';

function createAdminAccessRuntime(options = {}) {
  const {
    sendJson,
    getAuthContext,
    hasRoleAtLeast,
    resolveTenantScope,
    verifyPlatformApiKey,
    setRequestMeta,
    getAdminPermissionForPath,
    resolveItemIconUrl,
  } = options;

  function asInt(value, fallback = null) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
  }

  function requiredString(body, key) {
    const source = typeof key === 'undefined' ? body : body?.[key];
    const value = String(source || '').trim();
    return value || null;
  }

  function parseStringArray(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    }
    const text = String(value || '').trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
          ? parsed.map((entry) => String(entry || '').trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    }
    return text
      .split(/[\r\n,]+/)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }

  function parseDeliveryItemsBody(input) {
    let candidate = input;
    if (typeof candidate === 'string') {
      const raw = candidate.trim();
      if (!raw) return [];
      try {
        candidate = JSON.parse(raw);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(candidate)) return [];

    const out = [];
    for (const row of candidate) {
      if (!row || typeof row !== 'object') continue;
      const gameItemId = String(row.gameItemId || row.id || '').trim();
      if (!gameItemId) continue;
      const quantity = Math.max(1, asInt(row.quantity, 1) || 1);
      const iconUrl = String(row.iconUrl || '').trim() || null;
      out.push({ gameItemId, quantity, iconUrl });
    }
    return out;
  }

  function ensureRole(req, urlObj, minRole, res) {
    const auth = getAuthContext(req, urlObj);
    if (!auth) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return null;
    }
    if (!hasRoleAtLeast(auth.role, minRole)) {
      sendJson(res, 403, {
        ok: false,
        error: `Forbidden: ${minRole} role required`,
        role: auth.role,
      });
      return null;
    }
    return auth;
  }

  function resolveScopedTenantId(req, res, auth, requestedTenantId = '', optionsArg = {}) {
    const result = resolveTenantScope({
      auth,
      requestedTenantId,
      required: optionsArg.required === true,
    });
    if (!result.ok) {
      sendJson(res, result.statusCode || 400, {
        ok: false,
        error: result.error || 'Invalid tenant scope',
        ...(result.tenantId ? { tenantId: result.tenantId } : {}),
      });
      return null;
    }
    return result.tenantId;
  }

  function getForwardedDiscordId(req) {
    const value = String(req.headers['x-forwarded-discord-id'] || '').trim();
    if (!/^\d{15,25}$/.test(value)) return '';
    return value;
  }

  function ensurePortalTokenAuth(req, urlObj, res) {
    const auth = getAuthContext(req, urlObj);
    if (!auth) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return null;
    }
    if (auth.mode !== 'token') {
      sendJson(res, 403, {
        ok: false,
        error: 'Portal endpoint requires token auth',
      });
      return null;
    }
    const discordId = getForwardedDiscordId(req);
    if (!discordId) {
      sendJson(res, 400, {
        ok: false,
        error: 'Missing x-forwarded-discord-id header',
      });
      return null;
    }
    return {
      auth,
      discordId,
      forwardedUser: String(req.headers['x-forwarded-user'] || '').trim() || 'portal',
    };
  }

  function getPlatformApiKeyFromRequest(req) {
    const headerKey = String(req.headers['x-platform-api-key'] || '').trim();
    if (headerKey) return headerKey;
    const authHeader = String(req.headers.authorization || '').trim();
    if (/^bearer\s+/i.test(authHeader)) {
      return authHeader.replace(/^bearer\s+/i, '').trim();
    }
    return '';
  }

  async function ensurePlatformApiKey(req, res, requiredScopes = []) {
    const rawKey = getPlatformApiKeyFromRequest(req);
    const auth = await verifyPlatformApiKey(rawKey, requiredScopes);
    if (!auth?.ok) {
      const status = [
        'insufficient-scope',
        'tenant-access-suspended',
        'tenant-subscription-inactive',
        'tenant-license-inactive',
      ].includes(String(auth?.reason || '').trim())
        ? 403
        : 401;
      sendJson(res, status, {
        ok: false,
        error: auth?.reason || 'invalid-platform-api-key',
        missingScopes: Array.isArray(auth?.missingScopes) ? auth.missingScopes : [],
      });
      return null;
    }
    setRequestMeta(req, {
      authMode: 'platform-api-key',
      user: auth.apiKey?.name || 'platform-api-key',
      role: 'tenant',
      tenantId: auth.tenant?.id || null,
    });
    return auth;
  }

  function filterShopItems(rows, optionsArg = {}) {
    const kindFilter = String(optionsArg.kind || '').trim().toLowerCase();
    const query = String(optionsArg.q || '').trim().toLowerCase();
    const limit = Math.max(1, Math.min(1000, Number(optionsArg.limit || 200)));
    const out = [];

    for (const row of Array.isArray(rows) ? rows : []) {
      const kind = String(row?.kind || 'item').trim().toLowerCase() === 'vip'
        ? 'vip'
        : 'item';
      if (kindFilter && kindFilter !== 'all' && kind !== kindFilter) continue;

      const haystack = [row?.id, row?.name, row?.description, row?.gameItemId]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      if (query && !haystack.includes(query)) continue;

      out.push({
        ...row,
        kind,
        iconUrl: row?.iconUrl || resolveItemIconUrl(row),
      });
      if (out.length >= limit) break;
    }

    return out;
  }

  function requiredRoleForPostPath(pathname) {
    return getAdminPermissionForPath(pathname, 'POST')?.minRole || 'admin';
  }

  return {
    asInt,
    ensurePlatformApiKey,
    ensurePortalTokenAuth,
    ensureRole,
    filterShopItems,
    getForwardedDiscordId,
    getPlatformApiKeyFromRequest,
    parseDeliveryItemsBody,
    parseStringArray,
    requiredRoleForPostPath,
    requiredString,
    resolveScopedTenantId,
  };
}

module.exports = {
  createAdminAccessRuntime,
};
