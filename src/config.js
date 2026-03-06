// ค่าคอนฟิกพื้นฐานของบอทเซิร์ฟ SCUM

const { loadJson, saveJsonDebounced } = require('./store/_persist');

const PERSIST_FILENAME = 'config-overrides.json';

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
    currencySymbol: '💰',
    dailyReward: 250,
    weeklyReward: 1500,
    dailyCooldownMs: 24 * 60 * 60 * 1000,
    weeklyCooldownMs: 7 * 24 * 60 * 60 * 1000,
  },
  shop: {
    // รายการเริ่มต้น (สามารถแก้ได้เอง)
    initialItems: [
      {
        id: 'vip-7d',
        name: 'VIP 7 วัน',
        price: 5000,
        description: 'VIP 7 วัน + เข้าห้อง VIP + สีชื่อพิเศษ',
      },
      {
        id: 'vip-30d',
        name: 'VIP 30 วัน',
        price: 15000,
        description: 'VIP 30 วัน + เข้าห้อง VIP + สีชื่อพิเศษ',
      },
      {
        id: 'loot-box',
        name: 'Loot Box (ในเกม)',
        price: 2000,
        description: 'กล่องสุ่มของในเกม (สตาฟเป็นคนแจกในเกมตาม code)',
      },
    ],
  },
  serverInfo: {
    name: 'SCUM TH เซิร์ฟเวอร์',
    ip: '127.0.0.1',
    port: '12345',
    maxPlayers: 90,
    description:
      'เซิร์ฟ SCUM PVP/PVE เน้น community ไทย ไม่ pay2win\nอ่านกติกาใน #server-info ก่อนเข้าเล่น',
    rulesShort: [
      'ห้ามใช้โปรแกรมช่วยเล่น / cheat / macro ผิดกติกา',
      'ห้าม toxic หนัก, เหยียดชาติ/ศาสนา/เพศ',
      'ห้ามทำลายของใน safe zone',
    ],
    website: null,
  },
  restartSchedule: [
    'ทุกวัน 06:00',
    'ทุกวัน 12:00',
    'ทุกวัน 18:00',
    'ทุกวัน 00:00',
  ],
  raidTimes: [
    'จันทร์ - ศุกร์: 18:00 - 23:00',
    'เสาร์ - อาทิตย์: 14:00 - 23:00',
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
    badWordsSoft: ['เหี้ย', 'สัส', 'ควาย'],
    badWordsHard: ['nigger', 'ควยแม่', 'ไปตาย'],
    hardTimeoutMinutes: 30,
  },
  vip: {
    plans: [
      {
        id: 'vip-7d',
        name: 'VIP 7 วัน',
        description: 'VIP 7 วัน, ห้อง VIP, สีชื่อพิเศษ, โบนัส daily เล็กน้อย',
        priceCoins: 5000,
        durationDays: 7,
      },
      {
        id: 'vip-30d',
        name: 'VIP 30 วัน',
        description:
          'VIP 30 วัน, ห้อง VIP, สีชื่อพิเศษ, โบนัส daily เล็กน้อย',
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
      enabled: false,
      queueIntervalMs: 1200,
      maxRetries: 3,
      retryDelayMs: 6000,
      retryBackoff: 1.8,
      commandTimeoutMs: 10000,
      failedStatus: 'delivery_failed',
      // itemId -> command string | command array
      // placeholders: {steamId} {itemId} {itemName} {gameItemId} {quantity} {itemKind} {userId} {purchaseCode}
      itemCommands: {},
      // Optional fallback if env RCON_EXEC_TEMPLATE is not set.
      // Example:
      // rconExecTemplate: 'mcrcon -H {host} -P {port} -p "{password}" "{command}"',
      rconExecTemplate: '',
    },
  },
};

const runtimeConfig = deepClone(defaultConfig);
const persistedPatch = loadJson(PERSIST_FILENAME, null);
if (isPlainObject(persistedPatch)) {
  mergePatchInPlace(runtimeConfig, persistedPatch);
}

const scheduleConfigSave = saveJsonDebounced(
  PERSIST_FILENAME,
  () => getConfigSnapshot(),
);

function getConfigSnapshot() {
  return deepClone(runtimeConfig);
}

function updateConfigPatch(patch) {
  if (!isPlainObject(patch)) {
    throw new Error('patch must be an object');
  }
  mergePatchInPlace(runtimeConfig, patch);
  scheduleConfigSave();
  return getConfigSnapshot();
}

function setFullConfig(nextConfig) {
  if (!isPlainObject(nextConfig)) {
    throw new Error('config must be an object');
  }
  const merged = deepClone(defaultConfig);
  mergePatchInPlace(merged, nextConfig);
  replaceValueInPlace(runtimeConfig, merged);
  scheduleConfigSave();
  return getConfigSnapshot();
}

function resetConfigToDefault() {
  replaceValueInPlace(runtimeConfig, defaultConfig);
  scheduleConfigSave();
  return getConfigSnapshot();
}

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
