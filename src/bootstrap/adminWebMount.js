'use strict';

/** Optional admin web mount for the bot runtime. */

const { startAdminWebServer } = require('../adminWebServer');

function mountAdminWeb(client, enabled) {
  if (!enabled) {
    console.log('[boot] skip admin web (BOT_ENABLE_ADMIN_WEB=false)');
    return null;
  }

  // Keep the admin surface available even when Discord login is degraded.
  return startAdminWebServer(client);
}

module.exports = {
  mountAdminWeb,
};
