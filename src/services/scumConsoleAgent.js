'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const { executeCommandTemplate, validateCommandTemplate } = require('../utils/commandTemplate');
const { createPlatformAgentPresenceService } = require('./platformAgentPresenceService');

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFlag(value, fallback = false) {
  if (value == null || String(value).trim() === '') return fallback;
  const text = String(value).trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

function trimText(value, maxLen = 1200) {
  const text = String(value || '').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

function createAgentError(code, message, meta = null) {
  const error = new Error(message);
  error.agentCode = String(code || 'AGENT_ERROR');
  error.meta = meta && typeof meta === 'object' ? meta : null;
  return error;
}

function collectAgentDetailText(message, meta = null) {
  const parts = [String(message || '').trim()];
  if (meta && typeof meta === 'object') {
    parts.push(
      String(meta.stderr || '').trim(),
      String(meta.stdout || '').trim(),
      String(meta.shellCommand || '').trim(),
    );
    const detail = meta.detail && typeof meta.detail === 'object' ? meta.detail : null;
    if (detail) {
      parts.push(
        String(detail.stderr || '').trim(),
        String(detail.stdout || '').trim(),
        String(detail.message || '').trim(),
      );
    }
  }
  return parts.filter(Boolean).join(' | ');
}

function classifyAgentIssue(codeInput, messageInput, meta = null) {
  const code = String(codeInput || 'AGENT_ERROR').trim().toUpperCase() || 'AGENT_ERROR';
  const message = trimText(messageInput || 'Agent error', 300);
  const detailText = collectAgentDetailText(message, meta).toLowerCase();

  const classification = {
    code,
    message,
    category: 'unknown',
    reason: 'unknown',
    retryable: true,
    operatorActionRequired: true,
    autoRecoverable: false,
  };

  if (/AGENT_TOKEN_MISSING|AGENT_EXEC_TEMPLATE_MISSING|AGENT_BACKEND_UNSUPPORTED/.test(code)) {
    classification.category = 'config';
    classification.reason = 'config-missing';
    classification.retryable = false;
  } else if (/UNAUTHORIZED|AUTH/i.test(code)) {
    classification.category = 'auth';
    classification.reason = 'auth-failed';
    classification.retryable = false;
  } else if (/TIMEOUT/.test(code)) {
    classification.category = 'timeout';
    classification.reason = 'command-timeout';
    classification.retryable = true;
    classification.operatorActionRequired = false;
  } else if (
    /UNREACHABLE/.test(code)
    || /econnrefused|econnreset|ehostunreach|enotfound|request failed/.test(detailText)
  ) {
    classification.category = 'network';
    classification.reason = 'agent-unreachable';
    classification.retryable = true;
    classification.operatorActionRequired = false;
  } else if (
    detailText.includes('scum window not found')
    || detailText.includes('main window handle')
  ) {
    classification.category = 'client-window';
    classification.reason = 'window-not-found';
    classification.retryable = true;
  } else if (detailText.includes('foreground') || detailText.includes('focus')) {
    classification.category = 'client-focus';
    classification.reason = 'window-focus-failed';
    classification.retryable = true;
  } else if (detailText.includes('resolution') || detailText.includes('viewport')) {
    classification.category = 'client-window';
    classification.reason = 'window-resolution-failed';
    classification.retryable = true;
  } else if (detailText.includes('windows session') || detailText.includes('interactive desktop')) {
    classification.category = 'windows-session';
    classification.reason = 'session-unavailable';
    classification.retryable = true;
  } else if (
    detailText.includes('command is required')
    || detailText.includes('only scum admin commands starting with #')
  ) {
    classification.category = 'command-validation';
    classification.reason = 'command-rejected';
    classification.retryable = false;
  }

  return classification;
}

function buildAgentRecovery(classification) {
  if (!classification) return null;

  const recovery = {
    action: 'inspect-agent',
    hint: 'Inspect the delivery agent state before retrying.',
    retryable: classification.retryable === true,
    operatorActionRequired: classification.operatorActionRequired === true,
    autoRecoverable: false,
  };

  if (classification.category === 'config') {
    recovery.action = 'fix-config';
    recovery.hint = 'Fix the delivery-agent configuration and rerun preflight before retrying.';
  } else if (classification.category === 'auth') {
    recovery.action = 'fix-auth';
    recovery.hint = 'Align the delivery-agent token/auth settings and rerun preflight.';
  } else if (classification.category === 'timeout') {
    recovery.action = 'retry-after-client-check';
    recovery.hint = 'Check SCUM client responsiveness and command timeout settings, then retry.';
  } else if (classification.category === 'network') {
    recovery.action = 'check-agent-reachability';
    recovery.hint = 'Check the delivery-agent endpoint and local networking, then retry.';
  } else if (classification.category === 'client-window') {
    recovery.action = 'restore-scum-window';
    recovery.hint = 'Restore the SCUM client window/title binding and rerun preflight.';
  } else if (classification.category === 'client-focus') {
    recovery.action = 'restore-window-focus';
    recovery.hint = 'Bring the SCUM window to the foreground and keep the session unlocked before retrying.';
  } else if (classification.category === 'windows-session') {
    recovery.action = 'unlock-session';
    recovery.hint = 'Unlock the Windows session and keep the interactive desktop available before retrying.';
  } else if (classification.category === 'command-validation') {
    recovery.action = 'fix-command';
    recovery.hint = 'Fix the command/template input before retrying.';
  }

  return recovery;
}

function summarizeExecFailure(error, fallbackCode = 'AGENT_EXEC_FAILED') {
  const stderr = trimText(error?.stderr || '', 600);
  const stdout = trimText(error?.stdout || '', 600);
  const detail = {
    shellCommand: String(error?.displayCommand || '').trim() || null,
    stderr: stderr || null,
    stdout: stdout || null,
    exitCode:
      Number.isFinite(Number(error?.exitCode)) ? Number(error.exitCode) : null,
    signal: String(error?.signal || '').trim() || null,
  };
  const message =
    stderr
    || stdout
    || trimText(error?.message || 'Command failed', 300);
  return createAgentError(
    fallbackCode,
    message,
    detail,
  );
}

function secureTokenMatch(actual, expected) {
  const left = String(actual || '').trim();
  const right = String(expected || '').trim();
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeHost(value, fallback = '127.0.0.1') {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizeBaseUrl(value, host, port) {
  const text = String(value || '').trim();
  if (text) return text.replace(/\/+$/, '');
  return `http://${host}:${port}`;
}

function isWindowScriptTemplate(template) {
  return /send-scum-admin-command\.ps1/i.test(String(template || ''));
}

function getAgentSettings(env = process.env) {
  const host = normalizeHost(env.SCUM_CONSOLE_AGENT_HOST, '127.0.0.1');
  const port = Math.max(1, Math.trunc(asNumber(env.SCUM_CONSOLE_AGENT_PORT, 3213)));
  const backend = String(env.SCUM_CONSOLE_AGENT_BACKEND || 'exec').trim().toLowerCase() || 'exec';
  const token = String(env.SCUM_CONSOLE_AGENT_TOKEN || '').trim();
  const commandTimeoutMs = Math.max(
    1000,
    Math.trunc(asNumber(env.SCUM_CONSOLE_AGENT_COMMAND_TIMEOUT_MS, 15000)),
  );
  const allowNonHashCommands = envFlag(
    env.SCUM_CONSOLE_AGENT_ALLOW_NON_HASH,
    false,
  );

  return {
    host,
    port,
    baseUrl: normalizeBaseUrl(env.SCUM_CONSOLE_AGENT_BASE_URL, host, port),
    token,
    backend,
    execTemplate: String(env.SCUM_CONSOLE_AGENT_EXEC_TEMPLATE || '').trim(),
    commandTimeoutMs,
    allowNonHashCommands,
  };
}

function createJsonResponder(res) {
  return (statusCode, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  };
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`invalid json: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function startScumConsoleAgent(options = {}) {
  const env = options.env || process.env;
  const settings = getAgentSettings(env);
  const name = String(options.name || 'scum-console-agent').trim() || 'scum-console-agent';
  const platformPresence = createPlatformAgentPresenceService({
    env,
    role: 'execute',
    scope: 'execute_only',
    runtimeKey: trimText(env.SCUM_AGENT_RUNTIME_KEY || env.SCUM_CONSOLE_AGENT_RUNTIME_KEY, 160) || 'scum-console-agent',
    agentId: trimText(env.SCUM_AGENT_ID || env.SCUM_CONSOLE_AGENT_ID, 160) || 'scum-console-agent',
    displayName: trimText(env.SCUM_CONSOLE_AGENT_NAME, 160) || 'Delivery Agent',
    localBaseUrl: settings.baseUrl,
  });

  let shuttingDown = false;
  let lastCommandAt = null;
  let lastSuccessAt = null;
  let lastError = null;
  let lastErrorCode = null;
  let lastErrorMeta = null;
  let lastPreflightAt = null;
  let lastPreflight = null;
  const startedAt = new Date().toISOString();
  let executeCount = 0;
  let activeExecutionCount = 0;
  let queuedExecutionCount = 0;
  let executionQueue = Promise.resolve();
  const recentExecutions = [];

  function pushExecution(entry) {
    recentExecutions.push({
      at: new Date().toISOString(),
      ...entry,
    });
    if (recentExecutions.length > 25) {
      recentExecutions.splice(0, recentExecutions.length - 25);
    }
  }

  function getQueueDepth() {
    return Math.max(0, queuedExecutionCount);
  }

  function getCurrentAgentIssue() {
    if (lastErrorCode || lastError) {
      return {
        code: lastErrorCode || 'AGENT_EXEC_FAILED',
        message: lastError || 'Agent reported an error',
        meta: lastErrorMeta,
      };
    }
    return null;
  }

  function buildCurrentAgentDiagnostic() {
    const issue = getCurrentAgentIssue();
    if (!issue) {
      return {
        classification: null,
        recovery: null,
      };
    }
    const classification = classifyAgentIssue(
      issue.code,
      issue.message,
      issue.meta,
    );
    return {
      classification,
      recovery: buildAgentRecovery(classification),
    };
  }

  function getAgentStatus() {
    if (!settings.token) {
      return { status: 'error', ready: false, code: 'AGENT_TOKEN_MISSING', message: 'SCUM_CONSOLE_AGENT_TOKEN is not set' };
    }
    if (settings.backend !== 'exec') {
      return {
        status: 'error',
        ready: false,
        code: 'AGENT_BACKEND_UNSUPPORTED',
        message: `Unsupported delivery-agent backend: ${settings.backend}`,
      };
    }
    if (!settings.execTemplate) {
      return { status: 'error', ready: false, code: 'AGENT_EXEC_TEMPLATE_MISSING', message: 'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE is not set' };
    }
    if (lastErrorCode || lastError) {
      const issue = getCurrentAgentIssue();
      return {
        status: 'degraded',
        ready: false,
        code: issue?.code || lastErrorCode || 'AGENT_EXEC_FAILED',
        message: issue?.message || lastError || 'Agent reported an error',
      };
    }
    return { status: 'ready', ready: true, code: 'READY', message: 'Agent ready' };
  }

  function buildExecInvocation(command, optionsInput = {}) {
    if (!settings.execTemplate) {
      throw createAgentError(
        'AGENT_EXEC_TEMPLATE_MISSING',
        'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE is not set',
      );
    }
    validateCommandTemplate(settings.execTemplate);
    return {
      template: settings.execTemplate,
      vars: { command },
      extraArgs:
        optionsInput.checkOnly && isWindowScriptTemplate(settings.execTemplate)
          ? ['-CheckOnly']
          : [],
    };
  }

  function ensureCommandAllowed(command) {
    const trimmed = String(command || '').trim();
    if (!trimmed) {
      throw createAgentError('AGENT_COMMAND_REQUIRED', 'command is required');
    }
    if (!settings.allowNonHashCommands && !trimmed.startsWith('#')) {
      throw createAgentError(
        'AGENT_COMMAND_NOT_ALLOWED',
        'agent only allows SCUM admin commands starting with # by default',
      );
    }
    return trimmed;
  }

  async function executeWithExecBackend(command) {
    const invocation = buildExecInvocation(command);
    const result = await executeCommandTemplate(
      invocation.template,
      invocation.vars,
      {
        extraArgs: invocation.extraArgs,
        timeoutMs: settings.commandTimeoutMs,
        windowsHide: true,
        cwd: process.cwd(),
      },
    );
    return {
      backend: 'exec',
      accepted: true,
      shellCommand: result.displayCommand,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  async function runPreflight() {
    lastPreflightAt = new Date().toISOString();

    if (!settings.token) {
      throw createAgentError('AGENT_TOKEN_MISSING', 'SCUM_CONSOLE_AGENT_TOKEN is not set');
    }
    if (settings.backend !== 'exec') {
      throw createAgentError('AGENT_BACKEND_UNSUPPORTED', `Unsupported delivery-agent backend: ${settings.backend}`);
    }
    if (!settings.execTemplate) {
      throw createAgentError(
        'AGENT_EXEC_TEMPLATE_MISSING',
        'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE is not set',
      );
    }

    if (isWindowScriptTemplate(settings.execTemplate)) {
      const invocation = buildExecInvocation('#Announce PREFLIGHT', {
        checkOnly: true,
      });
      try {
        const result = await executeCommandTemplate(
          invocation.template,
          invocation.vars,
          {
            extraArgs: invocation.extraArgs,
            timeoutMs: settings.commandTimeoutMs,
            windowsHide: true,
            cwd: process.cwd(),
          },
        );
        lastPreflight = {
          ok: true,
          backend: 'exec',
          check: 'window-script',
          mode: 'window-script',
          shellCommand: result.displayCommand,
          detail: {
            stdout: trimText(result.stdout, 600) || null,
            stderr: trimText(result.stderr, 600) || null,
            shellCommand: result.displayCommand,
          },
          classification: null,
          recovery: null,
        };
      } catch (error) {
        throw summarizeExecFailure(error, 'AGENT_PREFLIGHT_FAILED');
      }
    } else {
      lastPreflight = {
        ok: true,
        backend: 'exec',
        check: 'config',
        mode: 'config-exec',
        shellCommand: null,
        detail: {
          templateConfigured: true,
          windowAware: false,
        },
        classification: null,
        recovery: null,
      };
    }

    lastError = null;
    lastErrorCode = null;
    lastErrorMeta = null;
    return lastPreflight;
  }

  async function executeCommand(command) {
    const normalizedCommand = ensureCommandAllowed(command);
    const executeOnce = async () => {
      activeExecutionCount += 1;
      lastCommandAt = new Date().toISOString();
      executeCount += 1;

      try {
        const result = await executeWithExecBackend(normalizedCommand).catch((error) => {
          throw summarizeExecFailure(error, 'AGENT_EXEC_FAILED');
        });

        lastSuccessAt = new Date().toISOString();
        lastError = null;
        lastErrorCode = null;
        lastErrorMeta = null;

        pushExecution({
          ok: true,
          backend: 'exec',
          command: normalizedCommand,
          stdout: trimText(result.stdout, 250),
          stderr: trimText(result.stderr, 250),
        });
        return result;
      } catch (error) {
        lastError = error.message;
        lastErrorCode = String(error.agentCode || error.code || 'AGENT_EXEC_FAILED');
        lastErrorMeta = error.meta || null;
        throw error;
      } finally {
        activeExecutionCount = Math.max(0, activeExecutionCount - 1);
        queuedExecutionCount = Math.max(0, queuedExecutionCount - 1);
      }
    };

    queuedExecutionCount += 1;
    const nextExecution = executionQueue.then(executeOnce);
    executionQueue = nextExecution.catch(() => {});
    return nextExecution;
  }

  const server = http.createServer(async (req, res) => {
    const reply = createJsonResponder(res);
    const url = new URL(req.url || '/', settings.baseUrl);
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-agent-token'] || '';
    const authorized = secureTokenMatch(token, settings.token);

    if (req.method === 'GET' && url.pathname === '/healthz') {
      const status = getAgentStatus();
      const diagnostic = buildCurrentAgentDiagnostic();
      return reply(200, {
        ok: true,
        name,
        host: settings.host,
        port: settings.port,
        backend: settings.backend,
        ready: status.ready,
        status: status.status,
        statusCode: status.code,
        statusMessage: status.message,
        startedAt,
        lastCommandAt,
        lastSuccessAt,
        lastError,
        lastErrorCode,
        lastErrorDetail: lastErrorMeta,
        lastPreflightAt,
        lastPreflight,
        classification: diagnostic.classification,
        recovery: diagnostic.recovery,
        activeExecutionCount,
        recentExecutions: recentExecutions.slice(-10),
        executeCount,
        queueDepth: getQueueDepth(),
        managedServer: null,
      });
    }

    if (req.method === 'GET' && url.pathname === '/preflight') {
      if (!authorized) {
        return reply(401, { ok: false, error: 'unauthorized' });
      }
      try {
        const result = await runPreflight();
        const status = getAgentStatus();
        const diagnostic = buildCurrentAgentDiagnostic();
        return reply(200, {
          ok: true,
          ready: status.ready,
          status: status.status,
          statusCode: status.code,
          statusMessage: status.message,
          classification: diagnostic.classification,
          recovery: diagnostic.recovery,
          result,
        });
      } catch (error) {
        lastError = error.message;
        lastErrorCode = String(error.agentCode || error.code || 'AGENT_PREFLIGHT_FAILED');
        lastErrorMeta = error.meta || null;
        const classification = classifyAgentIssue(
          lastErrorCode,
          error.message,
          error.meta || null,
        );
        const recovery = buildAgentRecovery(classification);
        lastPreflight = {
          ok: false,
          backend: settings.backend,
          error: error.message,
          errorCode: lastErrorCode,
          detail: error.meta || null,
          classification,
          recovery,
        };
        return reply(500, {
          ok: false,
          ready: false,
          error: error.message,
          errorCode: lastErrorCode,
          classification,
          recovery,
          result: lastPreflight,
        });
      }
    }

    if (req.method !== 'POST') {
      return reply(405, { ok: false, error: 'method-not-allowed' });
    }

    if (!authorized) {
      return reply(401, { ok: false, error: 'unauthorized' });
    }

    let body = {};
    try {
      body = await parseRequestBody(req);
    } catch (error) {
      return reply(400, { ok: false, error: error.message });
    }

    if (url.pathname === '/execute') {
      try {
        const result = await executeCommand(body.command);
        return reply(200, { ok: true, result });
      } catch (error) {
        lastError = error.message;
        lastErrorCode = String(error.agentCode || error.code || 'AGENT_EXEC_FAILED');
        lastErrorMeta = error.meta || null;
        const classification = classifyAgentIssue(
          lastErrorCode,
          error.message,
          error.meta || null,
        );
        const recovery = buildAgentRecovery(classification);
        pushExecution({
          ok: false,
          backend: settings.backend,
          command: String(body.command || '').trim(),
          error: error.message,
          errorCode: lastErrorCode,
          classification,
        });
        return reply(500, {
          ok: false,
          error: error.message,
          errorCode: lastErrorCode,
          classification,
          recovery,
        });
      }
    }

    return reply(404, { ok: false, error: 'not-found' });
  });

  server.on('error', (error) => {
    lastError = error.message;
    lastErrorCode = String(error.code || 'AGENT_SERVER_ERROR');
    lastErrorMeta = null;
    console.error(`[${name}] server error:`, error.message);
  });

  const ready = new Promise((resolve) => {
    server.listen(settings.port, settings.host, () => {
      console.log(`[${name}] listening at http://${settings.host}:${settings.port}`);
      console.log(`[${name}] backend=${settings.backend}`);
      void platformPresence.start({
        getDiagnostics: () => ({
          backend: settings.backend,
          baseUrl: settings.baseUrl,
          queueDepth: getQueueDepth(),
          activeExecutionCount,
          lastCommandAt,
          lastSuccessAt,
          statusCode: getAgentStatus().code,
        }),
      }).catch(() => null);
      resolve();
    });
  });

  return {
    server,
    settings,
    ready,
    async close() {
      shuttingDown = true;
      if (shuttingDown) {
        await platformPresence.close().catch(() => null);
      }
      await new Promise((resolve) => server.close(resolve));
    },
    getStatus() {
      return getAgentStatus();
    },
  };
}

module.exports = {
  getAgentSettings,
  startScumConsoleAgent,
};
