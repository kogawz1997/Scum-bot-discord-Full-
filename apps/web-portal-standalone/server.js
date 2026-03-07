'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { URL, URLSearchParams } = require('node:url');
const { Readable } = require('node:stream');

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const HOST = String(process.env.WEB_PORTAL_HOST || '127.0.0.1').trim() || '127.0.0.1';
const PORT = Number(process.env.WEB_PORTAL_PORT || 3300);
const BASE_URL = String(
  process.env.WEB_PORTAL_BASE_URL || `http://${HOST}:${PORT}`,
).trim();

const SESSION_TTL_MS = Math.max(
  10 * 60 * 1000,
  Number(process.env.WEB_PORTAL_SESSION_TTL_HOURS || 12) * 60 * 60 * 1000,
);
const SESSION_COOKIE_NAME = 'scum_portal_session';
const SECURE_COOKIE = isTruthy(process.env.WEB_PORTAL_SECURE_COOKIE);

const UPSTREAM_BASE_URL = String(
  process.env.WEB_PORTAL_UPSTREAM_BASE_URL || 'http://127.0.0.1:3200',
).trim();
const UPSTREAM_TOKEN = String(process.env.WEB_PORTAL_UPSTREAM_TOKEN || '').trim();
const MAX_PROXY_BODY_BYTES = Math.max(
  8 * 1024,
  Number(process.env.WEB_PORTAL_MAX_PROXY_BODY_BYTES || 1024 * 1024),
);
const ENFORCE_ORIGIN_CHECK = isTruthy(
  process.env.WEB_PORTAL_ENFORCE_ORIGIN_CHECK || 'true',
);

const DISCORD_CLIENT_ID = String(process.env.WEB_PORTAL_DISCORD_CLIENT_ID || '').trim();
const DISCORD_CLIENT_SECRET = String(
  process.env.WEB_PORTAL_DISCORD_CLIENT_SECRET || '',
).trim();
const DISCORD_GUILD_ID = String(process.env.WEB_PORTAL_DISCORD_GUILD_ID || '').trim();
const REQUIRE_GUILD_MEMBER = isTruthy(
  process.env.WEB_PORTAL_REQUIRE_GUILD_MEMBER || (DISCORD_GUILD_ID ? 'true' : 'false'),
);

const DEFAULT_ROLE = normalizeRole(process.env.WEB_PORTAL_DEFAULT_ROLE || 'mod');
const OWNER_IDS = parseCsvSet(process.env.WEB_PORTAL_OWNER_IDS || '');
const ADMIN_IDS = parseCsvSet(process.env.WEB_PORTAL_ADMIN_IDS || '');
const MOD_IDS = parseCsvSet(process.env.WEB_PORTAL_MOD_IDS || '');
const ALLOWED_DISCORD_IDS = parseCsvSet(
  process.env.WEB_PORTAL_ALLOWED_DISCORD_IDS || '',
);

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DASHBOARD_HTML_PATH = path.join(__dirname, 'public', 'dashboard.html');
const LOGIN_HTML_PATH = path.join(__dirname, 'public', 'login.html');

const sessions = new Map();
const oauthStates = new Map();

const ROLE_ORDER = {
  mod: 1,
  admin: 2,
  owner: 3,
};

const ownerOnlyPostPaths = new Set([
  '/admin/api/config/set',
  '/admin/api/config/reset',
  '/admin/api/welcome/clear',
  '/admin/api/rentbike/reset-now',
  '/admin/api/backup/create',
  '/admin/api/backup/restore',
]);

const modAllowedPostPaths = new Set([
  '/admin/api/ticket/claim',
  '/admin/api/ticket/close',
  '/admin/api/moderation/add',
  '/admin/api/stats/add-kill',
  '/admin/api/stats/add-death',
  '/admin/api/stats/add-playtime',
  '/admin/api/scum/status',
]);

const ownerOnlyGetPaths = new Set(['/admin/api/backup/list']);

function isTruthy(value) {
  const text = String(value || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

function parseCsvSet(value) {
  const out = new Set();
  for (const item of String(value || '').split(',')) {
    const text = item.trim();
    if (text) out.add(text);
  }
  return out;
}

function normalizeRole(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'owner') return 'owner';
  if (raw === 'admin') return 'admin';
  return 'mod';
}

function hasRoleAtLeast(actual, required) {
  const current = ROLE_ORDER[normalizeRole(actual)] || 0;
  const target = ROLE_ORDER[normalizeRole(required)] || 0;
  return current >= target;
}

function buildSecurityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cache-Control': 'no-store',
    ...extra,
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(
    statusCode,
    buildSecurityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    }),
  );
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(
    statusCode,
    buildSecurityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
    }),
  );
  res.end(html);
}

function parseCookies(req) {
  const out = {};
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function buildSessionCookie(sessionId) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (SECURE_COOKIE) parts.push('Secure');
  return parts.join('; ');
}

function buildClearSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (SECURE_COOKIE) parts.push('Secure');
  return parts.join('; ');
}

function getSession(req) {
  const cookies = parseCookies(req);
  const sessionId = String(cookies[SESSION_COOKIE_NAME] || '').trim();
  if (!sessionId) return null;
  const row = sessions.get(sessionId);
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return row;
}

function createSession(payload) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const row = {
    ...payload,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(sessionId, row);
  return sessionId;
}

function removeSession(req) {
  const cookies = parseCookies(req);
  const sessionId = String(cookies[SESSION_COOKIE_NAME] || '').trim();
  if (!sessionId) return;
  sessions.delete(sessionId);
}

function cleanupStates() {
  const now = Date.now();
  for (const [state, payload] of oauthStates.entries()) {
    if (!payload || payload.expiresAt <= now) {
      oauthStates.delete(state);
    }
  }
}

function requiredRoleForRequest(pathname, method) {
  const upper = String(method || 'GET').toUpperCase();
  if (upper === 'GET') {
    if (ownerOnlyGetPaths.has(pathname)) return 'owner';
    return 'mod';
  }

  if (upper === 'POST') {
    if (ownerOnlyPostPaths.has(pathname)) return 'owner';
    if (modAllowedPostPaths.has(pathname)) return 'mod';
    return 'admin';
  }

  return 'admin';
}

function ensureAuthorized(req, res, requiredRole) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return null;
  }

  if (!hasRoleAtLeast(session.role, requiredRole)) {
    sendJson(res, 403, {
      ok: false,
      error: `Forbidden: ${requiredRole} role required`,
      role: session.role,
    });
    return null;
  }

  return session;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDiscordRedirectUri() {
  return new URL('/admin/auth/discord/callback', BASE_URL).toString();
}

function buildDiscordAuthorizeUrl(state) {
  const url = new URL(`${DISCORD_API_BASE}/oauth2/authorize`);
  url.searchParams.set('client_id', DISCORD_CLIENT_ID);
  url.searchParams.set('redirect_uri', getDiscordRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set(
    'scope',
    DISCORD_GUILD_ID ? 'identify guilds.members.read' : 'identify',
  );
  url.searchParams.set('state', state);
  return url.toString();
}

async function exchangeDiscordCode(code) {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getDiscordRedirectUri(),
  });

  const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Discord token exchange failed (${res.status})`);
  }

  return data;
}

async function fetchDiscordProfile(accessToken) {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    throw new Error('Discord profile fetch failed');
  }
  return data;
}

async function fetchDiscordGuildMember(accessToken, guildId) {
  if (!guildId) return null;
  const res = await fetch(
    `${DISCORD_API_BASE}/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error('Discord guild membership check failed');
  }

  return res.json().catch(() => null);
}

function resolveUserRole(discordId) {
  const id = String(discordId || '').trim();
  if (OWNER_IDS.has(id)) return 'owner';
  if (ADMIN_IDS.has(id)) return 'admin';
  if (MOD_IDS.has(id)) return 'mod';
  return DEFAULT_ROLE;
}

function verifyOrigin(req) {
  if (!ENFORCE_ORIGIN_CHECK) return true;
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const expectedOrigin = new URL(BASE_URL).origin;
  const originHeader = String(req.headers.origin || '').trim();
  if (originHeader && originHeader !== expectedOrigin) return false;

  const referer = String(req.headers.referer || '').trim();
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== expectedOrigin) return false;
    } catch {
      return false;
    }
  }

  return true;
}

async function readRawBody(req, maxBytes) {
  const limit = Math.max(1024, Number(maxBytes || MAX_PROXY_BODY_BYTES));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('Request aborted')));
  });
}

async function proxyToUpstream(req, res, urlObj, session) {
  if (!UPSTREAM_TOKEN) {
    sendJson(res, 500, {
      ok: false,
      error: 'WEB_PORTAL_UPSTREAM_TOKEN is missing',
    });
    return;
  }

  const pathname = urlObj.pathname;
  const upstreamUrl = new URL(`${pathname}${urlObj.search}`, UPSTREAM_BASE_URL);
  const method = String(req.method || 'GET').toUpperCase();

  const headers = {
    'x-admin-token': UPSTREAM_TOKEN,
    'x-forwarded-user': String(session.user || ''),
    'x-forwarded-role': String(session.role || ''),
  };

  const accept = String(req.headers.accept || '').trim();
  if (accept) headers.accept = accept;

  const contentType = String(req.headers['content-type'] || '').trim();
  let bodyBuffer = null;
  if (method !== 'GET' && method !== 'HEAD') {
    bodyBuffer = await readRawBody(req, MAX_PROXY_BODY_BYTES);
    if (contentType) {
      headers['content-type'] = contentType;
    }
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method,
    headers,
    body: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined,
  });

  const responseHeaders = {
    ...buildSecurityHeaders(),
  };

  const upstreamContentType = upstreamRes.headers.get('content-type') || '';
  if (upstreamContentType) {
    responseHeaders['Content-Type'] = upstreamContentType;
  }

  if (/text\/event-stream/i.test(upstreamContentType)) {
    responseHeaders.Connection = 'keep-alive';
    responseHeaders['Cache-Control'] = 'no-cache, no-transform';
    responseHeaders['X-Accel-Buffering'] = 'no';
  }

  res.writeHead(upstreamRes.status, responseHeaders);

  if (!upstreamRes.body) {
    res.end();
    return;
  }

  if (/text\/event-stream/i.test(upstreamContentType)) {
    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.on('error', () => {
      if (!res.writableEnded) res.end();
    });
    nodeStream.pipe(res);
    return;
  }

  const data = Buffer.from(await upstreamRes.arrayBuffer());
  res.end(data);
}

function loadHtmlTemplate(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function renderLoginPage(message) {
  const html = loadHtmlTemplate(LOGIN_HTML_PATH);
  const safe = escapeHtml(String(message || ''));
  return html.replace('__ERROR_MESSAGE__', safe);
}

async function handleDiscordStart(req, res) {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return sendJson(res, 500, {
      ok: false,
      error: 'Discord OAuth env is not configured',
    });
  }

  cleanupStates();
  const state = crypto.randomBytes(24).toString('hex');
  oauthStates.set(state, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  res.writeHead(302, {
    Location: buildDiscordAuthorizeUrl(state),
  });
  res.end();
}

async function handleDiscordCallback(req, res, urlObj) {
  try {
    cleanupStates();

    const state = String(urlObj.searchParams.get('state') || '').trim();
    const code = String(urlObj.searchParams.get('code') || '').trim();
    const errorText = String(urlObj.searchParams.get('error') || '').trim();

    if (errorText) {
      res.writeHead(302, {
        Location: '/admin/login?error=Discord%20authorization%20denied',
      });
      return res.end();
    }

    if (!state || !oauthStates.has(state)) {
      res.writeHead(302, {
        Location: '/admin/login?error=Invalid%20OAuth%20state',
      });
      return res.end();
    }
    oauthStates.delete(state);

    if (!code) {
      res.writeHead(302, {
        Location: '/admin/login?error=Missing%20OAuth%20code',
      });
      return res.end();
    }

    const token = await exchangeDiscordCode(code);
    const profile = await fetchDiscordProfile(token.access_token);

    const discordId = String(profile.id || '').trim();
    if (!discordId) {
      throw new Error('Discord profile missing id');
    }

    if (ALLOWED_DISCORD_IDS.size > 0 && !ALLOWED_DISCORD_IDS.has(discordId)) {
      res.writeHead(302, {
        Location: '/admin/login?error=Discord%20account%20not%20allowed',
      });
      return res.end();
    }

    if (DISCORD_GUILD_ID && REQUIRE_GUILD_MEMBER) {
      await fetchDiscordGuildMember(token.access_token, DISCORD_GUILD_ID);
    }

    const role = resolveUserRole(discordId);
    const user = profile.username && profile.discriminator
      ? `${profile.username}#${profile.discriminator}`
      : String(profile.username || discordId);

    const sessionId = createSession({
      user,
      role,
      discordId,
      authMethod: 'discord-oauth',
    });

    res.writeHead(302, {
      Location: '/admin',
      'Set-Cookie': buildSessionCookie(sessionId),
    });
    res.end();
  } catch (error) {
    console.error('[web-portal-standalone] discord callback failed:', error);
    res.writeHead(302, {
      Location: '/admin/login?error=Discord%20login%20failed',
    });
    res.end();
  }
}

async function handleApi(req, res, urlObj) {
  const pathname = urlObj.pathname;
  const method = String(req.method || 'GET').toUpperCase();

  if (!verifyOrigin(req)) {
    return sendJson(res, 403, {
      ok: false,
      error: 'Cross-site request denied',
    });
  }

  if (pathname === '/admin/api/auth/providers' && method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      data: {
        loginSource: 'discord-oauth',
        password: false,
        discordSso: true,
        twoFactor: false,
      },
    });
  }

  if (pathname === '/admin/api/login' && method === 'POST') {
    return sendJson(res, 405, {
      ok: false,
      error: 'Password login is disabled. Use Discord OAuth.',
    });
  }

  if (pathname === '/admin/api/logout' && method === 'POST') {
    removeSession(req);
    return sendJson(
      res,
      200,
      { ok: true, data: { loggedOut: true } },
      { 'Set-Cookie': buildClearSessionCookie() },
    );
  }

  if (pathname === '/admin/api/me' && method === 'GET') {
    const session = getSession(req);
    if (!session) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    }

    return sendJson(res, 200, {
      ok: true,
      data: {
        user: session.user,
        role: session.role,
        authMethod: session.authMethod,
        session: true,
        discordId: session.discordId,
      },
    });
  }

  const requiredRole = requiredRoleForRequest(pathname, method);
  const session = ensureAuthorized(req, res, requiredRole);
  if (!session) return undefined;

  return proxyToUpstream(req, res, urlObj, session);
}

async function requestHandler(req, res) {
  const urlObj = new URL(req.url || '/', BASE_URL);
  const pathname = urlObj.pathname;
  const method = String(req.method || 'GET').toUpperCase();

  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }

  if (pathname === '/') {
    res.writeHead(302, { Location: '/admin' });
    return res.end();
  }

  if (pathname === '/admin/auth/discord/start' && method === 'GET') {
    return handleDiscordStart(req, res);
  }

  if (pathname === '/admin/auth/discord/callback' && method === 'GET') {
    return handleDiscordCallback(req, res, urlObj);
  }

  if (pathname === '/admin/login' && method === 'GET') {
    const session = getSession(req);
    if (session) {
      res.writeHead(302, { Location: '/admin' });
      return res.end();
    }
    return sendHtml(
      res,
      200,
      renderLoginPage(String(urlObj.searchParams.get('error') || '')),
    );
  }

  if (pathname === '/admin' && method === 'GET') {
    const session = getSession(req);
    if (!session) {
      res.writeHead(302, { Location: '/admin/login' });
      return res.end();
    }
    return sendHtml(res, 200, loadHtmlTemplate(DASHBOARD_HTML_PATH));
  }

  if (pathname.startsWith('/admin/api/')) {
    try {
      return await handleApi(req, res, urlObj);
    } catch (error) {
      const status = /payload too large/i.test(String(error?.message || '')) ? 413 : 500;
      return sendJson(res, status, {
        ok: false,
        error: status === 413 ? 'Payload too large' : 'Internal server error',
      });
    }
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}

function printStartupHints() {
  console.log(`[web-portal-standalone] listening at ${BASE_URL}`);
  console.log(`[web-portal-standalone] upstream: ${UPSTREAM_BASE_URL}`);

  if (!UPSTREAM_TOKEN) {
    console.warn(
      '[web-portal-standalone] WEB_PORTAL_UPSTREAM_TOKEN is empty: admin API proxy will fail',
    );
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.warn(
      '[web-portal-standalone] Discord OAuth env missing (WEB_PORTAL_DISCORD_CLIENT_ID/SECRET)',
    );
  }

  if (!DISCORD_GUILD_ID) {
    console.warn(
      '[web-portal-standalone] WEB_PORTAL_DISCORD_GUILD_ID is empty (membership check disabled)',
    );
  }
}

const server = http.createServer((req, res) => {
  void requestHandler(req, res);
});

server.listen(PORT, HOST, () => {
  printStartupHints();
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
