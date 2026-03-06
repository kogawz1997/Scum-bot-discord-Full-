const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listAllStats } = require('../store/statsStore');

function pad(value, width) {
  const text = String(value);
  if (text.length >= width) return text.slice(0, width);
  return text + ' '.repeat(width - text.length);
}

function table(headers, rows) {
  const head = headers.map((h) => pad(h.label, h.width)).join(' ');
  const sep = headers.map((h) => '-'.repeat(h.width)).join(' ');
  const body = rows
    .map((r) => headers.map((h) => pad(r[h.key] ?? '', h.width)).join(' '))
    .join('\n');

  return ['```', head, sep, body || '(ไม่มีข้อมูล)', '```'].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('ดูอันดับสถิติผู้เล่น')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('ประเภทอันดับ')
        .setRequired(true)
        .addChoices(
          { name: 'kills', value: 'kills' },
          { name: 'kd', value: 'kd' },
          { name: 'playtime', value: 'playtime' },
        ),
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type', true);
    const all = listAllStats();

    if (all.length === 0) {
      return interaction.reply('ยังไม่มีข้อมูลสถิติในระบบ');
    }

    if (type === 'kills') {
      all.sort((a, b) => b.kills - a.kills);
    } else if (type === 'playtime') {
      all.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
    } else {
      all.sort((a, b) => {
        const kdA = a.deaths === 0 ? a.kills : a.kills / a.deaths;
        const kdB = b.deaths === 0 ? b.kills : b.kills / b.deaths;
        return kdB - kdA;
      });
    }

    const top = all.slice(0, 25);
    const rows = await Promise.all(
      top.map(async (s, index) => {
        const user = await interaction.client.users.fetch(s.userId).catch(() => null);
        const name = user ? user.username : s.userId;
        const kd = s.deaths === 0 ? s.kills : s.kills / s.deaths;
        return {
          rank: `[${index + 1}]`,
          kills: s.kills,
          deaths: s.deaths,
          kd: kd.toFixed(2),
          playtime: `${Math.floor(s.playtimeMinutes / 60)}h`,
          name,
        };
      }),
    );

    const headers =
      type === 'playtime'
        ? [
            { key: 'rank', label: 'อันดับ', width: 6 },
            { key: 'playtime', label: 'เวลาเล่น', width: 9 },
            { key: 'kills', label: 'คิล', width: 7 },
            { key: 'deaths', label: 'ตาย', width: 7 },
            { key: 'name', label: 'ชื่อ', width: 18 },
          ]
        : [
            { key: 'rank', label: 'อันดับ', width: 6 },
            { key: 'kills', label: 'คิล', width: 7 },
            { key: 'deaths', label: 'ตาย', width: 7 },
            { key: 'kd', label: 'ค/ต', width: 6 },
            { key: 'name', label: 'ชื่อ', width: 18 },
          ];

    const embed = new EmbedBuilder()
      .setTitle(
        type === 'kills'
          ? '🏆 อันดับคิล'
          : type === 'kd'
          ? '🎯 อันดับคิล/ตาย'
          : '🕒 อันดับเวลาเล่น',
      )
      .setDescription(table(headers, rows))
      .setColor(0xffb347);

    await interaction.reply({ embeds: [embed] });
  },
};
