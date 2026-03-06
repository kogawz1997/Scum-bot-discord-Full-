const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listShopItems } = require('../store/memoryStore');
const { economy } = require('../config');
const { resolveItemIconUrl } = require('../services/itemIconService');

function normalizeKind(value) {
  return String(value || 'item').trim().toLowerCase() === 'vip' ? 'vip' : 'item';
}

function normalizeQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.trunc(n));
}

function normalizeDeliveryItems(item) {
  const direct = Array.isArray(item?.deliveryItems) ? item.deliveryItems : [];
  const normalized = direct
    .map((entry) => {
      const gameItemId = String(entry?.gameItemId || '').trim();
      if (!gameItemId) return null;
      return {
        gameItemId,
        quantity: normalizeQty(entry?.quantity),
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) return normalized;

  const fallbackId = String(item?.gameItemId || '').trim();
  if (!fallbackId) return [];
  return [{ gameItemId: fallbackId, quantity: normalizeQty(item?.quantity) }];
}

function buildDeliverySummary(item, maxRows = 2) {
  const entries = normalizeDeliveryItems(item);
  if (entries.length === 0) return 'ไอเทมในเกม: `-`';

  const totalQty = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const compact = entries
    .slice(0, maxRows)
    .map((entry) => `\`${entry.gameItemId}\` x${entry.quantity}`)
    .join(', ');
  const suffix = entries.length > maxRows
    ? ` และอีก ${entries.length - maxRows} รายการ`
    : '';

  return `ไอเทมในชุด: **${entries.length}** รายการ (รวม **${totalQty}** ชิ้น)\n${compact}${suffix}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('ดูสินค้าทั้งหมดในร้าน'),
  async execute(interaction) {
    const items = await listShopItems();

    if (items.length === 0) {
      return interaction.reply('ยังไม่มีสินค้าในร้านตอนนี้');
    }

    const lines = items.map((item) => {
      const iconUrl = resolveItemIconUrl(item);
      const iconLink = iconUrl ? `[🖼️](${iconUrl}) ` : '';
      const kind = normalizeKind(item.kind);
      const metaLine = kind === 'item'
        ? buildDeliverySummary(item)
        : 'แพ็กเกจ: **VIP**';

      return [
        `${iconLink}**${item.name}**`,
        `รหัส: \`${item.id}\``,
        `ประเภท: **${kind.toUpperCase()}**`,
        `ราคา: ${economy.currencySymbol} **${item.price.toLocaleString()}**`,
        metaLine,
        item.description || '-',
      ].join('\n');
    });

    const embed = new EmbedBuilder()
      .setTitle('ร้านค้า')
      .setDescription(lines.join('\n\n').slice(0, 4096))
      .setColor(0xffa500);

    await interaction.reply({ embeds: [embed] });
  },
};
