const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  canClaimWeekly,
  claimWeekly,
  getWallet,
} = require('../store/memoryStore');
const { economy } = require('../config');

function msToDaysHours(ms) {
  const totalHours = Math.ceil(ms / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days <= 0) return `${hours} ชม.`;
  return `${days} วัน ${hours} ชม.`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('รับเหรียญรายสัปดาห์'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const check = await canClaimWeekly(userId);

    if (!check.ok) {
      const wallet = await getWallet(userId);
      return interaction.reply({
        content: `คุณรับรายสัปดาห์ไปแล้ว ตอนนี้คุณมี ${economy.currencySymbol} **${wallet.balance.toLocaleString()}**\nโปรดลองใหม่อีกครั้งในอีก **${msToDaysHours(
          check.remainingMs,
        )}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const newBalance = await claimWeekly(userId);
    await interaction.reply(
      `คุณได้รับรายสัปดาห์ ${economy.currencySymbol} **${economy.weeklyReward.toLocaleString()}**!\nยอดคงเหลือใหม่: ${economy.currencySymbol} **${newBalance.toLocaleString()}**`,
    );
  },
};

