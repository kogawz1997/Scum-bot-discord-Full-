const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
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
    .setName('purchase-log')
    .setDescription('ดูประวัติการซื้อของผู้ใช้ (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ผู้ใช้เป้าหมาย')
        .setRequired(true),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const purchases = await listUserPurchases(target.id);

    if (purchases.length === 0) {
      return interaction.reply({
        content: `${target} ไม่มีประวัติการซื้อ`,
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
      .setTitle(`ประวัติการซื้อ | ${target.tag}`)
      .setDescription(lines.join('\n').slice(0, 4096))
      .setColor(0x708090);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
