/**
 * Admin auth/session mutation routes.
 */

function createAdminAuthPostRoutes(deps) {
  const {
    sendJson,
    requiredString,
    invalidateSession,
    revokeSessionsForUser,
    buildClearSessionCookie,
  } = deps;

  return async function handleAdminAuthPostRoute(context) {
    const {
      pathname,
      body,
      res,
      auth,
    } = context;

    if (pathname !== '/admin/api/auth/session/revoke') {
      return false;
    }

    const reason = requiredString(body, 'reason') || 'manual-revoke';
    const sessionId = requiredString(body, 'sessionId');
    const targetUser = requiredString(body, 'targetUser');
    const revokeCurrent = body?.current === true || (!sessionId && !targetUser);

    if (sessionId) {
      const revoked = invalidateSession(sessionId, {
        actor: auth?.user || 'unknown',
        reason,
      });
      if (!revoked) {
        sendJson(res, 404, { ok: false, error: 'Resource not found' });
        return true;
      }
      sendJson(
        res,
        200,
        { ok: true, data: { revokedCount: 1, sessions: [revoked] } },
        sessionId === auth?.sessionId ? { 'Set-Cookie': buildClearSessionCookie() } : {},
      );
      return true;
    }

    if (targetUser) {
      const revoked = revokeSessionsForUser(targetUser, {
        actor: auth?.user || 'unknown',
        reason,
      });
      if (revoked.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Resource not found' });
        return true;
      }
      const currentRevoked = revoked.some((entry) => entry.id === auth?.sessionId);
      sendJson(
        res,
        200,
        { ok: true, data: { revokedCount: revoked.length, sessions: revoked } },
        currentRevoked ? { 'Set-Cookie': buildClearSessionCookie() } : {},
      );
      return true;
    }

    if (revokeCurrent) {
      const revoked = invalidateSession(auth?.sessionId, {
        actor: auth?.user || 'unknown',
        reason,
      });
      sendJson(
        res,
        200,
        { ok: true, data: { revokedCount: revoked ? 1 : 0, sessions: revoked ? [revoked] : [] } },
        { 'Set-Cookie': buildClearSessionCookie() },
      );
      return true;
    }

    return true;
  };
}

module.exports = {
  createAdminAuthPostRoutes,
};
