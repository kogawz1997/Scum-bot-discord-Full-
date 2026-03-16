const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPortalServerLifecycle,
} = require('../apps/web-portal-standalone/runtime/portalServerLifecycle');

test('portal server lifecycle wires listen, cleanup, and signals', () => {
  const events = {};
  const calls = [];
  const fakeServer = {
    on(name, handler) {
      events[name] = handler;
    },
    listen(port, host, handler) {
      calls.push(['listen', host, port]);
      handler();
    },
  };

  const server = createPortalServerLifecycle({
    http: {
      createServer(handler) {
        calls.push(['createServer', typeof handler]);
        return fakeServer;
      },
    },
    host: '127.0.0.1',
    port: 3456,
    requestHandler() {},
    startCleanupTimer() {
      calls.push(['cleanup']);
    },
    registerSignal(name, handler) {
      calls.push(['signal', name]);
      events[`signal:${name}`] = handler;
    },
    exit(code) {
      calls.push(['exit', code]);
    },
    logger: {
      error(message) {
        calls.push(['error', message]);
      },
    },
  });

  assert.equal(server, fakeServer);
  assert.deepEqual(calls.slice(0, 4), [
    ['createServer', 'function'],
    ['listen', '127.0.0.1', 3456],
    ['cleanup'],
    ['signal', 'SIGINT'],
  ]);
  assert.deepEqual(calls[4], ['signal', 'SIGTERM']);

  events['signal:SIGINT']();
  assert.deepEqual(calls.at(-1), ['exit', 0]);
});

test('portal server lifecycle exits on port bind failure', () => {
  const calls = [];
  const events = {};
  createPortalServerLifecycle({
    http: {
      createServer() {
        return {
          on(name, handler) {
            events[name] = handler;
          },
          listen() {},
        };
      },
    },
    host: '127.0.0.1',
    port: 9999,
    requestHandler() {},
    startCleanupTimer() {},
    registerSignal() {},
    exit(code) {
      calls.push(['exit', code]);
    },
    logger: {
      error(message) {
        calls.push(['error', message]);
      },
    },
  });

  events.error({ code: 'EADDRINUSE' });
  assert.deepEqual(calls, [
    ['error', '[web-portal-standalone] port 9999 is already in use'],
    ['exit', 1],
  ]);
});
