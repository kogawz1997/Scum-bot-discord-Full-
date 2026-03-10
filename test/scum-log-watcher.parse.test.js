const test = require('node:test');
const assert = require('node:assert/strict');

const { parseLine } = require('../scum-log-watcher');

test('parseLine handles join and leave events', () => {
  assert.deepEqual(
    parseLine("LogSCUM: User 'CokeTH' logged in"),
    { type: 'join', playerName: 'CokeTH' },
  );

  assert.deepEqual(
    parseLine(
      'LogSCUM: Warning: Prisoner logging out: CokeTH (76561198000000001)',
    ),
    {
      type: 'leave',
      playerName: 'CokeTH',
      steamId: '76561198000000001',
    },
  );
});

test('parseLine handles kill events with weapon, distance and hit zone', () => {
  const line =
    "LogSCUM: '111:Victim(1)' was killed by '222:Killer(1)' with 'AK-47' from 123m (headshot)";

  assert.deepEqual(parseLine(line), {
    type: 'kill',
    killer: 'Killer',
    killerSteamId: '222',
    victim: 'Victim',
    victimSteamId: '111',
    weapon: 'AK-47',
    distance: 123,
    hitZone: 'head',
    sector: null,
    mapImageUrl: null,
  });
});

test('parseLine handles kill events with "using" syntax and fallback syntax', () => {
  const usingLine =
    "LogSCUM: '333:VictimB(1)' was killed by '444:KillerB(1)' using 'M9' from 15m to the torso";
  assert.deepEqual(parseLine(usingLine), {
    type: 'kill',
    killer: 'KillerB',
    killerSteamId: '444',
    victim: 'VictimB',
    victimSteamId: '333',
    weapon: 'M9',
    distance: 15,
    hitZone: 'body',
    sector: null,
    mapImageUrl: null,
  });

  const fallbackLine =
    "LogSCUM: '555:VictimC(1)' was killed by '666:KillerC(1)'";
  assert.deepEqual(parseLine(fallbackLine), {
    type: 'kill',
    killer: 'KillerC',
    killerSteamId: '666',
    victim: 'VictimC',
    victimSteamId: '555',
    weapon: null,
    distance: null,
    hitZone: null,
    sector: null,
    mapImageUrl: null,
  });
});

test('parseLine extracts sector and map image when present in kill line', () => {
  const line =
    "LogSCUM: '777:VictimD(1)' was killed by '888:KillerD(1)' with 'M1911' from 19m sector B2 https://cdn.example.com/map-b2.jpg";

  assert.deepEqual(parseLine(line), {
    type: 'kill',
    killer: 'KillerD',
    killerSteamId: '888',
    victim: 'VictimD',
    victimSteamId: '777',
    weapon: 'M1911',
    distance: 19,
    hitZone: null,
    sector: 'B2',
    mapImageUrl: 'https://cdn.example.com/map-b2.jpg',
  });
});

test('parseLine handles restart signal lines', () => {
  assert.deepEqual(parseLine('Log file closed'), {
    type: 'restart',
    message: 'Server is shutting down (or restarting)',
  });
});
