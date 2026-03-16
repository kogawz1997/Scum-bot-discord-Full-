'use strict';

/**
 * Keep admin route dispatch glue out of the main server file.
 */

function createAdminRouteRuntime(deps = {}) {
  const {
    sendJson,
    handleAdminAuthPostRoute,
    handleAdminEntityPostRoute,
    handleAdminConfigPostRoute,
    handleAdminCommerceDeliveryPostRoute,
    handleAdminPortalPostRoute,
    handleAdminPlatformPostRoute,
  } = deps;

  async function handlePostAction(client, req, urlObj, pathname, body, res, auth) {
    if (await handleAdminAuthPostRoute({ pathname, body, res, auth })) {
      return;
    }

    if (await handleAdminEntityPostRoute({ client, req, pathname, body, res, auth })) {
      return;
    }

    if (await handleAdminConfigPostRoute({ req, pathname, body, res, auth })) {
      return;
    }

    if (await handleAdminCommerceDeliveryPostRoute({ client, pathname, body, res, auth })) {
      return;
    }

    if (await handleAdminPortalPostRoute({ req, res, urlObj, pathname, body })) {
      return;
    }

    if (await handleAdminPlatformPostRoute({ client, req, pathname, body, res, auth })) {
      return;
    }

    return sendJson(res, 404, { ok: false, error: 'Resource not found' });
  }

  function deriveRouteGroup(pathname) {
    const pathValue = String(pathname || '').trim();
    if (pathValue.startsWith('/platform/api/')) return 'platform-api';
    if (pathValue.startsWith('/admin/api/')) return 'admin-api';
    if (pathValue.startsWith('/admin/auth/')) return 'admin-auth';
    if (pathValue.startsWith('/assets/') || pathValue.startsWith('/admin/assets/')) return 'static-asset';
    if (pathValue.startsWith('/admin')) return 'admin-page';
    return 'other';
  }

  return {
    deriveRouteGroup,
    handlePostAction,
  };
}

module.exports = {
  createAdminRouteRuntime,
};
