function isSnowflake(value) {
  return /^\d{15,25}$/.test(String(value || ''));
}

function getMissingEnv(keys, env = process.env) {
  return keys.filter((key) => !env[key] || String(env[key]).trim() === '');
}

function exitWithErrors(errors) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

function assertBotEnv(env = process.env) {
  const missing = getMissingEnv(['DISCORD_TOKEN'], env);
  const errors = [];

  if (missing.length) {
    errors.push(`Missing required env: ${missing.join(', ')}`);
  }

  if (env.DISCORD_GUILD_ID && !isSnowflake(env.DISCORD_GUILD_ID)) {
    errors.push('DISCORD_GUILD_ID should be a numeric snowflake.');
  }

  if (errors.length) exitWithErrors(errors);
}

function assertRegisterEnv(env = process.env) {
  const missing = getMissingEnv(
    ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'],
    env,
  );
  const errors = [];

  if (missing.length) {
    errors.push(`Missing required env: ${missing.join(', ')}`);
  }

  if (env.DISCORD_CLIENT_ID && !isSnowflake(env.DISCORD_CLIENT_ID)) {
    errors.push('DISCORD_CLIENT_ID must be a numeric snowflake.');
  }

  if (env.DISCORD_GUILD_ID && !isSnowflake(env.DISCORD_GUILD_ID)) {
    errors.push('DISCORD_GUILD_ID must be a numeric snowflake (ไอดีเซิร์ฟเวอร์).');
  }

  if (errors.length) exitWithErrors(errors);
}

function assertWatcherEnv(env = process.env) {
  const missing = getMissingEnv(['SCUM_LOG_PATH', 'DISCORD_GUILD_ID'], env);
  const errors = [];

  if (missing.length) {
    errors.push(`Missing required env: ${missing.join(', ')}`);
  }

  if (env.DISCORD_GUILD_ID && !isSnowflake(env.DISCORD_GUILD_ID)) {
    errors.push('DISCORD_GUILD_ID must be a numeric snowflake (ไอดีเซิร์ฟเวอร์).');
  }

  if (errors.length) exitWithErrors(errors);
}

module.exports = {
  isSnowflake,
  getMissingEnv,
  assertBotEnv,
  assertRegisterEnv,
  assertWatcherEnv,
};
