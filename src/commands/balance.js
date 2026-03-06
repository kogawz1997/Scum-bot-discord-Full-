const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getWallet } = require('../store/memoryStore');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('ดูจำนวนเหรียญของคุณ')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('ดูของคนอื่น (ถ้ามีสิทธิ์)')
        .setRequired(false),
    ),
  async execute(interaction) {
    const targetUser =
      interaction.options.getUser('user') ?? interaction.user;

    if (
      targetUser.id !== interaction.user.id &&
      !interaction.memberPermissions.has('ManageGuild')
    ) {
      return interaction.reply({
        content: 'คุณไม่มีสิทธิ์ดูยอดของผู้ใช้งานคนอื่น',
        flags: MessageFlags.Ephemeral,
      });
    }

    const wallet = await getWallet(targetUser.id);
    await interaction.reply(
      `${targetUser} มี ${economy.currencySymbol} **${wallet.balance.toLocaleString()}** เหรียญ`,
    );
  },
};

