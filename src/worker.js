const { loadRuntimeEnv } = require('./config/loadEnv');
const { getWorkerRuntimeProfile } = require('./config/runtimeProfile');
const { registerGracefulShutdown } = require('./bootstrap/gracefulShutdown');
const {
  acquireExclusiveServiceLockOrThrow,
  startWorkerQueueRuntime,
} = require('./bootstrap/workerQueueRuntime');
const { startWorkerDeliveryRuntime } = require('./bootstrap/deliveryRuntime');
const { logWorkerStartup } = require('./bootstrap/backgroundJobsRuntime');
const {
  buildWorkerHealthPayload,
  startWorkerHeartbeatLogger,
} = require('./bootstrap/workerHealthRuntime');
const { assertWorkerEnv } = require('./utils/env');
const { startRuntimeHealthServer } = require('./services/runtimeHealthServer');
const { releaseAllRuntimeLocks } = require('./services/runtimeLock');

loadRuntimeEnv();
const workerProfile = getWorkerRuntimeProfile();

async function startWorker() {
  assertWorkerEnv();

  if (!workerProfile.features.rentBike && !workerProfile.features.delivery) {
    throw new Error(
      'Worker disabled: both WORKER_ENABLE_RENTBIKE=false and WORKER_ENABLE_DELIVERY=false',
    );
  }

  await startWorkerQueueRuntime(workerProfile.features.rentBike);
  startWorkerDeliveryRuntime(
    workerProfile.features.delivery,
    acquireExclusiveServiceLockOrThrow,
  );
  logWorkerStartup(workerProfile);

  const healthServer = startRuntimeHealthServer({
    name: 'worker',
    host: workerProfile.health.host,
    port: workerProfile.health.port,
    getPayload: () => buildWorkerHealthPayload(workerProfile),
  });

  startWorkerHeartbeatLogger(workerProfile);

  registerGracefulShutdown({
    onSigint: () => {
      releaseAllRuntimeLocks();
      if (healthServer) healthServer.close();
    },
    onSigterm: () => {
      releaseAllRuntimeLocks();
      if (healthServer) healthServer.close();
    },
    onExit: () => {
      releaseAllRuntimeLocks();
    },
  });
}

startWorker().catch((error) => {
  console.error('[worker] failed to start:', error.message);
  releaseAllRuntimeLocks();
  process.exit(1);
});
