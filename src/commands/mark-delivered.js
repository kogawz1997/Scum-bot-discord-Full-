const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { findPurchaseByCode, setPurchaseStatusByCode } = require('../store/memoryStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mark-delivered')
    .setDescription('ตั้งสถานะรายการซื้อว่าแจกของแล้ว (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('โค้ดอ้างอิงการซื้อ')
        .setRequired(true),
    ),
  async execute(interaction) {
    const code = interaction.options.getString('code', true);
    const purchase = await findPurchaseByCode(code);

    if (!purchase) {
      return interaction.reply({
        content: 'ไม่พบรายการซื้อที่มีโค้ดนี้',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (purchase.status === 'delivered') {
      return interaction.reply({
        content: 'รายการนี้ถูกระบุว่าแจกแล้วอยู่แล้ว',
        flags: MessageFlags.Ephemeral,
      });
    }

    await setPurchaseStatusByCode(code, 'delivered');

    await interaction.reply(
      `ตั้งสถานะรายการ \`${purchase.code}\` เป็น **แจกแล้ว (delivered)** เรียบร้อย`,
    );
  },
};

