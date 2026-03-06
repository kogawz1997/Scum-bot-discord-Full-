require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { assertRegisterEnv } = require('./utils/env');

assertRegisterEnv();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`Command ที่ ${filePath} ไม่มี "data" หรือ "execute"`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(
      `กำลังรีเฟรช ${commands.length} application (/) commands สำหรับ guild ${guildId}...`,
    );

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log('อัปเดต slash commands สำเร็จแล้ว ✅');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดตอนอัปเดต commands', error);
  }
})();

