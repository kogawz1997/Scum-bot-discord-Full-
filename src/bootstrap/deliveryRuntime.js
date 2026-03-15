'use strict';

/** Worker delivery bootstrap helpers. */

const {
  startRconDeliveryWorker,
} = require('../services/rconDelivery');

function startWorkerDeliveryRuntime(enabled, acquireLock) {
  if (!enabled) {
    console.log('[worker] skip delivery worker');
    return false;
  }
  acquireLock('delivery-worker');
  startRconDeliveryWorker(null);
  return true;
}

module.exports = {
  startWorkerDeliveryRuntime,
};
