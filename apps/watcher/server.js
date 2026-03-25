'use strict';

const { startWatcher } = require('../../src/services/scumLogWatcherRuntime');

if (require.main === module) {
  startWatcher();
}

module.exports = {
  startWatcher,
};
