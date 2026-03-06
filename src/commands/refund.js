const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const {
  findPurchaseByCode,
  addCoins,
  setPurchaseStatusByCode,
} = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refund')
    .setDescription('คืนเงิน/ยกเลิกรายการซื้อ (แอดมิน)')
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

    if (purchase.status === 'refunded') {
      return interaction.reply({
        content: 'รายการนี้ถูกคืนเงินไปแล้วก่อนหน้านี้',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (purchase.status === 'delivered') {
      return interaction.reply({
        content: 'รายการนี้ถูกระบุว่าแจกของแล้ว หากจะคืนเงิน กรุณาจัดการด้วยวิธีแอดมิน',
        flags: MessageFlags.Ephemeral,
      });
    }

    await setPurchaseStatusByCode(code, 'refunded');
    await addCoins(purchase.userId, purchase.price);

    await interaction.reply(
      `คืนเงินรายการ \`${purchase.code}\` เรียบร้อยแล้ว เป็นจำนวน ${economy.currencySymbol} **${purchase.price.toLocaleString()}**`,
    );
  },
};
