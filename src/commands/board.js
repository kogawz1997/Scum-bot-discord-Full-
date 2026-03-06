const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listTopWallets } = require('../store/memoryStore');
const { listAllStats } = require('../store/statsStore');
const { economy } = require('../config');

function medal(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('board')
    .setDescription('ดูบอร์ดจัดอันดับแบบลูกเล่น')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('ประเภทบอร์ด')
        .setRequired(true)
        .addChoices(
          { name: 'economy (เหรียญ)', value: 'economy' },
          { name: 'kills', value: 'kills' },
          { name: 'kd', value: 'kd' },
          { name: 'playtime', value: 'playtime' },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('จำนวนอันดับที่ต้องการดู (3-15)')
        .setMinValue(3)
        .setMaxValue(15)
        .setRequired(false),
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type', true);
    const limit = interaction.options.getInteger('limit') || 10;

    let rows = [];
    let title = '🏆 ตารางคะแนน';

    if (type === 'economy') {
      const wallets = await listTopWallets(limit);
      if (wallets.length === 0) {
        return interaction.reply('ยังไม่มีข้อมูลเศรษฐกิจในระบบ');
      }

      rows = await Promise.all(
        wallets.map(async (w, i) => {
          const user = await interaction.client.users.fetch(w.userId).catch(() => null);
          const name = user ? user.tag : `<@${w.userId}>`;
          return `${medal(i)} **${name}** — ${economy.currencySymbol} ${Number(w.balance || 0).toLocaleString()}`;
        }),
      );
      title = '💰 กระดานเศรษฐกิจ';
    } else {
      const all = listAllStats();
      if (all.length === 0) {
        return interaction.reply('ยังไม่มีข้อมูลสถิติในระบบ');
      }

      if (type === 'kills') {
        all.sort((a, b) => b.kills - a.kills);
        title = '⚔️ กระดานสังหาร';
        rows = await Promise.all(
          all.slice(0, limit).map(async (s, i) => {
            const user = await interaction.client.users.fetch(s.userId).catch(() => null);
            const name = user ? user.tag : `<@${s.userId}>`;
            return `${medal(i)} **${name}** — ${s.kills} คิล`;
          }),
        );
      }

      if (type === 'playtime') {
        all.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
        title = '🕒 กระดานเวลาเล่น';
        rows = await Promise.all(
          all.slice(0, limit).map(async (s, i) => {
            const user = await interaction.client.users.fetch(s.userId).catch(() => null);
            const name = user ? user.tag : `<@${s.userId}>`;
            return `${medal(i)} **${name}** — ${Math.floor((s.playtimeMinutes || 0) / 60)} ชม.`;
          }),
        );
      }

      if (type === 'kd') {
        all.sort((a, b) => {
          const kdA = a.deaths === 0 ? a.kills : a.kills / a.deaths;
          const kdB = b.deaths === 0 ? b.kills : b.kills / b.deaths;
          return kdB - kdA;
        });
        title = '🎯 กระดาน K/D';
        rows = await Promise.all(
          all.slice(0, limit).map(async (s, i) => {
            const user = await interaction.client.users.fetch(s.userId).catch(() => null);
            const name = user ? user.tag : `<@${s.userId}>`;
            const kd = s.deaths === 0 ? s.kills : s.kills / s.deaths;
            return `${medal(i)} **${name}** — K/D ${kd.toFixed(2)} (${s.kills}/${s.deaths})`;
          }),
        );
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x00bcd4)
      .setTitle(title)
      .setDescription(rows.join('\n'))
      .setFooter({ text: `ขอโดย ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
