const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requestRentBike } = require('../services/rentBikeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rentbike')
    .setDescription('เช่ามอไซรายวัน (จำกัด 1 ครั้งต่อวัน)'),
  async execute(interaction) {
    const result = await requestRentBike(interaction.user.id, interaction.guildId || null);
    if (!result.ok) {
      return interaction.reply({
        content: result.message || 'ไม่สามารถเช่ามอไซได้ในขณะนี้',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `${result.message}\nหากไม่ขึ้นรถทันที ให้รอระบบคิวประมวลผล 5-15 วินาที`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

