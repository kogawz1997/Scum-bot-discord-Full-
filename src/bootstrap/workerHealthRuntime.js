const {
  getDeliveryMetricsSnapshot,
  getDeliveryRuntimeStatus,
} = require('../services/rconDelivery');
const {
  getRentBikeRuntime,
} = require('../services/rentBikeService');

async function buildWorkerHealthPayload(workerProfile) {
  const rent = getRentBikeRuntime();
  const delivery = getDeliveryMetricsSnapshot();
  const deliveryRuntime = await getDeliveryRuntimeStatus();
  const deliveryReady = deliveryRuntime?.readiness?.ready === true;
  const status =
    workerProfile.features.delivery && !deliveryReady
      ? 'degraded'
      : 'ready';

  return {
    now: new Date().toISOString(),
    status,
    ready: status === 'ready',
    uptimeSec: Math.round(process.uptime()),
    rentBikeEnabled: workerProfile.features.rentBike,
    deliveryEnabled: workerProfile.features.delivery,
    rentQueueLength: rent.queueLength,
    maintenance: rent.maintenance,
    queueLength: delivery.queueLength,
    failRate: delivery.failRate,
    attempts: delivery.attempts,
    deliveryRuntime,
  };
}

function startWorkerHeartbeatLogger(workerProfile) {
  const timer = setInterval(() => {
    const rent = getRentBikeRuntime();
    const delivery = getDeliveryMetricsSnapshot();
    console.log(
      `[worker] heartbeat | queue=${delivery.queueLength} failRate=${delivery.failRate.toFixed(3)} attempts=${delivery.attempts} rentQueue=${rent.queueLength} maintenance=${rent.maintenance ? 'yes' : 'no'}`,
    );
  }, workerProfile.heartbeatMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  return timer;
}

module.exports = {
  buildWorkerHealthPayload,
  startWorkerHeartbeatLogger,
};
