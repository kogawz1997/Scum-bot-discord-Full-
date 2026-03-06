const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { canClaimDaily, claimDaily, getWallet } = require('../store/memoryStore');
const { economy } = require('../config');

function msToHoursMinutes(ms) {
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} นาที`;
  return `${hours} ชม. ${minutes} นาที`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('รับเหรียญรายวัน'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const check = await canClaimDaily(userId);

    if (!check.ok) {
      const wallet = await getWallet(userId);
      return interaction.reply({
        content: `คุณรับรายวันไปแล้ว วันนี้มียอด ${economy.currencySymbol} **${wallet.balance.toLocaleString()}**\nโปรดลองใหม่อีกครั้งในอีก **${msToHoursMinutes(
          check.remainingMs,
        )}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const newBalance = await claimDaily(userId);
    await interaction.reply(
      `คุณได้รับรายวัน ${economy.currencySymbol} **${economy.dailyReward.toLocaleString()}**!\nยอดคงเหลือใหม่: ${economy.currencySymbol} **${newBalance.toLocaleString()}**`,
    );
  },
};

