// à¸„à¹ˆà¸²à¸„à¸­à¸™à¸Ÿà¸´à¸à¸žà¸·à¹‰à¸™à¸à¸²à¸™à¸‚à¸­à¸‡à¸šà¸­à¸—à¹€à¸‹à¸´à¸£à¹Œà¸Ÿ SCUM

const { loadJson, saveJsonDebounced } = require('./store/_persist');
const { prisma } = require('./prisma');

const PERSIST_FILENAME = 'config-overrides.json';
const CONFIG_ROW_ID = 1;

let mutationVersion = 0;
let dbWriteQueue = Promise.resolve();
let initPromise = null;

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = deepClone(nested);
    }
    return out;
  }
  return value;
}

function replaceValueInPlace(currentValue, nextValue) {
  if (Array.isArray(currentValue) && Array.isArray(nextValue)) {
    currentValue.length = 0;
    for (const item of nextValue) {
      currentValue.push(deepClone(item));
    }
    return currentValue;
  }

  if (isPlainObject(currentValue) && isPlainObject(nextValue)) {
    const nextKeys = new Set(Object.keys(nextValue));
    for (const key of Object.keys(currentValue)) {
      if (!nextKeys.has(key)) {
        delete currentValue[key];
      }
    }

    for (const [key, value] of Object.entries(nextValue)) {
      if (!(key in currentValue)) {
        currentValue[key] = deepClone(value);
        continue;
      }

      const existing = currentValue[key];
      if (
        (Array.isArray(existing) && Array.isArray(value)) ||
        (isPlainObject(existing) && isPlainObject(value))
      ) {
        currentValue[key] = replaceValueInPlace(existing, value);
      } else {
        currentValue[key] = deepClone(value);
      }
    }

    return currentValue;
  }

  return deepClone(nextValue);
}

function mergePatchInPlace(target, patch) {
  if (!isPlainObject(target) || !isPlainObject(patch)) return target;

  for (const [key, value] of Object.entries(patch)) {
    if (!(key in target)) {
      target[key] = deepClone(value);
      continue;
    }

    const existing = target[key];
    if (Array.isArray(existing) && Array.isArray(value)) {
      existing.length = 0;
      for (const item of value) {
        existing.push(deepClone(item));
      }
      continue;
    }

    if (isPlainObject(existing) && isPlainObject(value)) {
      mergePatchInPlace(existing, value);
      continue;
    }

    target[key] = deepClone(value);
  }

  return target;
}

const defaultConfig = {
  economy: {
    currencySymbol: 'ðŸ’°',
    dailyReward: 250,
    weeklyReward: 1500,
    dailyCooldownMs: 24 * 60 * 60 * 1000,
    weeklyCooldownMs: 7 * 24 * 60 * 60 * 1000,
  },
  luckyWheel: {
    enabled: true,
    cooldownMs: 6 * 60 * 60 * 1000,
    rewards: [
      { id: 'coin-100', label: '100 Coins', type: 'coins', amount: 100, weight: 30 },
      { id: 'coin-250', label: '250 Coins', type: 'coins', amount: 250, weight: 24 },
      { id: 'coin-500', label: '500 Coins', type: 'coins', amount: 500, weight: 16 },
      { id: 'coin-1000', label: '1,000 Coins', type: 'coins', amount: 1000, weight: 9 },
      { id: 'coin-2000', label: '2,000 Coins', type: 'coins', amount: 2000, weight: 4 },
      { id: 'miss', label: 'No Reward', type: 'none', amount: 0, weight: 17 },
    ],
    tips: [
      'Link SteamID before buying in-game items.',
      'Read server rules before you play.',
      'Do not share Discord or Steam account credentials.',
      'If delivery fails, report your order code to admin.',
    ],
  },
  shop: {
    // à¸£à¸²à¸¢à¸à¸²à¸£à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™ (à¸ªà¸²à¸¡à¸²à¸£à¸–à¹à¸à¹‰à¹„à¸”à¹‰à¹€à¸­à¸‡)
    initialItems: [
      {
        id: 'vip-7d',
        name: 'VIP 7 à¸§à¸±à¸™',
        price: 5000,
        description: 'VIP 7 à¸§à¸±à¸™ + à¹€à¸‚à¹‰à¸²à¸«à¹‰à¸­à¸‡ VIP + à¸ªà¸µà¸Šà¸·à¹ˆà¸­à¸žà¸´à¹€à¸¨à¸©',
      },
      {
        id: 'vip-30d',
        name: 'VIP 30 à¸§à¸±à¸™',
        price: 15000,
        description: 'VIP 30 à¸§à¸±à¸™ + à¹€à¸‚à¹‰à¸²à¸«à¹‰à¸­à¸‡ VIP + à¸ªà¸µà¸Šà¸·à¹ˆà¸­à¸žà¸´à¹€à¸¨à¸©',
      },
      {
        id: 'loot-box',
        name: 'Loot Box (à¹ƒà¸™à¹€à¸à¸¡)',
        price: 2000,
        description: 'à¸à¸¥à¹ˆà¸­à¸‡à¸ªà¸¸à¹ˆà¸¡à¸‚à¸­à¸‡à¹ƒà¸™à¹€à¸à¸¡ (à¸ªà¸•à¸²à¸Ÿà¹€à¸›à¹‡à¸™à¸„à¸™à¹à¸ˆà¸à¹ƒà¸™à¹€à¸à¸¡à¸•à¸²à¸¡ code)',
      },
    ],
  },
  serverInfo: {
    name: 'SCUM TH à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œ',
    ip: '127.0.0.1',
    port: '12345',
    maxPlayers: 90,
    description:
      'à¹€à¸‹à¸´à¸£à¹Œà¸Ÿ SCUM PVP/PVE à¹€à¸™à¹‰à¸™ community à¹„à¸—à¸¢ à¹„à¸¡à¹ˆ pay2win\nà¸­à¹ˆà¸²à¸™à¸à¸•à¸´à¸à¸²à¹ƒà¸™ #server-info à¸à¹ˆà¸­à¸™à¹€à¸‚à¹‰à¸²à¹€à¸¥à¹ˆà¸™',
    rulesShort: [
      'à¸«à¹‰à¸²à¸¡à¹ƒà¸Šà¹‰à¹‚à¸›à¸£à¹à¸à¸£à¸¡à¸Šà¹ˆà¸§à¸¢à¹€à¸¥à¹ˆà¸™ / cheat / macro à¸œà¸´à¸”à¸à¸•à¸´à¸à¸²',
      'à¸«à¹‰à¸²à¸¡ toxic à¸«à¸™à¸±à¸, à¹€à¸«à¸¢à¸µà¸¢à¸”à¸Šà¸²à¸•à¸´/à¸¨à¸²à¸ªà¸™à¸²/à¹€à¸žà¸¨',
      'à¸«à¹‰à¸²à¸¡à¸—à¸³à¸¥à¸²à¸¢à¸‚à¸­à¸‡à¹ƒà¸™ safe zone',
    ],
    website: null,
  },
  restartSchedule: [
    'à¸—à¸¸à¸à¸§à¸±à¸™ 06:00',
    'à¸—à¸¸à¸à¸§à¸±à¸™ 12:00',
    'à¸—à¸¸à¸à¸§à¸±à¸™ 18:00',
    'à¸—à¸¸à¸à¸§à¸±à¸™ 00:00',
  ],
  raidTimes: [
    'à¸ˆà¸±à¸™à¸—à¸£à¹Œ - à¸¨à¸¸à¸à¸£à¹Œ: 18:00 - 23:00',
    'à¹€à¸ªà¸²à¸£à¹Œ - à¸­à¸²à¸—à¸´à¸•à¸¢à¹Œ: 14:00 - 23:00',
  ],
  channels: {
    shopLog: 'shop-log',
    statusOnline: 'status-online',
    playerJoin: 'player-join',
    killFeed: 'kill-feed',
    restartAlerts: 'restart-alerts',
    bountyBoard: 'bounty-board',
    evidence: 'evidence',
    adminLog: 'admin-log',
    ticketsHub: 'tickets',
    commandsChannel: 'commands-channel',
    inServer: 'in-server',
  },
  killFeed: {
    // Used when no specific weapon image is matched.
    defaultWeaponImage:
      'https://img.icons8.com/color/96/rifle.png',
    unknownWeaponLabel: 'อาวุธไม่ทราบชนิด',

    // Optional map snapshot image in kill feed.
    // mapImageTemplate supports {sector} placeholder.
    mapImageTemplate: '',
    defaultMapImage: '',
    sectorMapImages: {},

    // Normalize raw SCUM weapon names to canonical display names.
    weaponAliases: {
      AK47: 'AK-47',
      'AK 47': 'AK-47',
      BP_WEAPON_AK47: 'AK-47',
      BP_WEAPON_AK47_C: 'AK-47',

      M16A4: 'M16A4',
      'M16 A4': 'M16A4',
      BP_WEAPON_M16A4: 'M16A4',
      BP_WEAPON_M16A4_C: 'M16A4',

      M82A1: 'M82A1',
      'M82 A1': 'M82A1',
      BP_WEAPON_M82A1: 'M82A1',
      BP_WEAPON_M82A1_C: 'M82A1',

      MP5: 'MP5',
      MP5K: 'MP5K',
      'MP5 K': 'MP5K',
      BP_WEAPON_MP5: 'MP5',
      BP_WEAPON_MP5_C: 'MP5',
      BP_WEAPON_MP5K: 'MP5K',
      BP_WEAPON_MP5K_C: 'MP5K',

      SVD: 'SVD',
      BP_WEAPON_SVD: 'SVD',
      BP_WEAPON_SVD_C: 'SVD',

      M9: 'M9',
      'TEC01 M9': 'M9',
      BP_WEAPON_M9: 'M9',
      BP_WEAPON_M9_C: 'M9',

      BOW: 'Bow',
      COMPOUND_BOW: 'Compound Bow',
      CROSSBOW: 'Crossbow',
    },

    // Canonical weapon name -> image URL
    weaponImages: {
      'AK-47': 'https://img.icons8.com/color/96/rifle.png',
      M16A4: 'https://img.icons8.com/color/96/rifle.png',
      M82A1: 'https://img.icons8.com/color/96/sniper-rifle.png',
      MP5: 'https://img.icons8.com/color/96/submachine-gun.png',
      MP5K: 'https://img.icons8.com/color/96/submachine-gun.png',
      SVD: 'https://img.icons8.com/color/96/sniper-rifle.png',
      M9: 'https://img.icons8.com/color/96/pistol-gun.png',
      Bow: 'https://img.icons8.com/color/96/bow-and-arrow.png',
      Crossbow: 'https://img.icons8.com/color/96/bow-and-arrow.png',
      'Compound Bow': 'https://img.icons8.com/color/96/bow-and-arrow.png',
    },
  },
  roles: {
    owner: 'Owner',
    admin: 'Admin',
    moderator: 'Moderator',
    helper: 'Helper',
    vip: 'VIP',
    verified: 'Verified',
    muted: 'Muted',
  },
  moderation: {
    spam: {
      messages: 5,
      intervalMs: 7000,
      muteMinutes: 10,
    },
    badWordsSoft: ['à¹€à¸«à¸µà¹‰à¸¢', 'à¸ªà¸±à¸ª', 'à¸„à¸§à¸²à¸¢'],
    badWordsHard: ['nigger', 'à¸„à¸§à¸¢à¹à¸¡à¹ˆ', 'à¹„à¸›à¸•à¸²à¸¢'],
    hardTimeoutMinutes: 30,
  },
  vip: {
    plans: [
      {
        id: 'vip-7d',
        name: 'VIP 7 à¸§à¸±à¸™',
        description: 'VIP 7 à¸§à¸±à¸™, à¸«à¹‰à¸­à¸‡ VIP, à¸ªà¸µà¸Šà¸·à¹ˆà¸­à¸žà¸´à¹€à¸¨à¸©, à¹‚à¸šà¸™à¸±à¸ª daily à¹€à¸¥à¹‡à¸à¸™à¹‰à¸­à¸¢',
        priceCoins: 5000,
        durationDays: 7,
      },
      {
        id: 'vip-30d',
        name: 'VIP 30 à¸§à¸±à¸™',
        description:
          'VIP 30 à¸§à¸±à¸™, à¸«à¹‰à¸­à¸‡ VIP, à¸ªà¸µà¸Šà¸·à¹ˆà¸­à¸žà¸´à¹€à¸¨à¸©, à¹‚à¸šà¸™à¸±à¸ª daily à¹€à¸¥à¹‡à¸à¸™à¹‰à¸­à¸¢',
        priceCoins: 15000,
        durationDays: 30,
      },
    ],
  },
  rentBike: {
    timezone: 'Asia/Phnom_Penh',
    resetCheckIntervalMs: 15000,
    cooldownMinutes: 5,
    spawnSettleMs: 2500,
    resetDestroyDelayMs: 300,
    vehicle: {
      // Vehicle ID used by #SpawnVehicle <ID>
      spawnId: '',
      listCommand: '#ListSpawnedVehicles',
      spawnCommand: '#SpawnVehicle {spawnId}',
      destroyCommand: '#DestroyVehicle {vehicleInstanceId}',
      motorbikeKeywords: ['motorbike', 'motorcycle', 'bike', 'dirtbike'],
    },
    rcon: {
      commandTimeoutMs: 10000,
      commandRetries: 2,
      retryDelayMs: 1000,
      // Optional fallback if env RCON_EXEC_TEMPLATE is not set
      execTemplate: '',
    },
  },
  delivery: {
    auto: {
      enabled: true,
      queueIntervalMs: 1200,
      maxRetries: 3,
      retryDelayMs: 6000,
      retryBackoff: 1.8,
      commandTimeoutMs: 10000,
      failedStatus: 'delivery_failed',
      // itemId OR gameItemId/spawn_id -> command string | command array
      // placeholders: {steamId} {itemId} {itemName} {gameItemId} {quantity} {itemKind} {userId} {purchaseCode}
      itemCommands: {},
      // If true: auto-use command template from scum_weapons_from_wiki.json
      // when no explicit itemCommands entry is found.
      wikiWeaponCommandFallbackEnabled: true,
      // If true: auto-use generic command template from scum_item_category_manifest.json
      // for all known item IDs in icon catalog when no explicit itemCommands is found.
      itemManifestCommandFallbackEnabled: true,
      // Optional fallback if env RCON_EXEC_TEMPLATE is not set.
      // Example:
      // rconExecTemplate: 'mcrcon -H {host} -P {port} -p "{password}" "{command}"',
      rconExecTemplate: '',
    },
  },
};

const runtimeConfig = deepClone(defaultConfig);
const legacyConfigSnapshot = loadJson(PERSIST_FILENAME, null);
if (isPlainObject(legacyConfigSnapshot)) {
  mergePatchInPlace(runtimeConfig, legacyConfigSnapshot);
}

const scheduleConfigSave = saveJsonDebounced(
  PERSIST_FILENAME,
  () => getConfigSnapshot(),
);

function queueDbWrite(work, label) {
  dbWriteQueue = dbWriteQueue
    .then(async () => {
      await work();
    })
    .catch((error) => {
      console.error(`[config] prisma ${label} failed:`, error.message);
    });
  return dbWriteQueue;
}

function persistConfigToPrisma(snapshot) {
  if (!isPlainObject(snapshot)) return;
  const configJson = JSON.stringify(snapshot);
  queueDbWrite(
    async () => {
      await prisma.botConfig.upsert({
        where: { id: CONFIG_ROW_ID },
        update: {
          configJson,
        },
        create: {
          id: CONFIG_ROW_ID,
          configJson,
        },
      });
    },
    'upsert-config',
  );
}

async function hydrateConfigFromPrisma() {
  const startVersion = mutationVersion;
  try {
    const row = await prisma.botConfig.findUnique({
      where: { id: CONFIG_ROW_ID },
    });
    if (!row) {
      if (isPlainObject(legacyConfigSnapshot)) {
        persistConfigToPrisma(getConfigSnapshot());
      }
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(row.configJson);
    } catch (error) {
      console.error('[config] invalid configJson in prisma:', error.message);
      return;
    }
    if (!isPlainObject(parsed)) return;

    if (startVersion !== mutationVersion) {
      // Local runtime was updated before hydration completed; keep local state.
      persistConfigToPrisma(getConfigSnapshot());
      return;
    }

    const merged = deepClone(defaultConfig);
    mergePatchInPlace(merged, parsed);
    replaceValueInPlace(runtimeConfig, merged);
    scheduleConfigSave();
  } catch (error) {
    console.error('[config] failed to hydrate from prisma:', error.message);
  }
}

function initConfigStore() {
  if (!initPromise) {
    initPromise = hydrateConfigFromPrisma();
  }
  return initPromise;
}

function flushConfigWrites() {
  return dbWriteQueue;
}

function getConfigSnapshot() {
  return deepClone(runtimeConfig);
}

function updateConfigPatch(patch) {
  if (!isPlainObject(patch)) {
    throw new Error('patch must be an object');
  }
  mutationVersion += 1;
  mergePatchInPlace(runtimeConfig, patch);
  const snapshot = getConfigSnapshot();
  scheduleConfigSave();
  persistConfigToPrisma(snapshot);
  return snapshot;
}

function setFullConfig(nextConfig) {
  if (!isPlainObject(nextConfig)) {
    throw new Error('config must be an object');
  }
  mutationVersion += 1;
  const merged = deepClone(defaultConfig);
  mergePatchInPlace(merged, nextConfig);
  replaceValueInPlace(runtimeConfig, merged);
  const snapshot = getConfigSnapshot();
  scheduleConfigSave();
  persistConfigToPrisma(snapshot);
  return snapshot;
}

function resetConfigToDefault() {
  mutationVersion += 1;
  replaceValueInPlace(runtimeConfig, defaultConfig);
  const snapshot = getConfigSnapshot();
  scheduleConfigSave();
  persistConfigToPrisma(snapshot);
  return snapshot;
}

initConfigStore();

module.exports = runtimeConfig;
Object.defineProperty(module.exports, 'getConfigSnapshot', {
  value: getConfigSnapshot,
  enumerable: false,
});
Object.defineProperty(module.exports, 'updateConfigPatch', {
  value: updateConfigPatch,
  enumerable: false,
});
Object.defineProperty(module.exports, 'setFullConfig', {
  value: setFullConfig,
  enumerable: false,
});
Object.defineProperty(module.exports, 'resetConfigToDefault', {
  value: resetConfigToDefault,
  enumerable: false,
});
Object.defineProperty(module.exports, 'initConfigStore', {
  value: initConfigStore,
  enumerable: false,
});
Object.defineProperty(module.exports, 'flushConfigWrites', {
  value: flushConfigWrites,
  enumerable: false,
});

