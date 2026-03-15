'use strict';

/** Minimal runtime container for bot startup resources. */

const { startRuntimeHealthServer } = require('../services/runtimeHealthServer');

function createBotRuntimeContainer(options = {}) {
  const container = {
    client: options.client || null,
    profile: options.profile || null,
    healthServer: null,
  };

  if (container.profile?.health) {
    container.healthServer = startRuntimeHealthServer({
      name: 'bot',
      host: container.profile.health.host,
      port: container.profile.health.port,
      getPayload: options.getHealthPayload,
    });
  }

  return Object.freeze(container);
}

module.exports = {
  createBotRuntimeContainer,
};
