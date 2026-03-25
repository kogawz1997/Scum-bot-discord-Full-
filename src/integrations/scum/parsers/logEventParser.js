'use strict';

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseDistance(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(1)) : null;
}

function parseHitZone(sourceText) {
  const matched = String(sourceText || '').match(
    /\b(headshot|head|torso|chest|arm|leg|abdomen)\b/i,
  );
  if (!matched) return null;
  const rawZone = cleanName(matched[1]).toLowerCase();
  if (rawZone === 'headshot' || rawZone === 'head') return 'head';
  if (
    rawZone === 'torso'
    || rawZone === 'chest'
    || rawZone === 'abdomen'
    || rawZone === 'arm'
    || rawZone === 'leg'
  ) {
    return 'body';
  }
  return rawZone;
}

function parseSector(sourceText) {
  const matched = String(sourceText || '').match(/\bsector\s+([A-Z]\d{1,2})\b/i);
  return matched ? cleanName(matched[1]) : null;
}

function parseMapImageUrl(sourceText) {
  const text = String(sourceText || '');
  if (!text) return null;
  const matched = text.match(
    /(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>]*)?)/i,
  );
  return matched ? String(matched[1]) : null;
}

function toKillEvent(groups, weapon, distance, sourceText) {
  return {
    type: 'kill',
    killer: cleanName(groups.killerName),
    killerSteamId: String(groups.killerSteamId || ''),
    victim: cleanName(groups.victimName),
    victimSteamId: String(groups.victimSteamId || ''),
    weapon: weapon ? cleanName(weapon) : null,
    distance: parseDistance(distance),
    hitZone: parseHitZone(sourceText),
    sector: parseSector(sourceText),
    mapImageUrl: parseMapImageUrl(sourceText),
  };
}

const RESTART_PATTERNS = [
  /\blog file closed\b/i,
  /\bshutdown\b/i,
  /\brestarting\b/i,
  /\bserver is shutting down\b/i,
];

function parseScumLogLine(line) {
  const text = String(line || '').replace(/\u0000/g, '').trim();
  if (!text) return null;

  let match = text.match(/LogSCUM:\s+User\s+'(?<playerName>.+?)'\s+logged in/i);
  if (match?.groups?.playerName) {
    return {
      type: 'join',
      playerName: cleanName(match.groups.playerName),
    };
  }

  match = text.match(
    /LogSCUM:\s+'(?<remoteAddress>[^ ]+)\s+(?<steamId>\d{15,25}):(?<playerName>.+?)\(\d+\)'\s+logged in at:/i,
  );
  if (match?.groups?.playerName) {
    return {
      type: 'join',
      playerName: cleanName(match.groups.playerName),
      steamId: match.groups.steamId || null,
      remoteAddress: cleanName(match.groups.remoteAddress),
    };
  }

  match = text.match(
    /LogSCUM:\s+Warning:\s+Prisoner logging out:\s+(?<playerName>.+?)(?:\s+\((?<steamId>\d{15,25})\))?$/i,
  );
  if (match?.groups?.playerName) {
    return {
      type: 'leave',
      playerName: cleanName(match.groups.playerName),
      steamId: match.groups.steamId || null,
    };
  }

  match = text.match(
    /LogBattlEye:\s+Display:\s+Player\s+#\d+\s+(?<playerName>.+?)\s+\([^)]+\)\s+disconnected/i,
  );
  if (match?.groups?.playerName) {
    return {
      type: 'leave',
      playerName: cleanName(match.groups.playerName),
      steamId: null,
    };
  }

  match = text.match(
    /LogSCUM:\s+'(?<steamId>\d{15,25}):(?<playerName>.+?)\(\d+\)'\s+Command:\s+'(?<command>.+?)'$/i,
  );
  if (match?.groups?.command) {
    const commandText = cleanName(match.groups.command);
    const commandName = String(commandText.split(/\s+/)[0] || '').trim() || null;
    return {
      type: 'admin-command',
      playerName: cleanName(match.groups.playerName),
      steamId: match.groups.steamId || null,
      command: commandText,
      commandName,
    };
  }

  const killWithWeapon = text.match(
    /LogSCUM:\s+'(?<victimSteamId>\d+):(?<victimName>.+?)\(\d+\)'\s+was killed by\s+'(?<killerSteamId>\d+):(?<killerName>.+?)\(\d+\)'\s+with\s+'(?<weapon>[^']+)'(?:\s+from\s+(?<distance>\d+(?:\.\d+)?)\s*m?)?/i,
  );
  if (killWithWeapon?.groups) {
    return toKillEvent(
      killWithWeapon.groups,
      killWithWeapon.groups.weapon,
      killWithWeapon.groups.distance,
      text,
    );
  }

  const killWithUsing = text.match(
    /LogSCUM:\s+'(?<victimSteamId>\d+):(?<victimName>.+?)\(\d+\)'\s+was killed by\s+'(?<killerSteamId>\d+):(?<killerName>.+?)\(\d+\)'\s+using\s+'(?<weapon>[^']+)'(?:\s+from\s+(?<distance>\d+(?:\.\d+)?)\s*m?)?/i,
  );
  if (killWithUsing?.groups) {
    return toKillEvent(
      killWithUsing.groups,
      killWithUsing.groups.weapon,
      killWithUsing.groups.distance,
      text,
    );
  }

  const killNoWeapon = text.match(
    /LogSCUM:\s+'(?<victimSteamId>\d+):(?<victimName>.+?)\(\d+\)'\s+was killed by\s+'(?<killerSteamId>\d+):(?<killerName>.+?)\(\d+\)'/i,
  );
  if (killNoWeapon?.groups) {
    return toKillEvent(killNoWeapon.groups, null, null, text);
  }

  if (RESTART_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      type: 'restart',
      message: 'Server is shutting down (or restarting)',
    };
  }

  return null;
}

module.exports = {
  cleanName,
  parseDistance,
  parseHitZone,
  parseMapImageUrl,
  parseScumLogLine,
  parseSector,
};
