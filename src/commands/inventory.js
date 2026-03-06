const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { listUserPurchases, getShopItemById } = require('../store/memoryStore');
const { economy } = require('../config');
const { resolveItemIconUrl } = require('../services/itemIconService');

function statusEmoji(status) {
  if (status === 'delivered') return '✅';
  if (status === 'refunded') return '♻️';
  if (status === 'delivery_failed') return '❌';
  if (status === 'delivering') return '🚚';
  return '⏳';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('ดูประวัติการซื้อของคุณ'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const purchases = await listUserPurchases(userId);

    if (purchases.length === 0) {
      return interaction.reply({
        content: 'ไม่พบประวัติการซื้อสำหรับบัญชีของคุณ',
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = await Promise.all(
      purchases
        .slice()
        .sort((a, b) => b.id - a.id)
        .map(async (purchase) => {
          const item = await getShopItemById(purchase.itemId);
          const emoji = statusEmoji(purchase.status);
          const name = item ? item.name : purchase.itemId;
          const iconUrl = resolveItemIconUrl(item || purchase.itemId);
          const iconLink = iconUrl ? `[🖼️](${iconUrl}) ` : '';
          return `${emoji} ${iconLink}**${name}** | ราคา ${economy.currencySymbol} **${purchase.price.toLocaleString()}** | โค้ด: \`${purchase.code}\``;
        }),
    );

    const embed = new EmbedBuilder()
      .setTitle('ประวัติการซื้อของคุณ')
      .setDescription(lines.join('\n').slice(0, 4096))
      .setColor(0x00bfff);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
