'use strict';

/**
 * Compose the player portal HTTP surface from route/runtime factories. Keep the
 * standalone server entry file focused on env parsing and dependency assembly.
 */

function createPortalSurfaceRuntime(deps = {}) {
  const {
    createPlayerCommerceRoutes,
    createPlayerGeneralRoutes,
    createPortalPageAssetRuntime,
    createPortalPageRoutes,
    createPortalRequestRuntime,
    commerceRouteDeps,
    generalRouteDeps,
    pageAssetDeps,
    pageRouteDeps,
    requestRuntimeDeps,
  } = deps;

  const handlePlayerCommerceRoute = createPlayerCommerceRoutes(commerceRouteDeps);
  const handlePlayerGeneralRoute = createPlayerGeneralRoutes(generalRouteDeps);
  const pageAssetRuntime = createPortalPageAssetRuntime(pageAssetDeps);
  const handlePortalPageRoute = createPortalPageRoutes({
    ...pageRouteDeps,
    ...pageAssetRuntime,
  });

  return createPortalRequestRuntime({
    ...requestRuntimeDeps,
    handlePortalPageRoute,
    handlePlayerGeneralRoute,
    handlePlayerCommerceRoute,
  });
}

module.exports = {
  createPortalSurfaceRuntime,
};
