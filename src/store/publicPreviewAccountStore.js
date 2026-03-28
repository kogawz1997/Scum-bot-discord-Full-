'use strict';

/**
 * Preview account registry for the public SaaS signup flow.
 * Prefer database persistence when the platform preview-account table exists,
 * but keep a file-backed fallback while environments are being upgraded.
 */

const crypto = require('node:crypto');
const { prisma } = require('../prisma');
const {
  atomicWriteJson,
  getFilePath,
  loadJson,
} = require('./_persist');

const FILE_PATH = getFilePath('public-preview-accounts.json');

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = 'preview') {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function trimText(value, maxLen = 240) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

function normalizeEmail(value) {
  return trimText(value, 200).toLowerCase();
}

function toIsoText(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const text = trimText(value, 80);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function createInitialState() {
  return {
    accounts: [],
    updatedAt: nowIso(),
  };
}

let state = null;

function loadState() {
  if (state) return state;
  const loaded = loadJson('public-preview-accounts.json', null);
  state = loaded && typeof loaded === 'object'
    ? {
        accounts: Array.isArray(loaded.accounts) ? loaded.accounts : [],
        updatedAt: trimText(loaded.updatedAt, 80) || nowIso(),
      }
    : createInitialState();
  return state;
}

function saveState() {
  const current = loadState();
  current.updatedAt = nowIso();
  atomicWriteJson(FILE_PATH, current);
}

function normalizeLinkedIdentities(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      discordLinked: value.discordLinked === true,
      discordVerified: value.discordVerified === true,
      steamLinked: value.steamLinked === true,
      playerMatched: value.playerMatched === true,
      fullyVerified: value.fullyVerified === true,
    };
  }
  return {
    discordLinked: false,
    discordVerified: false,
    steamLinked: false,
    playerMatched: false,
    fullyVerified: false,
  };
}

function parseLinkedIdentities(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeLinkedIdentities(value);
  }
  const text = trimText(value, 2000);
  if (!text) return normalizeLinkedIdentities();
  try {
    return normalizeLinkedIdentities(JSON.parse(text));
  } catch {
    return normalizeLinkedIdentities();
  }
}

function stringifyLinkedIdentities(value) {
  return JSON.stringify(normalizeLinkedIdentities(value));
}

function normalizeAccountRecord(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: trimText(row.id, 120) || null,
    email: normalizeEmail(row.email),
    passwordHash: trimText(row.passwordHash, 512),
    displayName: trimText(row.displayName, 180) || null,
    communityName: trimText(row.communityName, 180) || null,
    locale: trimText(row.locale, 12) || 'en',
    packageId: trimText(row.packageId, 120) || null,
    accountState: trimText(row.accountState, 80) || 'preview',
    verificationState: trimText(row.verificationState, 80) || 'registered',
    tenantId: trimText(row.tenantId, 120) || null,
    subscriptionId: trimText(row.subscriptionId, 120) || null,
    linkedIdentities: parseLinkedIdentities(row.linkedIdentities || row.linkedIdentitiesJson),
    createdAt: toIsoText(row.createdAt),
    updatedAt: toIsoText(row.updatedAt),
    lastLoginAt: toIsoText(row.lastLoginAt),
  };
}

function sanitizeAccount(row) {
  const normalized = normalizeAccountRecord(row);
  if (!normalized) return null;
  return {
    id: normalized.id,
    email: normalized.email,
    displayName: normalized.displayName,
    communityName: normalized.communityName,
    locale: normalized.locale,
    packageId: normalized.packageId,
    accountState: normalized.accountState,
    verificationState: normalized.verificationState,
    tenantId: normalized.tenantId,
    subscriptionId: normalized.subscriptionId,
    linkedIdentities: normalized.linkedIdentities,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    lastLoginAt: normalized.lastLoginAt,
  };
}

function getPreviewAccountDelegate() {
  if (!prisma || typeof prisma !== 'object') return null;
  const delegate = prisma.platformPreviewAccount;
  if (!delegate || typeof delegate.findUnique !== 'function') return null;
  return delegate;
}

function getPersistenceMode() {
  const explicit = trimText(process.env.PUBLIC_PREVIEW_ACCOUNT_STORE_MODE, 32).toLowerCase();
  if (explicit === 'file') return 'file';
  if (explicit === 'db') return 'db';
  return 'auto';
}

function shouldFallbackToFile(error) {
  const code = trimText(error?.code, 40).toUpperCase();
  if (['P2021', 'P2022', 'P1017'].includes(code)) return true;
  const message = String(error?.message || '').toLowerCase();
  return message.includes('no such table')
    || message.includes('does not exist')
    || message.includes('unknown table')
    || message.includes('error validating datasource')
    || message.includes('url must start with the protocol')
    || message.includes('platformpreviewaccount');
}

async function runWithPreferredPersistence(dbWork, fileWork) {
  const mode = getPersistenceMode();
  const delegate = getPreviewAccountDelegate();
  if (mode === 'file' || !delegate) {
    return fileWork();
  }
  try {
    return await dbWork(delegate);
  } catch (error) {
    if (mode === 'db' || !shouldFallbackToFile(error)) {
      throw error;
    }
    return fileWork();
  }
}

function findPreviewAccountByIdFile(accountId) {
  const id = trimText(accountId, 120);
  if (!id) return null;
  const row = loadState().accounts.find((entry) => trimText(entry.id, 120) === id);
  return normalizeAccountRecord(row);
}

function findPreviewAccountByEmailFile(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const row = loadState().accounts.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
  return normalizeAccountRecord(row);
}

function createPreviewAccountFile(input = {}) {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    throw new Error('email-required');
  }
  if (findPreviewAccountByEmailFile(normalizedEmail)) {
    throw new Error('email-conflict');
  }

  const timestamp = nowIso();
  const record = normalizeAccountRecord({
    id: trimText(input.id, 120) || createId('preview-account'),
    email: normalizedEmail,
    passwordHash: trimText(input.passwordHash, 512),
    displayName: trimText(input.displayName, 180) || null,
    communityName: trimText(input.communityName, 180) || null,
    locale: trimText(input.locale, 12) || 'en',
    packageId: trimText(input.packageId, 120) || 'BOT_LOG_DELIVERY',
    accountState: trimText(input.accountState, 80) || 'preview',
    verificationState: trimText(input.verificationState, 80) || 'registered',
    tenantId: trimText(input.tenantId, 120) || null,
    subscriptionId: trimText(input.subscriptionId, 120) || null,
    linkedIdentities: normalizeLinkedIdentities(input.linkedIdentities),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: null,
  });
  loadState().accounts.unshift(record);
  saveState();
  return sanitizeAccount(record);
}

function updatePreviewAccountFile(accountId, patch = {}) {
  const id = trimText(accountId, 120);
  if (!id) return null;
  const current = loadState();
  const index = current.accounts.findIndex((entry) => trimText(entry.id, 120) === id);
  if (index < 0) return null;
  const existing = normalizeAccountRecord(current.accounts[index]);
  const nextEmail = patch.email == null ? existing.email : normalizeEmail(patch.email);
  if (!nextEmail) {
    throw new Error('email-required');
  }
  const duplicate = current.accounts.find(
    (entry, entryIndex) => entryIndex !== index && normalizeEmail(entry.email) === nextEmail,
  );
  if (duplicate) {
    throw new Error('email-conflict');
  }
  const next = normalizeAccountRecord({
    ...existing,
    ...patch,
    email: nextEmail,
    displayName:
      patch.displayName == null ? existing.displayName : trimText(patch.displayName, 180) || null,
    communityName:
      patch.communityName == null ? existing.communityName : trimText(patch.communityName, 180) || null,
    locale: patch.locale == null ? existing.locale : trimText(patch.locale, 12) || 'en',
    packageId:
      patch.packageId == null ? existing.packageId : trimText(patch.packageId, 120) || existing.packageId,
    accountState:
      patch.accountState == null ? existing.accountState : trimText(patch.accountState, 80) || existing.accountState,
    verificationState:
      patch.verificationState == null
        ? existing.verificationState
        : trimText(patch.verificationState, 80) || existing.verificationState,
    tenantId:
      patch.tenantId == null ? existing.tenantId : trimText(patch.tenantId, 120) || null,
    subscriptionId:
      patch.subscriptionId == null ? existing.subscriptionId : trimText(patch.subscriptionId, 120) || null,
    passwordHash:
      patch.passwordHash == null ? existing.passwordHash : trimText(patch.passwordHash, 512),
    linkedIdentities:
      patch.linkedIdentities == null
        ? existing.linkedIdentities
        : normalizeLinkedIdentities({
          ...existing.linkedIdentities,
          ...patch.linkedIdentities,
        }),
    updatedAt: nowIso(),
  });
  current.accounts[index] = next;
  saveState();
  return sanitizeAccount(next);
}

async function listPreviewAccounts() {
  return runWithPreferredPersistence(
    async (delegate) => {
      const rows = await delegate.findMany({
        orderBy: { updatedAt: 'desc' },
      });
      return rows.map(sanitizeAccount).filter(Boolean);
    },
    () => Promise.resolve(loadState().accounts.map(sanitizeAccount).filter(Boolean)),
  );
}

async function getPreviewAccountById(accountId) {
  const id = trimText(accountId, 120);
  if (!id) return null;
  return runWithPreferredPersistence(
    async (delegate) => {
      const row = await delegate.findUnique({ where: { id } });
      return normalizeAccountRecord(row);
    },
    () => Promise.resolve(findPreviewAccountByIdFile(id)),
  );
}

async function getPreviewAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return runWithPreferredPersistence(
    async (delegate) => {
      const row = await delegate.findUnique({ where: { email: normalizedEmail } });
      return normalizeAccountRecord(row);
    },
    () => Promise.resolve(findPreviewAccountByEmailFile(normalizedEmail)),
  );
}

async function createPreviewAccount(input = {}) {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    throw new Error('email-required');
  }

  return runWithPreferredPersistence(
    async (delegate) => {
      try {
        const row = await delegate.create({
          data: {
            id: trimText(input.id, 120) || createId('preview-account'),
            email: normalizedEmail,
            passwordHash: trimText(input.passwordHash, 512),
            displayName: trimText(input.displayName, 180) || null,
            communityName: trimText(input.communityName, 180) || null,
            locale: trimText(input.locale, 12) || 'en',
            packageId: trimText(input.packageId, 120) || 'BOT_LOG_DELIVERY',
            accountState: trimText(input.accountState, 80) || 'preview',
            verificationState: trimText(input.verificationState, 80) || 'registered',
            tenantId: trimText(input.tenantId, 120) || null,
            subscriptionId: trimText(input.subscriptionId, 120) || null,
            linkedIdentitiesJson: stringifyLinkedIdentities(input.linkedIdentities),
            lastLoginAt: null,
          },
        });
        return sanitizeAccount(row);
      } catch (error) {
        if (trimText(error?.code, 40).toUpperCase() === 'P2002') {
          throw new Error('email-conflict');
        }
        throw error;
      }
    },
    () => Promise.resolve(createPreviewAccountFile(input)),
  );
}

async function updatePreviewAccount(accountId, patch = {}) {
  const id = trimText(accountId, 120);
  if (!id) return null;
  return runWithPreferredPersistence(
    async (delegate) => {
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) return null;
      const nextEmail = patch.email == null ? existing.email : normalizeEmail(patch.email);
      if (!nextEmail) {
        throw new Error('email-required');
      }
      try {
        const linkedIdentities = patch.linkedIdentities == null
          ? parseLinkedIdentities(existing.linkedIdentitiesJson)
          : normalizeLinkedIdentities({
            ...parseLinkedIdentities(existing.linkedIdentitiesJson),
            ...patch.linkedIdentities,
          });
        const row = await delegate.update({
          where: { id },
          data: {
            email: nextEmail,
            displayName:
              patch.displayName == null ? existing.displayName : trimText(patch.displayName, 180) || null,
            communityName:
              patch.communityName == null ? existing.communityName : trimText(patch.communityName, 180) || null,
            locale: patch.locale == null ? existing.locale : trimText(patch.locale, 12) || 'en',
            packageId:
              patch.packageId == null ? existing.packageId : trimText(patch.packageId, 120) || existing.packageId,
            accountState:
              patch.accountState == null ? existing.accountState : trimText(patch.accountState, 80) || existing.accountState,
            verificationState:
              patch.verificationState == null
                ? existing.verificationState
                : trimText(patch.verificationState, 80) || existing.verificationState,
            tenantId:
              patch.tenantId == null ? existing.tenantId : trimText(patch.tenantId, 120) || null,
            subscriptionId:
              patch.subscriptionId == null ? existing.subscriptionId : trimText(patch.subscriptionId, 120) || null,
            passwordHash:
              patch.passwordHash == null ? existing.passwordHash : trimText(patch.passwordHash, 512),
            linkedIdentitiesJson: stringifyLinkedIdentities(linkedIdentities),
            lastLoginAt:
              patch.lastLoginAt == null ? existing.lastLoginAt : trimText(patch.lastLoginAt, 80) || null,
          },
        });
        return sanitizeAccount(row);
      } catch (error) {
        const code = trimText(error?.code, 40).toUpperCase();
        if (code === 'P2002') {
          throw new Error('email-conflict');
        }
        if (code === 'P2025') {
          return null;
        }
        throw error;
      }
    },
    () => Promise.resolve(updatePreviewAccountFile(id, patch)),
  );
}

module.exports = {
  createPreviewAccount,
  getPreviewAccountByEmail,
  getPreviewAccountById,
  listPreviewAccounts,
  sanitizeAccount,
  updatePreviewAccount,
};
