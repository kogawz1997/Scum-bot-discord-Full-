const {
  normalizeSteamId,
  getLinkBySteamId,
  getLinkByUserId,
  setLink,
  unlinkByUserId,
  unlinkBySteamId,
} = require('../store/linkStore');
const { ensurePlatformPlayerIdentity } = require('./platformIdentityService');
const { resolveDefaultTenantId } = require('../prisma');

function normalizeText(value) {
  return String(value || '').trim();
}

async function bindSteamLinkForUser(params = {}) {
  const userId = normalizeText(params.userId);
  const steamId = normalizeSteamId(params.steamId);
  const inGameName = normalizeText(params.inGameName) || null;
  const allowReplace = params.allowReplace === true;
  const allowSteamReuse = params.allowSteamReuse === true;
  const tenantId = normalizeText(params.tenantId) || resolveDefaultTenantId() || null;

  if (!userId || !steamId) {
    return { ok: false, reason: 'invalid-input' };
  }

  const current = getLinkByUserId(userId);
  if (current?.steamId === steamId) {
    return {
      ok: true,
      alreadyLinked: true,
      link: current,
    };
  }

  if (current?.steamId && current.steamId !== steamId && !allowReplace) {
    return {
      ok: false,
      reason: 'user-already-linked',
      current,
    };
  }

  const existing = getLinkBySteamId(steamId);
  if (existing && existing.userId !== userId && !allowSteamReuse) {
    return {
      ok: false,
      reason: 'steam-already-linked',
      existing,
    };
  }

  const result = setLink({
    steamId,
    userId,
    inGameName,
  });
  if (!result.ok) {
    return result;
  }

  let identity = null;
  try {
    identity = await ensurePlatformPlayerIdentity({
      provider: 'steam',
      providerUserId: steamId,
      tenantId,
      role: 'player',
      membershipType: tenantId ? 'tenant' : 'player',
      discordUserId: userId,
      steamId,
      inGameName,
      verificationState: 'steam_linked',
      linkedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      identityMetadata: {
        source: 'steam-link-service',
        linkedUserId: userId,
      },
      profileMetadata: {
        source: 'steam-link-service',
      },
    });
  } catch {
    identity = null;
  }

  return {
    ok: true,
    steamId: result.steamId,
    userId: result.userId,
    identity: identity?.ok
      ? {
          userId: identity.user?.id || null,
          profileId: identity.profile?.id || null,
        }
      : null,
  };
}

function getSteamLinkByUserId(userId) {
  const normalized = normalizeText(userId);
  if (!normalized) return null;
  return getLinkByUserId(normalized);
}

function getSteamLinkBySteamId(steamId) {
  const normalized = normalizeSteamId(steamId);
  if (!normalized) return null;
  return getLinkBySteamId(normalized);
}

function removeSteamLink(params = {}) {
  const steamId = normalizeSteamId(params.steamId);
  const userId = normalizeText(params.userId);
  if (!steamId && !userId) {
    return { ok: false, reason: 'invalid-input' };
  }

  const removed = steamId ? unlinkBySteamId(steamId) : unlinkByUserId(userId);
  if (!removed) {
    return { ok: false, reason: 'not-found' };
  }

  return {
    ok: true,
    removed,
  };
}

module.exports = {
  normalizeSteamIdInput: normalizeSteamId,
  bindSteamLinkForUser,
  getSteamLinkByUserId,
  getSteamLinkBySteamId,
  removeSteamLink,
};
