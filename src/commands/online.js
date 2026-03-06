const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatus } = require('../store/scumStore');
const { serverInfo } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('online')
    .setDescription('ดูจำนวนผู้เล่นออนไลน์บนเซิร์ฟ SCUM'),
  async execute(interaction) {
    const status = getStatus();

    const embed = new EmbedBuilder()
      .setTitle(`สถานะเซิร์ฟเวอร์ ${serverInfo.name}`)
      .setDescription(
        [
          `ผู้เล่นออนไลน์: **${status.onlinePlayers}/${status.maxPlayers}**`,
          status.pingMs != null ? `ping: **${status.pingMs} ms**` : null,
          status.uptimeMinutes != null
            ? `uptime: **${Math.floor(status.uptimeMinutes)} นาที**`
            : null,
          status.lastUpdated
            ? `อัปเดตล่าสุด: <t:${Math.floor(
                new Date(status.lastUpdated).getTime() / 1000,
              )}:R>`
            : 'ยังไม่เคยได้รับสถานะจากเซิร์ฟภายนอก',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .setColor(0x00ff7f);

    await interaction.reply({ embeds: [embed] });
  },
};

