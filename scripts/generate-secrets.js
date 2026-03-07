const crypto = require('node:crypto');

function makeSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function main() {
  const values = {
    SCUM_WEBHOOK_SECRET: makeSecret(32),
    ADMIN_WEB_PASSWORD: makeSecret(24),
    ADMIN_WEB_TOKEN: makeSecret(32),
    RCON_PASSWORD: makeSecret(24),
  };

  console.log('# Copy to .env (rotate old values immediately)');
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
  }
}

main();
