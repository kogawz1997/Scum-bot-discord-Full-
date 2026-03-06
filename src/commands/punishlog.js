const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { getPunishments } = require('../store/moderationStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punishlog')
    .setDescription('ดูประวัติการลงโทษของผู้ใช้')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการดูประวัติ')
        .setRequired(true),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const list = getPunishments(target.id);

    if (list.length === 0) {
      return interaction.reply({
        content: `${target} ยังไม่มีประวัติการลงโทษ`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = list.map((p) => {
      const when = `<t:${Math.floor(
        new Date(p.createdAt).getTime() / 1000,
      )}:R>`;
      const base = `• [${p.type.toUpperCase()}] โดย <@${p.staffId}> | ${when} | เหตุผล: ${p.reason}`;
      if (p.durationMinutes) {
        return `${base} | เวลา: ${p.durationMinutes} นาที`;
      }
      return base;
    });

    const embed = new EmbedBuilder()
      .setTitle(`📂 ประวัติลงโทษของ ${target.tag}`)
      .setDescription(lines.join('\n'))
      .setColor(0xcd5c5c);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

