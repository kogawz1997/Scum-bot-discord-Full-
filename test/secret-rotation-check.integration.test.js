const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const scriptPath = path.resolve(projectRoot, 'scripts', 'check-secret-rotation.js');

function runRotationCheck(env, args = []) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ADMIN_WEB_SESSION_COOKIE_DOMAIN: '',
      WEB_PORTAL_COOKIE_DOMAIN: '',
      ...env,
    },
    encoding: 'utf8',
  });
}

function createValidEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    DISCORD_TOKEN:
      'MTQ3ODY1MTQyNzA4ODc2MDg0Mg.ABCDEF.qwertyuiopasdfghjklzxcvbnm12',
    SCUM_WEBHOOK_SECRET: 'webhook-secret-12345678901234567890',
    ADMIN_WEB_PASSWORD: 'admin-password-123456',
    ADMIN_WEB_TOKEN: 'admin-token-12345678901234567890',
    ADMIN_WEB_2FA_ENABLED: 'true',
    ADMIN_WEB_2FA_SECRET: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
    ADMIN_WEB_SSO_DISCORD_ENABLED: 'true',
    ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET: 'admin-sso-secret-1234567890',
    ADMIN_WEB_ALLOWED_ORIGINS: 'https://admin.example.com',
    ADMIN_WEB_SSO_DISCORD_REDIRECT_URI:
      'https://admin.example.com/admin/auth/discord/callback',
    ADMIN_WEB_SESSION_COOKIE_PATH: '/',
    WEB_PORTAL_MODE: 'player',
    WEB_PORTAL_BASE_URL: 'https://player.example.com',
    WEB_PORTAL_LEGACY_ADMIN_URL: 'https://admin.example.com/admin',
    WEB_PORTAL_DISCORD_CLIENT_SECRET: 'portal-secret-1234567890',
    DELIVERY_EXECUTION_MODE: 'rcon',
    RCON_HOST: '127.0.0.1',
    RCON_PASSWORD: 'rcon-secret-1234567890',
    BOT_ENABLE_DELIVERY_WORKER: 'false',
    WORKER_ENABLE_DELIVERY: 'true',
    BOT_HEALTH_PORT: '3210',
    WORKER_HEALTH_PORT: '3211',
    SCUM_WATCHER_HEALTH_PORT: '3212',
    SCUM_CONSOLE_AGENT_REQUIRED: 'true',
    SCUM_CONSOLE_AGENT_PORT: '3213',
    SCUM_CONSOLE_AGENT_TOKEN: 'console-agent-token-123456',
    ...overrides,
  };
}

test('secret rotation check passes a valid production rotation posture', () => {
  const result = runRotationCheck(createValidEnv());

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /SECRET_ROTATION_CHECK: PASSED/i);
  assert.match(output, /Secret Rotation Matrix/i);
  assert.match(output, /DISCORD_TOKEN/i);
  assert.match(output, /Runtime Reload Plan/i);
});

test('secret rotation check fails when required admin SSO secret is missing', () => {
  const result = runRotationCheck(
    createValidEnv({
      ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET: '',
    }),
  );

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET is missing or still placeholder/i,
  );
});

test('secret rotation check fails when delivery ownership is duplicated', () => {
  const result = runRotationCheck(
    createValidEnv({
      BOT_ENABLE_DELIVERY_WORKER: 'true',
      WORKER_ENABLE_DELIVERY: 'true',
    }),
  );

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Delivery ownership is split across bot and worker/i,
  );
});

test('secret rotation check emits shared JSON report when requested', () => {
  const result = runRotationCheck(createValidEnv(), ['--json']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.kind, 'secret-rotation-check');
  assert.equal(payload.ok, true);
  assert.equal(Array.isArray(payload.data.secrets), true);
  assert.equal(Array.isArray(payload.data.reloadMatrix), true);
});
