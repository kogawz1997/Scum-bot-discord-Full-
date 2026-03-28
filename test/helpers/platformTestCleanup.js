'use strict';

const { prisma } = require('../../src/prisma');

function normalizeList(value) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean)))
    : [];
}

function buildPrefixFilter(field, prefixes) {
  const normalized = normalizeList(prefixes);
  if (normalized.length === 0) return null;
  if (normalized.length === 1) {
    return {
      [field]: {
        startsWith: normalized[0],
      },
    };
  }
  return {
    OR: normalized.map((prefix) => ({
      [field]: {
        startsWith: prefix,
      },
    })),
  };
}

async function cleanupPlatformTenantFixtures(options = {}) {
  const tenantIds = normalizeList(options.tenantIds);
  const purchaseWhere = buildPrefixFilter('code', options.purchaseCodePrefixes);
  const shopItemWhere = buildPrefixFilter('id', options.shopItemPrefixes);
  const vipMembershipWhere = buildPrefixFilter('userId', options.vipUserPrefixes);

  const operations = [];
  if (tenantIds.length > 0) {
    const tenantScope = { in: tenantIds };
    operations.push(prisma.platformMarketplaceOffer.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.platformAgentRuntime.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.platformWebhookEndpoint.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.platformApiKey.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.platformLicense.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.platformSubscription.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.deliveryAudit.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.deliveryDeadLetter.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.deliveryQueueJob.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.purchase.deleteMany({ where: { tenantId: tenantScope } }));
    operations.push(prisma.platformTenant.deleteMany({ where: { id: tenantScope } }));
  }
  if (purchaseWhere) {
    operations.push(prisma.purchase.deleteMany({ where: purchaseWhere }));
  }
  if (shopItemWhere) {
    operations.push(prisma.shopItem.deleteMany({ where: shopItemWhere }));
  }
  if (vipMembershipWhere) {
    operations.push(prisma.vipMembership.deleteMany({ where: vipMembershipWhere }));
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  if (tenantIds.length > 0) {
    for (const tenantId of tenantIds) {
      await prisma.$executeRaw`DELETE FROM platform_tenant_configs WHERE tenant_id = ${tenantId}`.catch(() => null);
    }
  }
}

module.exports = {
  cleanupPlatformTenantFixtures,
};
