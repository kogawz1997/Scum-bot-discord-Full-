const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifestModulePath = path.resolve(
  __dirname,
  '../src/services/wikiItemManifestCatalog.js',
);
const iconModulePath = path.resolve(
  __dirname,
  '../src/services/itemIconService.js',
);

function freshManifestService() {
  delete require.cache[manifestModulePath];
  delete require.cache[iconModulePath];
  return require(manifestModulePath);
}

function withEnv(overrides, fn) {
  const keys = [
    'SCUM_ITEM_MANIFEST_PATH',
    'SCUM_ITEMS_BASE_URL',
    'SCUM_ITEMS_INDEX_PATH',
    'SCUM_ITEMS_DIR_PATH',
  ];
  const backup = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const [key, value] of Object.entries(overrides)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(backup)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    delete require.cache[manifestModulePath];
    delete require.cache[iconModulePath];
  }
}

test('manifest catalog maps item name/icon/category and spawn command template', () =>
  withEnv({}, () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-manifest-'));
    const manifestPath = path.join(tempRoot, 'manifest.json');
    const manifest = {
      source_page: 'https://example.test/scum',
      spawn_command_format: '#SpawnItem <Item_ID>',
      categories: [
        { category: 'weapons', title: 'Weapons', url: 'https://example.test/weapons' },
        { category: 'food', title: 'Food', url: 'https://example.test/food' },
      ],
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    fs.writeFileSync(path.join(tempRoot, 'Weapon_AK47.webp'), 'x', 'utf8');
    fs.writeFileSync(path.join(tempRoot, 'Apple.webp'), 'x', 'utf8');

    process.env.SCUM_ITEM_MANIFEST_PATH = manifestPath;
    process.env.SCUM_ITEMS_INDEX_PATH = path.join(tempRoot, 'missing-index.json');
    process.env.SCUM_ITEMS_DIR_PATH = tempRoot;
    process.env.SCUM_ITEMS_BASE_URL = 'https://icons.example/scum-items';

    const service = freshManifestService();
    const weaponMeta = service.resolveManifestItemMeta('Weapon_AK47');
    const foodMeta = service.resolveManifestItemMeta('Apple');

    assert.ok(weaponMeta);
    assert.ok(foodMeta);
    assert.equal(weaponMeta.category, 'weapons');
    assert.equal(foodMeta.category, 'food');
    assert.equal(
      weaponMeta.commandTemplate,
      '#SpawnItem {steamId} {gameItemId} {quantity}',
    );
    assert.equal(
      weaponMeta.iconUrl,
      'https://icons.example/scum-items/Weapon_AK47.webp',
    );

    const listWeapons = service.listManifestItemCatalog({
      category: 'weapons',
      query: 'ak47',
      limit: 20,
    });
    assert.equal(listWeapons.length, 1);
    assert.equal(listWeapons[0].gameItemId, 'Weapon_AK47');

    const meta = service.getManifestItemCatalogMeta();
    assert.equal(meta.sourcePath, manifestPath);
    assert.equal(meta.sourcePage, 'https://example.test/scum');
    assert.equal(meta.commandTemplate, '#SpawnItem {steamId} {gameItemId} {quantity}');
    assert.ok(meta.total >= 2);
    const categoryMap = new Map(meta.categories.map((row) => [row.key, row.count]));
    assert.equal(categoryMap.get('weapons'), 1);
    assert.equal(categoryMap.get('food'), 1);
  }));

