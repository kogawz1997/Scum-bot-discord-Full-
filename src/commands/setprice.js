const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setShopItemPrice } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprice')
    .setDescription('ปรับราคาสินค้าในร้าน (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName('item')
        .setDescription('รหัสหรือชื่อสินค้า')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('price')
        .setDescription('ราคาที่ต้องการตั้งใหม่')
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const query = interaction.options.getString('item', true);
    const price = interaction.options.getInteger('price', true);

    const item = await setShopItemPrice(query, price);
    if (!item) {
      return interaction.reply({
        content: 'ไม่พบสินค้า กรุณาตรวจสอบชื่อ/รหัสอีกครั้ง',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply(
      `ตั้งราคาของ **${item.name}** (รหัส: \`${item.id}\`) เป็น ${economy.currencySymbol} **${item.price.toLocaleString()}** แล้ว`,
    );
  },
};
