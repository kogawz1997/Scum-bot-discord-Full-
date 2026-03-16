'use strict';

/**
 * Discord ops-alert bridge used by the bot runtime.
 * Keep alert formatting and Discord fan-out outside bot.js so bootstrap stays small.
 */

function formatOpsAlertMessage(payload = {}) {
  const kind = String(payload.kind || 'alert');
  if (kind === 'queue-pressure') {
    return (
      `[OPS] queue-pressure | length=${payload.queueLength || 0} ` +
      `threshold=${payload.threshold || '-'}`
    );
  }
  if (kind === 'queue-stuck') {
    return (
      `[OPS] queue-stuck | oldestDueMs=${payload.oldestDueMs || 0} ` +
      `thresholdMs=${payload.thresholdMs || '-'} ` +
      `queueLength=${payload.queueLength || 0} ` +
      `code=${payload.purchaseCode || '-'}`
    );
  }
  if (kind === 'fail-rate') {
    const failRate = Number(payload.failRate || 0);
    return (
      `[OPS] fail-rate | failRate=${failRate.toFixed(3)} ` +
      `attempts=${payload.attempts || 0} failures=${payload.failures || 0} ` +
      `threshold=${payload.threshold || '-'}`
    );
  }
  if (kind === 'login-failure-spike') {
    return (
      `[OPS] login-failure-spike | failures=${payload.failures || 0} ` +
      `windowMs=${payload.windowMs || '-'} threshold=${payload.threshold || '-'} ` +
      `topIps=${Array.isArray(payload.topIps) ? payload.topIps.join(',') : '-'}`
    );
  }
  return `[OPS] ${JSON.stringify(payload)}`;
}

function createBindOpsAlertRoute({
  adminLiveBus,
  channels,
  logger = console,
}) {
  let bound = false;

  return function bindOpsAlertRoute(clientInstance) {
    if (bound) return;
    bound = true;

    adminLiveBus.on('update', async (evt) => {
      try {
        if (evt?.type !== 'ops-alert') return;
        const content = formatOpsAlertMessage(evt?.payload || {});

        for (const guild of clientInstance.guilds.cache.values()) {
          const channel =
            guild.channels.cache.find(
              (candidate) =>
                candidate.name === channels.adminLog
                && candidate.isTextBased
                && candidate.isTextBased(),
            )
            || guild.channels.cache.find(
              (candidate) =>
                candidate.name === channels.shopLog
                && candidate.isTextBased
                && candidate.isTextBased(),
            );
          if (!channel) continue;
          await channel.send(content).catch(() => null);
        }
      } catch (error) {
        logger.error('[ops-alert-route] failed to send alert to Discord', error);
      }
    });
  };
}

module.exports = {
  createBindOpsAlertRoute,
  formatOpsAlertMessage,
};
