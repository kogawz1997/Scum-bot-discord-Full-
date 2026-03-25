const test = require('node:test');
const assert = require('node:assert/strict');

const { parseScumLogLine } = require('../src/integrations/scum/parsers/logEventParser');

test('parseScumLogLine normalizes kill events', () => {
  const line = "LogSCUM: '111:Victim(1)' was killed by '222:Killer(1)' with 'AK-47' from 123m (headshot)";
  const event = parseScumLogLine(line);
  assert.equal(event.type, 'kill');
  assert.equal(event.killer, 'Killer');
  assert.equal(event.killerSteamId, '222');
  assert.equal(event.victim, 'Victim');
  assert.equal(event.victimSteamId, '111');
  assert.equal(event.weapon, 'AK-47');
  assert.equal(event.distance, 123);
});

test('parseScumLogLine normalizes join events', () => {
  assert.deepEqual(
    parseScumLogLine("LogSCUM: User 'CokeTH' logged in"),
    { type: 'join', playerName: 'CokeTH' },
  );
});
