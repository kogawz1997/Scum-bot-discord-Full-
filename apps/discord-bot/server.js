'use strict';

require('dotenv').config();

const { client } = require('../../src/bot');

async function startDiscordBot() {
  const token = String(process.env.DISCORD_TOKEN || '').trim();
  if (!token) {
    throw new Error('DISCORD_TOKEN is required');
  }
  return client.login(token);
}

if (require.main === module) {
  startDiscordBot().catch((error) => {
    console.error('[apps/discord-bot] failed to start:', error.message);
    process.exit(1);
  });
}

module.exports = {
  client,
  startDiscordBot,
};
