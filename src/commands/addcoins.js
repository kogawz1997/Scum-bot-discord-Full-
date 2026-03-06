const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCoins, getWallet } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcoins')
    .setDescription('เติมเหรียญให้ผู้ใช้ (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการเติมเหรียญให้')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('จำนวนเหรียญ')
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    const newBalance = await addCoins(target.id, amount);
    const wallet = await getWallet(target.id);

    await interaction.reply(
      `เพิ่ม ${economy.currencySymbol} **${amount.toLocaleString()}** ให้กับ ${target} แล้ว\nยอดใหม่: ${economy.currencySymbol} **${wallet.balance.toLocaleString()}**`,
    );
  },
};

