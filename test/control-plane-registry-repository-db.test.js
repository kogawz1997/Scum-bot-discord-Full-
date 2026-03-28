const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.resolve(__dirname, '../src/data/repositories/controlPlaneRegistryRepository.js');
const prismaPath = path.resolve(__dirname, '../src/prisma.js');
const persistPath = path.resolve(__dirname, '../src/store/_persist.js');

function installMock(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

function createDelegateStore() {
  const rows = new Map();
  return {
    delegate: {
      async findMany() {
        return Array.from(rows.values()).map((row) => JSON.parse(JSON.stringify(row)));
      },
      async deleteMany() {
        rows.clear();
        return { count: 0 };
      },
      async createMany({ data }) {
        for (const row of Array.isArray(data) ? data : []) {
          rows.set(String(row.id), JSON.parse(JSON.stringify(row)));
        }
        return { count: rows.size };
      },
      snapshot() {
        return Array.from(rows.values()).map((row) => JSON.parse(JSON.stringify(row)));
      },
    },
  };
}

function createPrismaHarness() {
  const stores = {
    controlPlaneServer: createDelegateStore(),
    controlPlaneServerDiscordLink: createDelegateStore(),
    controlPlaneAgent: createDelegateStore(),
    controlPlaneAgentTokenBinding: createDelegateStore(),
    controlPlaneAgentProvisioningToken: createDelegateStore(),
    controlPlaneAgentDevice: createDelegateStore(),
    controlPlaneAgentCredential: createDelegateStore(),
    controlPlaneAgentSession: createDelegateStore(),
    controlPlaneSyncRun: createDelegateStore(),
    controlPlaneSyncEvent: createDelegateStore(),
  };
  return {
    prisma: Object.fromEntries(
      Object.entries(stores).map(([key, value]) => [key, value.delegate]),
    ),
    snapshot(key) {
      return stores[key]?.delegate.snapshot() || [];
    },
  };
}

function loadRepositoryWithMocks(prismaHarness) {
  clearModule(repositoryPath);
  installMock(prismaPath, {
    prisma: prismaHarness.prisma,
  });
  const fileWrites = [];
  installMock(persistPath, {
    atomicWriteJson(filePath, payload) {
      fileWrites.push({
        filePath,
        payload: JSON.parse(JSON.stringify(payload)),
      });
    },
    getFilePath(name) {
      return path.join(process.cwd(), 'tmp', name);
    },
    isDbPersistenceEnabled() {
      return String(process.env.PERSIST_REQUIRE_DB || '').trim().toLowerCase() === 'true';
    },
  });
  return {
    repository: require(repositoryPath),
    fileWrites,
  };
}

test.afterEach(() => {
  delete process.env.CONTROL_PLANE_REGISTRY_STORE_MODE;
  delete process.env.CONTROL_PLANE_REGISTRY_FILE_MIRROR_SLICES;
  clearModule(repositoryPath);
  clearModule(prismaPath);
  clearModule(persistPath);
});

test('control plane registry mirrors core server, agent, session, and sync slices through prisma delegates when available', async () => {
  process.env.CONTROL_PLANE_REGISTRY_STORE_MODE = 'db';
  const prismaHarness = createPrismaHarness();
  const { repository } = loadRepositoryWithMocks(prismaHarness);

  await repository.initControlPlaneRegistryRepository();

  assert.equal(repository.upsertServer({
    tenantId: 'tenant-a',
    id: 'server-a',
    slug: 'server-a',
    name: 'Server A',
    guildId: 'guild-a',
  }).ok, true);

  assert.equal(repository.upsertServerDiscordLink({
    tenantId: 'tenant-a',
    serverId: 'server-a',
    guildId: 'guild-a',
  }).ok, true);

  assert.equal(repository.upsertAgent({
    tenantId: 'tenant-a',
    serverId: 'server-a',
    guildId: 'guild-a',
    agentId: 'agent-a',
    runtimeKey: 'runtime-a',
    role: 'hybrid',
    scope: 'sync_execute',
    version: '1.2.3',
  }).ok, true);

  assert.equal(repository.upsertAgentTokenBinding({
    id: 'binding-a',
    tenantId: 'tenant-a',
    serverId: 'server-a',
    guildId: 'guild-a',
    agentId: 'agent-a',
    apiKeyId: 'api-key-a',
  }).ok, true);

  assert.equal(repository.recordAgentSession({
    tenantId: 'tenant-a',
    serverId: 'server-a',
    guildId: 'guild-a',
    agentId: 'agent-a',
    runtimeKey: 'runtime-a',
    sessionId: 'session-a',
    heartbeatAt: '2026-03-28T05:00:00.000Z',
    baseUrl: 'http://127.0.0.1:3211',
  }).ok, true);

  assert.equal(repository.recordSyncPayload({
    tenantId: 'tenant-a',
    serverId: 'server-a',
    guildId: 'guild-a',
    agentId: 'agent-a',
    runtimeKey: 'runtime-a',
    syncRunId: 'sync-a',
    freshnessAt: '2026-03-28T05:01:00.000Z',
    events: [{ type: 'join', playerName: 'Tester' }],
  }).ok, true);

  await repository.waitForControlPlaneRegistryPersistence();

  assert.equal(prismaHarness.snapshot('controlPlaneServer').length, 1);
  assert.equal(prismaHarness.snapshot('controlPlaneServerDiscordLink').length, 1);
  assert.equal(prismaHarness.snapshot('controlPlaneAgent').length, 1);
  assert.equal(prismaHarness.snapshot('controlPlaneAgentTokenBinding').length, 1);
  assert.equal(prismaHarness.snapshot('controlPlaneAgentSession').length, 1);
  assert.equal(prismaHarness.snapshot('controlPlaneSyncRun').length, 1);
  assert.equal(prismaHarness.snapshot('controlPlaneSyncEvent').length, 1);
});

test('control plane registry file mirror can exclude volatile slices while keeping db persistence active', async () => {
  process.env.CONTROL_PLANE_REGISTRY_STORE_MODE = 'db';
  process.env.CONTROL_PLANE_REGISTRY_FILE_MIRROR_SLICES = 'servers';
  const prismaHarness = createPrismaHarness();
  const { repository, fileWrites } = loadRepositoryWithMocks(prismaHarness);

  await repository.initControlPlaneRegistryRepository();

  assert.equal(repository.upsertServer({
    tenantId: 'tenant-a',
    id: 'server-a',
    slug: 'server-a',
    name: 'Server A',
  }).ok, true);
  await repository.waitForControlPlaneRegistryPersistence();

  const writesAfterServer = fileWrites.length;
  assert.ok(writesAfterServer >= 1);

  assert.equal(repository.recordAgentSession({
    tenantId: 'tenant-a',
    serverId: 'server-a',
    agentId: 'agent-a',
    runtimeKey: 'runtime-a',
    sessionId: 'session-a',
    heartbeatAt: '2026-03-28T05:00:00.000Z',
  }).ok, true);
  await repository.waitForControlPlaneRegistryPersistence();

  assert.equal(prismaHarness.snapshot('controlPlaneAgentSession').length, 1);
  assert.equal(fileWrites.length, writesAfterServer);

  const lastMirrorSnapshot = fileWrites.at(-1)?.payload;
  assert.equal(lastMirrorSnapshot.servers.length, 1);
  assert.equal(lastMirrorSnapshot.agentSessions.length, 0);
  assert.equal(lastMirrorSnapshot.syncRuns.length, 0);
});

test('control plane registry can disable file mirror entirely while keeping db persistence active', async () => {
  process.env.CONTROL_PLANE_REGISTRY_STORE_MODE = 'db';
  process.env.CONTROL_PLANE_REGISTRY_FILE_MIRROR_SLICES = 'none';
  const prismaHarness = createPrismaHarness();
  const { repository, fileWrites } = loadRepositoryWithMocks(prismaHarness);

  await repository.initControlPlaneRegistryRepository();

  assert.equal(repository.upsertServer({
    tenantId: 'tenant-a',
    id: 'server-a',
    slug: 'server-a',
    name: 'Server A',
  }).ok, true);
  await repository.waitForControlPlaneRegistryPersistence();

  assert.equal(prismaHarness.snapshot('controlPlaneServer').length, 1);
  assert.equal(fileWrites.length, 0);
});
