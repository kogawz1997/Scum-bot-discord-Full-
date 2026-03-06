const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setCoins, getWallet } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcoins')
    .setDescription('ตั้งยอดเหรียญของผู้ใช้ (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้ที่ต้องการตั้งยอดให้')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('จำนวนเหรียญใหม่')
        .setRequired(true)
        .setMinValue(0),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    await setCoins(target.id, amount);
    const wallet = await getWallet(target.id);

    await interaction.reply(
      `ตั้งยอดเหรียญของ ${target} เป็น ${economy.currencySymbol} **${wallet.balance.toLocaleString()}** แล้ว`,
    );
  },
};

