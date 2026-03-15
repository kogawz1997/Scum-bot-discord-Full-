'use strict';

/** Worker queue bootstrap helpers and lock ownership. */

const {
  startRentBikeService,
} = require('../services/rentBikeService');
const {
  acquireRuntimeLock,
} = require('../services/runtimeLock');

function acquireExclusiveServiceLockOrThrow(serviceName) {
  const result = acquireRuntimeLock(serviceName, 'worker');
  if (result.ok) return result.data;

  const holder = result.data
    ? `pid=${result.data.pid || '-'} owner=${result.data.owner || '-'} host=${result.data.hostname || '-'}`
    : result.reason || 'unknown';
  throw new Error(`runtime lock conflict for ${serviceName}: ${holder}`);
}

async function startWorkerQueueRuntime(enabled) {
  if (!enabled) {
    console.log('[worker] skip rent bike service');
    return false;
  }
  acquireExclusiveServiceLockOrThrow('rent-bike-service');
  await startRentBikeService(null);
  return true;
}

module.exports = {
  acquireExclusiveServiceLockOrThrow,
  startWorkerQueueRuntime,
};
