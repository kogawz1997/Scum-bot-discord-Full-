const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { addShopItem } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('เพิ่มสินค้าเข้าร้าน (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID ในระบบ (เช่น vip-90d หรือ item-ak47)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('ชื่อที่แสดงในร้าน')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('price')
        .setDescription('ราคาเหรียญ')
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((option) =>
      option
        .setName('description')
        .setDescription('คำอธิบายสินค้า')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('kind')
        .setDescription('ประเภทสินค้า')
        .addChoices(
          { name: 'ไอเทมในเกม', value: 'item' },
          { name: 'VIP', value: 'vip' },
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('game_item_id')
        .setDescription('รหัสไอเทมในเกม (เช่น Weapon_AK47)')
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName('quantity')
        .setDescription('จำนวนไอเทมที่ได้ต่อ 1 คำสั่งซื้อ')
        .setMinValue(1)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('icon_url')
        .setDescription('ลิงก์ไอคอนสินค้า (ไม่บังคับ)')
        .setRequired(false),
    ),

  async execute(interaction) {
    const id = interaction.options.getString('id', true);
    const name = interaction.options.getString('name', true);
    const price = interaction.options.getInteger('price', true);
    const description = interaction.options.getString('description', true);
    const kind = interaction.options.getString('kind') || 'item';
    const gameItemId = interaction.options.getString('game_item_id');
    const quantity = interaction.options.getInteger('quantity') || 1;
    const iconUrl = interaction.options.getString('icon_url');

    if (kind === 'item' && !gameItemId) {
      return interaction.reply({
        content: 'สินค้าประเภทไอเทม ต้องระบุ game_item_id',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const item = await addShopItem(id, name, price, description, {
        kind,
        gameItemId: kind === 'item' ? gameItemId : null,
        quantity: Math.max(1, Number(quantity || 1)),
        iconUrl,
      });

      await interaction.reply(
        [
          'เพิ่มสินค้าใหม่เรียบร้อยแล้ว:',
          `ID: \`${item.id}\``,
          `ชื่อ: **${item.name}**`,
          `ประเภท: **${item.kind || kind}**`,
          `ราคา: ${economy.currencySymbol} **${item.price.toLocaleString()}**`,
          `จำนวน: **${item.quantity || 1}**`,
          `ไอเทมในเกม: \`${item.gameItemId || '-'}\``,
          item.description || '-',
        ].join('\n'),
      );
    } catch (err) {
      await interaction.reply({
        content: `ไม่สามารถเพิ่มสินค้าได้: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
