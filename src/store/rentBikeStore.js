const { prisma } = require('../prisma');

let ensurePromise = null;

async function ensureTables() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS daily_rent (
        user_key TEXT NOT NULL,
        date TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_key, date)
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rental_vehicles (
        order_id TEXT NOT NULL PRIMARY KEY,
        user_key TEXT NOT NULL,
        guild_id TEXT,
        vehicle_instance_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        destroyed_at DATETIME,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `);
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE rental_vehicles ADD COLUMN guild_id TEXT;',
      );
    } catch {
      // ignore duplicate-column errors
    }
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS idx_rental_vehicles_status ON rental_vehicles(status);',
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS idx_rental_vehicles_user_key ON rental_vehicles(user_key);',
    );
  })();

  try {
    await ensurePromise;
  } catch (error) {
    ensurePromise = null;
    throw error;
  }
}

function normalizeDailyRent(row) {
  if (!row) return null;
  return {
    userKey: String(row.user_key || ''),
    date: String(row.date || ''),
    used: Number(row.used || 0) === 1,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function normalizeRental(row) {
  if (!row) return null;
  return {
    orderId: String(row.order_id || ''),
    userKey: String(row.user_key || ''),
    guildId: row.guild_id ? String(row.guild_id) : null,
    vehicleInstanceId: row.vehicle_instance_id ? String(row.vehicle_instance_id) : null,
    status: String(row.status || 'pending'),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    destroyedAt: row.destroyed_at ? new Date(row.destroyed_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    attemptCount: Number(row.attempt_count || 0),
    lastError: row.last_error ? String(row.last_error) : null,
  };
}

async function getDailyRent(userKey, date) {
  await ensureTables();
  const rows = await prisma.$queryRaw`
    SELECT user_key, date, used, updated_at
    FROM daily_rent
    WHERE user_key = ${String(userKey)} AND date = ${String(date)}
    LIMIT 1
  `;
  return normalizeDailyRent(rows[0] || null);
}

async function markDailyRentUsed(userKey, date) {
  await ensureTables();
  await prisma.$executeRaw`
    INSERT INTO daily_rent (user_key, date, used, updated_at)
    VALUES (${String(userKey)}, ${String(date)}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_key, date) DO UPDATE SET
      used = 1,
      updated_at = CURRENT_TIMESTAMP
  `;
  return getDailyRent(userKey, date);
}

async function createRentalOrder({ orderId, userKey, guildId = null }) {
  await ensureTables();
  await prisma.$executeRaw`
    INSERT INTO rental_vehicles (
      order_id,
      user_key,
      guild_id,
      vehicle_instance_id,
      status,
      created_at,
      destroyed_at,
      updated_at,
      attempt_count,
      last_error
    )
    VALUES (
      ${String(orderId)},
      ${String(userKey)},
      ${guildId == null ? null : String(guildId)},
      NULL,
      'pending',
      CURRENT_TIMESTAMP,
      NULL,
      CURRENT_TIMESTAMP,
      0,
      NULL
    )
  `;
  return getRentalOrder(orderId);
}

async function getRentalOrder(orderId) {
  await ensureTables();
  const rows = await prisma.$queryRaw`
    SELECT
      order_id,
      user_key,
      guild_id,
      vehicle_instance_id,
      status,
      created_at,
      destroyed_at,
      updated_at,
      attempt_count,
      last_error
    FROM rental_vehicles
    WHERE order_id = ${String(orderId)}
    LIMIT 1
  `;
  return normalizeRental(rows[0] || null);
}

async function setRentalOrderStatus(orderId, status, extra = {}) {
  await ensureTables();
  const current = await getRentalOrder(orderId);
  if (!current) return null;
  await prisma.$executeRaw`
    UPDATE rental_vehicles
    SET
      status = ${String(status)},
      vehicle_instance_id = ${
        extra.vehicleInstanceId == null
          ? current.vehicleInstanceId
          : String(extra.vehicleInstanceId)
      },
      destroyed_at = ${
        extra.destroyedAt == null
          ? current.destroyedAt
          : new Date(extra.destroyedAt)
      },
      attempt_count = ${
        extra.attemptCount == null
          ? current.attemptCount
          : Number(extra.attemptCount)
      },
      last_error = ${
        extra.lastError === undefined
          ? current.lastError
          : extra.lastError == null
          ? null
          : String(extra.lastError)
      },
      updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ${String(orderId)}
  `;
  return getRentalOrder(orderId);
}

async function updateRentalAttempt(orderId, attemptCount, lastError = null) {
  await ensureTables();
  await prisma.$executeRaw`
    UPDATE rental_vehicles
    SET
      attempt_count = ${Number(attemptCount || 0)},
      last_error = ${lastError == null ? null : String(lastError)},
      updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ${String(orderId)}
  `;
  return getRentalOrder(orderId);
}

async function listRentalVehiclesByStatuses(statuses, limit = 5000) {
  await ensureTables();
  const values = Array.isArray(statuses)
    ? statuses
        .map((s) => String(s || '').trim())
        .filter((s) => s.length > 0)
    : [];
  if (values.length === 0) return [];

  const placeholders = values.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
  const sql = `
    SELECT
      order_id,
      user_key,
      guild_id,
      vehicle_instance_id,
      status,
      created_at,
      destroyed_at,
      updated_at,
      attempt_count,
      last_error
    FROM rental_vehicles
    WHERE status IN (${placeholders})
    ORDER BY created_at ASC
    LIMIT ${Math.max(1, Number(limit || 5000))}
  `;
  const rows = await prisma.$queryRawUnsafe(sql);
  return rows.map(normalizeRental);
}

async function listRentalVehicles(limit = 500) {
  await ensureTables();
  const rows = await prisma.$queryRaw`
    SELECT
      order_id,
      user_key,
      guild_id,
      vehicle_instance_id,
      status,
      created_at,
      destroyed_at,
      updated_at,
      attempt_count,
      last_error
    FROM rental_vehicles
    ORDER BY created_at DESC
    LIMIT ${Math.max(1, Number(limit || 500))}
  `;
  return rows.map(normalizeRental);
}

async function listDailyRents(limit = 1000) {
  await ensureTables();
  const rows = await prisma.$queryRaw`
    SELECT user_key, date, used, updated_at
    FROM daily_rent
    ORDER BY date DESC, updated_at DESC
    LIMIT ${Math.max(1, Number(limit || 1000))}
  `;
  return rows.map(normalizeDailyRent);
}

async function getLatestRentalByUser(userKey) {
  await ensureTables();
  const rows = await prisma.$queryRaw`
    SELECT
      order_id,
      user_key,
      guild_id,
      vehicle_instance_id,
      status,
      created_at,
      destroyed_at,
      updated_at,
      attempt_count,
      last_error
    FROM rental_vehicles
    WHERE user_key = ${String(userKey)}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return normalizeRental(rows[0] || null);
}

module.exports = {
  ensureRentBikeTables: ensureTables,
  getDailyRent,
  markDailyRentUsed,
  createRentalOrder,
  getRentalOrder,
  setRentalOrderStatus,
  updateRentalAttempt,
  listRentalVehiclesByStatuses,
  listRentalVehicles,
  listDailyRents,
  getLatestRentalByUser,
};
