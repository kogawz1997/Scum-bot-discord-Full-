require('dotenv').config();
const { spawnSync } = require('node:child_process');

function isTruthy(value) {
  const text = String(value || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

function isLikelyPlaceholder(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  const patterns = [
    'your_',
    'example',
    'changeme',
    'replace',
    'token_here',
    'password_here',
    'put_a_',
    'placeholder',
    'xxx',
  ];
  return patterns.some((pattern) => text.includes(pattern));
}

function isLocalHost(host) {
  const value = String(host || '').trim().toLowerCase();
  return value === '127.0.0.1' || value === 'localhost' || value === '::1';
}

function checkMinLength(name, value, minLength, errors, warnings) {
  const text = String(value || '').trim();
  if (!text) {
    errors.push(`${name} is missing`);
    return;
  }
  if (text.length < minLength) {
    warnings.push(`${name} should be at least ${minLength} chars (current=${text.length})`);
  }
}

function checkDiscordToken(value, errors, warnings) {
  const token = String(value || '').trim();
  if (!token || isLikelyPlaceholder(token)) {
    errors.push('DISCORD_TOKEN is missing or placeholder');
    return;
  }

  const discordTokenPattern = /^[A-Za-z0-9_\-.]{20,}\.[A-Za-z0-9_\-.]{6,}\.[A-Za-z0-9_\-.]{20,}$/;
  if (!discordTokenPattern.test(token)) {
    warnings.push('DISCORD_TOKEN format looks unusual; verify token is correct');
  }
}

function isGitTracked(filePath) {
  const out = spawnSync('git', ['ls-files', '--error-unmatch', filePath], {
    encoding: 'utf8',
  });
  return out.status === 0;
}

function parseAdminUsersJson(raw, warnings, errors) {
  const text = String(raw || '').trim();
  if (!text) return;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    errors.push('ADMIN_WEB_USERS_JSON is invalid JSON');
    return;
  }

  if (!Array.isArray(parsed)) {
    errors.push('ADMIN_WEB_USERS_JSON must be a JSON array');
    return;
  }

  for (const row of parsed) {
    if (!row || typeof row !== 'object') {
      errors.push('ADMIN_WEB_USERS_JSON contains invalid row');
      continue;
    }
    const username = String(row.username || '').trim();
    const password = String(row.password || '').trim();
    const role = String(row.role || '').trim().toLowerCase();
    if (!username || !password) {
      errors.push('ADMIN_WEB_USERS_JSON rows must contain username and password');
      continue;
    }
    if (password.length < 10) {
      warnings.push(`ADMIN_WEB_USERS_JSON user ${username} has short password (<10)`);
    }
    if (role && !['owner', 'admin', 'mod'].includes(role)) {
      warnings.push(`ADMIN_WEB_USERS_JSON user ${username} has unknown role (${role})`);
    }
  }
}

function run() {
  const env = process.env;
  const errors = [];
  const warnings = [];
  const isProduction = String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const persistRequireDb = isTruthy(env.PERSIST_REQUIRE_DB);

  checkDiscordToken(env.DISCORD_TOKEN, errors, warnings);

  checkMinLength('SCUM_WEBHOOK_SECRET', env.SCUM_WEBHOOK_SECRET, 24, errors, warnings);
  checkMinLength('ADMIN_WEB_PASSWORD', env.ADMIN_WEB_PASSWORD, 12, errors, warnings);
  checkMinLength('ADMIN_WEB_TOKEN', env.ADMIN_WEB_TOKEN, 24, errors, warnings);

  parseAdminUsersJson(env.ADMIN_WEB_USERS_JSON, warnings, errors);

  if (String(env.ADMIN_WEB_ALLOW_TOKEN_QUERY || '').trim().toLowerCase() !== 'false') {
    warnings.push('ADMIN_WEB_ALLOW_TOKEN_QUERY should be false in production');
  }

  if (!isTruthy(env.ADMIN_WEB_ENFORCE_ORIGIN_CHECK)) {
    warnings.push('ADMIN_WEB_ENFORCE_ORIGIN_CHECK should be true');
  }

  const allowedOrigins = String(env.ADMIN_WEB_ALLOWED_ORIGINS || '').trim();
  if (!allowedOrigins) {
    warnings.push('ADMIN_WEB_ALLOWED_ORIGINS is empty; set explicit allowed origins');
  }

  const host = String(env.ADMIN_WEB_HOST || '').trim();
  if (host && !isLocalHost(host) && !isTruthy(env.ADMIN_WEB_SECURE_COOKIE)) {
    warnings.push('ADMIN_WEB_SECURE_COOKIE should be true when ADMIN_WEB_HOST is non-local');
  }

  if (isTruthy(env.ADMIN_WEB_SECURE_COOKIE) && !isTruthy(env.ADMIN_WEB_HSTS_ENABLED)) {
    warnings.push('ADMIN_WEB_HSTS_ENABLED should be true when using secure cookies behind HTTPS');
  }

  const rconExecTemplate = String(env.RCON_EXEC_TEMPLATE || '').trim();
  if (rconExecTemplate.includes('{password}') && !String(env.RCON_PASSWORD || '').trim()) {
    warnings.push('RCON_PASSWORD is empty while RCON_EXEC_TEMPLATE uses {password}');
  }

  if (!String(env.DATABASE_URL || '').trim()) {
    errors.push('DATABASE_URL is missing');
  }

  if (persistRequireDb) {
    const sqliteCheck = spawnSync('sqlite3', ['--version'], {
      encoding: 'utf8',
    });
    if (sqliteCheck.status !== 0) {
      errors.push(
        'PERSIST_REQUIRE_DB=true but sqlite3 binary is not available in PATH',
      );
    }
  }

  if (isGitTracked('.env')) {
    errors.push('.env is tracked by git (must be ignored)');
  }

  if (isProduction) {
    if (!isTruthy(env.ADMIN_WEB_SECURE_COOKIE)) {
      errors.push('NODE_ENV=production requires ADMIN_WEB_SECURE_COOKIE=true');
    }
    if (!isTruthy(env.ADMIN_WEB_HSTS_ENABLED)) {
      errors.push('NODE_ENV=production requires ADMIN_WEB_HSTS_ENABLED=true');
    }
    if (!allowedOrigins || allowedOrigins.includes('http://')) {
      errors.push('NODE_ENV=production requires strict HTTPS ADMIN_WEB_ALLOWED_ORIGINS');
    }
    if (!persistRequireDb) {
      warnings.push(
        'NODE_ENV=production should set PERSIST_REQUIRE_DB=true after data migration is complete',
      );
    }
  }

  if (errors.length > 0) {
    console.error('SECURITY_CHECK: FAILED');
    for (const line of errors) {
      console.error(`ERROR: ${line}`);
    }
    for (const line of warnings) {
      console.error(`WARN: ${line}`);
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('SECURITY_CHECK: PASSED with warnings');
    for (const line of warnings) {
      console.warn(`WARN: ${line}`);
    }
  } else {
    console.log('SECURITY_CHECK: PASSED');
  }
}

run();
