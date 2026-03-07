const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { channels, economy } = require('../config');
const { getShopItemByName, getShopItemById } = require('../store/memoryStore');
const {
  addCartItem,
  removeCartItem,
  clearCart,
  listCartItems,
} = require('../store/cartStore');
const {
  getResolvedCart,
  checkoutCart,
} = require('../services/cartService');

function formatResolvedCart(resolved, maxRows = 8) {
  if (!resolved || !Array.isArray(resolved.rows) || resolved.rows.length === 0) {
    return 'ตะกร้าของคุณว่างอยู่';
  }

  const lines = [];
  for (const row of resolved.rows.slice(0, maxRows)) {
    lines.push(
      `- **${row.item.name}** (\`${row.item.id}\`) x**${row.quantity}** = ${economy.currencySymbol} **${row.lineTotal.toLocaleString()}**`,
    );
  }
  if (resolved.rows.length > maxRows) {
    lines.push(`- และอีก **${resolved.rows.length - maxRows}** รายการ`);
  }

  lines.push('');
  lines.push(`รวม ${resolved.rows.length} รายการ (${resolved.totalUnits} ชิ้น)`);
  lines.push(`ยอดรวม: ${economy.currencySymbol} **${resolved.totalPrice.toLocaleString()}**`);
  if (Array.isArray(resolved.missingItemIds) && resolved.missingItemIds.length > 0) {
    lines.push(
      `ข้ามสินค้าที่ไม่พบในร้าน: ${resolved.missingItemIds
        .map((id) => `\`${id}\``)
        .join(', ')}`,
    );
  }

  return lines.join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cart')
    .setDescription('จัดการตะกร้าสินค้าของคุณ')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('เพิ่มสินค้าลงตะกร้า')
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('ชื่อสินค้า หรือรหัสสินค้า')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('qty')
            .setDescription('จำนวน (ค่าเริ่มต้น 1)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('ดูรายการสินค้าในตะกร้า'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('นำสินค้าออกจากตะกร้า')
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('ชื่อสินค้า หรือรหัสสินค้า')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('qty')
            .setDescription('จำนวนที่ต้องการนำออก (ถ้าไม่ใส่ = ลบทั้งรายการ)')
            .setMinValue(1)
            .setMaxValue(99)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('clear').setDescription('ล้างตะกร้าทั้งหมด'),
    )
    .addSubcommand((sub) =>
      sub.setName('checkout').setDescription('ชำระตะกร้าและสร้างคำสั่งซื้อทั้งหมด'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'add') {
      const query = interaction.options.getString('item', true);
      const qty = interaction.options.getInteger('qty') || 1;
      const item = (await getShopItemByName(query)) || (await getShopItemById(query));
      if (!item) {
        return interaction.reply({
          content: 'ไม่พบสินค้าที่ต้องการเพิ่มลงตะกร้า',
          flags: MessageFlags.Ephemeral,
        });
      }
      addCartItem(userId, item.id, qty);
      const resolved = await getResolvedCart(userId);
      return interaction.reply({
        content: `เพิ่ม **${item.name}** x**${qty}** ลงตะกร้าแล้ว\n\n${formatResolvedCart(resolved, 6)}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'view') {
      const resolved = await getResolvedCart(userId);
      return interaction.reply({
        content: formatResolvedCart(resolved),
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'remove') {
      const query = interaction.options.getString('item', true);
      const item = (await getShopItemByName(query)) || (await getShopItemById(query));
      const cartRows = listCartItems(userId);
      const row = item
        ? cartRows.find((entry) => entry.itemId === item.id)
        : cartRows.find((entry) => entry.itemId === query);
      if (!row) {
        return interaction.reply({
          content: 'ไม่พบสินค้านี้ในตะกร้าของคุณ',
          flags: MessageFlags.Ephemeral,
        });
      }

      const qtyArg = interaction.options.getInteger('qty');
      const removeQty = qtyArg || row.quantity;
      removeCartItem(userId, row.itemId, removeQty);

      const resolved = await getResolvedCart(userId);
      const itemLabel = item?.name || row.itemId;
      return interaction.reply({
        content: `นำ **${itemLabel}** ออกจากตะกร้าแล้ว\n\n${formatResolvedCart(resolved, 6)}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'clear') {
      clearCart(userId);
      return interaction.reply({
        content: 'ล้างตะกร้าเรียบร้อยแล้ว',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'checkout') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await checkoutCart(userId, {
        guildId: interaction.guildId || null,
      });

      if (!result.ok && result.reason === 'empty') {
        return interaction.editReply({
          content: 'ตะกร้าของคุณว่างอยู่',
        });
      }

      if (!result.ok && result.reason === 'insufficient') {
        return interaction.editReply({
          content:
            `ยอดเหรียญไม่พอสำหรับชำระตะกร้า\n` +
            `ต้องใช้: ${economy.currencySymbol} **${result.totalPrice.toLocaleString()}**\n` +
            `ยอดคงเหลือ: ${economy.currencySymbol} **${Number(result.walletBalance || 0).toLocaleString()}**`,
        });
      }

      const successCodes = result.purchases
        .slice(0, 10)
        .map((entry) => `\`${entry.purchase.code}\``)
        .join(', ');
      const moreText = result.purchases.length > 10
        ? ` และอีก ${result.purchases.length - 10} รายการ`
        : '';

      const lines = [
        'ชำระตะกร้าสำเร็จ ✅',
        `รวม ${result.rows.length} รายการ (${result.totalUnits} ชิ้น)`,
        `ตัดเหรียญ: ${economy.currencySymbol} **${result.totalPrice.toLocaleString()}**`,
        `สร้างคำสั่งซื้อ: **${result.purchases.length}** รายการ`,
      ];
      if (successCodes) {
        lines.push(`โค้ดอ้างอิง: ${successCodes}${moreText}`);
      }
      if (result.failures.length > 0) {
        lines.push(
          `มี ${result.failures.length} รายการที่ระบบส่งของมีปัญหา (ตรวจสอบใน /inventory และ shop-log)`,
        );
      }

      try {
        const guild = interaction.guild;
        if (guild) {
          const logChannel = guild.channels.cache.find((c) => c.name === channels.shopLog);
          if (logChannel && logChannel.isTextBased()) {
            await logChannel.send(
              `🛒 **ชำระตะกร้า** | ผู้ใช้: ${interaction.user} | รายการ: ${result.rows.length} | ชิ้นรวม: ${result.totalUnits} | ตัดเหรียญ: ${economy.currencySymbol} **${result.totalPrice.toLocaleString()}** | คำสั่งซื้อที่สร้าง: ${result.purchases.length} | fail: ${result.failures.length}`,
            );
          }
        }
      } catch (error) {
        console.error('ไม่สามารถส่ง log ชำระตะกร้าไปยัง shop-log ได้', error);
      }

      return interaction.editReply({
        content: lines.join('\n'),
      });
    }

    return interaction.reply({
      content: 'ไม่พบคำสั่งย่อย',
      flags: MessageFlags.Ephemeral,
    });
  },
};
