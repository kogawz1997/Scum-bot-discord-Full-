require('dotenv').config();

const { Events } = require('discord.js');
const config = require('./config');
const { moderation, roles, channels, economy } = config;
const { loadRuntimeEnv } = require('./config/loadEnv');
const { getBotRuntimeProfile } = require('./config/runtimeProfile');
const {
  createDiscordClient,
  loadDiscordCommands,
} = require('./bootstrap/discordRuntime');
const {
  registerBotCommunityRuntime,
} = require('./bootstrap/botCommunityRuntime');
const {
  createBotReadyHandler,
} = require('./bootstrap/botReadyRuntime');
const {
  createBindOpsAlertRoute,
  formatOpsAlertMessage,
} = require('./bootstrap/botOpsAlertRuntime');
const { mountScumWebhook } = require('./bootstrap/scumWebhookMount');
const { registerGracefulShutdown } = require('./bootstrap/gracefulShutdown');
const { createBotRuntimeContainer } = require('./bootstrap/runtimeContainer');
const {
  pushMessage,
  getRecentMessages,
} = require('./store/moderationStore');
const { createPunishmentEntry } = require('./services/moderationService');
const { listMemberships, revokeVipForUser } = require('./services/vipService');
const { startRestartScheduler } = require('./services/restartScheduler');
const { startRentBikeService } = require('./services/rentBikeService');
const {
  startRconDeliveryWorker,
} = require('./services/rconDelivery');
const { acquireRuntimeLock, releaseAllRuntimeLocks } = require('./services/runtimeLock');
const { queueLeaderboardRefreshForGuild } = require('./services/leaderboardPanels');
const { adminLiveBus } = require('./services/adminLiveBus');
const { assertBotEnv } = require('./utils/env');
const {
  addItemToCartForUser,
  getResolvedCart,
  checkoutCart,
} = require('./services/cartService');
const {
  getShopItemViewById,
} = require('./services/playerQueryService');
const {
  purchaseShopItemForUser,
  normalizeShopKind,
  buildBundleSummary,
} = require('./services/shopService');
const {
  getMemberCommandAccessRole,
  getRequiredCommandAccessRole,
  hasCommandAccessAtLeast,
} = require('./utils/discordCommandAccess');
const { claimWelcomePackForUser } = require('./services/welcomePackService');
const {
  initLinkStore,
} = require('./store/linkStore');
const {
  normalizeSteamIdInput,
  bindSteamLinkForUser,
} = require('./services/linkService');
const { upsertPlayerAccount } = require('./store/playerAccountStore');
const { initBountyStore } = require('./store/bountyStore');
const { initStatsStore } = require('./store/statsStore');
const {
  createSupportTicket,
  findOpenTicketForUserInGuild,
} = require('./services/ticketService');
const { enterGiveawayForUser } = require('./services/giveawayService');
const {
  createOpenTicketHandler,
  createInteractionHandler,
} = require('./discord/interactions/botInteractionRuntime');

loadRuntimeEnv();
assertBotEnv();
const token = process.env.DISCORD_TOKEN;

function acquireExclusiveServiceLockOrExit(serviceName) {
  const result = acquireRuntimeLock(serviceName, 'bot');
  if (result.ok) return result.data;

  const holder = result.data
    ? `pid=${result.data.pid || '-'} owner=${result.data.owner || '-'} host=${result.data.hostname || '-'}`
    : result.reason || 'unknown';
  console.error(`[boot] runtime lock conflict for ${serviceName}: ${holder}`);
  process.exit(1);
}

const botProfile = getBotRuntimeProfile();
const client = createDiscordClient();
loadDiscordCommands(client);

const runtimeContainer = createBotRuntimeContainer({
  client,
  profile: botProfile,
  getHealthPayload: () => ({
    now: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    discordReady: Boolean(client?.isReady && client.isReady()),
    features: {
      scumWebhook: botProfile.features.scumWebhook,
      restartScheduler: botProfile.features.restartScheduler,
      rentBikeService: botProfile.features.rentBikeService,
      deliveryWorker: botProfile.features.deliveryWorker,
      opsAlertRoute: botProfile.features.opsAlertRoute,
    },
  }),
});
const botHealthServer = runtimeContainer.healthServer;

console.log(
  `[boot] runtime=bot dbProvider=${botProfile.database.provider} adminWeb=standalone webhook=${botProfile.features.scumWebhook ? 'on' : 'off'} delivery=${botProfile.features.deliveryWorker ? 'on' : 'off'}`,
);

const bindOpsAlertRoute = createBindOpsAlertRoute({
  adminLiveBus,
  channels,
});

client.once(Events.ClientReady, createBotReadyHandler({
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
}));

const openTicketFromPanel = createOpenTicketHandler({
  channels,
  roles,
  createSupportTicket,
  findOpenTicketForUserInGuild,
});

const handleInteractionCreate = createInteractionHandler({
  config,
  channels,
  roles,
  economy,
  openTicketFromPanel,
  queueLeaderboardRefreshForGuild,
  claimWelcomePackForUser,
  getShopItemViewById,
  purchaseShopItemForUser,
  normalizeShopKind,
  buildBundleSummary,
  addItemToCartForUser,
  getResolvedCart,
  checkoutCart,
  normalizeSteamIdInput,
  bindSteamLinkForUser,
  upsertPlayerAccount,
  enterGiveawayForUser,
  getMemberCommandAccessRole,
  getRequiredCommandAccessRole,
  hasCommandAccessAtLeast,
});

client.on(Events.InteractionCreate, handleInteractionCreate);
registerBotCommunityRuntime({
  client,
  moderation,
  roles,
  channels,
  pushMessage,
  getRecentMessages,
  createPunishmentEntry,
});

if (require.main === module) {
  client.login(token);
}

registerGracefulShutdown({
  onSigint: () => {
    releaseAllRuntimeLocks();
    if (botHealthServer) {
      botHealthServer.close();
    }
  },
  onSigterm: () => {
    releaseAllRuntimeLocks();
    if (botHealthServer) {
      botHealthServer.close();
    }
  },
  onExit: () => {
    releaseAllRuntimeLocks();
  },
});

module.exports = {
  client,
  handleInteractionCreate,
  openTicketFromPanel,
  formatOpsAlertMessage,
  bindOpsAlertRoute,
};
