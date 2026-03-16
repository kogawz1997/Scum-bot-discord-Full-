'use strict';

/**
 * HTTP server lifecycle wiring for the standalone player portal. Keep signal and
 * listen/error handling out of the server entrypoint so the entry file mostly
 * composes route/runtime dependencies.
 */

function createPortalServerLifecycle(options = {}) {
  const {
    http,
    host,
    port,
    requestHandler,
    startCleanupTimer,
    logger = console,
    exit = (code) => process.exit(code),
    registerSignal = (event, handler) => process.on(event, handler),
  } = options;

  const server = http.createServer((req, res) => {
    void requestHandler(req, res);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      logger.error(`[web-portal-standalone] port ${port} is already in use`);
      exit(1);
      return;
    }
    logger.error('[web-portal-standalone] server error:', error);
    exit(1);
  });

  server.listen(port, host, () => {
    startCleanupTimer();
  });

  registerSignal('SIGINT', () => exit(0));
  registerSignal('SIGTERM', () => exit(0));

  return server;
}

module.exports = {
  createPortalServerLifecycle,
};
