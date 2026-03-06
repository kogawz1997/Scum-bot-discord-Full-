const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { roles, channels } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('ยกเลิกปิดแชทผู้ใช้')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการปลดปิดแชท')
        .setRequired(true),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const guild = interaction.guild;

    if (!guild) {
      return interaction.reply({
        content: 'คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์',
        flags: MessageFlags.Ephemeral,
      });
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'ไม่พบสมาชิกคนนี้ในเซิร์ฟเวอร์',
        flags: MessageFlags.Ephemeral,
      });
    }

    const mutedRole = guild.roles.cache.find((r) => r.name === roles.muted);
    if (!mutedRole) {
      return interaction.reply({
        content: `ไม่พบยศ "${roles.muted}"`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await member.roles.remove(mutedRole, `ปลดปิดแชทโดย ${interaction.user.tag}`);

    await interaction.reply(`🔊 ยกเลิกปิดแชทให้กับ ${member} แล้ว`);

    const logChannel = guild.channels.cache.find(
      (c) => c.name === channels.adminLog,
    );
    if (logChannel && logChannel.isTextBased && logChannel.isTextBased()) {
      await logChannel.send(
        `🔊 **ปลดปิดแชท** | ผู้ใช้: ${member} | โดย: ${interaction.user}`,
      );
    }
  },
};
