const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DATA_DIR = process.env.BOT_DATA_DIR
  ? path.resolve(process.env.BOT_DATA_DIR)
  : path.resolve(__dirname, '..', '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(filename) {
  ensureDataDir();
  return path.join(DATA_DIR, filename);
}

function atomicWriteJson(filePath, obj) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function resolveDbPath() {
  const raw = (process.env.DATABASE_URL || 'file:./prisma/dev.db').trim();
  if (!raw.startsWith('file:')) {
    throw new Error('Only sqlite file DATABASE_URL is supported in this project');
  }

  const filePath = raw.slice('file:'.length).replace(/^"|"$/g, '');
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const dir = path.dirname(absolute);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return absolute;
}

const DB_PATH = resolveDbPath();

function runSql(sql) {
  return execFileSync('sqlite3', [DB_PATH], {
    input: sql,
    encoding: 'utf8',
  });
}

let useDb = true;

function initKvStore() {
  try {
    runSql(`
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      useDb = false;
      console.warn(
        '[persist] sqlite3 binary not found; fallback to JSON file persistence.',
      );
      return;
    }
    throw err;
  }
}

initKvStore();

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function upsertJsonDb(key, obj) {
  const json = JSON.stringify(obj);
  runSql(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES ('${escapeSqlString(key)}', '${escapeSqlString(json)}', datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now');
  `);
}

function loadFromDb(filename) {
  const result = runSql(`
    SELECT value FROM kv_store
    WHERE key = '${escapeSqlString(filename)}'
    LIMIT 1;
  `).trim();

  if (!result) return null;
  return JSON.parse(result);
}

function loadFromFile(filename) {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw || !raw.trim()) return null;
  return JSON.parse(raw);
}

function saveToFile(filename, obj) {
  const filePath = getFilePath(filename);
  atomicWriteJson(filePath, obj);
}

function loadJson(filename, fallback) {
  try {
    if (useDb) {
      const fromDb = loadFromDb(filename);
      if (fromDb !== null) return fromDb;

      // one-time migration fallback: read legacy JSON file and import to DB
      const legacy = loadFromFile(filename);
      if (legacy == null) return fallback;
      upsertJsonDb(filename, legacy);
      return legacy;
    }

    const fromFile = loadFromFile(filename);
    return fromFile == null ? fallback : fromFile;
  } catch (err) {
    console.error(`Failed to load ${filename}`, err);
    return fallback;
  }
}

const timers = new Map(); // filename -> timeout

function saveJsonDebounced(filename, producer, waitMs = 300) {
  return function scheduleSave() {
    const prev = timers.get(filename);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      try {
        const payload = producer();
        if (useDb) {
          upsertJsonDb(filename, payload);
        } else {
          saveToFile(filename, payload);
        }
      } catch (err) {
        console.error(`Failed to save ${filename}`, err);
      }
    }, waitMs);
    timers.set(filename, t);
  };
}

module.exports = {
  DATA_DIR,
  DB_PATH,
  loadJson,
  saveJsonDebounced,
  getFilePath,
};
