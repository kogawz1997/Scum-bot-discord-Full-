'use strict';

function trimText(value, maxLen = 240) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

async function requestConsoleAgent(pathname, options = {}) {
  const baseUrl = trimText(options.baseUrl, 400).replace(/\/+$/, '');
  const token = trimText(options.token, 500);
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || 10000) || 10000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${pathname}`, {
      method: options.method || 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    return {
      ok: res.ok && Boolean(payload?.ok ?? true),
      status: res.status,
      payload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  requestConsoleAgent,
};
