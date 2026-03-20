const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isSnowflake,
  getMissingEnv,
  getProductionSecurityErrors,
  getDatabaseRuntimeErrors,
  getRuntimeOwnershipErrors,
  getWorkerRuntimeErrors,
} = require('../src/utils/env');

test('isSnowflake validates numeric Discord IDs', () => {
  assert.equal(isSnowflake('12345678901234567'), true);
  assert.equal(isSnowflake('abc'), false);
  assert.equal(isSnowflake('1234'), false);
});

test('getMissingEnv reports empty and missing keys', () => {
  const env = { A: 'ok', B: '', C: '  ' };
  assert.deepEqual(getMissingEnv(['A', 'B', 'C', 'D'], env), ['B', 'C', 'D']);
});

test('getProductionSecurityErrors blocks weak production config', () => {
  const errors = getProductionSecurityErrors({
    NODE_ENV: 'production',
    DISCORD_TOKEN: 'your_bot_token_here',
    SCUM_WEBHOOK_SECRET: 'short',
    ADMIN_WEB_PASSWORD: '1234',
    ADMIN_WEB_TOKEN: '',
    ADMIN_WEB_2FA_ENABLED: 'false',
    ADMIN_WEB_2FA_SECRET: 'short',
    ADMIN_WEB_STEP_UP_ENABLED: 'false',
    ADMIN_WEB_SECURE_COOKIE: 'false',
    ADMIN_WEB_HSTS_ENABLED: 'false',
    ADMIN_WEB_ALLOW_TOKEN_QUERY: 'true',
    ADMIN_WEB_ENFORCE_ORIGIN_CHECK: 'false',
    ADMIN_WEB_ALLOWED_ORIGINS: 'http://127.0.0.1:3200',
    WEB_PORTAL_BASE_URL: 'http://127.0.0.1:3300',
    PERSIST_REQUIRE_DB: 'false',
    PERSIST_LEGACY_SNAPSHOTS: 'true',
  });
  assert.ok(errors.length >= 5);
});

test('getProductionSecurityErrors passes strong production config', () => {
  const errors = getProductionSecurityErrors({
    NODE_ENV: 'production',
    DISCORD_TOKEN:
      'MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0.NTQzMjE2.abcdefghijklmnopqrstuvwx',
    SCUM_WEBHOOK_SECRET: 'w'.repeat(32),
    ADMIN_WEB_PASSWORD: 'StrongPassword_12345',
    ADMIN_WEB_TOKEN: 't'.repeat(40),
    ADMIN_WEB_2FA_ENABLED: 'true',
    ADMIN_WEB_2FA_SECRET: 'A'.repeat(32),
    ADMIN_WEB_STEP_UP_ENABLED: 'true',
    ADMIN_WEB_SECURE_COOKIE: 'true',
    ADMIN_WEB_HSTS_ENABLED: 'true',
    ADMIN_WEB_ALLOW_TOKEN_QUERY: 'false',
    ADMIN_WEB_ENFORCE_ORIGIN_CHECK: 'true',
    ADMIN_WEB_ALLOWED_ORIGINS: 'https://admin.genz.noah-dns.online',
    WEB_PORTAL_BASE_URL: 'https://player.genz.noah-dns.online',
    DATABASE_URL: 'postgresql://app:secret@127.0.0.1:5432/scum_th_platform?schema=public',
    DATABASE_PROVIDER: 'postgresql',
    PRISMA_SCHEMA_PROVIDER: 'postgresql',
    PERSIST_REQUIRE_DB: 'true',
    PERSIST_LEGACY_SNAPSHOTS: 'false',
  });
  assert.deepEqual(errors, []);
});

test('getProductionSecurityErrors blocks SQLite production runtime', () => {
  const errors = getProductionSecurityErrors({
    NODE_ENV: 'production',
    DISCORD_TOKEN:
      'MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0.NTQzMjE2.abcdefghijklmnopqrstuvwx',
    SCUM_WEBHOOK_SECRET: 'w'.repeat(32),
    ADMIN_WEB_PASSWORD: 'StrongPassword_12345',
    ADMIN_WEB_TOKEN: 't'.repeat(40),
    ADMIN_WEB_2FA_ENABLED: 'true',
    ADMIN_WEB_2FA_SECRET: 'A'.repeat(32),
    ADMIN_WEB_STEP_UP_ENABLED: 'true',
    ADMIN_WEB_SECURE_COOKIE: 'true',
    ADMIN_WEB_HSTS_ENABLED: 'true',
    ADMIN_WEB_ALLOW_TOKEN_QUERY: 'false',
    ADMIN_WEB_ENFORCE_ORIGIN_CHECK: 'true',
    ADMIN_WEB_ALLOWED_ORIGINS: 'https://admin.genz.noah-dns.online',
    WEB_PORTAL_BASE_URL: 'https://player.genz.noah-dns.online',
    DATABASE_URL: 'file:./prisma/dev.db',
    PERSIST_REQUIRE_DB: 'true',
    PERSIST_LEGACY_SNAPSHOTS: 'false',
  });

  assert.match(errors.join('\n'), /requires PostgreSQL DATABASE_URL/i);
});

test('getDatabaseRuntimeErrors blocks tenant topology on non-PostgreSQL engine', () => {
  const errors = getDatabaseRuntimeErrors({
    DATABASE_URL: 'file:./prisma/dev.db',
    TENANT_DB_TOPOLOGY_MODE: 'schema-per-tenant',
  });

  assert.match(errors.join('\n'), /schema-per-tenant requires PostgreSQL/i);
});

test('getRuntimeOwnershipErrors blocks duplicate delivery worker ownership', () => {
  const errors = getRuntimeOwnershipErrors({
    BOT_ENABLE_DELIVERY_WORKER: 'true',
    WORKER_ENABLE_DELIVERY: 'true',
  });

  assert.match(errors.join('\n'), /Do not enable delivery worker on both bot and worker/i);
});

test('getWorkerRuntimeErrors validates worker toggles', () => {
  const invalid = getWorkerRuntimeErrors({
    WORKER_ENABLE_RENTBIKE: 'false',
    WORKER_ENABLE_DELIVERY: 'false',
  });
  assert.equal(invalid.length > 0, true);

  const valid = getWorkerRuntimeErrors({
    WORKER_ENABLE_RENTBIKE: 'true',
    WORKER_ENABLE_DELIVERY: 'false',
  });
  assert.deepEqual(valid, []);
});
