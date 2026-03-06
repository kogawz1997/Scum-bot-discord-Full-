const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getCode, markUsed } = require('../store/redeemStore');
const { addCoins } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('ยืนยันรับของ/โค้ดโปรโมชั่น')
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('โค้ดที่ได้รับมา')
        .setRequired(true),
    ),
  async execute(interaction) {
    const codeInput = interaction.options.getString('code', true).trim();
    const code = codeInput.toUpperCase();

    const data = getCode(code);
    if (!data) {
      return interaction.reply({
        content: 'ไม่พบโค้ดนี้ หรือโค้ดไม่ถูกต้อง',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (data.usedBy) {
      return interaction.reply({
        content: 'โค้ดนี้ถูกใช้งานไปแล้ว',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (data.type === 'coins') {
      addCoins(interaction.user.id, data.amount);
      markUsed(code, interaction.user.id);

      return interaction.reply(
        `คุณใช้โค้ดสำเร็จ และได้รับ ${economy.currencySymbol} **${data.amount.toLocaleString()}**`,
      );
    }

    // เผื่ออนาคตไว้สำหรับโค้ดประเภท item
    markUsed(code, interaction.user.id);
    await interaction.reply(
      `คุณใช้โค้ดสำเร็จแล้ว (ประเภท: ${data.type}) กรุณารอทีมงานแจกของหรือเช็คระบบในเกม`,
    );
  },
};

