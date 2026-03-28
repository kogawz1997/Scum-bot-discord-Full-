'use strict';

const { prisma } = require('../prisma');
const {
  ensurePlatformIdentityTables,
  ensurePlatformUserIdentity,
} = require('./platformIdentityService');

function trimText(value, maxLen = 240) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

function normalizeEmail(value) {
  return trimText(value, 200).toLowerCase();
}

function parseJsonObject(value) {
  if (value == null || String(value).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeRole(value) {
  const normalized = trimText(value, 80).toLowerCase();
  return ['owner', 'admin', 'manager', 'support', 'moderator', 'editor', 'viewer', 'member'].includes(normalized)
    ? normalized
    : 'member';
}

function normalizeStatus(value) {
  const normalized = trimText(value, 40).toLowerCase();
  return ['active', 'invited', 'revoked', 'disabled'].includes(normalized) ? normalized : 'active';
}

function normalizeStaffRow(row) {
  if (!row) return null;
  return {
    membershipId: trimText(row.membershipId || row.id, 160) || null,
    userId: trimText(row.userId, 160) || null,
    tenantId: trimText(row.tenantId, 160) || null,
    membershipType: trimText(row.membershipType, 80) || 'tenant',
    role: trimText(row.role, 80) || 'member',
    status: trimText(row.status, 40) || 'active',
    isPrimary: row.isPrimary === true || Number(row.isPrimary) === 1,
    invitedAt: toIso(row.invitedAt),
    acceptedAt: toIso(row.acceptedAt),
    revokedAt: toIso(row.revokedAt),
    metadata: parseJsonObject(row.metadataJson),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    user: {
      id: trimText(row.userId, 160) || null,
      email: normalizeEmail(row.primaryEmail) || null,
      displayName: trimText(row.displayName, 200) || null,
      locale: trimText(row.locale, 16) || 'en',
      status: trimText(row.userStatus, 40) || 'active',
    },
  };
}

async function findMembershipRecord(db, membershipId, tenantId, userId = null) {
  const normalizedMembershipId = trimText(membershipId, 160);
  const normalizedTenantId = trimText(tenantId, 160);
  const normalizedUserId = trimText(userId, 160);
  if (!normalizedTenantId) return null;
  const rows = normalizedMembershipId
    ? await db.$queryRaw`
        SELECT
          m.id AS "membershipId",
          m.userId,
          m.tenantId,
          m.membershipType,
          m.role,
          m.status,
          m.isPrimary,
          m.invitedAt,
          m.acceptedAt,
          m.revokedAt,
          m.metadataJson,
          m.createdAt,
          m.updatedAt,
          u.primaryEmail,
          u.displayName,
          u.locale,
          u.status AS "userStatus"
        FROM platform_memberships m
        LEFT JOIN platform_users u ON u.id = m.userId
        WHERE m.id = ${normalizedMembershipId}
          AND m.tenantId = ${normalizedTenantId}
        LIMIT 1
      `
    : await db.$queryRaw`
        SELECT
          m.id AS "membershipId",
          m.userId,
          m.tenantId,
          m.membershipType,
          m.role,
          m.status,
          m.isPrimary,
          m.invitedAt,
          m.acceptedAt,
          m.revokedAt,
          m.metadataJson,
          m.createdAt,
          m.updatedAt,
          u.primaryEmail,
          u.displayName,
          u.locale,
          u.status AS "userStatus"
        FROM platform_memberships m
        LEFT JOIN platform_users u ON u.id = m.userId
        WHERE m.userId = ${normalizedUserId}
          AND m.tenantId = ${normalizedTenantId}
          AND m.membershipType = 'tenant'
        ORDER BY m.updatedAt DESC
        LIMIT 1
      `;
  return normalizeStaffRow(Array.isArray(rows) ? rows[0] : null);
}

async function listTenantStaffMemberships(tenantId, options = {}, db = prisma) {
  const normalizedTenantId = trimText(tenantId, 160);
  if (!normalizedTenantId) return [];
  await ensurePlatformIdentityTables(db);
  const limit = Math.max(1, Math.min(500, Number(options.limit || 100) || 100));
  const rows = await db.$queryRaw`
    SELECT
      m.id AS "membershipId",
      m.userId,
      m.tenantId,
      m.membershipType,
      m.role,
      m.status,
      m.isPrimary,
      m.invitedAt,
      m.acceptedAt,
      m.revokedAt,
      m.metadataJson,
      m.createdAt,
      m.updatedAt,
      u.primaryEmail,
      u.displayName,
      u.locale,
      u.status AS "userStatus"
    FROM platform_memberships m
    LEFT JOIN platform_users u ON u.id = m.userId
    WHERE m.tenantId = ${normalizedTenantId}
      AND m.membershipType = 'tenant'
    ORDER BY m.updatedAt DESC
    LIMIT ${limit}
  `;
  return Array.isArray(rows) ? rows.map(normalizeStaffRow).filter(Boolean) : [];
}

async function inviteTenantStaff(input = {}, actor = 'system', db = prisma) {
  const tenantId = trimText(input.tenantId, 160);
  const email = normalizeEmail(input.email);
  if (!tenantId) return { ok: false, reason: 'tenant-required' };
  if (!email) return { ok: false, reason: 'email-required' };
  const role = normalizeRole(input.role);
  const result = await ensurePlatformUserIdentity({
    provider: 'email_staff',
    providerUserId: email,
    email,
    displayName: trimText(input.displayName, 200) || email.split('@')[0],
    locale: trimText(input.locale, 16) || 'en',
    tenantId,
    role,
    membershipType: 'tenant',
    identityMetadata: {
      source: 'tenant-staff-invite',
      actor,
    },
    membershipMetadata: {
      source: 'tenant-staff-invite',
      actor,
      invitedBy: actor,
      inviteState: 'pending',
    },
  }, db);
  if (!result?.ok || !result.membership) {
    return { ok: false, reason: result?.reason || 'tenant-staff-invite-failed' };
  }
  await db.$executeRaw`
    UPDATE platform_memberships
    SET
      role = ${role},
      status = ${'invited'},
      invitedAt = COALESCE(invitedAt, ${new Date().toISOString()}),
      acceptedAt = ${null},
      metadataJson = ${JSON.stringify({
        ...(result.membership?.metadata || {}),
        source: 'tenant-staff-invite',
        actor,
        invitedBy: actor,
        inviteState: 'pending',
      })},
      updatedAt = ${new Date().toISOString()}
    WHERE id = ${result.membership.id}
  `;
  return {
    ok: true,
    staff: await findMembershipRecord(db, result.membership.id, tenantId),
  };
}

async function updateTenantStaffRole(input = {}, actor = 'system', db = prisma) {
  const tenantId = trimText(input.tenantId, 160);
  if (!tenantId) return { ok: false, reason: 'tenant-required' };
  const existing = await findMembershipRecord(db, input.membershipId, tenantId, input.userId);
  if (!existing) return { ok: false, reason: 'tenant-staff-not-found' };
  await db.$executeRaw`
    UPDATE platform_memberships
    SET
      role = ${normalizeRole(input.role)},
      status = ${normalizeStatus(input.status || existing.status)},
      acceptedAt = ${existing.acceptedAt || new Date().toISOString()},
      metadataJson = ${JSON.stringify({
        ...existing.metadata,
        source: 'tenant-staff-role-update',
        actor,
      })},
      updatedAt = ${new Date().toISOString()}
    WHERE id = ${existing.membershipId}
  `;
  return {
    ok: true,
    staff: await findMembershipRecord(db, existing.membershipId, tenantId),
  };
}

async function revokeTenantStaffMembership(input = {}, actor = 'system', db = prisma) {
  const tenantId = trimText(input.tenantId, 160);
  if (!tenantId) return { ok: false, reason: 'tenant-required' };
  const existing = await findMembershipRecord(db, input.membershipId, tenantId, input.userId);
  if (!existing) return { ok: false, reason: 'tenant-staff-not-found' };
  await db.$executeRaw`
    UPDATE platform_memberships
    SET
      status = 'revoked',
      revokedAt = ${new Date().toISOString()},
      metadataJson = ${JSON.stringify({
        ...existing.metadata,
        source: 'tenant-staff-revoke',
        actor,
        revokeReason: trimText(input.revokeReason, 240) || null,
      })},
      updatedAt = ${new Date().toISOString()}
    WHERE id = ${existing.membershipId}
  `;
  return {
    ok: true,
    staff: await findMembershipRecord(db, existing.membershipId, tenantId),
  };
}

module.exports = {
  inviteTenantStaff,
  listTenantStaffMemberships,
  revokeTenantStaffMembership,
  updateTenantStaffRole,
};
