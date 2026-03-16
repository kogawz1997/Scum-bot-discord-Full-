'use strict';

/**
 * Discord OAuth helpers for the admin control plane. Keep the HTTP exchange and
 * guild lookup logic outside the main admin server entrypoint so route wiring
 * stays readable.
 */

async function exchangeDiscordOauthCode(options = {}) {
  const {
    apiBase,
    clientId,
    clientSecret,
    code,
    redirectUri,
  } = options;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(`${apiBase}/oauth2/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Discord token exchange failed (${res.status})`);
  }
  if (!data.access_token) {
    throw new Error('Discord token response missing access_token');
  }
  return data;
}

async function fetchDiscordProfile(apiBase, accessToken) {
  const res = await fetch(`${apiBase}/users/@me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    throw new Error('Discord profile fetch failed');
  }
  return data;
}

async function fetchDiscordGuildMember(apiBase, accessToken, guildId) {
  if (!guildId) return null;
  const res = await fetch(
    `${apiBase}/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error('Discord guild member fetch failed');
  }
  return res.json().catch(() => null);
}

async function listDiscordGuildRolesFromClient(client, guildId) {
  if (!client || !guildId) return [];
  try {
    const cachedGuild =
      client.guilds?.cache?.get?.(guildId)
      || (typeof client.guilds?.fetch === 'function' ? await client.guilds.fetch(guildId) : null);
    if (!cachedGuild) return [];
    const roleCollection =
      cachedGuild.roles?.cache?.size > 0
        ? cachedGuild.roles.cache
        : (typeof cachedGuild.roles?.fetch === 'function' ? await cachedGuild.roles.fetch() : null);
    if (!roleCollection) return [];
    return [...roleCollection.values()]
      .filter(Boolean)
      .map((role) => ({
        id: String(role.id || '').trim(),
        name: String(role.name || '').trim(),
      }))
      .filter((role) => role.id && role.name);
  } catch {
    return [];
  }
}

function buildDiscordAuthorizeUrl(options = {}) {
  const {
    apiBase,
    clientId,
    guildId,
    redirectUri,
    state,
  } = options;
  const scopes = guildId
    ? 'identify guilds.members.read'
    : 'identify';
  const url = new URL(`${apiBase}/oauth2/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  return url.toString();
}

module.exports = {
  buildDiscordAuthorizeUrl,
  exchangeDiscordOauthCode,
  fetchDiscordGuildMember,
  fetchDiscordProfile,
  listDiscordGuildRolesFromClient,
};
