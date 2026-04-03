const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readTenantAppSource() {
  return fs.readFileSync(path.join(__dirname, '..', 'src', 'admin', 'assets', 'tenant-v4-app.js'), 'utf8');
}

test('tenant v4 app collects tenant player support assign and escalation controls', () => {
  const source = readTenantAppSource();

  assert.match(source, /const assignButtons = Array\.from\(document\.querySelectorAll\('\[data-tenant-player-ticket-assign\]'\)\);/);
  assert.match(source, /const escalationButtons = Array\.from\(document\.querySelectorAll\('\[data-tenant-player-ticket-escalate\]\[data-escalated\]'\)\);/);
  assert.match(source, /\.\.\.assignButtons,\s*\.\.\.escalationButtons,\s*\.\.\.reviewButtons,\s*\.\.\.closeButtons/s);
});

test('tenant v4 app wires assign and escalation mutations through the existing player support flow', () => {
  const source = readTenantAppSource();

  assert.match(source, /data-tenant-player-ticket-assign/);
  assert.match(source, /apiRequest\('\/admin\/api\/ticket\/assign'/);
  assert.match(source, /Support ticket \$\{channelId\} assigned to the current operator\./);
  assert.match(source, /data-tenant-player-ticket-escalate/);
  assert.match(source, /apiRequest\('\/admin\/api\/ticket\/escalate'/);
  assert.match(source, /Support ticket \$\{channelId\} escalated\./);
  assert.match(source, /Support ticket \$\{channelId\} returned to the active queue\./);
});
