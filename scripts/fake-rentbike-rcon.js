const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function getStatePath() {
  const fromEnv = String(process.env.FAKE_RENTBIKE_STATE_PATH || '').trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.tmpdir(), 'fake-rentbike-rcon-state.json');
}

function loadState(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('invalid state');
    }
    return {
      nextId: Number(parsed.nextId || 9000),
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
    };
  } catch {
    return {
      nextId: 9000,
      vehicles: [],
    };
  }
}

function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

function findNumericToken(text) {
  const match = String(text || '').match(/\b(\d{1,12})\b/);
  return match ? String(match[1]) : '';
}

function main() {
  const statePath = getStatePath();
  const state = loadState(statePath);
  const command = process.argv.slice(2).join(' ').trim();
  const lower = command.toLowerCase();

  if (lower.startsWith('#listspawnedvehicles')) {
    if (state.vehicles.length === 0) {
      process.stdout.write('No vehicles\n');
      return;
    }
    const lines = state.vehicles.map(
      (row) => `VehicleID: ${row.id} Type: ${row.type || 'Motorbike'}`,
    );
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }

  if (lower.startsWith('#spawnvehicle')) {
    state.nextId += 1;
    const id = String(state.nextId);
    state.vehicles.push({
      id,
      type: 'Motorbike',
    });
    saveState(statePath, state);
    process.stdout.write(`Spawned vehicle ${id}\n`);
    return;
  }

  if (lower.startsWith('#destroyvehicle')) {
    const targetId = findNumericToken(command);
    const before = state.vehicles.length;
    state.vehicles = state.vehicles.filter((row) => String(row.id) !== targetId);
    saveState(statePath, state);
    if (state.vehicles.length < before) {
      process.stdout.write(`Destroyed vehicle ${targetId}\n`);
      return;
    }
    process.stderr.write(`Vehicle not found: ${targetId}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Unknown command: ${command}\n`);
}

main();
