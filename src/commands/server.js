const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { serverInfo } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('ดูข้อมูลเซิร์ฟเวอร์แบบย่อ (ไอพี/พอร์ต/กติกา)'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle(serverInfo.name)
      .setDescription(serverInfo.description)
      .addFields(
        {
          name: 'ไอพี / พอร์ต',
          value: `\`${serverInfo.ip}:${serverInfo.port}\``,
        },
        {
          name: 'กติกาคร่าว ๆ',
          value: serverInfo.rulesShort.join('\n'),
        },
      )
      .setColor(0x1e90ff);

    await interaction.reply({ embeds: [embed] });
  },
};
