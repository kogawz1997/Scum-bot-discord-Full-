const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const suspectTokens = [
  '\u00E0\u00B8',
  '\u00E0\u00B9',
  '\u00E2\u20AC',
  '\u00F0\u0178',
  '\uFFFD',
];

const targets = [
  path.resolve(__dirname, '../src/commands/stats.js'),
  path.resolve(__dirname, '../src/commands/top.js'),
  path.resolve(__dirname, '../src/commands/board.js'),
  path.resolve(__dirname, '../src/services/leaderboardPanels.js'),
];

test('user-facing Thai command text stays free of mojibake markers', () => {
  for (const filePath of targets) {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const token of suspectTokens) {
      assert.equal(
        text.includes(token),
        false,
        `${path.basename(filePath)} still contains mojibake token ${JSON.stringify(token)}`,
      );
    }
  }
});
