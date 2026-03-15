'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pipeline } = require('node:stream/promises');
const { URL } = require('node:url');

const { loadMergedEnvFiles } = require('../../src/utils/loadEnvFiles');
loadMergedEnvFiles({
  basePath: path.resolve(process.cwd(), '.env'),
  overlayPath: path.join(__dirname, '.env'),
});
const {
  safeJsonStringify,
  installBigIntJsonSerialization,
} = require('../../src/utils/jsonSerialization');
installBigIntJsonSerialization();

const {
  listShopItems,
  listUserPurchases,
  getWallet,
  listWalletLedger,
  canClaimDaily,
  claimDaily,
  canClaimWeekly,
  claimWeekly,
  listTopWallets,
  listPurchaseStatusHistory,
} = require('../../src/store/memoryStore');
const {
  getPlayerDashboard,
  listPlayerAccounts,
  getPlayerAccount,
  upsertPlayerAccount,
} = require('../../src/store/playerAccountStore');
const {
  redeemCodeForUser,
  requestRentBikeForUser,
  createBountyForUser,
  listActiveBountiesForUser,
} = require('../../src/services/playerOpsService');
const { resolveItemIconUrl } = require('../../src/services/itemIconService');
const {
  getResolvedCart,
  checkoutCart,
  buildBundleSummary,
  getDeliveryStatusText,
} = require('../../src/services/cartService');
const {
  normalizeShopKind,
  isGameItemShopKind,
  findShopItemByQuery,
  purchaseShopItemForUser,
} = require('../../src/services/shopService');
const {
  addCartItem,
  removeCartItem,
  clearCart,
  listCartItems,
} = require('../../src/store/cartStore');
const { transferCoins } = require('../../src/services/coinService');
const {
  checkRewardClaimForUser,
  claimRewardForUser,
} = require('../../src/services/rewardService');
const {
  setLink,
  getLinkBySteamId,
  getLinkByUserId,
} = require('../../src/store/linkStore');
const {
  canSpinWheel,
  getUserWheelState,
} = require('../../src/store/luckyWheelStore');
const {
  listPartyMessages,
  addPartyMessage,
  normalizePartyKey,
} = require('../../src/store/partyChatStore');
const { listCodes } = require('../../src/store/redeemStore');
const { getStats, listAllStats } = require('../../src/store/statsStore');
const { getStatus } = require('../../src/store/scumStore');
const {
  ensureRentBikeTables,
  listRentalVehicles,
  getDailyRent,
} = require('../../src/store/rentBikeStore');
const { awardWheelRewardForUser } = require('../../src/services/wheelService');
const { getPlatformPublicOverview } = require('../../src/services/platformService');
const { createPortalAuthRuntime } = require('./auth/portalAuthRuntime');
const {
  createPlayerCommerceRoutes,
} = require('./api/playerCommerceRoutes');
const {
  createPlayerGeneralRoutes,
} = require('./api/playerGeneralRoutes');
const {
  buildPortalHealthPayload,
  printPortalStartupHints,
} = require('./runtime/portalRuntime');
const config = require('../../src/config');

const NODE_ENV = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';

const HOST = String(process.env.WEB_PORTAL_HOST || '127.0.0.1').trim() || '127.0.0.1';
const PORT = asInt(process.env.WEB_PORTAL_PORT, 3300, 1, 65535);
const BASE_URL = String(process.env.WEB_PORTAL_BASE_URL || `http://${HOST}:${PORT}`).trim();
const PORTAL_MODE = normalizeMode(process.env.WEB_PORTAL_MODE || 'player');
const LEGACY_ADMIN_URL = String(
  process.env.WEB_PORTAL_LEGACY_ADMIN_URL || 'http://127.0.0.1:3200/admin',
).trim();

const SESSION_TTL_MS =
  asInt(process.env.WEB_PORTAL_SESSION_TTL_HOURS, 12, 1, 168) * 60 * 60 * 1000;
const SESSION_COOKIE_NAME =
  String(process.env.WEB_PORTAL_SESSION_COOKIE_NAME || 'scum_portal_session').trim()
    || 'scum_portal_session';
const SESSION_COOKIE_SAMESITE = normalizeSameSite(
  process.env.WEB_PORTAL_COOKIE_SAMESITE || 'lax',
);
const SESSION_COOKIE_PATH = normalizeCookiePath(
  process.env.WEB_PORTAL_SESSION_COOKIE_PATH || '/',
  '/',
);
const SESSION_COOKIE_DOMAIN = normalizeCookieDomain(
  process.env.WEB_PORTAL_COOKIE_DOMAIN || '',
);
const SECURE_COOKIE = envBool('WEB_PORTAL_SECURE_COOKIE', IS_PRODUCTION);
const ENFORCE_ORIGIN_CHECK = envBool('WEB_PORTAL_ENFORCE_ORIGIN_CHECK', true);

const DISCORD_CLIENT_ID = String(
  process.env.WEB_PORTAL_DISCORD_CLIENT_ID
    || process.env.ADMIN_WEB_SSO_DISCORD_CLIENT_ID
    || process.env.DISCORD_CLIENT_ID
    || '',
).trim();
const DISCORD_CLIENT_SECRET = String(
  process.env.WEB_PORTAL_DISCORD_CLIENT_SECRET
    || process.env.ADMIN_WEB_SSO_DISCORD_CLIENT_SECRET
    || '',
).trim();
const DISCORD_GUILD_ID = String(
  process.env.WEB_PORTAL_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID || '',
).trim();
const PLAYER_OPEN_ACCESS = envBool('WEB_PORTAL_PLAYER_OPEN_ACCESS', true);
const REQUIRE_GUILD_MEMBER = PLAYER_OPEN_ACCESS
  ? false
  : envBool('WEB_PORTAL_REQUIRE_GUILD_MEMBER', Boolean(DISCORD_GUILD_ID));
const ALLOWED_DISCORD_IDS = parseCsvSet(
  process.env.WEB_PORTAL_ALLOWED_DISCORD_IDS || '',
);
const OAUTH_STATE_TTL_MS = asInt(
  process.env.WEB_PORTAL_OAUTH_STATE_TTL_MS,
  10 * 60 * 1000,
  60 * 1000,
  60 * 60 * 1000,
);
const DISCORD_REDIRECT_PATH = String(
  process.env.WEB_PORTAL_DISCORD_REDIRECT_PATH || '/auth/discord/callback',
).trim() || '/auth/discord/callback';

const CLEANUP_INTERVAL_MS = asInt(
  process.env.WEB_PORTAL_CLEANUP_INTERVAL_MS,
  60_000,
  10_000,
  10 * 60 * 1000,
);

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const LOGIN_HTML_PATH = path.join(__dirname, 'public', 'login.html');
const PLAYER_HTML_PATH = path.join(__dirname, 'public', 'player.html');
const LANDING_HTML_PATH = path.join(__dirname, 'public', 'landing.html');
const TRIAL_HTML_PATH = path.join(__dirname, 'public', 'trial.html');
const SHOWCASE_HTML_PATH = path.join(__dirname, 'public', 'showcase.html');
const DOCS_DIR_PATH = path.resolve(process.cwd(), 'docs');
const DEFAULT_MAP_PORTAL_URL = 'https://scum-map.com/th/map/bunkers_and_killboxes';
const DEFAULT_SCUM_ITEMS_DIR_PATH = path.resolve(process.cwd(), 'scum_items-main');
const SCUM_ITEMS_DIR_PATH = path.resolve(
  String(process.env.SCUM_ITEMS_DIR_PATH || DEFAULT_SCUM_ITEMS_DIR_PATH).trim()
    || DEFAULT_SCUM_ITEMS_DIR_PATH,
);
const STATIC_ICON_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg']);

const FAVICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">',
  '<stop offset="0%" stop-color="#d3af6a"/><stop offset="100%" stop-color="#b6ce84"/>',
  '</linearGradient></defs>',
  '<rect width="64" height="64" rx="12" fill="#10180f"/>',
  '<path d="M10 14h44v6H10zm0 30h44v6H10z" fill="url(#g)" opacity=".85"/>',
  '<path d="M45 20H24c-2.4 0-4 1.4-4 3.5 0 2.4 1.9 3.4 4.5 4.1l8 2.2c1.4.4 2.1 1 2.1 1.9 0 1-1 1.8-2.4 1.8H18v8h15.2c6.4 0 10.8-3.6 10.8-9.2 0-4.4-2.5-7.2-7.7-8.7l-7.5-2.1c-1.2-.3-1.7-.8-1.7-1.4 0-.8.8-1.3 1.9-1.3H45z" fill="url(#g)"/>',
  '</svg>',
].join('');

const sessions = new Map();
const oauthStates = new Map();
const partyChatLastSentAt = new Map();

const PARTY_CHAT_MIN_INTERVAL_MS = 900;
const PARTY_CHAT_MAX_LENGTH = 280;

let cachedLoginHtml = null;
let cachedPlayerHtml = null;
let cachedLandingHtml = null;
let cachedTrialHtml = null;
let cachedShowcaseHtml = null;
let cachedLoginHtmlMtimeMs = 0;
let cachedPlayerHtmlMtimeMs = 0;
let cachedLandingHtmlMtimeMs = 0;
let cachedTrialHtmlMtimeMs = 0;
let cachedShowcaseHtmlMtimeMs = 0;

function asInt(raw, fallback, min, max) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function envBool(name, fallback = false) {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function normalizeSameSite(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'strict') return 'Strict';
  if (raw === 'none') return 'None';
  return 'Lax';
}

function normalizeCookiePath(value, fallback = '/') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (!text.startsWith('/')) return fallback;
  return text;
}

function normalizeCookieDomain(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/[;\s]/.test(text)) return '';
  return text;
}

function normalizeMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'player') return 'player';
  return 'player';
}

function parseCsvSet(value) {
  const out = new Set();
  for (const item of String(value || '').split(',')) {
    const text = item.trim();
    if (text) out.add(text);
  }
  return out;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePurchaseStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAmount(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function normalizeQuantity(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

function normalizeHttpUrl(value) {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function getFrameSrcOrigins() {
  const origins = new Set();
  const mapConfig = getMapPortalConfig();
  if (mapConfig.embedUrl) {
    try {
      origins.add(new URL(mapConfig.embedUrl).origin);
    } catch {
      // ignore invalid map URL
    }
  }
  return Array.from(origins);
}

function getMapPortalConfig() {
  const serverInfo = config.serverInfo || {};
  const externalUrl = normalizeHttpUrl(
    process.env.WEB_PORTAL_MAP_EXTERNAL_URL
      || process.env.WEB_PORTAL_MAP_URL
      || serverInfo.mapUrl
      || DEFAULT_MAP_PORTAL_URL,
  );
  const embedEnabled = envBool('WEB_PORTAL_MAP_EMBED_ENABLED', true);
  const embedUrl = embedEnabled
    ? normalizeHttpUrl(
        process.env.WEB_PORTAL_MAP_EMBED_URL
          || serverInfo.mapEmbedUrl
          || externalUrl
          || DEFAULT_MAP_PORTAL_URL,
      )
    : null;
  return {
    enabled: Boolean(externalUrl || embedUrl),
    embedEnabled: Boolean(embedEnabled && embedUrl),
    embedUrl: embedUrl || null,
    externalUrl: externalUrl || embedUrl || DEFAULT_MAP_PORTAL_URL,
  };
}

function isDiscordId(value) {
  return /^\d{15,25}$/.test(String(value || '').trim());
}

function buildDiscordAvatarUrl(profile = {}) {
  const userId = normalizeText(profile.id);
  const avatarHash = normalizeText(profile.avatar);
  if (!isDiscordId(userId)) return null;
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(
    userId,
  )}/${encodeURIComponent(avatarHash)}.${ext}?size=256`;
}

function getEconomyConfig() {
  const economy = config.economy || {};
  return {
    currencySymbol: String(economy.currencySymbol || 'Coins'),
    dailyReward: normalizeAmount(economy.dailyReward, 0),
    weeklyReward: normalizeAmount(economy.weeklyReward, 0),
  };
}

const DEFAULT_WHEEL_REWARDS = [
  { id: 'coin-100', label: '100 Coins', type: 'coins', amount: 100, weight: 30 },
  { id: 'coin-250', label: '250 Coins', type: 'coins', amount: 250, weight: 24 },
  { id: 'coin-500', label: '500 Coins', type: 'coins', amount: 500, weight: 16 },
  { id: 'coin-1000', label: '1,000 Coins', type: 'coins', amount: 1000, weight: 9 },
  { id: 'coin-2000', label: '2,000 Coins', type: 'coins', amount: 2000, weight: 4 },
  { id: 'miss', label: 'พลาดรางวัล', type: 'none', amount: 0, weight: 17 },
];

const DEFAULT_PLAYER_TIPS = [
  'ผูก SteamID ให้เรียบร้อยก่อนซื้อไอเทมในเกม',
  'อ่านกฎเซิร์ฟเวอร์ให้ครบก่อนเริ่มเล่น',
  'อย่าแชร์บัญชี Discord/Steam และอย่าเปิดเผยรหัสผ่าน',
  'หากพบปัญหาส่งของ ให้ใช้เลขออเดอร์แจ้งแอดมิน',
];

function normalizeWheelReward(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const id = normalizeText(raw.id || `reward-${index + 1}`).toLowerCase();
  const label = normalizeText(raw.label || raw.name || id);
  const rawType = normalizeText(raw.type || 'coins').toLowerCase();
  const type = rawType === 'item' || rawType === 'shop_item' || rawType === 'game_item'
    ? 'item'
    : rawType === 'none'
      ? 'none'
      : 'coins';
  const amount = normalizeAmount(raw.amount, 0);
  const weight = Math.max(1, normalizeAmount(raw.weight, 1));
  const itemId = normalizeText(raw.itemId || raw.shopItemId || raw.item);
  const gameItemId = normalizeText(raw.gameItemId || raw.scumItemId || itemId);
  const quantity = normalizeQuantity(raw.quantity, 1);
  const iconUrl = normalizeHttpUrl(raw.iconUrl)
    || resolveItemIconUrl({
      id: itemId || gameItemId || id,
      gameItemId,
      name: label,
    })
    || null;
  if (!id || !label) return null;
  if (type === 'item' && !itemId && !gameItemId) return null;
  return {
    id,
    label,
    type: type || 'coins',
    amount: type === 'coins' ? amount : 0,
    weight,
    itemId: type === 'item' ? (itemId || gameItemId) : null,
    gameItemId: type === 'item' ? (gameItemId || itemId || null) : null,
    quantity: type === 'item' ? quantity : 0,
    iconUrl,
  };
}

function getLuckyWheelConfig() {
  const luckyWheel = config.luckyWheel || {};
  const rewardsRaw = Array.isArray(luckyWheel.rewards) && luckyWheel.rewards.length > 0
    ? luckyWheel.rewards
    : DEFAULT_WHEEL_REWARDS;
  const rewards = rewardsRaw
    .map((row, index) => normalizeWheelReward(row, index))
    .filter(Boolean);
  const cooldownMs = Math.max(
    60 * 1000,
    normalizeAmount(luckyWheel.cooldownMs, 6 * 60 * 60 * 1000),
  );
  const tips = Array.isArray(luckyWheel.tips) && luckyWheel.tips.length > 0
    ? luckyWheel.tips.map((line) => normalizeText(line)).filter(Boolean)
    : DEFAULT_PLAYER_TIPS;
  return {
    enabled: luckyWheel.enabled !== false,
    cooldownMs,
    rewards: rewards.length > 0 ? rewards : DEFAULT_WHEEL_REWARDS,
    tips,
  };
}

function pickLuckyWheelReward(rewards) {
  const rows = Array.isArray(rewards) ? rewards : [];
  const normalized = rows
    .map((row, index) => normalizeWheelReward(row, index))
    .filter(Boolean);
  if (normalized.length === 0) {
    return normalizeWheelReward(DEFAULT_WHEEL_REWARDS[0], 0);
  }

  const totalWeight = normalized.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) return normalized[0];

  let cursor = crypto.randomInt(totalWeight);
  for (const row of normalized) {
    cursor -= row.weight;
    if (cursor < 0) return row;
  }
  return normalized[normalized.length - 1];
}

function msToHoursMinutes(ms) {
  const totalMinutes = Math.ceil(Number(ms || 0) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} นาที`;
  return `${hours} ชม. ${minutes} นาที`;
}

function msToDaysHours(ms) {
  const totalHours = Math.ceil(Number(ms || 0) / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days <= 0) return `${hours} ชม.`;
  return `${days} วัน ${hours} ชม.`;
}

function msToCountdownText(ms) {
  const value = Math.max(0, normalizeAmount(ms, 0));
  if (value <= 0) return 'พร้อมหมุน';
  if (value < 60 * 60 * 1000) return msToHoursMinutes(value);
  return msToDaysHours(value);
}

async function buildWheelStatePayload(discordId, wheelConfig, limit = 20) {
  const [check, stateRaw] = await Promise.all([
    canSpinWheel(discordId, wheelConfig.cooldownMs),
    getUserWheelState(discordId, limit),
  ]);
  const state = stateRaw || {
    userId: String(discordId || ''),
    lastSpinAt: null,
    totalSpins: 0,
    history: [],
  };
  return {
    enabled: Boolean(wheelConfig.enabled),
    cooldownMs: normalizeAmount(wheelConfig.cooldownMs, 0),
    canSpin: Boolean(wheelConfig.enabled) && Boolean(check.ok),
    remainingMs: Boolean(check.ok) ? 0 : normalizeAmount(check.remainingMs, 0),
    remainingText: Boolean(check.ok)
      ? 'พร้อมหมุน'
      : msToCountdownText(check.remainingMs),
    nextSpinAt: check.nextSpinAt || null,
    lastSpinAt: state.lastSpinAt || null,
    totalSpins: normalizeAmount(state.totalSpins, 0),
    history: Array.isArray(state.history) ? state.history : [],
    rewards: wheelConfig.rewards.map((row) => ({
      id: row.id,
      label: row.label,
      type: row.type,
      amount: row.amount,
      weight: row.weight,
      itemId: row.itemId || null,
      gameItemId: row.gameItemId || null,
      quantity: row.quantity || 0,
      iconUrl: row.iconUrl || null,
    })),
  };
}

function getRentTimezone() {
  return normalizeText(config.rentBike?.timezone) || 'Asia/Phnom_Penh';
}

function getDatePartsInTimezone(date, timezone) {
  const safeDate = date instanceof Date ? date : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(safeDate);
  const out = {};
  for (const part of parts) {
    out[part.type] = part.value;
  }
  return out;
}

function getDateKeyInTimezone(timezone, date = new Date()) {
  const parts = getDatePartsInTimezone(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getNextMidnightIsoInTimezone(timezone, date = new Date()) {
  try {
    const currentLocal = new Date(
      date.toLocaleString('en-US', { timeZone: timezone }),
    );
    if (Number.isNaN(currentLocal.getTime())) return null;
    const nextLocalMidnight = new Date(currentLocal);
    nextLocalMidnight.setHours(24, 0, 0, 0);
    const diffMs = nextLocalMidnight.getTime() - currentLocal.getTime();
    return new Date(date.getTime() + diffMs).toISOString();
  } catch {
    return null;
  }
}

function walletReasonLabel(reason) {
  const key = normalizeText(reason).toLowerCase();
  const map = {
    daily_claim: 'รับรางวัลรายวัน',
    weekly_claim: 'รับรางวัลรายสัปดาห์',
    purchase_debit: 'ซื้อสินค้า',
    cart_checkout_debit: 'ชำระตะกร้า',
    redeem_code_coins: 'ใช้โค้ดแลกเหรียญ',
    wheel_spin_reward: 'วงล้อสุ่มรางวัล',
    wheel_spin_rollback: 'ย้อนกลับรางวัลวงล้อ',
    gift_transfer_out: 'โอนเหรียญออก',
    gift_transfer_in: 'รับเหรียญจากผู้เล่น',
    admin_wallet_set: 'แอดมินตั้งค่าเหรียญ',
    admin_wallet_add: 'แอดมินเพิ่มเหรียญ',
    admin_wallet_remove: 'แอดมินหักเหรียญ',
    wallet_add: 'เพิ่มเหรียญ',
    wallet_remove: 'หักเหรียญ',
    wallet_set: 'ตั้งค่ายอดเหรียญ',
    vip_purchase: 'ซื้อ VIP',
  };
  return map[key] || (key || 'unknown');
}

async function resolveSessionSteamLink(discordId) {
  const [link, account] = await Promise.all([
    Promise.resolve(getLinkByUserId(discordId)),
    getPlayerAccount(discordId),
  ]);
  const steamId = link?.steamId || normalizeText(account?.steamId) || null;
  const inGameName = normalizeText(link?.inGameName) || null;
  return {
    linked: Boolean(steamId),
    steamId,
    inGameName,
    linkedAt: link?.linkedAt || null,
  };
}

const portalAuthRuntime = createPortalAuthRuntime({
  sessions,
  oauthStates,
  baseUrl: BASE_URL,
  enforceOriginCheck: ENFORCE_ORIGIN_CHECK,
  playerOpenAccess: PLAYER_OPEN_ACCESS,
  requireGuildMember: REQUIRE_GUILD_MEMBER,
  allowedDiscordIds: ALLOWED_DISCORD_IDS,
  oauthStateTtlMs: OAUTH_STATE_TTL_MS,
  sessionTtlMs: SESSION_TTL_MS,
  sessionCookieName: SESSION_COOKIE_NAME,
  sessionCookiePath: SESSION_COOKIE_PATH,
  sessionCookieSameSite: SESSION_COOKIE_SAMESITE,
  sessionCookieDomain: SESSION_COOKIE_DOMAIN,
  secureCookie: SECURE_COOKIE,
  discordApiBase: DISCORD_API_BASE,
  discordClientId: DISCORD_CLIENT_ID,
  discordClientSecret: DISCORD_CLIENT_SECRET,
  discordGuildId: DISCORD_GUILD_ID,
  discordRedirectPath: DISCORD_REDIRECT_PATH,
  sendJson,
  upsertPlayerAccount,
  buildDiscordAvatarUrl,
  normalizeText,
  isDiscordId,
  logger: console,
});

const {
  buildClearSessionCookie,
  buildSessionCookie,
  cleanupRuntimeState,
  createSession,
  getCanonicalRedirectUrl,
  getSession,
  handleDiscordCallback,
  handleDiscordStart,
  removeSession,
  verifyOrigin,
} = portalAuthRuntime;

function buildNotificationItems(payload = {}) {
  const items = [];
  const purchases = Array.isArray(payload.purchases) ? payload.purchases : [];
  const ledgers = Array.isArray(payload.ledgers) ? payload.ledgers : [];
  const rentals = Array.isArray(payload.rentals) ? payload.rentals : [];

  for (const row of purchases.slice(0, 10)) {
    items.push({
      type: 'purchase',
      title: `คำสั่งซื้อ ${row.code || '-'}`,
      message: `${row.itemName || row.itemId || '-'} | สถานะ ${row.status || '-'}`,
      createdAt: row.createdAt || null,
    });
  }

  for (const row of ledgers.slice(0, 10)) {
    items.push({
      type: 'wallet',
      title: walletReasonLabel(row.reason),
      message: `${row.delta >= 0 ? '+' : ''}${row.delta || 0} | ยอดหลังทำรายการ ${row.balanceAfter || 0}`,
      createdAt: row.createdAt || null,
    });
  }

  for (const row of rentals.slice(0, 10)) {
    items.push({
      type: 'rentbike',
      title: `เช่ารถ: ${row.status || '-'}`,
      message: `order: ${row.orderId || '-'} | vehicle: ${row.vehicleInstanceId || '-'}`,
      createdAt: row.updatedAt || row.createdAt || null,
    });
  }

  items.sort((a, b) => {
    const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
  return items.slice(0, 30);
}

function buildSecurityHeaders(extra = {}, options = {}) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store',
  };

  if (SECURE_COOKIE) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  if (options.isHtml) {
    const frameSrcList = ["'self'", ...getFrameSrcOrigins()];
    headers['Content-Security-Policy'] = [
      "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      `frame-src ${frameSrcList.join(' ')}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }

  return { ...headers, ...extra };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  let effectiveStatus = statusCode;
  let body = '';
  try {
    body = safeJsonStringify(payload);
  } catch (error) {
    effectiveStatus = 500;
    body = safeJsonStringify({
      ok: false,
      error: 'Internal serialization error',
    });
    console.error(
      '[web-portal-standalone] sendJson serialize failed:',
      error?.message || error,
    );
  }

  res.writeHead(
    effectiveStatus,
    buildSecurityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    }),
  );
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(
    statusCode,
    buildSecurityHeaders(
      {
        'Content-Type': 'text/html; charset=utf-8',
      },
      { isHtml: true },
    ),
  );
  res.end(html);
}

function sendFavicon(res) {
  res.writeHead(
    200,
    buildSecurityHeaders({
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    }),
  );
  res.end(FAVICON_SVG);
}

function getIconContentType(ext) {
  const normalized = String(ext || '').toLowerCase();
  if (normalized === '.png') return 'image/png';
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg';
  return 'image/webp';
}

function resolveStaticScumIconPath(pathname) {
  const prefixes = ['/assets/scum-items/', '/player/assets/scum-items/'];
  let matchedPrefix = null;
  for (const prefix of prefixes) {
    if (String(pathname || '').startsWith(prefix)) {
      matchedPrefix = prefix;
      break;
    }
  }
  if (!matchedPrefix) return null;

  let relativeName = '';
  try {
    relativeName = decodeURIComponent(
      String(pathname || '').slice(matchedPrefix.length),
    );
  } catch {
    return null;
  }
  if (!relativeName || relativeName.includes('/') || relativeName.includes('\\')) {
    return null;
  }
  if (relativeName.includes('..')) {
    return null;
  }
  const ext = path.extname(relativeName).toLowerCase();
  if (!STATIC_ICON_EXT.has(ext)) {
    return null;
  }
  const absPath = path.resolve(SCUM_ITEMS_DIR_PATH, relativeName);
  if (!absPath.startsWith(SCUM_ITEMS_DIR_PATH)) {
    return null;
  }
  return {
    absPath,
    ext,
  };
}

async function tryServeStaticScumIcon(req, res, pathname) {
  if (String(req.method || '').toUpperCase() !== 'GET') return false;
  const resolved = resolveStaticScumIconPath(pathname);
  if (!resolved) return false;
  try {
    const stat = await fs.promises.stat(resolved.absPath);
    if (!stat.isFile()) {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return true;
    }
    res.writeHead(
      200,
      buildSecurityHeaders({
        'Content-Type': getIconContentType(resolved.ext),
        'Cache-Control': 'public, max-age=86400',
      }),
    );
    await pipeline(fs.createReadStream(resolved.absPath), res);
    return true;
  } catch {
    sendJson(res, 404, { ok: false, error: 'Not found' });
    return true;
  }
}

async function readRawBody(req, maxBytes) {
  const limit = Math.max(1024, Number(maxBytes || 1024 * 1024));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      if (tooLarge) return;
      bytes += chunk.length;
      if (bytes > limit) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        const err = new Error('Payload too large');
        err.statusCode = 413;
        reject(err);
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
    req.on('aborted', () => reject(new Error('Request aborted')));
  });
}

async function readJsonBody(req) {
  const buf = await readRawBody(req, 1024 * 1024);
  if (!buf || buf.length === 0) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON body');
    error.statusCode = 400;
    throw error;
  }
}

function loadHtmlTemplate(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getFileMtimeMs(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return Number(stat.mtimeMs || 0);
  } catch {
    return 0;
  }
}

function getPlayerHtml() {
  const mtimeMs = getFileMtimeMs(PLAYER_HTML_PATH);
  if (!cachedPlayerHtml || !IS_PRODUCTION || mtimeMs > cachedPlayerHtmlMtimeMs) {
    cachedPlayerHtml = loadHtmlTemplate(PLAYER_HTML_PATH);
    cachedPlayerHtmlMtimeMs = mtimeMs;
  }
  return cachedPlayerHtml;
}

function getLandingHtml() {
  const mtimeMs = getFileMtimeMs(LANDING_HTML_PATH);
  if (!cachedLandingHtml || !IS_PRODUCTION || mtimeMs > cachedLandingHtmlMtimeMs) {
    cachedLandingHtml = loadHtmlTemplate(LANDING_HTML_PATH);
    cachedLandingHtmlMtimeMs = mtimeMs;
  }
  return cachedLandingHtml;
}

function getTrialHtml() {
  const mtimeMs = getFileMtimeMs(TRIAL_HTML_PATH);
  if (!cachedTrialHtml || !IS_PRODUCTION || mtimeMs > cachedTrialHtmlMtimeMs) {
    cachedTrialHtml = loadHtmlTemplate(TRIAL_HTML_PATH);
    cachedTrialHtmlMtimeMs = mtimeMs;
  }
  return cachedTrialHtml;
}

function renderMarkdownDocument(title, markdown) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body{margin:0;background:#0c1318;color:#e9f3f3;font-family:ui-sans-serif,system-ui,sans-serif}
    .shell{width:min(980px,calc(100% - 32px));margin:0 auto;padding:28px 0 44px}
    .card{background:#121d24;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:22px;box-shadow:0 24px 56px rgba(0,0,0,.28)}
    a{color:#8fd4c8}
    h1{margin:0 0 16px;font-size:32px}
    pre{white-space:pre-wrap;line-height:1.7;font-size:14px;color:#bcd0cf}
  </style>
</head>
<body>
  <div class="shell">
    <div class="card">
      <p><a href="/landing">กลับหน้า Landing</a></p>
      <h1>${escapeHtml(title)}</h1>
      <pre>${escapeHtml(markdown)}</pre>
    </div>
  </div>
</body>
</html>`;
}

function tryServePublicDoc(pathname, res) {
  if (!pathname.startsWith('/docs/')) return false;
  const relative = pathname.slice('/docs/'.length);
  if (!relative || !relative.toLowerCase().endsWith('.md')) return false;
  const absolute = path.resolve(DOCS_DIR_PATH, relative);
  if (!absolute.startsWith(DOCS_DIR_PATH)) return false;
  if (!fs.existsSync(absolute)) return false;
  const markdown = fs.readFileSync(absolute, 'utf8');
  sendHtml(
    res,
    200,
    renderMarkdownDocument(path.basename(relative), markdown),
  );
  return true;
}

function renderLoginPage(message) {
  const mtimeMs = getFileMtimeMs(LOGIN_HTML_PATH);
  if (!cachedLoginHtml || !IS_PRODUCTION || mtimeMs > cachedLoginHtmlMtimeMs) {
    cachedLoginHtml = loadHtmlTemplate(LOGIN_HTML_PATH);
    cachedLoginHtmlMtimeMs = mtimeMs;
  }
  const safe = escapeHtml(String(message || ''));
  return cachedLoginHtml.replace('__ERROR_MESSAGE__', safe);
}

// Keep the public showcase static and cacheable so sales/demo flows do not depend on auth or API calls.
function getShowcaseHtml() {
  const mtimeMs = getFileMtimeMs(SHOWCASE_HTML_PATH);
  if (!cachedShowcaseHtml || !IS_PRODUCTION || mtimeMs > cachedShowcaseHtmlMtimeMs) {
    cachedShowcaseHtml = loadHtmlTemplate(SHOWCASE_HTML_PATH);
    cachedShowcaseHtmlMtimeMs = mtimeMs;
  }
  return cachedShowcaseHtml;
}

function filterShopItems(rows, options = {}) {
  const kindFilter = normalizeText(options.kind).toLowerCase();
  const query = normalizeText(options.q).toLowerCase();
  const limit = Math.max(1, Math.min(1000, Number(options.limit || 120)));
  const out = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const kind = normalizeText(row?.kind).toLowerCase() === 'vip' ? 'vip' : 'item';
    if (kindFilter && kindFilter !== 'all' && kind !== kindFilter) continue;

    const haystack = [
      row?.id,
      row?.name,
      row?.description,
      row?.gameItemId,
    ]
      .map((value) => normalizeText(value).toLowerCase())
      .join(' ');
    if (query && !haystack.includes(query)) continue;

    const requiresSteamLink = isGameItemShopKind(kind);
    out.push({
      ...row,
      kind,
      iconUrl: normalizeText(row?.iconUrl) || resolveItemIconUrl(row),
      stock: row?.stock == null ? null : normalizeAmount(row.stock, 0),
      requiresSteamLink,
    });
    if (out.length >= limit) break;
  }

  return out;
}

function serializeCartResolved(resolved) {
  const rows = Array.isArray(resolved?.rows) ? resolved.rows : [];
  return {
    rows: rows.map((row) => ({
      itemId: row.itemId,
      quantity: normalizeQuantity(row.quantity, 1),
      lineTotal: normalizeAmount(row.lineTotal, 0),
      item: row.item
        ? {
            id: row.item.id,
            name: row.item.name,
            price: normalizeAmount(row.item.price, 0),
            kind: normalizeShopKind(row.item.kind),
            description: normalizeText(row.item.description),
            iconUrl: normalizeText(row.item.iconUrl) || resolveItemIconUrl(row.item),
            bundle: buildBundleSummary(row.item),
            stock: row.item.stock == null ? null : normalizeAmount(row.item.stock, 0),
            requiresSteamLink: isGameItemShopKind(row.item.kind),
          }
        : null,
    })),
    missingItemIds: Array.isArray(resolved?.missingItemIds) ? resolved.missingItemIds : [],
    totalPrice: normalizeAmount(resolved?.totalPrice, 0),
    totalUnits: normalizeAmount(resolved?.totalUnits, 0),
  };
}

async function buildPlayerNameLookup() {
  const rows = await listPlayerAccounts(2000).catch(() => []);
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const discordId = normalizeText(row?.discordId);
    if (!isDiscordId(discordId)) continue;
    const display = [
      normalizeText(row?.displayName),
      normalizeText(row?.username),
      discordId,
    ].find(Boolean) || discordId;
    map.set(discordId, display);
  }
  return map;
}

function normalizeSquadName(value) {
  const name = normalizeText(value);
  return name || null;
}

async function resolvePartyContext(discordId) {
  const userId = normalizeText(discordId);
  const statsRows = listAllStats();
  const rows = Array.isArray(statsRows) ? statsRows : [];
  const statsByUser = new Map();
  for (const row of rows) {
    const id = normalizeText(row?.userId);
    if (!id) continue;
    statsByUser.set(id, row);
  }
  const selfStat = statsByUser.get(userId) || null;
  const selfSquad = normalizeSquadName(selfStat?.squad);

  const nameMap = await buildPlayerNameLookup();
  const memberIds = new Set([userId]);
  let partyKey = null;
  let source = 'none';
  let title = 'ยังไม่เข้าปาร์ตี้';
  let chatEnabled = false;

  if (selfSquad) {
    const squadKey = selfSquad.toLowerCase();
    partyKey =
      normalizePartyKey(`squad:${squadKey}`)
      || normalizePartyKey(`squad:${squadKey.replace(/[^a-z0-9_-]/g, '')}`);
    source = 'stats.squad';
    title = `ปาร์ตี้ ${selfSquad}`;
    chatEnabled = Boolean(partyKey);
    for (const row of rows) {
      const rowUserId = normalizeText(row?.userId);
      if (!rowUserId) continue;
      const rowSquad = normalizeSquadName(row?.squad);
      if (!rowSquad) continue;
      if (rowSquad.toLowerCase() !== squadKey) continue;
      memberIds.add(rowUserId);
    }
  }

  const members = Array.from(memberIds)
    .map((id) => {
      const stat = statsByUser.get(id);
      const link = getLinkByUserId(id);
      return {
        discordId: id,
        displayName: nameMap.get(id) || id,
        steamId: normalizeText(link?.steamId) || null,
        inGameName: normalizeText(link?.inGameName) || null,
        squad: normalizeSquadName(stat?.squad),
        isSelf: id === userId,
      };
    })
    .sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      return String(a.displayName).localeCompare(String(b.displayName), 'th');
    });

  return {
    partyKey,
    squad: selfSquad,
    title,
    source,
    chatEnabled,
    memberCount: members.length,
    members,
  };
}

function sortLeaderboardRows(rows, type) {
  if (type === 'playtime') {
    rows.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
    return;
  }
  if (type === 'kd') {
    rows.sort((a, b) => b.kd - a.kd);
    return;
  }
  rows.sort((a, b) => b.kills - a.kills);
}

const handlePlayerCommerceRoute = createPlayerCommerceRoutes({
  sendJson,
  readJsonBody,
  normalizeText,
  normalizeAmount,
  normalizeQuantity,
  normalizePurchaseStatus,
  asInt,
  resolveItemIconUrl,
  buildBundleSummary,
  getDeliveryStatusText,
  serializeCartResolved,
  getResolvedCart,
  findShopItemByQuery,
  isGameItemShopKind,
  resolveSessionSteamLink,
  purchaseShopItemForUser,
  checkoutCart,
  listUserPurchases,
  listShopItems,
  listPurchaseStatusHistory,
  listCartItems,
  addCartItem,
  removeCartItem,
  clearCart,
  listActiveBountiesForUser,
  redeemCodeForUser,
  requestRentBikeForUser,
  createBountyForUser,
  normalizeShopKind,
  filterShopItems,
});

const handlePlayerGeneralRoute = createPlayerGeneralRoutes({
  sendJson,
  readJsonBody,
  buildClearSessionCookie,
  normalizeText,
  normalizeAmount,
  normalizePurchaseStatus,
  asInt,
  config,
  getStatus,
  getEconomyConfig,
  getLuckyWheelConfig,
  getMapPortalConfig,
  getPlayerAccount,
  getPlayerDashboard,
  resolveSessionSteamLink,
  removeSession,
  listTopWallets,
  listAllStats,
  getStats,
  buildPlayerNameLookup,
  sortLeaderboardRows,
  resolvePartyContext,
  listPartyMessages,
  addPartyMessage,
  partyChatLastSentAt,
  partyChatMinIntervalMs: PARTY_CHAT_MIN_INTERVAL_MS,
  partyChatMaxLength: PARTY_CHAT_MAX_LENGTH,
  listWalletLedger,
  getWallet,
  walletReasonLabel,
  listCodes,
  ensureRentBikeTables,
  getDailyRent,
  listRentalVehicles,
  getRentTimezone,
  getDateKeyInTimezone,
  getNextMidnightIsoInTimezone,
  canClaimDaily,
  canClaimWeekly,
  buildWheelStatePayload,
  canSpinWheel,
  pickLuckyWheelReward,
  awardWheelRewardForUser,
  msToCountdownText,
  buildNotificationItems,
  getLinkBySteamId,
  setLink,
  claimRewardForUser,
  checkRewardClaimForUser,
  msToHoursMinutes,
  msToDaysHours,
  transferCoins,
  isDiscordId,
  listUserPurchases,
});

async function handlePlayerApi(req, res, urlObj) {
  const pathname = urlObj.pathname;
  const method = String(req.method || 'GET').toUpperCase();

  if (!verifyOrigin(req)) {
    return sendJson(res, 403, {
      ok: false,
      error: 'Cross-site request denied',
    });
  }

  const session = getSession(req);
  if (!session || !isDiscordId(session.discordId)) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }

  if (
    await handlePlayerGeneralRoute({
      req,
      res,
      urlObj,
      pathname,
      method,
      session,
    })
  ) {
    return;
  }

  if (
    await handlePlayerCommerceRoute({
      req,
      res,
      urlObj,
      pathname,
      method,
      session,
    })
  ) {
    return;
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

function buildLegacyAdminUrl(pathname, search) {
  try {
    const base = new URL(LEGACY_ADMIN_URL);
    const basePath = base.pathname.replace(/\/+$/, '') || '/admin';
    const suffix = pathname.startsWith('/admin')
      ? pathname.slice('/admin'.length)
      : pathname;
    base.pathname = `${basePath}${suffix || ''}`;
    base.search = search || '';
    return base.toString();
  } catch {
    return null;
  }
}

function getPortalRuntimeSettings() {
  return {
    nodeEnv: NODE_ENV,
    mode: PORTAL_MODE,
    baseUrl: BASE_URL,
    legacyAdminUrl: LEGACY_ADMIN_URL,
    sessionCount: sessions.size,
    oauthStateCount: oauthStates.size,
    secureCookie: SECURE_COOKIE,
    cookieName: SESSION_COOKIE_NAME,
    cookiePath: SESSION_COOKIE_PATH,
    cookieSameSite: SESSION_COOKIE_SAMESITE,
    cookieDomain: SESSION_COOKIE_DOMAIN,
    enforceOriginCheck: ENFORCE_ORIGIN_CHECK,
    discordOAuthConfigured: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET),
    discordClientId: DISCORD_CLIENT_ID,
    discordClientSecret: DISCORD_CLIENT_SECRET,
    discordGuildId: DISCORD_GUILD_ID,
    playerOpenAccess: PLAYER_OPEN_ACCESS,
    requireGuildMember: REQUIRE_GUILD_MEMBER,
    allowedDiscordIdsCount: ALLOWED_DISCORD_IDS.size,
    sessionTtlMs: SESSION_TTL_MS,
    isProduction: IS_PRODUCTION,
  };
}

function buildHealthPayload() {
  return buildPortalHealthPayload(getPortalRuntimeSettings());
}

function isDiscordStartPath(pathname) {
  return pathname === '/auth/discord/start' || pathname === '/admin/auth/discord/start';
}

function isDiscordCallbackPath(pathname) {
  const normalizedPath = DISCORD_REDIRECT_PATH.startsWith('/')
    ? DISCORD_REDIRECT_PATH
    : `/${DISCORD_REDIRECT_PATH}`;
  return (
    pathname === '/auth/discord/callback'
    || pathname === '/admin/auth/discord/callback'
    || pathname === normalizedPath
  );
}

async function requestHandler(req, res) {
  const urlObj = new URL(req.url || '/', BASE_URL);
  const pathname = urlObj.pathname;
  const method = String(req.method || 'GET').toUpperCase();

  if (await tryServeStaticScumIcon(req, res, pathname)) {
    return;
  }

  // Admin routes must jump to the dedicated admin origin before generic
  // player canonicalization, otherwise local smoke checks get redirected
  // back to the player origin and never reach the real admin surface.
  if (pathname.startsWith('/admin')) {
    const target = buildLegacyAdminUrl(pathname, urlObj.search);
    if (!target) {
      return sendJson(res, 503, {
        ok: false,
        error: 'Legacy admin URL is invalid',
      });
    }
    res.writeHead(302, { Location: target });
    return res.end();
  }

  const canonicalRedirectUrl = getCanonicalRedirectUrl(req);
  if (canonicalRedirectUrl && (method === 'GET' || method === 'HEAD')) {
    res.writeHead(302, { Location: canonicalRedirectUrl });
    return res.end();
  }

  if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
    return sendFavicon(res);
  }

  if (pathname === '/healthz' && method === 'GET') {
    return sendJson(res, 200, buildHealthPayload());
  }

  if (method === 'GET' && tryServePublicDoc(pathname, res)) {
    return;
  }

  if (pathname === '/') {
    res.writeHead(302, { Location: '/player' });
    return res.end();
  }

  if (pathname === '/showcase/' && method === 'GET') {
    res.writeHead(302, { Location: '/showcase' });
    return res.end();
  }

  if (pathname === '/landing/' && method === 'GET') {
    res.writeHead(302, { Location: '/landing' });
    return res.end();
  }

  if (pathname === '/landing' && method === 'GET') {
    return sendHtml(res, 200, getLandingHtml());
  }

  if (pathname === '/showcase' && method === 'GET') {
    return sendHtml(res, 200, getShowcaseHtml());
  }

  if (pathname === '/trial/' && method === 'GET') {
    res.writeHead(302, { Location: '/trial' });
    return res.end();
  }

  if (pathname === '/trial' && method === 'GET') {
    return sendHtml(res, 200, getTrialHtml());
  }

  if (pathname === '/api/platform/public/overview' && method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      data: await getPlatformPublicOverview(),
    });
  }

  if (pathname === '/player/') {
    res.writeHead(302, { Location: '/player' });
    return res.end();
  }

  if (pathname === '/player/login/') {
    res.writeHead(302, { Location: '/player/login' });
    return res.end();
  }

  if (isDiscordStartPath(pathname) && method === 'GET') {
    return handleDiscordStart(req, res);
  }

  if (isDiscordCallbackPath(pathname) && method === 'GET') {
    return handleDiscordCallback(req, res, urlObj);
  }

  if ((pathname === '/login' || pathname === '/player/login') && method === 'GET') {
    const session = getSession(req);
    if (session) {
      res.writeHead(302, { Location: '/player' });
      return res.end();
    }
    return sendHtml(
      res,
      200,
      renderLoginPage(String(urlObj.searchParams.get('error') || '')),
    );
  }

  if (pathname === '/player' && method === 'GET') {
    const session = getSession(req);
    if (!session) {
      res.writeHead(302, { Location: '/player/login' });
      return res.end();
    }
    return sendHtml(res, 200, getPlayerHtml());
  }

  if (pathname.startsWith('/player/api/')) {
    try {
      return await handlePlayerApi(req, res, urlObj);
    } catch (error) {
      if (res.headersSent || res.writableEnded) {
        console.error('[web-portal-standalone] player api error after response:', error?.message || error);
        return;
      }
      const status = Number(error?.statusCode || 500);
      return sendJson(res, status, {
        ok: false,
        error:
          status === 413
            ? 'Payload too large'
            : status >= 500
              ? 'Internal server error'
              : String(error?.message || 'Request failed'),
      });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
}

function printStartupHints() {
  return printPortalStartupHints(getPortalRuntimeSettings());
}

function startCleanupTimer() {
  const timer = setInterval(() => {
    cleanupRuntimeState();
  }, CLEANUP_INTERVAL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

const startupReady = printStartupHints();
if (!startupReady) {
  process.exit(1);
}

const server = http.createServer((req, res) => {
  void requestHandler(req, res);
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`[web-portal-standalone] port ${PORT} is already in use`);
    process.exit(1);
  }
  console.error('[web-portal-standalone] server error:', error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  startCleanupTimer();
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
