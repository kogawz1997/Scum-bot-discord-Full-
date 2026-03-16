'use strict';

function startVipExpirySweeper(deps) {
  const {
    client,
    roles,
    listMemberships,
    revokeVipForUser,
    intervalMs = 60 * 1000,
  } = deps;

  const timer = setInterval(async () => {
    for (const membership of listMemberships()) {
      if (!membership.expiresAt || membership.expiresAt > new Date()) continue;
      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(membership.userId).catch(() => null);
        if (!member) continue;
        const vipRole = guild.roles.cache.find((role) => role.name === roles.vip);
        if (vipRole && member.roles.cache.has(vipRole.id)) {
          await member.roles.remove(vipRole, 'VIP หมดอายุ').catch(() => null);
        }
      }
      await revokeVipForUser({ userId: membership.userId }).catch(() => null);
    }
  }, intervalMs);

  return timer;
}

function createBotReadyHandler(deps) {
  const {
    client,
    botProfile,
    mountScumWebhook,
    initLinkStore,
    initBountyStore,
    initStatsStore,
    startRestartScheduler,
    startRentBikeService,
    startRconDeliveryWorker,
    acquireExclusiveServiceLockOrExit,
    bindOpsAlertRoute,
    listMemberships,
    revokeVipForUser,
    roles,
  } = deps;

  return async function handleBotReady(readyClient) {
    console.log(`บอทล็อกอินสำเร็จเป็น ${readyClient.user.tag}`);

    const warmups = await Promise.allSettled([
      initLinkStore(),
      initBountyStore(),
      initStatsStore(),
    ]);
    for (const warmup of warmups) {
      if (warmup.status !== 'rejected') continue;
      console.error('[boot] store warmup failed:', warmup.reason?.message || warmup.reason);
    }

    mountScumWebhook(client, botProfile.features.scumWebhook);

    if (botProfile.features.restartScheduler) {
      startRestartScheduler(client);
    } else {
      console.log('[boot] skip restart scheduler (BOT_ENABLE_RESTART_SCHEDULER=false)');
    }

    if (botProfile.features.rentBikeService) {
      acquireExclusiveServiceLockOrExit('rent-bike-service');
      startRentBikeService(client).catch((error) => {
        console.error('[rent-bike] failed to start service:', error.message);
      });
    } else {
      console.log('[boot] skip rent bike service (BOT_ENABLE_RENTBIKE_SERVICE=false)');
    }

    if (botProfile.features.deliveryWorker) {
      acquireExclusiveServiceLockOrExit('delivery-worker');
      startRconDeliveryWorker(client);
    } else {
      console.log('[boot] skip delivery worker (BOT_ENABLE_DELIVERY_WORKER=false)');
    }

    if (botProfile.features.opsAlertRoute) {
      bindOpsAlertRoute(client);
    } else {
      console.log('[boot] skip ops alert route (BOT_ENABLE_OPS_ALERT_ROUTE=false)');
    }

    startVipExpirySweeper({
      client,
      roles,
      listMemberships,
      revokeVipForUser,
    });
  };
}

module.exports = {
  createBotReadyHandler,
  startVipExpirySweeper,
};
