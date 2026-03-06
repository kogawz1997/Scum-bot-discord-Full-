const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { restartSchedule } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart-schedule')
    .setDescription('ดูตารางรีสตาร์ทเซิร์ฟ'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🕒 ตารางรีสตาร์ทเซิร์ฟเวอร์')
      .setDescription(restartSchedule.map((x) => `• ${x}`).join('\n'))
      .setColor(0xff6347);

    await interaction.reply({ embeds: [embed] });
  },
};

