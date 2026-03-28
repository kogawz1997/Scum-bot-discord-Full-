const test = require('node:test');
const assert = require('node:assert/strict');

const { prisma } = require('../src/prisma');
const {
  completeRestartPlan,
  ensurePlatformRestartTables,
  listRestartExecutions,
  listRestartPlans,
  recordRestartExecution,
  scheduleRestartPlan,
} = require('../src/services/platformRestartOrchestrationService');

async function cleanupRestartFixtures() {
  await ensurePlatformRestartTables(prisma);
  await prisma.$executeRawUnsafe("DELETE FROM platform_restart_executions WHERE tenant_id = 'tenant-restart-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_restart_announcements WHERE tenant_id = 'tenant-restart-test'").catch(() => null);
  await prisma.$executeRawUnsafe("DELETE FROM platform_restart_plans WHERE tenant_id = 'tenant-restart-test'").catch(() => null);
}

test('platform restart orchestration persists restart plan and execution history', async (t) => {
  await cleanupRestartFixtures();
  t.after(cleanupRestartFixtures);

  const plan = await scheduleRestartPlan({
    tenantId: 'tenant-restart-test',
    serverId: 'server-restart-test',
    guildId: 'guild-restart-test',
    delaySeconds: 60,
    restartMode: 'safe_restart',
    controlMode: 'service',
    reason: 'config-update',
  }, 'test-suite');
  assert.equal(plan.ok, true);
  assert.equal(String(plan.plan?.status || ''), 'scheduled');
  assert.equal(String(plan.plan?.restartMode || ''), 'safe_restart');

  const execution = await recordRestartExecution({
    planId: plan.plan.id,
    tenantId: 'tenant-restart-test',
    serverId: 'server-restart-test',
    runtimeKey: 'server-bot-runtime',
    resultStatus: 'succeeded',
    exitCode: 0,
    detail: 'Restart completed',
  });
  assert.equal(execution.ok, true);

  const completed = await completeRestartPlan({
    planId: plan.plan.id,
    status: 'completed',
    healthStatus: 'pending_verification',
  });
  assert.equal(completed.ok, true);

  const plans = await listRestartPlans({
    tenantId: 'tenant-restart-test',
    serverId: 'server-restart-test',
    limit: 5,
  });
  const executions = await listRestartExecutions({
    tenantId: 'tenant-restart-test',
    serverId: 'server-restart-test',
    limit: 5,
  });
  assert.equal(plans.length >= 1, true);
  assert.equal(executions.length >= 1, true);
  assert.equal(String(plans[0]?.id || ''), String(plan.plan.id || ''));
  assert.equal(String(executions[0]?.planId || ''), String(plan.plan.id || ''));
});
