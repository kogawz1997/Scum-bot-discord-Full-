const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStats } = require('../store/statsStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('ดูสถิติของคุณ (คิล/ตาย/คิลต่อเดธ/เวลาเล่น)')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ดูสถิติของคนอื่น (ถ้ามีสิทธิ์)')
        .setRequired(false),
    ),
  async execute(interaction) {
    const target =
      interaction.options.getUser('user') ?? interaction.user;

    const s = getStats(target.id);
    const kd = s.deaths === 0 ? s.kills : s.kills / s.deaths;

    const embed = new EmbedBuilder()
      .setTitle(`📊 สถิติของ ${target.tag}`)
      .addFields(
        { name: 'คิล', value: `${s.kills}`, inline: true },
        { name: 'ตาย', value: `${s.deaths}`, inline: true },
        { name: 'คิล/ตาย', value: kd.toFixed(2), inline: true },
        {
          name: 'เวลาเล่น',
          value: `${Math.floor(s.playtimeMinutes / 60)} ชม. ${s.playtimeMinutes % 60} นาที`,
        },
      )
      .setColor(0x00ced1);

    await interaction.reply({ embeds: [embed] });
  },
};
