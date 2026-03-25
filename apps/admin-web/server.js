'use strict';

const { startApiServer } = require('../api/server');

if (require.main === module) {
  startApiServer();
}

module.exports = {
  startAdminWebServer: startApiServer,
};
