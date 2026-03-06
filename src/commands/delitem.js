const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { deleteShopItem } = require('../store/memoryStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delitem')
    .setDescription('ลบสินค้าออกจากร้าน (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName('item')
        .setDescription('ID หรือชื่อสินค้า')
        .setRequired(true),
    ),
  async execute(interaction) {
    const query = interaction.options.getString('item', true);
    const deleted = await deleteShopItem(query);

    if (!deleted) {
      return interaction.reply({
        content: 'ไม่พบสินค้าให้ลบ กรุณาตรวจสอบ ID/ชื่อ อีกครั้ง',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply(
      `ลบสินค้า **${deleted.name}** (ID: \`${deleted.id}\`) ออกจากร้านเรียบร้อยแล้ว`,
    );
  },
};

