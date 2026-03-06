const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { channels } = require('../config');
const { addPunishment } = require('../store/moderationStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('เตือนผู้ใช้ (บันทึกลงระบบลงโทษ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการเตือน')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('เหตุผล')
        .setRequired(true),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const guild = interaction.guild;

    if (!guild) {
      return interaction.reply({
        content: 'คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์',
        flags: MessageFlags.Ephemeral,
      });
    }

    addPunishment(target.id, 'warn', reason, interaction.user.id, null);

    await target
      .send(
        `คุณถูกเตือนจากเซิร์ฟ **${guild.name}**\nเหตุผล: ${reason}\nโปรดระวังการกระทำในอนาคต`,
      )
      .catch(() => null);

    await interaction.reply(`⚠️ เตือน ${target} | เหตุผล: ${reason}`);

    const logChannel = guild.channels.cache.find(
      (c) => c.name === channels.adminLog,
    );
    if (logChannel && logChannel.isTextBased && logChannel.isTextBased()) {
      await logChannel.send(
        `⚠️ **WARN** | ผู้ใช้: ${target} | โดย: ${interaction.user} | เหตุผล: ${reason}`,
      );
    }
  },
};

