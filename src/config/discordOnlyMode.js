'use strict';

const http = require('node:http');

const {
  parseBooleanEnv,
  parseIntegerEnv,
  parseTextEnv,
} = require('./schema');

function isDiscordOnlyMode(env = process.env) {
  return parseBooleanEnv(env.PLATFORM_DISCORD_ONLY, false);
}

function buildDiscordOnlySurfacePayload(surface) {
  const surfaceName = String(surface || 'web-surface').trim() || 'web-surface';
  return {
    ok: false,
    mode: 'discord-only',
    surface: surfaceName,
    error: 'WEB_SURFACE_DISABLED',
    message: `The ${surfaceName} web surface is disabled. Use Discord instead.`,
  };
}

function createDiscordOnlySurfaceRequestHandler(surface) {
  const payload = buildDiscordOnlySurfacePayload(surface);
  return function handleDiscordOnlySurface(req, res) {
    const path = String(req?.url || '/').trim() || '/';
    const isHealth = path === '/healthz' || path.startsWith('/healthz?');
    const statusCode = isHealth ? 503 : 410;
    res.writeHead(statusCode, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(payload));
  };
}

function createDiscordOnlySurfaceServer({
  surface,
  env = process.env,
  hostEnvKey,
  portEnvKey,
  defaultHost,
  defaultPort,
  logger = console,
} = {}) {
  const host = parseTextEnv(env[hostEnvKey], defaultHost || '127.0.0.1');
  const port = parseIntegerEnv(env[portEnvKey], defaultPort || 0, 0);
  const handler = createDiscordOnlySurfaceRequestHandler(surface);
  const server = http.createServer(handler);
  server.listen(port, host, () => {
    logger.log(
      `[${String(surface || 'web-surface')}] discord-only mode active on http://${host}:${port}`,
    );
  });
  return server;
}

module.exports = {
  buildDiscordOnlySurfacePayload,
  createDiscordOnlySurfaceRequestHandler,
  createDiscordOnlySurfaceServer,
  isDiscordOnlyMode,
};
