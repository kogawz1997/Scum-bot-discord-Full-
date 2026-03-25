'use strict';

const {
  deriveScopesForAgent,
  normalizeAgentRegistrationInput,
  normalizeAgentSessionInput,
  trimText,
} = require('../../contracts/agent/agentContracts');
const {
  listAgents,
  listAgentSessions,
  listAgentTokenBindings,
  recordAgentSession,
  revokeAgentTokenBinding,
  upsertAgent,
  upsertAgentTokenBinding,
} = require('../../data/repositories/controlPlaneRegistryRepository');

function createAgentRegistryService(deps = {}) {
  const {
    createPlatformApiKey,
    listPlatformApiKeys,
    listPlatformAgentRuntimes,
    recordPlatformAgentHeartbeat,
    revokePlatformApiKey,
    rotatePlatformApiKey,
    getPlatformTenantById,
  } = deps;

  const tenantApiKeyCache = new Map();
  const tenantRuntimeCache = new Map();

  async function assertTenantExists(tenantId) {
    const tenant = await getPlatformTenantById?.(tenantId);
    if (!tenant) return { ok: false, reason: 'tenant-not-found' };
    return { ok: true, tenant };
  }

  async function createAgentToken(input = {}, actor = 'system') {
    const normalized = normalizeAgentRegistrationInput(input);
    if (!normalized.tenantId || !normalized.serverId || !normalized.agentId) {
      return { ok: false, reason: 'invalid-agent-token' };
    }
    const tenantCheck = await assertTenantExists(normalized.tenantId);
    if (!tenantCheck.ok) return tenantCheck;
    const tokenResult = await createPlatformApiKey({
      id: input.apiKeyId,
      tenantId: normalized.tenantId,
      name: trimText(input.name, 160) || `agent-${normalized.agentId}-${normalized.scope}`,
      status: 'active',
      scopes: deriveScopesForAgent(normalized.role, normalized.scope),
    }, actor);
    if (!tokenResult.ok) return tokenResult;
    const bindingResult = upsertAgentTokenBinding({
      id: tokenResult.apiKey?.id,
      tenantId: normalized.tenantId,
      serverId: normalized.serverId,
      guildId: normalized.guildId,
      agentId: normalized.agentId,
      apiKeyId: tokenResult.apiKey?.id,
      role: normalized.role,
      scope: normalized.scope,
      minVersion: normalized.minimumVersion,
      status: 'active',
    }, actor);
    if (!bindingResult.ok) return bindingResult;
    const agentResult = upsertAgent({
      ...normalized,
      status: 'active',
    }, actor);
    return {
      ok: true,
      agent: agentResult.agent,
      binding: bindingResult.binding,
      apiKey: tokenResult.apiKey,
      rawKey: tokenResult.rawKey,
    };
  }

  async function revokeAgentToken(input = {}, actor = 'system') {
    const apiKeyId = trimText(input.apiKeyId, 120);
    if (!apiKeyId) return { ok: false, reason: 'invalid-api-key-id' };
    if (typeof revokePlatformApiKey === 'function') {
      const result = await revokePlatformApiKey(apiKeyId, actor);
      if (!result.ok) return result;
    }
    return revokeAgentTokenBinding(apiKeyId, actor);
  }

  async function rotateAgentToken(input = {}, actor = 'system') {
    const apiKeyId = trimText(input.apiKeyId, 120);
    if (!apiKeyId) return { ok: false, reason: 'invalid-api-key-id' };
    const binding = listAgentTokenBindings({ apiKeyId })[0] || null;
    if (!binding) return { ok: false, reason: 'agent-token-binding-not-found' };
    if (typeof rotatePlatformApiKey === 'function') {
      const rotated = await rotatePlatformApiKey({
        apiKeyId,
        tenantId: binding.tenantId,
        name: trimText(input.name, 160) || null,
      }, actor);
      if (!rotated.ok) return rotated;
      upsertAgentTokenBinding({
        ...binding,
        id: rotated.apiKey?.id,
        apiKeyId: rotated.apiKey?.id,
        status: 'active',
        revokedAt: null,
      }, actor);
      revokeAgentTokenBinding(apiKeyId, actor);
      return {
        ok: true,
        apiKey: rotated.apiKey,
        rawKey: rotated.rawKey,
      };
    }
    const scopes = binding.scope ? deriveScopesForAgent(binding.role, binding.scope) : [];
    const created = await createPlatformApiKey({
      tenantId: binding.tenantId,
      name: trimText(input.name, 160) || `agent-${binding.agentId}-${binding.scope}`,
      scopes,
      status: 'active',
    }, actor);
    if (!created.ok) return created;
    upsertAgentTokenBinding({
      ...binding,
      id: created.apiKey?.id,
      apiKeyId: created.apiKey?.id,
      status: 'active',
      revokedAt: null,
    }, actor);
    if (typeof revokePlatformApiKey === 'function') {
      await revokePlatformApiKey(apiKeyId, actor).catch(() => null);
    }
    revokeAgentTokenBinding(apiKeyId, actor);
    return {
      ok: true,
      apiKey: created.apiKey,
      rawKey: created.rawKey,
    };
  }

  async function registerAgent(input = {}, auth = {}, actor = 'platform-agent') {
    const normalized = normalizeAgentRegistrationInput({
      ...input,
      tenantId: input.tenantId || auth.tenantId,
    });
    if (!normalized.tenantId || !normalized.serverId || !normalized.agentId || !normalized.runtimeKey) {
      return { ok: false, reason: 'invalid-agent-registration' };
    }
    const binding = listAgentTokenBindings({
      apiKeyId: auth.apiKeyId,
      tenantId: normalized.tenantId,
    })[0] || null;
    if (!binding) return { ok: false, reason: 'agent-token-binding-not-found' };
    if (binding.serverId !== normalized.serverId || binding.agentId !== normalized.agentId) {
      return { ok: false, reason: 'agent-registration-scope-mismatch' };
    }
    const result = upsertAgent({
      ...normalized,
      role: binding.role || normalized.role,
      scope: binding.scope || normalized.scope,
      status: 'active',
      guildId: normalized.guildId || binding.guildId || null,
      minimumVersion: binding.minVersion || normalized.minimumVersion || null,
    }, actor);
    await recordPlatformAgentHeartbeat?.({
      tenantId: normalized.tenantId,
      runtimeKey: normalized.runtimeKey,
      channel: normalized.channel,
      version: normalized.version || '0.0.0',
      minRequiredVersion: binding.minVersion || normalized.minimumVersion || null,
      status: 'online',
      meta: {
        ...normalized.metadata,
        agentId: normalized.agentId,
        serverId: normalized.serverId,
        guildId: normalized.guildId || binding.guildId || null,
        agentRole: binding.role || normalized.role,
        agentScope: binding.scope || normalized.scope,
        baseUrl: normalized.baseUrl || null,
        hostname: normalized.hostname || null,
      },
    }, actor).catch(() => null);
    return {
      ok: true,
      agent: result.agent,
      binding,
    };
  }

  async function recordSession(input = {}, auth = {}, actor = 'platform-agent') {
    const normalized = normalizeAgentSessionInput({
      ...input,
      tenantId: input.tenantId || auth.tenantId,
    });
    const agent = listAgents({
      tenantId: normalized.tenantId,
      serverId: normalized.serverId,
      agentId: normalized.agentId,
    })[0] || null;
    if (!agent) return { ok: false, reason: 'agent-not-registered' };
    const session = recordAgentSession({
      ...normalized,
      role: agent.role,
      scope: agent.scope,
      guildId: normalized.guildId || agent.guildId || null,
    }, actor);
    await recordPlatformAgentHeartbeat?.({
      tenantId: normalized.tenantId,
      runtimeKey: normalized.runtimeKey,
      channel: normalized.channel || agent.channel || null,
      version: normalized.version || agent.version || '0.0.0',
      minRequiredVersion: agent.minimumVersion || null,
      status: 'online',
      meta: {
        ...(agent.metadata || {}),
        baseUrl: normalized.baseUrl || agent.baseUrl || null,
        hostname: normalized.hostname || agent.hostname || null,
        agentId: agent.agentId,
        serverId: agent.serverId,
        guildId: agent.guildId || null,
        agentRole: agent.role,
        agentScope: agent.scope,
        diagnostics: normalized.diagnostics,
      },
    }, actor).catch(() => null);
    return {
      ok: true,
      session: session.session,
      agent,
    };
  }

  async function listAgentRegistry(options = {}) {
    const agents = listAgents(options);
    const readApiKeysForTenant = async (tenantId) => {
      if (tenantApiKeyCache.has(tenantId)) {
        return tenantApiKeyCache.get(tenantId);
      }
      const rows = typeof listPlatformApiKeys === 'function'
        ? await listPlatformApiKeys({ tenantId, limit: 200 })
        : [];
      tenantApiKeyCache.set(tenantId, rows);
      return rows;
    };
    const readAgentRuntimesForTenant = async (tenantId) => {
      if (tenantRuntimeCache.has(tenantId)) {
        return tenantRuntimeCache.get(tenantId);
      }
      const rows = typeof listPlatformAgentRuntimes === 'function'
        ? await listPlatformAgentRuntimes({ tenantId, limit: 200 })
        : [];
      tenantRuntimeCache.set(tenantId, rows);
      return rows;
    };
    const matchRuntimeForAgent = (agent, runtimes = []) => {
      const runtimeKey = trimText(agent?.runtimeKey, 160);
      const agentId = trimText(agent?.agentId, 120);
      const serverId = trimText(agent?.serverId, 120);
      const guildId = trimText(agent?.guildId, 120);
      return runtimes.find((row) => {
        const meta = row?.meta && typeof row.meta === 'object' ? row.meta : {};
        if (runtimeKey && String(row?.runtimeKey || '') === runtimeKey) return true;
        if (agentId && String(meta.agentId || '') === agentId) {
          if (serverId && String(meta.serverId || '') && String(meta.serverId || '') !== serverId) {
            return false;
          }
          if (guildId && String(meta.guildId || '') && String(meta.guildId || '') !== guildId) {
            return false;
          }
          return true;
        }
        return false;
      }) || null;
    };
    return Promise.all(agents.map(async (agent) => {
      const sessions = listAgentSessions({
        tenantId: agent.tenantId,
        serverId: agent.serverId,
        agentId: agent.agentId,
      });
      const bindings = listAgentTokenBindings({
        tenantId: agent.tenantId,
        serverId: agent.serverId,
        agentId: agent.agentId,
      });
      const [apiKeys, runtimes] = await Promise.all([
        readApiKeysForTenant(agent.tenantId),
        readAgentRuntimesForTenant(agent.tenantId),
      ]);
      const bindingViews = bindings.map((binding) => ({
        ...binding,
        apiKey: apiKeys.find((row) => String(row?.id || '') === String(binding.apiKeyId || '')) || null,
      }));
      return {
        ...agent,
        bindings: bindingViews,
        sessions: sessions.slice(0, 10),
        runtime: matchRuntimeForAgent(agent, runtimes),
      };
    }));
  }

  return {
    createAgentToken,
    listAgentRegistry,
    recordSession,
    registerAgent,
    revokeAgentToken,
    rotateAgentToken,
  };
}

module.exports = {
  createAgentRegistryService,
};
