const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeItemIconKey,
  listItemIconCatalog,
  resolveItemIconUrl,
} = require('./itemIconService');

const DEFAULT_MANIFEST_PATH = path.resolve(
  process.cwd(),
  'scum_item_category_manifest.json',
);

const DEFAULT_CATEGORY = 'misc';
const CATEGORY_SET = new Set([
  'weapons',
  'fishing',
  'gear',
  'food',
  'medical',
  'components',
  'blueprints',
  'tools',
  'misc',
  'vehicles',
  'full_list_wip',
]);

let cached = null;
let warnedMissingManifest = false;

function text(value) {
  return String(value || '').trim();
}

function normalizeSpawnCommandTemplate(rawFormat) {
  const raw = text(rawFormat) || '#SpawnItem <Item_ID>';
  let template = raw
    .replace(/<\s*item[_\s-]*id\s*>/gi, '{gameItemId}')
    .replace(/\{item[_\s-]*id\}/gi, '{gameItemId}')
    .trim();

  if (!template.includes('{gameItemId}')) {
    template = `${template} {gameItemId}`.trim();
  }

  const tokens = template.split(/\s+/);
  if (tokens.length === 0) {
    return '#SpawnItem {steamId} {gameItemId} {quantity}';
  }

  if (
    /^#spawnitem$/i.test(tokens[0])
    && !tokens.some((token) => token.includes('{steamId}'))
  ) {
    tokens.splice(1, 0, '{steamId}');
  }

  if (!tokens.some((token) => token.includes('{quantity}'))) {
    tokens.push('{quantity}');
  }

  return tokens.join(' ').trim();
}

function deriveCategory(itemId) {
  const value = text(itemId).toLowerCase();
  if (!value) return DEFAULT_CATEGORY;

  if (
    value.startsWith('weapon_')
    || value.startsWith('bp_weapon')
    || value.startsWith('weaponscope_')
    || value.startsWith('weaponsights_')
    || value.startsWith('weaponsuppressor_')
    || value.startsWith('weaponflashlight_')
    || value.startsWith('ammo_')
    || value.startsWith('cal_')
    || value.includes('ammobox')
  ) {
    return 'weapons';
  }

  if (
    value.startsWith('bpc_')
    || value.includes('vehicle')
    || value.includes('tractor_')
    || value.includes('wheel_')
    || value.includes('door_')
    || value.includes('engine_')
    || value.includes('car_')
  ) {
    return 'vehicles';
  }

  if (
    value.includes('fish')
    || value.includes('fishing')
    || value.includes('hook')
    || value.includes('bait')
    || value.includes('float')
  ) {
    return 'fishing';
  }

  if (
    value.includes('antibiotic')
    || value.includes('adrenaline')
    || value.includes('painkiller')
    || value.includes('bandage')
    || value.includes('tourniquet')
    || value.includes('syringe')
    || value.includes('medicine')
    || value.includes('medic')
    || value.includes('vitamin')
  ) {
    return 'medical';
  }

  if (
    value.includes('apple')
    || value.includes('banana')
    || value.includes('meat')
    || value.includes('steak')
    || value.includes('soup')
    || value.includes('beans')
    || value.includes('corn')
    || value.includes('water')
    || value.includes('wine')
    || value.includes('whiskey')
    || value.includes('food')
    || value.includes('canned')
    || value.includes('chocolate')
    || value.includes('bread')
    || value.includes('fruit')
  ) {
    return 'food';
  }

  if (
    value.includes('jacket')
    || value.includes('pants')
    || value.includes('vest')
    || value.includes('helmet')
    || value.includes('backpack')
    || value.includes('gloves')
    || value.includes('boots')
    || value.includes('hat')
    || value.includes('shirt')
    || value.includes('sweater')
    || value.includes('mask')
    || value.includes('holster')
  ) {
    return 'gear';
  }

  if (
    value.includes('bolt')
    || value.includes('nail')
    || value.includes('wire')
    || value.includes('battery')
    || value.includes('parts')
    || value.includes('component')
    || value.includes('circuit')
    || value.includes('screw')
    || value.includes('plastic')
    || value.includes('metal')
    || value.includes('wooden')
  ) {
    return 'components';
  }

  if (
    value.startsWith('bp_')
    || value.includes('blueprint')
    || value.includes('recipe')
  ) {
    return 'blueprints';
  }

  if (
    value.includes('axe')
    || value.includes('hammer')
    || value.includes('saw')
    || value.includes('shovel')
    || value.includes('wrench')
    || value.includes('pickaxe')
    || value.includes('tool')
    || value.includes('chainsaw')
    || value.includes('knife')
    || value.includes('crowbar')
  ) {
    return 'tools';
  }

  return DEFAULT_CATEGORY;
}

function loadManifestRows(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    if (!warnedMissingManifest) {
      warnedMissingManifest = true;
      console.warn(
        `[wiki-item-manifest] missing file: ${sourcePath} (set SCUM_ITEM_MANIFEST_PATH if needed)`,
      );
    }
    return null;
  }
  try {
    const raw = fs.readFileSync(sourcePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error(
      `[wiki-item-manifest] failed to parse ${sourcePath}:`,
      error.message,
    );
    return null;
  }
}

function loadCatalog() {
  const sourcePath = text(process.env.SCUM_ITEM_MANIFEST_PATH) || DEFAULT_MANIFEST_PATH;
  const manifest = loadManifestRows(sourcePath);
  const commandTemplate = normalizeSpawnCommandTemplate(
    manifest?.spawn_command_format,
  );
  const sourcePage = text(manifest?.source_page) || null;
  const categories = Array.isArray(manifest?.categories)
    ? manifest.categories
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
          key: text(row.category) || DEFAULT_CATEGORY,
          title: text(row.title) || text(row.category) || 'Unknown',
          url: text(row.url) || null,
        }))
    : [];

  const itemCatalog = listItemIconCatalog('', 10000);
  const items = [];
  const byKey = new Map();

  for (const row of itemCatalog) {
    const gameItemId = text(row.id || row.name);
    if (!gameItemId) continue;
    const category = deriveCategory(gameItemId);
    const iconUrl =
      text(row.iconUrl) || resolveItemIconUrl({ gameItemId, id: gameItemId }) || null;
    const item = {
      category,
      name: text(row.name) || gameItemId,
      gameItemId,
      commandTemplate,
      spawnCommandExample: commandTemplate
        .replace('{steamId}', '76561198000000000')
        .replace('{gameItemId}', gameItemId)
        .replace('{quantity}', '1'),
      iconUrl,
    };
    items.push(item);

    const keyCandidates = new Set([
      normalizeItemIconKey(gameItemId),
      normalizeItemIconKey(row.name),
    ]);
    for (const key of keyCandidates) {
      if (key && !byKey.has(key)) {
        byKey.set(key, item);
      }
    }
  }

  const counts = {};
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }

  for (const key of Object.keys(counts)) {
    if (!CATEGORY_SET.has(key)) {
      counts[DEFAULT_CATEGORY] = (counts[DEFAULT_CATEGORY] || 0) + counts[key];
      delete counts[key];
    }
  }

  const normalizedCategoryInfo = categories.map((cat) => ({
    ...cat,
    count: counts[cat.key] || 0,
  }));

  return {
    sourcePath,
    sourcePage,
    commandTemplate,
    categories: normalizedCategoryInfo,
    items,
    byKey,
  };
}

function ensureLoaded() {
  if (!cached) {
    cached = loadCatalog();
  }
  return cached;
}

function resolveManifestItemMeta(rawValue) {
  const state = ensureLoaded();
  const key = normalizeItemIconKey(rawValue);
  if (!key) return null;
  return state.byKey.get(key) || null;
}

function resolveManifestItemCommandTemplate(rawValue) {
  return resolveManifestItemMeta(rawValue)?.commandTemplate || null;
}

function listManifestItemCatalog(options = {}) {
  const state = ensureLoaded();
  const query = text(options.query || '').toLowerCase();
  const categoryFilter = text(options.category || '').toLowerCase();
  const limit = Math.max(1, Math.min(10000, Number(options.limit || 300)));

  const out = state.items.filter((item) => {
    if (categoryFilter && item.category.toLowerCase() !== categoryFilter) {
      return false;
    }
    if (!query) return true;
    const hay = `${item.name} ${item.gameItemId} ${item.category}`.toLowerCase();
    return hay.includes(query);
  });

  return out.slice(0, limit).map((row) => ({ ...row }));
}

function getManifestItemCatalogMeta() {
  const state = ensureLoaded();
  return {
    sourcePath: state.sourcePath,
    sourcePage: state.sourcePage,
    total: state.items.length,
    commandTemplate: state.commandTemplate,
    categories: state.categories,
  };
}

module.exports = {
  resolveManifestItemMeta,
  resolveManifestItemCommandTemplate,
  listManifestItemCatalog,
  getManifestItemCatalogMeta,
};

