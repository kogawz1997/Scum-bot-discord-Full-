'use strict';

/**
 * Admin user persistence/bootstrap helpers. Keep the database and password
 * handling out of the main admin server entrypoint so HTTP wiring stays focused
 * on request flow and gating.
 */

function createAdminUserStoreRuntime(options = {}) {
  const {
    prisma,
    crypto,
    secureEqual,
    normalizeRole,
    resolveDatabaseRuntime,
    adminWebUser,
    adminWebUserRole,
    adminWebUsersJson,
    logger = console,
  } = options;

  let resolvedToken = null;
  let resolvedLoginPassword = null;
  let adminUsersReadyPromise = null;

  function getAdminToken() {
    if (resolvedToken) return resolvedToken;
    const fromEnv = String(process.env.ADMIN_WEB_TOKEN || '').trim();
    if (fromEnv) {
      resolvedToken = fromEnv;
      return resolvedToken;
    }
    resolvedToken = crypto.randomBytes(18).toString('hex');
    logger.warn('[admin-web] ยังไม่ได้ตั้งค่า ADMIN_WEB_TOKEN จึงสร้างโทเค็นเซสชันชั่วคราว:');
    logger.warn(`[admin-web] ${resolvedToken}`);
    return resolvedToken;
  }

  function getAdminLoginPassword() {
    if (resolvedLoginPassword) return resolvedLoginPassword;

    const fromEnv = String(process.env.ADMIN_WEB_PASSWORD || '').trim();
    if (fromEnv) {
      resolvedLoginPassword = fromEnv;
      return resolvedLoginPassword;
    }

    resolvedLoginPassword = getAdminToken();
    return resolvedLoginPassword;
  }

  function parseAdminUsersFromEnv() {
    let users = [];
    if (adminWebUsersJson) {
      try {
        const parsed = JSON.parse(adminWebUsersJson);
        if (Array.isArray(parsed)) {
          users = parsed
            .map((row) => {
              if (!row || typeof row !== 'object') return null;
              const username = String(row.username || '').trim();
              const password = String(row.password || '').trim();
              if (!username || !password) return null;
              return {
                username,
                password,
                role: normalizeRole(row.role || 'mod'),
                tenantId: String(row.tenantId || '').trim() || null,
              };
            })
            .filter(Boolean);
        }
      } catch (error) {
        logger.warn('[admin-web] ADMIN_WEB_USERS_JSON parse failed:', error.message);
      }
    }

    if (users.length === 0) {
      users.push({
        username: adminWebUser,
        password: getAdminLoginPassword(),
        role: adminWebUserRole,
        tenantId: null,
      });
    }

    return users;
  }

  function getAdminUsersDatabaseEngine() {
    const runtime = resolveDatabaseRuntime();
    return runtime.engine === 'unsupported' ? 'sqlite' : runtime.engine;
  }

  function isIgnorableAdminUsersSchemaError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('duplicate column')
      || message.includes('already exists')
      || message.includes('(typname, typnamespace)=(admin_web_users');
  }

  function createAdminPasswordHash(password) {
    const pass = String(password || '');
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(pass, salt, 64);
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
  }

  function verifyAdminPassword(password, passwordHash) {
    const pass = String(password || '');
    const stored = String(passwordHash || '').trim();
    if (!stored) return false;

    if (!stored.startsWith('scrypt$')) {
      return secureEqual(pass, stored);
    }

    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const saltHex = parts[1];
    const hashHex = parts[2];
    if (!saltHex || !hashHex) return false;

    let salt;
    let expected;
    try {
      salt = Buffer.from(saltHex, 'hex');
      expected = Buffer.from(hashHex, 'hex');
    } catch {
      return false;
    }
    if (!salt.length || !expected.length) return false;

    const actual = crypto.scryptSync(pass, salt, expected.length);
    return secureEqual(actual.toString('hex'), expected.toString('hex'));
  }

  async function ensureAdminUsersTable() {
    const engine = getAdminUsersDatabaseEngine();
    try {
      if (engine === 'postgresql') {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS admin_web_users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'mod',
            tenant_id TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS admin_web_users (
            username TEXT PRIMARY KEY COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'mod',
            tenant_id TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
    } catch (error) {
      if (!isIgnorableAdminUsersSchemaError(error)) {
        throw error;
      }
    }
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE admin_web_users
        ADD COLUMN tenant_id TEXT;
      `);
    } catch (error) {
      if (!isIgnorableAdminUsersSchemaError(error)) {
        throw error;
      }
    }
  }

  async function seedAdminUsersFromEnv() {
    const users = parseAdminUsersFromEnv();
    for (const user of users) {
      await prisma.$executeRaw`
        INSERT INTO admin_web_users (
          username,
          password_hash,
          role,
          tenant_id,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ${String(user.username || '').trim()},
          ${createAdminPasswordHash(user.password)},
          ${normalizeRole(user.role)},
          ${String(user.tenantId || '').trim() || null},
          ${true},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (username) DO NOTHING
      `;
    }
  }

  async function listAdminUsersFromDb(limit = 100, options = {}) {
    const { activeOnly = true } = options;
    const normalizedLimit = Math.max(1, Math.trunc(Number(limit || 100)));
    const rows = activeOnly
      ? await prisma.$queryRaw`
        SELECT
          username,
          role,
          tenant_id AS "tenantId",
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM admin_web_users
        WHERE is_active = ${true}
        ORDER BY username ASC
        LIMIT ${normalizedLimit}
      `
      : await prisma.$queryRaw`
        SELECT
          username,
          role,
          tenant_id AS "tenantId",
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM admin_web_users
        ORDER BY username ASC
        LIMIT ${normalizedLimit}
      `;

    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      username: String(row?.username || '').trim(),
      role: normalizeRole(row?.role || 'mod'),
      tenantId: String(row?.tenantId || '').trim() || null,
      isActive: row?.isActive === true || Number(row?.isActive || 0) === 1,
      createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    }));
  }

  async function getAdminUserByUsername(username) {
    const name = String(username || '').trim();
    if (!name) return null;
    const rows = await prisma.$queryRaw`
      SELECT
        username,
        password_hash AS "passwordHash",
        role,
        tenant_id AS "tenantId",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM admin_web_users
      WHERE username = ${name}
      LIMIT 1
    `;
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!row) return null;
    return {
      username: String(row.username || '').trim(),
      passwordHash: String(row.passwordHash || '').trim(),
      role: normalizeRole(row.role || 'mod'),
      tenantId: String(row.tenantId || '').trim() || null,
      isActive: row.isActive === true || Number(row.isActive || 0) === 1,
      createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  async function countActiveOwnerUsers() {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM admin_web_users
      WHERE is_active = ${true}
        AND lower(role) = 'owner'
    `;
    const total = Array.isArray(rows) && rows.length > 0
      ? Number(rows[0]?.total || 0)
      : 0;
    return Number.isFinite(total) ? total : 0;
  }

  function normalizeAdminUsername(value) {
    const username = String(value || '').trim();
    if (!username) return '';
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) return '';
    return username;
  }

  async function upsertAdminUserInDb(input = {}) {
    const username = normalizeAdminUsername(input.username);
    const role = normalizeRole(input.role || 'mod');
    const isActive = input.isActive !== false;
    const password = String(input.password || '').trim();
    const tenantId = String(input.tenantId || '').trim() || null;
    if (!username) {
      throw new Error('Invalid username');
    }

    await ensureAdminUsersReady();
    const existing = await getAdminUserByUsername(username);
    if (!existing && !password) {
      throw new Error('Password is required for a new admin user');
    }

    const willRemainOwner = role === 'owner' && isActive;
    if (
      existing
      && existing.role === 'owner'
      && existing.isActive
      && !willRemainOwner
    ) {
      const ownerCount = await countActiveOwnerUsers();
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last active owner');
      }
    }

    if (!existing) {
      await prisma.$executeRaw`
        INSERT INTO admin_web_users (
          username,
          password_hash,
          role,
          tenant_id,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ${username},
          ${createAdminPasswordHash(password)},
          ${role},
          ${tenantId},
          ${isActive},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
    } else if (password) {
      await prisma.$executeRaw`
        UPDATE admin_web_users
        SET password_hash = ${createAdminPasswordHash(password)},
            role = ${role},
            tenant_id = ${tenantId},
            is_active = ${isActive},
            updated_at = CURRENT_TIMESTAMP
        WHERE username = ${username}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE admin_web_users
        SET role = ${role},
            tenant_id = ${tenantId},
            is_active = ${isActive},
            updated_at = CURRENT_TIMESTAMP
        WHERE username = ${username}
      `;
    }

    return getAdminUserByUsername(username);
  }

  async function ensureAdminUsersReady() {
    if (adminUsersReadyPromise) return adminUsersReadyPromise;

    adminUsersReadyPromise = (async () => {
      await ensureAdminUsersTable();
      await seedAdminUsersFromEnv();
      const users = await listAdminUsersFromDb(1);
      if (!users.length) {
        throw new Error('No active admin users in database');
      }
    })().catch((error) => {
      adminUsersReadyPromise = null;
      throw error;
    });

    return adminUsersReadyPromise;
  }

  async function getUserByCredentials(username, password) {
    const name = String(username || '').trim();
    const pass = String(password || '');
    if (!name || !pass) return null;

    await ensureAdminUsersReady();
    const rows = await prisma.$queryRaw`
      SELECT
        username,
        password_hash AS "passwordHash",
        role,
        tenant_id AS "tenantId",
        is_active AS "isActive"
      FROM admin_web_users
      WHERE username = ${name}
      LIMIT 1
    `;
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!row || !(row.isActive === true || Number(row.isActive || 0) === 1)) return null;
    if (!verifyAdminPassword(pass, row.passwordHash)) return null;

    return {
      username: String(row.username || '').trim(),
      role: normalizeRole(row.role || 'mod'),
      tenantId: String(row.tenantId || '').trim() || null,
      authMethod: 'password-db',
    };
  }

  return {
    ensureAdminUsersReady,
    getAdminLoginPassword,
    getAdminToken,
    getUserByCredentials,
    listAdminUsersFromDb,
    upsertAdminUserInDb,
  };
}

module.exports = {
  createAdminUserStoreRuntime,
};
