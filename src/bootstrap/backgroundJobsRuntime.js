'use strict';

/** Worker startup logging for runtime ownership and topology. */

function logWorkerStartup(profile) {
  console.log('[worker] started');
  console.log(
    `[worker] rentBike=${profile.features.rentBike ? 'on' : 'off'} delivery=${profile.features.delivery ? 'on' : 'off'}`,
  );
  console.log(
    `[worker] executionMode=${profile.executionMode} dbProvider=${profile.database.provider} tenantMode=${profile.tenantMode}`,
  );
}

module.exports = {
  logWorkerStartup,
};
