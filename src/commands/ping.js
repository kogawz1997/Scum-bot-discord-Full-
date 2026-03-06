const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ทดสอบบอทว่าตอบได้หรือไม่'),
  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'กำลังตรวจสอบความหน่วง...',
      fetchReply: true,
    });

    const ping = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`🏓 บอทตอบกลับแล้ว ความหน่วงประมาณ ${ping}ms`);
  },
};
