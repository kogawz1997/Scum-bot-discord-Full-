'use strict';

const {
  listServerDiscordLinks,
  listServers,
  upsertServer,
  upsertServerDiscordLink,
} = require('../../data/repositories/controlPlaneRegistryRepository');
const {
  normalizeServerDiscordLinkInput,
  normalizeServerInput,
  trimText,
} = require('../../contracts/agent/agentContracts');

function createServerRegistryService() {
  async function createServer(input = {}, actor = 'system') {
    const normalized = normalizeServerInput(input);
    if (!normalized.tenantId || !normalized.name) {
      return { ok: false, reason: 'invalid-server' };
    }
    if (normalized.guildId) {
      const duplicateLink = listServerDiscordLinks({
        tenantId: normalized.tenantId,
        guildId: normalized.guildId,
      }).find((row) => String(row?.serverId || '') !== normalized.id);
      if (duplicateLink) {
        return { ok: false, reason: 'guild-link-conflict' };
      }
    }
    const result = upsertServer(normalized, actor);
    if (!result.ok) return result;
    if (normalized.guildId) {
      await createServerDiscordLink({
        tenantId: normalized.tenantId,
        serverId: result.server.id,
        guildId: normalized.guildId,
      }, actor);
    }
    return result;
  }

  async function createServerDiscordLink(input = {}, actor = 'system') {
    const normalized = normalizeServerDiscordLinkInput(input);
    if (!normalized.tenantId || !normalized.serverId || !normalized.guildId) {
      return { ok: false, reason: 'invalid-server-discord-link' };
    }
    const server = listServers({
      tenantId: normalized.tenantId,
      serverId: normalized.serverId,
    })[0] || null;
    if (!server) return { ok: false, reason: 'server-not-found' };
    const duplicate = listServerDiscordLinks({
      tenantId: normalized.tenantId,
      guildId: normalized.guildId,
    }).find((row) => String(row?.serverId || '') !== normalized.serverId);
    if (duplicate) return { ok: false, reason: 'guild-link-conflict' };
    return upsertServerDiscordLink(normalized, actor);
  }

  async function listServerRegistry(options = {}) {
    const tenantId = trimText(options.tenantId, 120);
    const servers = listServers({ tenantId, serverId: options.serverId });
    const links = listServerDiscordLinks({ tenantId });
    return servers.map((server) => ({
      ...server,
      guildLinks: links.filter((row) => String(row?.serverId || '') === String(server.id)),
    }));
  }

  async function listServerLinks(options = {}) {
    return listServerDiscordLinks({
      tenantId: options.tenantId,
      serverId: options.serverId,
      guildId: options.guildId,
    });
  }

  return {
    createServer,
    createServerDiscordLink,
    listServerLinks,
    listServerRegistry,
  };
}

module.exports = {
  createServerRegistryService,
};
