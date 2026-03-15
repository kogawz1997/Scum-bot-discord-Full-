'use strict';

/** Runtime feature flag readers for bot and worker entrypoints. */

const { parseBooleanEnv } = require('./schema');

function getBotFeatureFlags(env = process.env, options = {}) {
  const isTestRuntime = options.isTestRuntime === true;
  const defaultEnabled = !isTestRuntime;
  return Object.freeze({
    adminWeb: parseBooleanEnv(env.BOT_ENABLE_ADMIN_WEB, defaultEnabled),
    scumWebhook: parseBooleanEnv(env.BOT_ENABLE_SCUM_WEBHOOK, defaultEnabled),
    restartScheduler: parseBooleanEnv(
      env.BOT_ENABLE_RESTART_SCHEDULER,
      defaultEnabled,
    ),
    rentBikeService: parseBooleanEnv(
      env.BOT_ENABLE_RENTBIKE_SERVICE,
      defaultEnabled,
    ),
    deliveryWorker: parseBooleanEnv(
      env.BOT_ENABLE_DELIVERY_WORKER,
      defaultEnabled,
    ),
    opsAlertRoute: parseBooleanEnv(
      env.BOT_ENABLE_OPS_ALERT_ROUTE,
      defaultEnabled,
    ),
  });
}

function getWorkerFeatureFlags(env = process.env) {
  return Object.freeze({
    rentBike: parseBooleanEnv(env.WORKER_ENABLE_RENTBIKE, true),
    delivery: parseBooleanEnv(env.WORKER_ENABLE_DELIVERY, true),
  });
}

module.exports = {
  getBotFeatureFlags,
  getWorkerFeatureFlags,
};
