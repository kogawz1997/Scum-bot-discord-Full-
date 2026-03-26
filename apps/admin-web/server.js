'use strict';

require('dotenv').config();

const {
  createDiscordOnlySurfaceServer,
  isDiscordOnlyMode,
} = require('../../src/config/discordOnlyMode');
const { startApiServer } = require('../api/server');

function startAdminWebServer() {
  if (isDiscordOnlyMode(process.env)) {
    return createDiscordOnlySurfaceServer({
      surface: 'admin-web',
      env: process.env,
      hostEnvKey: 'ADMIN_WEB_HOST',
      portEnvKey: 'ADMIN_WEB_PORT',
      defaultHost: '127.0.0.1',
      defaultPort: 3200,
    });
  }
  return startApiServer();
}

if (require.main === module) {
  startAdminWebServer();
}

module.exports = {
  startAdminWebServer,
};
