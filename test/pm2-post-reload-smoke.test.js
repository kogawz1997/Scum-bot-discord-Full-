const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PM2_ENV,
  buildPm2PostReloadSmokeReport,
  buildProfilePlan,
} = require('../scripts/pm2-post-reload-smoke');

function createPm2Entry(name, overrides = {}) {
  return {
    name,
    pid: 1234,
    pm2_env: {
      status: 'online',
      ...REQUIRED_PM2_ENV,
      ...(overrides.pm2_env || {}),
    },
    ...overrides,
  };
}

function buildJsonReport(kind, options = {}) {
  return JSON.stringify({
    kind,
    ok: options.ok !== false,
    status: options.status || (options.ok === false ? 'failed' : 'pass'),
    summary: options.summary || `${kind} ok`,
    checks: options.checks || [],
    warnings: options.warnings || [],
    errors: options.errors || [],
    data: options.data || {},
  });
}

function createRunner(responders) {
  const calls = [];
  const runner = (command, args, options = {}) => {
    calls.push({
      command,
      args: [...args],
      options,
    });
    for (const responder of responders) {
      const value = responder(command, args, options, calls);
      if (value) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
          ...value,
        };
      }
    }
    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
  runner.calls = calls;
  return runner;
}

test('pm2 post-reload smoke verifies machine-a control-plane profile end-to-end', async () => {
  const plan = buildProfilePlan('machine-a-control-plane');
  const runner = createRunner([
    (command, args) => {
      if (command === 'cmd' && args[2] === 'reload') {
        return { stdout: 'reloaded' };
      }
      return null;
    },
    (command, args) => {
      if (command === 'cmd' && args[2] === 'jlist') {
        return {
          stdout: JSON.stringify(plan.expectedApps.map((name) => createPm2Entry(name))),
        };
      }
      return null;
    },
    (command, args) => {
      if (
        command === process.execPath
        && String(args[0]).endsWith('persistence-production-smoke.js')
      ) {
        return {
          stdout: buildJsonReport('persistence-smoke'),
        };
      }
      return null;
    },
    (command, args) => {
      if (
        command === process.execPath
        && String(args[0]).endsWith('machine-validation.js')
      ) {
        assert.equal(args.includes('--role'), true);
        assert.equal(args.includes('control-plane'), true);
        return {
          stdout: buildJsonReport('machine-validation'),
        };
      }
      return null;
    },
    (command, args) => {
      if (
        command === process.execPath
        && String(args[0]).endsWith('post-deploy-smoke.js')
      ) {
        return {
          stdout: buildJsonReport('smoke'),
        };
      }
      return null;
    },
  ]);

  const report = await buildPm2PostReloadSmokeReport({
    profile: 'machine-a-control-plane',
    runner,
    sleep: async () => {},
    waitMs: 0,
  });

  assert.equal(report.kind, 'pm2-post-reload-smoke');
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(
    runner.calls.some((entry) => (
      entry.command === process.execPath
      && String(entry.args[0]).endsWith('post-deploy-smoke.js')
    )),
    true,
  );
});

test('pm2 post-reload smoke fails when pm2 env still mirrors control-plane registry slices', async () => {
  const plan = buildProfilePlan('machine-b-game-bot');
  const runner = createRunner([
    (command, args) => {
      if (command === 'cmd' && args[2] === 'reload') {
        return { stdout: 'reloaded' };
      }
      return null;
    },
    (command, args) => {
      if (command === 'cmd' && args[2] === 'jlist') {
        return {
          stdout: JSON.stringify([
            createPm2Entry('scum-watcher'),
            createPm2Entry('scum-server-bot', {
              pm2_env: {
                CONTROL_PLANE_REGISTRY_FILE_MIRROR_SLICES: 'servers',
              },
            }),
            createPm2Entry('scum-console-agent'),
          ]),
        };
      }
      return null;
    },
    (command, args) => {
      if (
        command === process.execPath
        && String(args[0]).endsWith('persistence-production-smoke.js')
      ) {
        return {
          stdout: buildJsonReport('persistence-smoke'),
        };
      }
      return null;
    },
    (command, args) => {
      if (
        command === process.execPath
        && String(args[0]).endsWith('machine-validation.js')
      ) {
        assert.equal(args.includes('game-node'), true);
        return {
          stdout: buildJsonReport('machine-validation'),
        };
      }
      return null;
    },
  ]);

  const report = await buildPm2PostReloadSmokeReport({
    profile: 'machine-b-game-bot',
    runner,
    sleep: async () => {},
    waitMs: 0,
  });

  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /CONTROL_PLANE_REGISTRY_FILE_MIRROR_SLICES=servers/i);
  assert.equal(
    runner.calls.some((entry) => (
      entry.command === process.execPath
      && String(entry.args[0]).endsWith('post-deploy-smoke.js')
    )),
    false,
  );
});
