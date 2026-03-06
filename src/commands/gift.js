const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getWallet, removeCoins, addCoins } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gift')
    .setDescription('โอนเหรียญให้ผู้ใช้อื่น')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('คนที่ต้องการโอนให้')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('จำนวนเหรียญที่ต้องการโอน')
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const senderId = interaction.user.id;
    const target = interaction.options.getUser('target', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.bot) {
      return interaction.reply({
        content: 'คุณไม่สามารถโอนเหรียญให้บอทได้',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (target.id === senderId) {
      return interaction.reply({
        content: 'คุณไม่สามารถโอนเหรียญให้ตัวเองได้',
        flags: MessageFlags.Ephemeral,
      });
    }

    const wallet = await getWallet(senderId);
    if (wallet.balance < amount) {
      return interaction.reply({
        content: `ยอดเหรียญของคุณไม่พอ คุณมี ${economy.currencySymbol} **${wallet.balance.toLocaleString()}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await removeCoins(senderId, amount);
    await addCoins(target.id, amount);

    await interaction.reply(
      `${interaction.user} ได้โอน ${economy.currencySymbol} **${amount.toLocaleString()}** ให้กับ ${target} แล้ว`,
    );
  },
};

