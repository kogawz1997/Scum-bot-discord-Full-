const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { raidTimes } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidtimes')
    .setDescription('ดูช่วงเวลาเรดฐาน'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⏰ เวลาเรดฐาน')
      .setDescription(raidTimes.map((x) => `• ${x}`).join('\n'))
      .setColor(0xffd700);

    await interaction.reply({ embeds: [embed] });
  },
};
