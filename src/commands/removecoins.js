const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeCoins, getWallet } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removecoins')
    .setDescription('หักเหรียญผู้ใช้ (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการหักเหรียญ')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('จำนวนเหรียญที่จะหัก')
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    await removeCoins(target.id, amount);
    const wallet = await getWallet(target.id);

    await interaction.reply(
      `หัก ${economy.currencySymbol} **${amount.toLocaleString()}** จาก ${target} แล้ว\nยอดใหม่: ${economy.currencySymbol} **${wallet.balance.toLocaleString()}**`,
    );
  },
};

