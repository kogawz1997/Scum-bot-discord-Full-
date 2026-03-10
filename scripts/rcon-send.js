#!/usr/bin/env node
'use strict';

const { Rcon } = require('rcon-client');

function readArg(argv, key, fallback = '') {
  const flag = `--${key}`;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== flag) continue;
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) return fallback;
    return next;
  }
  return fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

async function main() {
  const argv = process.argv.slice(2);
  const host = String(readArg(argv, 'host', process.env.RCON_HOST || '')).trim();
  const port = parseNumber(readArg(argv, 'port', process.env.RCON_PORT || '27015'), 27015);
  const password = String(
    readArg(argv, 'password', process.env.RCON_PASSWORD || ''),
  ).trim();
  const timeoutMs = Math.max(
    1000,
    parseNumber(readArg(argv, 'timeout', process.env.RCON_TIMEOUT_MS || '10000'), 10000),
  );

  let command = String(readArg(argv, 'command', '')).trim();
  if (!command) {
    const positional = argv.filter((token, index) => {
      if (token.startsWith('--')) return false;
      const prev = argv[index - 1];
      if (prev && prev.startsWith('--')) return false;
      return true;
    });
    command = positional.join(' ').trim();
  }

  if (!host) {
    console.error('rcon-send: missing --host');
    process.exit(2);
  }
  if (!password) {
    console.error('rcon-send: missing --password');
    process.exit(2);
  }
  if (!command) {
    console.error('rcon-send: missing --command');
    process.exit(2);
  }

  let rcon = null;
  try {
    rcon = await Rcon.connect({
      host,
      port,
      password,
      timeout: timeoutMs,
      maxPending: 1,
    });
    const response = await rcon.send(command);
    const output = String(response || '').trim();
    if (output) {
      process.stdout.write(output);
      if (!output.endsWith('\n')) process.stdout.write('\n');
    }
  } catch (error) {
    const message = String(error?.message || error || 'unknown rcon error');
    process.stderr.write(`rcon-send: ${message}\n`);
    process.exitCode = 1;
  } finally {
    if (rcon) {
      try {
        await rcon.end();
      } catch {
        // Ignore close errors.
      }
    }
  }
}

void main();
