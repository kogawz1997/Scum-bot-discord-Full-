const { exec } = require('node:child_process');

const config = require('../config');
const { loadJson, saveJsonDebounced } = require('../store/_persist');
const { getLinkByUserId } = require('../store/linkStore');
const { addDeliveryAudit, listDeliveryAudit } = require('../store/deliveryAuditStore');
const {
  findPurchaseByCode,
  setPurchaseStatusByCode,
  getShopItemById,
} = require('../store/memoryStore');
const { publishAdminLiveUpdate } = require('./adminLiveBus');
const { resolveItemIconUrl } = require('./itemIconService');

const jobs = new Map(); // purchaseCode -> job
let workerStarted = false;
let workerBusy = false;
let workerTimer = null;
let workerClient = null;
const deliveryOutcomes = []; // rolling attempt outcomes
let lastQueuePressureAlertAt = 0;
let lastFailRateAlertAt = 0;

const METRICS_WINDOW_MS = Math.max(
  60 * 1000,
  asNumber(process.env.DELIVERY_METRICS_WINDOW_MS, 5 * 60 * 1000),
);
const FAIL_RATE_ALERT_THRESHOLD = Math.min(
  1,
  Math.max(0.05, asNumber(process.env.DELIVERY_FAIL_RATE_ALERT_THRESHOLD, 0.3)),
);
const FAIL_RATE_ALERT_MIN_SAMPLES = Math.max(
  3,
  Math.trunc(asNumber(process.env.DELIVERY_FAIL_RATE_ALERT_MIN_SAMPLES, 10)),
);
const QUEUE_ALERT_THRESHOLD = Math.max(
  1,
  Math.trunc(asNumber(process.env.DELIVERY_QUEUE_ALERT_THRESHOLD, 25)),
);
const ALERT_COOLDOWN_MS = Math.max(
  15 * 1000,
  asNumber(process.env.DELIVERY_ALERT_COOLDOWN_MS, 60 * 1000),
);

function nowIso() {
  return new Date().toISOString();
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function trimText(value, maxLen = 500) {
  const text = String(value || '').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

function getSettings() {
  const auto = config.delivery?.auto || {};
  return {
    enabled: auto.enabled === true,
    queueIntervalMs: Math.max(250, asNumber(auto.queueIntervalMs, 1200)),
    maxRetries: Math.max(0, asNumber(auto.maxRetries, 3)),
    retryDelayMs: Math.max(500, asNumber(auto.retryDelayMs, 6000)),
    retryBackoff: Math.max(1, asNumber(auto.retryBackoff, 1.8)),
    commandTimeoutMs: Math.max(1000, asNumber(auto.commandTimeoutMs, 10000)),
    failedStatus: String(auto.failedStatus || 'delivery_failed'),
    itemCommands: auto.itemCommands && typeof auto.itemCommands === 'object'
      ? auto.itemCommands
      : {},
  };
}

function normalizeCommands(rawValue) {
  if (!rawValue) return [];
  if (typeof rawValue === 'string') {
    return rawValue.trim() ? [rawValue.trim()] : [];
  }
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((line) => String(line || '').trim())
      .filter((line) => line.length > 0);
  }
  if (rawValue && typeof rawValue === 'object') {
    if (typeof rawValue.command === 'string') {
      const single = rawValue.command.trim();
      return single ? [single] : [];
    }
    if (Array.isArray(rawValue.commands)) {
      return rawValue.commands
        .map((line) => String(line || '').trim())
        .filter((line) => line.length > 0);
    }
  }
  return [];
}

function resolveItemCommands(itemId) {
  const settings = getSettings();
  const raw = settings.itemCommands[String(itemId)] || settings.itemCommands[String(itemId).toLowerCase()];
  return normalizeCommands(raw);
}

function commandSupportsBundleItems(commands) {
  return commands.some(
    (template) =>
      String(template).includes('{gameItemId}')
      || String(template).includes('{quantity}'),
  );
}

function substituteTemplate(template, vars) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    if (!(key in vars)) return `{${key}}`;
    const value = vars[key];
    if (value == null) return '';
    return String(value);
  });
}

function runShell(command, timeoutMs) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 * 4 },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function getRconTemplate() {
  const envTemplate = String(process.env.RCON_EXEC_TEMPLATE || '').trim();
  if (envTemplate) return envTemplate;
  const configTemplate = String(config.delivery?.auto?.rconExecTemplate || '').trim();
  if (configTemplate) return configTemplate;
  return '';
}

async function runRconCommand(gameCommand, settings) {
  const shellTemplate = getRconTemplate();
  if (!shellTemplate) {
    throw new Error('RCON_EXEC_TEMPLATE is not set');
  }

  const host = String(process.env.RCON_HOST || '').trim();
  const port = String(process.env.RCON_PORT || '').trim();
  const password = String(process.env.RCON_PASSWORD || '').trim();

  if (shellTemplate.includes('{host}') && !host) {
    throw new Error('RCON_HOST is required by template');
  }
  if (shellTemplate.includes('{port}') && !port) {
    throw new Error('RCON_PORT is required by template');
  }
  if (shellTemplate.includes('{password}') && !password) {
    throw new Error('RCON_PASSWORD is required by template');
  }

  const shellCommand = substituteTemplate(shellTemplate, {
    host,
    port,
    password,
    command: gameCommand,
  });

  const { stdout, stderr } = await runShell(shellCommand, settings.commandTimeoutMs);
  return {
    command: gameCommand,
    shellCommand,
    stdout: trimText(stdout, 1200),
    stderr: trimText(stderr, 1200),
  };
}

function normalizeDeliveryItemsForJob(items, fallback = {}) {
  const source = Array.isArray(items) ? items : [];
  const out = [];
  const byKey = new Map();

  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue;
    const gameItemId = String(raw.gameItemId || raw.id || '').trim();
    if (!gameItemId) continue;
    const quantity = Math.max(1, Math.trunc(Number(raw.quantity || 1)));
    const iconUrl = String(raw.iconUrl || '').trim() || null;
    const key = gameItemId.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      const entry = { gameItemId, quantity, iconUrl };
      byKey.set(key, entry);
      out.push(entry);
      continue;
    }
    existing.quantity += quantity;
    if (!existing.iconUrl && iconUrl) {
      existing.iconUrl = iconUrl;
    }
  }

  if (out.length > 0) return out;

  const fallbackGameItemId = String(fallback.gameItemId || '').trim();
  if (!fallbackGameItemId) return [];
  return [
    {
      gameItemId: fallbackGameItemId,
      quantity: Math.max(1, Math.trunc(Number(fallback.quantity || 1))),
      iconUrl: String(fallback.iconUrl || '').trim() || null,
    },
  ];
}

function normalizeJob(input) {
  if (!input || typeof input !== 'object') return null;
  const purchaseCode = String(input.purchaseCode || '').trim();
  if (!purchaseCode) return null;
  const deliveryItems = normalizeDeliveryItemsForJob(input.deliveryItems, {
    gameItemId: input.gameItemId,
    quantity: input.quantity,
    iconUrl: input.iconUrl,
  });
  const primary = deliveryItems[0] || null;
  const quantityNumber = Number(primary?.quantity || input.quantity);
  const quantity = Number.isFinite(quantityNumber)
    ? Math.max(1, Math.trunc(quantityNumber))
    : 1;

  return {
    purchaseCode,
    userId: String(input.userId || '').trim(),
    itemId: String(input.itemId || '').trim(),
    itemName: String(input.itemName || '').trim() || null,
    iconUrl: String(primary?.iconUrl || input.iconUrl || '').trim() || null,
    gameItemId: String(primary?.gameItemId || input.gameItemId || '').trim() || null,
    quantity,
    deliveryItems,
    itemKind: String(input.itemKind || '').trim() || null,
    guildId: input.guildId ? String(input.guildId) : null,
    attempts: Math.max(0, asNumber(input.attempts, 0)),
    nextAttemptAt: Math.max(Date.now(), asNumber(input.nextAttemptAt, Date.now())),
    lastError: input.lastError ? String(input.lastError) : null,
    createdAt: input.createdAt ? new Date(input.createdAt).toISOString() : nowIso(),
    updatedAt: input.updatedAt ? new Date(input.updatedAt).toISOString() : nowIso(),
  };
}

const persisted = loadJson('delivery-queue.json', null);
if (persisted?.jobs && Array.isArray(persisted.jobs)) {
  for (const rawJob of persisted.jobs) {
    const job = normalizeJob(rawJob);
    if (!job) continue;
    jobs.set(job.purchaseCode, job);
  }
}

const scheduleQueueSave = saveJsonDebounced('delivery-queue.json', () => ({
  jobs: Array.from(jobs.values()).map((job) => ({ ...job })),
}));

function listDeliveryQueue(limit = 500) {
  const max = Math.max(1, Number(limit || 500));
  return Array.from(jobs.values())
    .slice()
    .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt)
    .slice(0, max)
    .map((job) => ({ ...job }));
}

function compactOutcomes(now = Date.now()) {
  const cutoff = now - METRICS_WINDOW_MS;
  while (deliveryOutcomes.length > 0 && deliveryOutcomes[0].at < cutoff) {
    deliveryOutcomes.shift();
  }
}

function getDeliveryMetricsSnapshot(now = Date.now()) {
  compactOutcomes(now);
  const attempts = deliveryOutcomes.length;
  const failures = deliveryOutcomes.reduce(
    (sum, entry) => sum + (entry.ok ? 0 : 1),
    0,
  );
  const successes = attempts - failures;
  const failRate = attempts > 0 ? failures / attempts : 0;
  return {
    windowMs: METRICS_WINDOW_MS,
    attempts,
    successes,
    failures,
    failRate,
    queueLength: jobs.size,
    thresholds: {
      failRate: FAIL_RATE_ALERT_THRESHOLD,
      minSamples: FAIL_RATE_ALERT_MIN_SAMPLES,
      queueLength: QUEUE_ALERT_THRESHOLD,
    },
  };
}

function maybeAlertQueuePressure() {
  const queueLength = jobs.size;
  if (queueLength < QUEUE_ALERT_THRESHOLD) return;
  const now = Date.now();
  if (now - lastQueuePressureAlertAt < ALERT_COOLDOWN_MS) return;
  lastQueuePressureAlertAt = now;

  const payload = {
    source: 'delivery',
    kind: 'queue-pressure',
    queueLength,
    threshold: QUEUE_ALERT_THRESHOLD,
  };
  console.warn(
    `[delivery][alert] queue pressure: length=${queueLength} threshold=${QUEUE_ALERT_THRESHOLD}`,
  );
  publishAdminLiveUpdate('ops-alert', payload);
}

function maybeAlertFailRate(snapshot) {
  if (!snapshot) return;
  if (snapshot.attempts < FAIL_RATE_ALERT_MIN_SAMPLES) return;
  if (snapshot.failRate < FAIL_RATE_ALERT_THRESHOLD) return;

  const now = Date.now();
  if (now - lastFailRateAlertAt < ALERT_COOLDOWN_MS) return;
  lastFailRateAlertAt = now;

  const payload = {
    source: 'delivery',
    kind: 'fail-rate',
    attempts: snapshot.attempts,
    failures: snapshot.failures,
    failRate: snapshot.failRate,
    threshold: FAIL_RATE_ALERT_THRESHOLD,
    windowMs: METRICS_WINDOW_MS,
  };
  console.warn(
    `[delivery][alert] fail rate spike: failRate=${snapshot.failRate.toFixed(3)} attempts=${snapshot.attempts} failures=${snapshot.failures}`,
  );
  publishAdminLiveUpdate('ops-alert', payload);
}

function recordDeliveryOutcome(ok, context = {}) {
  deliveryOutcomes.push({
    at: Date.now(),
    ok: ok === true,
    purchaseCode: context.purchaseCode || null,
  });
  const snapshot = getDeliveryMetricsSnapshot();
  maybeAlertFailRate(snapshot);
  return snapshot;
}

function publishQueueLiveUpdate(action, job) {
  const deliveryItems = normalizeDeliveryItemsForJob(job?.deliveryItems, {
    gameItemId: job?.gameItemId,
    quantity: job?.quantity,
    iconUrl: job?.iconUrl,
  });
  publishAdminLiveUpdate('delivery-queue', {
    action: String(action || 'update'),
    purchaseCode: job?.purchaseCode || null,
    itemId: job?.itemId || null,
    itemName: job?.itemName || null,
    iconUrl: deliveryItems[0]?.iconUrl || job?.iconUrl || null,
    gameItemId: deliveryItems[0]?.gameItemId || job?.gameItemId || null,
    quantity: deliveryItems[0]?.quantity || job?.quantity || 1,
    deliveryItems,
    userId: job?.userId || null,
    queueLength: jobs.size,
  });
}

function queueAudit(level, action, job, message, meta = null) {
  addDeliveryAudit({
    level,
    action,
    purchaseCode: job?.purchaseCode || null,
    itemId: job?.itemId || null,
    userId: job?.userId || null,
    attempt: job?.attempts == null ? null : job.attempts,
    message,
    meta,
  });
  publishQueueLiveUpdate(action, job);
}

function setJob(job) {
  const normalized = normalizeJob(job);
  if (!normalized) return;
  jobs.set(normalized.purchaseCode, normalized);
  scheduleQueueSave();
  maybeAlertQueuePressure();
}

function removeJob(purchaseCode) {
  jobs.delete(String(purchaseCode));
  scheduleQueueSave();
}

function calcDelayMs(attempts) {
  const settings = getSettings();
  const base = settings.retryDelayMs;
  const factor = settings.retryBackoff;
  const delay = Math.round(base * Math.pow(factor, Math.max(0, attempts - 1)));
  return Math.min(delay, 60 * 60 * 1000);
}

function nextDueJob() {
  const now = Date.now();
  let selected = null;
  for (const job of jobs.values()) {
    if (job.nextAttemptAt > now) continue;
    if (!selected || job.nextAttemptAt < selected.nextAttemptAt) {
      selected = job;
    }
  }
  return selected;
}

async function trySendDiscordAudit(job, message) {
  if (!workerClient || !job?.guildId || !message) return;
  try {
    const guild = workerClient.guilds.cache.get(job.guildId)
      || (await workerClient.guilds.fetch(job.guildId).catch(() => null));
    if (!guild) return;

    const channel = guild.channels.cache.find(
      (c) => c.name === config.channels?.shopLog && c.isTextBased && c.isTextBased(),
    ) || guild.channels.cache.find(
      (c) => c.name === config.channels?.adminLog && c.isTextBased && c.isTextBased(),
    );
    if (!channel) return;
    await channel.send(message).catch(() => null);
  } catch {
    // best effort
  }
}

async function handleRetry(job, reason) {
  const settings = getSettings();
  recordDeliveryOutcome(false, { purchaseCode: job?.purchaseCode });
  const nextAttempt = Number(job.attempts || 0) + 1;
  if (nextAttempt > settings.maxRetries) {
    const summary = trimText(
      normalizeDeliveryItemsForJob(job?.deliveryItems, {
        gameItemId: job?.gameItemId,
        quantity: job?.quantity,
      })
        .map((entry) => `${entry.gameItemId} x${entry.quantity}`)
        .join(', '),
      220,
    );
    queueAudit('error', 'failed', job, reason, {
      maxRetries: settings.maxRetries,
      failedStatus: settings.failedStatus,
    });
    await setPurchaseStatusByCode(job.purchaseCode, settings.failedStatus).catch(() => null);
    removeJob(job.purchaseCode);
    await trySendDiscordAudit(
      job,
      `[FAIL] **Auto delivery failed** | code: \`${job.purchaseCode}\` | item: \`${job.itemName || job.itemId}\` | delivery: \`${summary || `${job.gameItemId || job.itemId} x${job.quantity || 1}`}\` | reason: ${trimText(reason, 300)}`,
    );
    return;
  }

  const delayMs = calcDelayMs(nextAttempt);
  setJob({
    ...job,
    attempts: nextAttempt,
    nextAttemptAt: Date.now() + delayMs,
    lastError: reason,
    updatedAt: nowIso(),
  });
  queueAudit('warn', 'retry', job, `${reason} (retry in ${delayMs}ms)`, {
    delayMs,
    maxRetries: settings.maxRetries,
  });
}

async function processJob(job) {
  const purchase = await findPurchaseByCode(job.purchaseCode);
  if (!purchase) {
    queueAudit('error', 'missing-purchase', job, 'Purchase not found');
    removeJob(job.purchaseCode);
    return;
  }

  if (purchase.status === 'delivered' || purchase.status === 'refunded') {
    queueAudit(
      'info',
      'skip-terminal-status',
      job,
      `Skip because purchase status is ${purchase.status}`,
    );
    removeJob(job.purchaseCode);
    return;
  }

  const shopItem = await getShopItemById(purchase.itemId).catch(() => null);
  const resolvedDeliveryItems = normalizeDeliveryItemsForJob(
    shopItem?.deliveryItems || job?.deliveryItems,
    {
      gameItemId: shopItem?.gameItemId || job?.gameItemId || purchase.itemId,
      quantity: shopItem?.quantity || job?.quantity || 1,
      iconUrl: shopItem?.iconUrl || job?.iconUrl || null,
    },
  );
  const firstDeliveryItem = resolvedDeliveryItems[0] || {
    gameItemId: String(purchase.itemId || '').trim(),
    quantity: 1,
    iconUrl: null,
  };
  const commands = resolveItemCommands(purchase.itemId);
  if (commands.length === 0) {
    queueAudit(
      'warn',
      'missing-item-commands',
      job,
      `No auto-delivery command for itemId=${purchase.itemId}`,
    );
    await setPurchaseStatusByCode(job.purchaseCode, 'pending').catch(() => null);
    removeJob(job.purchaseCode);
    return;
  }

  const link = getLinkByUserId(purchase.userId);
  if (!link?.steamId) {
    await handleRetry(job, `Missing steam link for userId=${purchase.userId}`);
    return;
  }

  const context = {
    purchaseCode: purchase.code,
    itemId: purchase.itemId,
    itemName: shopItem?.name || job?.itemName || purchase.itemId,
    gameItemId: firstDeliveryItem.gameItemId,
    quantity: firstDeliveryItem.quantity,
    itemKind: String(shopItem?.kind || job?.itemKind || 'item'),
    userId: purchase.userId,
    steamId: link.steamId,
  };

  const settings = getSettings();
  const outputs = [];
  const needsItemPlaceholder = commandSupportsBundleItems(commands);

  if (resolvedDeliveryItems.length > 1 && !needsItemPlaceholder) {
    throw new Error(
      'itemCommands ต้องมี {gameItemId} หรือ {quantity} เมื่อสินค้าเป็นหลายไอเทม',
    );
  }

  for (const deliveryItem of resolvedDeliveryItems) {
    const itemContext = {
      ...context,
      gameItemId: deliveryItem.gameItemId,
      quantity: deliveryItem.quantity,
    };
    for (const template of commands) {
      const gameCommand = substituteTemplate(template, itemContext);
      const output = await runRconCommand(gameCommand, settings);
      outputs.push({
        gameItemId: deliveryItem.gameItemId,
        quantity: deliveryItem.quantity,
        command: output.command,
        stdout: output.stdout,
        stderr: output.stderr,
      });
    }
  }

  await setPurchaseStatusByCode(job.purchaseCode, 'delivered').catch(() => null);
  removeJob(job.purchaseCode);
  recordDeliveryOutcome(true, { purchaseCode: job?.purchaseCode });
  queueAudit('info', 'success', job, 'Auto delivery complete', {
    steamId: link.steamId,
    deliveryItems: resolvedDeliveryItems,
    outputs,
  });
  const deliveredItemsText = trimText(
    resolvedDeliveryItems
      .map((entry) => `${entry.gameItemId} x${entry.quantity}`)
      .join(', '),
    240,
  );
  await trySendDiscordAudit(
    job,
    `[OK] **Auto delivered** | code: \`${job.purchaseCode}\` | item: \`${job.itemName || job.itemId}\` | delivery: \`${deliveredItemsText || `${firstDeliveryItem.gameItemId} x${firstDeliveryItem.quantity}`}\` | steam: \`${link.steamId}\``,
  );
}

async function processDueJobOnce() {
  const settings = getSettings();
  if (!settings.enabled) {
    return { processed: false, reason: 'delivery-disabled' };
  }
  if (workerBusy) {
    return { processed: false, reason: 'worker-busy' };
  }

  const job = nextDueJob();
  if (!job) {
    return { processed: false, reason: 'empty-queue' };
  }

  workerBusy = true;
  queueAudit('info', 'attempt', job, 'Processing auto-delivery job');
  try {
    await processJob(job);
    return { processed: true, purchaseCode: job.purchaseCode, ok: true };
  } catch (error) {
    await handleRetry(job, error?.message || 'Unknown delivery error');
    return {
      processed: true,
      purchaseCode: job.purchaseCode,
      ok: false,
      error: String(error?.message || error),
    };
  } finally {
    workerBusy = false;
  }
}

async function processDeliveryQueueNow(limit = 1) {
  const max = Math.max(1, Math.trunc(Number(limit || 1)));
  let processed = 0;
  let lastResult = { processed: false, reason: 'empty-queue' };

  while (processed < max) {
    lastResult = await processDueJobOnce();
    if (!lastResult.processed) break;
    processed += 1;
  }

  return {
    processed,
    queueLength: jobs.size,
    metrics: getDeliveryMetricsSnapshot(),
    lastResult,
  };
}

function kickWorker(delayMs = 10) {
  if (!workerStarted) return;
  if (workerTimer) clearTimeout(workerTimer);
  workerTimer = setTimeout(() => {
    void workerTick();
  }, Math.max(10, delayMs));
}

async function workerTick() {
  const settings = getSettings();
  if (!workerStarted) return;
  if (!settings.enabled) {
    kickWorker(settings.queueIntervalMs);
    return;
  }
  if (workerBusy) {
    kickWorker(settings.queueIntervalMs);
    return;
  }
  await processDueJobOnce();
  kickWorker(settings.queueIntervalMs);
}

async function enqueuePurchaseDelivery(purchase, context = {}) {
  const settings = getSettings();
  if (!purchase?.code || !purchase?.itemId || !purchase?.userId) {
    return { queued: false, reason: 'invalid-purchase' };
  }
  const shopItem = await getShopItemById(purchase.itemId).catch(() => null);
  const itemName = String(shopItem?.name || purchase.itemId);
  const deliveryItems = normalizeDeliveryItemsForJob(shopItem?.deliveryItems, {
    gameItemId: shopItem?.gameItemId || purchase.itemId,
    quantity: shopItem?.quantity || 1,
    iconUrl: shopItem?.iconUrl || null,
  });
  const primary = deliveryItems[0] || {
    gameItemId: String(shopItem?.gameItemId || purchase.itemId),
    quantity: Math.max(1, Math.trunc(Number(shopItem?.quantity || 1))),
    iconUrl: String(shopItem?.iconUrl || '').trim() || null,
  };
  const gameItemId = String(primary.gameItemId || purchase.itemId);
  const quantity = Math.max(1, Math.trunc(Number(primary.quantity || 1)));
  const iconUrl = primary.iconUrl || resolveItemIconUrl(shopItem || purchase.itemId);
  const itemKind = String(shopItem?.kind || 'item');

  if (!settings.enabled) {
    addDeliveryAudit({
      level: 'info',
      action: 'skip-disabled',
      purchaseCode: String(purchase.code),
      itemId: String(purchase.itemId),
      userId: String(purchase.userId),
      meta: { itemName, iconUrl, gameItemId, quantity, itemKind, deliveryItems },
      message: 'Auto delivery is disabled',
    });
    return { queued: false, reason: 'delivery-disabled' };
  }

  const commands = resolveItemCommands(purchase.itemId);
  if (commands.length === 0) {
    addDeliveryAudit({
      level: 'info',
      action: 'skip-missing-command',
      purchaseCode: String(purchase.code),
      itemId: String(purchase.itemId),
      userId: String(purchase.userId),
      meta: { itemName, iconUrl, gameItemId, quantity, itemKind, deliveryItems },
      message: 'Item has no configured auto-delivery command',
    });
    return { queued: false, reason: 'item-not-configured' };
  }

  if (deliveryItems.length > 1 && !commandSupportsBundleItems(commands)) {
    addDeliveryAudit({
      level: 'warn',
      action: 'skip-invalid-template',
      purchaseCode: String(purchase.code),
      itemId: String(purchase.itemId),
      userId: String(purchase.userId),
      meta: {
        deliveryItems,
        itemName,
        templateRule: '{gameItemId} or {quantity}',
      },
      message:
        'Bundle delivery requires {gameItemId} or {quantity} in itemCommands template',
    });
    return { queued: false, reason: 'bundle-template-missing-placeholder' };
  }

  const purchaseCode = String(purchase.code);
  if (jobs.has(purchaseCode)) {
    return { queued: true, reason: 'already-queued' };
  }

  const job = normalizeJob({
    purchaseCode,
    userId: String(purchase.userId),
    itemId: String(purchase.itemId),
    itemName,
    iconUrl,
    gameItemId,
    quantity,
    deliveryItems,
    itemKind,
    guildId: context.guildId ? String(context.guildId) : null,
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (!job) return { queued: false, reason: 'invalid-job' };

  setJob(job);
  await setPurchaseStatusByCode(purchaseCode, 'delivering').catch(() => null);
  queueAudit('info', 'queued', job, 'Queued purchase for auto-delivery');
  kickWorker(20);
  return { queued: true, reason: 'queued' };
}

async function enqueuePurchaseDeliveryByCode(purchaseCode, context = {}) {
  const purchase = await findPurchaseByCode(String(purchaseCode || ''));
  if (!purchase) {
    return { ok: false, reason: 'purchase-not-found' };
  }
  const result = await enqueuePurchaseDelivery(purchase, context);
  return { ok: result.queued, ...result };
}

function retryDeliveryNow(purchaseCode) {
  const code = String(purchaseCode || '').trim();
  const job = jobs.get(code);
  if (!job) return null;
  setJob({
    ...job,
    nextAttemptAt: Date.now(),
    updatedAt: nowIso(),
    lastError: null,
  });
  queueAudit('info', 'manual-retry', job, 'Manual retry requested');
  kickWorker(20);
  return { ...jobs.get(code) };
}

function cancelDeliveryJob(purchaseCode, reason = 'manual-cancel') {
  const code = String(purchaseCode || '').trim();
  const job = jobs.get(code);
  if (!job) return null;
  removeJob(code);
  queueAudit('warn', 'manual-cancel', job, `Queue job cancelled: ${reason}`);
  return { ...job };
}

function startRconDeliveryWorker(client) {
  if (client) workerClient = client;
  if (workerStarted) return;
  workerStarted = true;
  console.log('[delivery] auto delivery worker started');
  kickWorker(100);
}

module.exports = {
  startRconDeliveryWorker,
  enqueuePurchaseDelivery,
  enqueuePurchaseDeliveryByCode,
  listDeliveryQueue,
  retryDeliveryNow,
  cancelDeliveryJob,
  listDeliveryAudit,
  getDeliveryMetricsSnapshot,
  processDeliveryQueueNow,
};

