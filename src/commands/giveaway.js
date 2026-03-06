const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const {
  createGiveaway,
  getGiveaway,
  addEntrant,
  removeGiveaway,
} = require('../store/giveawayStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('จัดกิจกรรมแจกของ/ยศ/เหรียญ')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('เริ่มกิจกรรมแจกของ')
        .addStringOption((option) =>
          option
            .setName('prize')
            .setDescription('ของรางวัล (ข้อความ)')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('minutes')
            .setDescription('เวลาจบ (นาที)')
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('winners')
            .setDescription('จำนวนผู้ชนะ')
            .setRequired(false)
            .setMinValue(1),
        ),
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'คำสั่งนี้สำหรับแอดมินเท่านั้น',
          flags: MessageFlags.Ephemeral,
        });
      }
      return handleStart(interaction);
    }
  },
};

async function handleStart(interaction) {
  const prize = interaction.options.getString('prize', true);
  const minutes = interaction.options.getInteger('minutes', true);
  const winners = interaction.options.getInteger('winners') || 1;

  const endsAt = new Date(Date.now() + minutes * 60 * 1000);

  const embed = new EmbedBuilder()
    .setTitle('🎉 กิจกรรมแจกของ')
    .setDescription(
      [
        `ของรางวัล: **${prize}**`,
        `จำนวนผู้ชนะ: **${winners}**`,
        `จะจบใน: **${minutes} นาที**`,
        '',
        'กดปุ่มด้านล่างเพื่อเข้าร่วม!',
      ].join('\n'),
    )
    .setTimestamp(endsAt)
    .setColor(0xff69b4);

  const button = new ButtonBuilder()
    .setCustomId('giveaway-join')
    .setLabel('เข้าร่วม')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const msg = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  createGiveaway({
    messageId: msg.id,
    channelId: msg.channel.id,
    guildId: msg.guild.id,
    prize,
    winnersCount: winners,
    endsAt,
  });

  // ตั้งเวลาเพื่อสุ่มผู้ชนะ
  setTimeout(async () => {
    const g = getGiveaway(msg.id);
    if (!g) return;

    const entrants = Array.from(g.entrants);
    if (entrants.length === 0) {
      await msg.reply('กิจกรรมแจกของจบแล้ว แต่ไม่มีผู้เข้าร่วม');
      removeGiveaway(msg.id);
      return;
    }

    const shuffled = entrants.sort(() => Math.random() - 0.5);
    const winnersArr = shuffled.slice(0, g.winnersCount);
    const winnerMentions = winnersArr.map((id) => `<@${id}>`).join(', ');

    await msg.reply(
      `🎉 กิจกรรมแจกของจบแล้ว! ผู้ชนะ: ${winnerMentions}\nของรางวัล: **${g.prize}**`,
    );
    removeGiveaway(msg.id);
  }, minutes * 60 * 1000);
}
