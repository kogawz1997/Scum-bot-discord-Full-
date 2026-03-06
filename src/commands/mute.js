const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { roles, channels } = require('../config');
const { addPunishment } = require('../store/moderationStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('ปิดแชทผู้ใช้ชั่วคราว')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการปิดแชท')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('minutes')
        .setDescription('เวลาที่จะปิดแชท (นาที)')
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('เหตุผล')
        .setRequired(true),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason', true);
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
        content: `ไม่พบยศ "${roles.muted}" กรุณาสร้างยศก่อน`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await member.roles.add(mutedRole, `ปิดแชทโดย ${interaction.user.tag}: ${reason}`);
    addPunishment(member.id, 'mute', reason, interaction.user.id, minutes);

    await interaction.reply(
      `🔇 ${member} ถูกปิดแชทเป็นเวลา ${minutes} นาที | เหตุผล: ${reason}`,
    );

    const logChannel = guild.channels.cache.find(
      (c) => c.name === channels.adminLog,
    );
    if (logChannel && logChannel.isTextBased && logChannel.isTextBased()) {
      await logChannel.send(
        `🔇 **ปิดแชท** | ผู้ใช้: ${member} | โดย: ${interaction.user} | ${minutes} นาที | เหตุผล: ${reason}`,
      );
    }
  },
};
