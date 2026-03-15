'use strict';

/** Optional SCUM webhook mount for the bot runtime. */

const { startScumServer } = require('../scumWebhookServer');

function mountScumWebhook(client, enabled) {
  if (!enabled) {
    console.log('[boot] skip SCUM webhook (BOT_ENABLE_SCUM_WEBHOOK=false)');
    return null;
  }
  return startScumServer(client);
}

module.exports = {
  mountScumWebhook,
};
