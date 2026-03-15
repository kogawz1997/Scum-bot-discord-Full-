const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { assertRuntimeHealth } = require('../scripts/post-deploy-smoke');

async function startHealthServer(payload) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/healthz') {
      res.writeHead(404);
      res.end('not-found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}/healthz`,
  };
}

test('assertRuntimeHealth fails required degraded runtime', async (t) => {
  const runtime = await startHealthServer({
    ok: true,
    service: 'console-agent',
    status: 'degraded',
    ready: false,
    statusCode: 'AGENT_PREFLIGHT_FAILED',
    statusMessage: 'SCUM window not found',
  });

  t.after(async () => {
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  await assert.rejects(
    () => assertRuntimeHealth(runtime.url, 2000, 'console-agent healthz', { required: true }),
    /degraded|not-ready/i,
  );
});

test('assertRuntimeHealth allows disabled optional runtime', async (t) => {
  const runtime = await startHealthServer({
    ok: true,
    service: 'watcher',
    status: 'disabled',
    ready: null,
    reason: 'watcher-disabled',
  });

  t.after(async () => {
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const result = await assertRuntimeHealth(runtime.url, 2000, 'watcher healthz', {
    required: false,
    allowDisabled: true,
  });

  assert.equal(result.state, 'disabled');
  assert.equal(result.reason, 'watcher-disabled');
});
