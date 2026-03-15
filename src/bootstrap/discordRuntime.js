'use strict';

/** Discord client and command bootstrap helpers. */

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  GatewayIntentBits,
} = require('discord.js');

function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  client.commands = new Collection();
  return client;
}

function loadDiscordCommands(client, commandsRootPath) {
  const commandsPath = path.resolve(
    String(commandsRootPath || path.join(process.cwd(), 'src', 'commands')).trim()
      || path.join(process.cwd(), 'src', 'commands'),
  );
  if (!fs.existsSync(commandsPath)) return [];

  const loaded = [];
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      loaded.push(command.data.name);
      continue;
    }
    console.warn(`Command file ${filePath} is missing "data" or "execute"`);
  }

  return loaded;
}

module.exports = {
  createDiscordClient,
  loadDiscordCommands,
};
