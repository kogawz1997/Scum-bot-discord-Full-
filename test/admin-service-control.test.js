const test = require('node:test');
const assert = require('node:assert/strict');

const {
  listManagedRuntimeServices,
} = require('../src/services/adminServiceControl');

test('managed runtime services expose standalone admin web separately from discord bot', () => {
  const services = listManagedRuntimeServices();
  const adminWeb = services.find((entry) => entry.key === 'admin-web');
  const bot = services.find((entry) => entry.key === 'bot');
  const serverBot = services.find((entry) => entry.key === 'server-bot');

  assert.ok(adminWeb);
  assert.ok(bot);
  assert.ok(serverBot);
  assert.equal(adminWeb.pm2Name, 'scum-admin-web');
  assert.equal(bot.pm2Name, 'scum-bot');
  assert.equal(serverBot.pm2Name, 'scum-server-bot');
  assert.match(String(adminWeb.label || ''), /admin web/i);
  assert.match(String(bot.label || ''), /discord bot/i);
  assert.match(String(serverBot.label || ''), /server bot/i);
});
