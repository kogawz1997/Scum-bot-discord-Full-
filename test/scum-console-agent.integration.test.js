const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { startScumConsoleAgent } = require('../src/services/scumConsoleAgent');

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const payload = await res.json().catch(() => null);
  return { res, payload };
}

test('scum console agent: exec backend executes command template', async () => {
  const runtime = startScumConsoleAgent({
    env: {
      SCUM_CONSOLE_AGENT_HOST: '127.0.0.1',
      SCUM_CONSOLE_AGENT_PORT: '3313',
      SCUM_CONSOLE_AGENT_TOKEN: 'exec-agent-token-123456',
      SCUM_CONSOLE_AGENT_BACKEND: 'exec',
      SCUM_CONSOLE_AGENT_EXEC_TEMPLATE: `node "${path.join(
        process.cwd(),
        'scripts',
        'agent-echo.js',
      )}" "{command}"`,
    },
  });

  try {
    await runtime.ready;
    const health = await fetchJson('http://127.0.0.1:3313/healthz', {
      headers: {
        Authorization: 'Bearer exec-agent-token-123456',
      },
    });
    assert.equal(health.res.status, 200);
    assert.equal(health.payload.backend, 'exec');

    const preflight = await fetchJson('http://127.0.0.1:3313/preflight', {
      headers: {
        Authorization: 'Bearer exec-agent-token-123456',
      },
    });
    assert.equal(preflight.res.status, 200);
    assert.equal(preflight.payload.ok, true);
    assert.equal(preflight.payload.ready, true);
    assert.equal(preflight.payload.result?.mode, 'config-exec');

    const execRes = await fetchJson('http://127.0.0.1:3313/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer exec-agent-token-123456',
      },
      body: JSON.stringify({
        command: '#SpawnItem 76561198000000001 Weapon_AK47 1',
      }),
    });
    assert.equal(execRes.res.status, 200);
    assert.equal(execRes.payload.ok, true);
    assert.match(execRes.payload.result.stdout, /AGENT-ECHO:/);
  } finally {
    await runtime.close();
  }
});

test('scum console agent: unsupported backend is surfaced by preflight and health', async () => {
  const runtime = startScumConsoleAgent({
    env: {
      SCUM_CONSOLE_AGENT_HOST: '127.0.0.1',
      SCUM_CONSOLE_AGENT_PORT: '3314',
      SCUM_CONSOLE_AGENT_TOKEN: 'process-agent-token-123456',
      SCUM_CONSOLE_AGENT_BACKEND: 'process',
    },
  });

  try {
    await runtime.ready;
    const preflight = await fetchJson('http://127.0.0.1:3314/preflight', {
      headers: {
        Authorization: 'Bearer process-agent-token-123456',
      },
    });
    assert.equal(preflight.res.status, 500);
    assert.equal(preflight.payload.ok, false);
    assert.equal(preflight.payload.errorCode, 'AGENT_BACKEND_UNSUPPORTED');

    const health = await fetchJson('http://127.0.0.1:3314/healthz', {
      headers: {
        Authorization: 'Bearer process-agent-token-123456',
      },
    });
    assert.equal(health.res.status, 200);
    assert.equal(health.payload.ready, false);
    assert.equal(health.payload.statusCode, 'AGENT_BACKEND_UNSUPPORTED');
  } finally {
    await runtime.close();
  }
});

test('scum console agent: window-script preflight exposes actionable stderr details', async () => {
  const runtime = startScumConsoleAgent({
    env: {
      SCUM_CONSOLE_AGENT_HOST: '127.0.0.1',
      SCUM_CONSOLE_AGENT_PORT: '3315',
      SCUM_CONSOLE_AGENT_TOKEN: 'window-agent-token-123456',
      SCUM_CONSOLE_AGENT_BACKEND: 'exec',
      SCUM_CONSOLE_AGENT_EXEC_TEMPLATE: `powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(
        process.cwd(),
        'scripts',
        'send-scum-admin-command.ps1',
      )}" -WindowTitle "THIS_WINDOW_DOES_NOT_EXIST" -WindowProcessName "THIS_PROCESS_DOES_NOT_EXIST" -Command "{command}"`,
      SCUM_CONSOLE_AGENT_COMMAND_TIMEOUT_MS: '8000',
    },
  });

  try {
    await runtime.ready;
    const preflight = await fetchJson('http://127.0.0.1:3315/preflight', {
      headers: {
        Authorization: 'Bearer window-agent-token-123456',
      },
    });
    assert.equal(preflight.res.status, 500);
    assert.equal(preflight.payload.ok, false);
    assert.equal(preflight.payload.errorCode, 'AGENT_PREFLIGHT_FAILED');
    assert.match(String(preflight.payload.error || ''), /SCUM window not found/i);
    assert.match(
      String(preflight.payload.result?.detail?.stderr || ''),
      /THIS_WINDOW_DOES_NOT_EXIST|THIS_PROCESS_DOES_NOT_EXIST/i,
    );
    assert.match(
      String(preflight.payload.result?.detail?.shellCommand || ''),
      /send-scum-admin-command\.ps1/i,
    );
    assert.equal(preflight.payload.classification?.category, 'client-window');
    assert.equal(preflight.payload.classification?.reason, 'window-not-found');
    assert.equal(preflight.payload.recovery?.action, 'restore-scum-window');
  } finally {
    await runtime.close();
  }
});

test('scum console agent: successful preflight clears stale health error state', async () => {
  const runtime = startScumConsoleAgent({
    env: {
      SCUM_CONSOLE_AGENT_HOST: '127.0.0.1',
      SCUM_CONSOLE_AGENT_PORT: '3316',
      SCUM_CONSOLE_AGENT_TOKEN: 'window-agent-token-healthy',
      SCUM_CONSOLE_AGENT_BACKEND: 'exec',
      SCUM_CONSOLE_AGENT_EXEC_TEMPLATE: `node "${path.join(
        process.cwd(),
        'scripts',
        'agent-echo.js',
      )}" "{command}"`,
    },
  });

  try {
    await runtime.ready;
    const execRes = await fetchJson('http://127.0.0.1:3316/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer window-agent-token-healthy',
      },
      body: JSON.stringify({
        command: '#Announce fail-once',
      }),
    });
    assert.equal(execRes.res.status, 200);

    const preflight = await fetchJson('http://127.0.0.1:3316/preflight', {
      headers: {
        Authorization: 'Bearer window-agent-token-healthy',
      },
    });
    assert.equal(preflight.res.status, 200);
    assert.equal(preflight.payload.ok, true);
    assert.equal(preflight.payload.ready, true);

    const health = await fetchJson('http://127.0.0.1:3316/healthz', {
      headers: {
        Authorization: 'Bearer window-agent-token-healthy',
      },
    });
    assert.equal(health.res.status, 200);
    assert.equal(health.payload.ready, true);
    assert.equal(health.payload.statusCode, 'READY');
    assert.equal(health.payload.lastErrorCode, null);
    assert.equal(health.payload.classification, null);
  } finally {
    await runtime.close();
  }
});

test('scum console agent: server control routes are not exposed on the delivery agent', async () => {
  const runtime = startScumConsoleAgent({
    env: {
      SCUM_CONSOLE_AGENT_HOST: '127.0.0.1',
      SCUM_CONSOLE_AGENT_PORT: '3317',
      SCUM_CONSOLE_AGENT_TOKEN: 'exec-agent-no-server-control',
      SCUM_CONSOLE_AGENT_BACKEND: 'exec',
      SCUM_CONSOLE_AGENT_EXEC_TEMPLATE: `node "${path.join(
        process.cwd(),
        'scripts',
        'agent-echo.js',
      )}" "{command}"`,
    },
  });

  try {
    await runtime.ready;
    const startRes = await fetchJson('http://127.0.0.1:3317/server/start', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer exec-agent-no-server-control',
      },
    });
    assert.equal(startRes.res.status, 404);
    assert.equal(startRes.payload.ok, false);

    const stopRes = await fetchJson('http://127.0.0.1:3317/server/stop', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer exec-agent-no-server-control',
      },
    });
    assert.equal(stopRes.res.status, 404);
    assert.equal(stopRes.payload.ok, false);
  } finally {
    await runtime.close();
  }
});
