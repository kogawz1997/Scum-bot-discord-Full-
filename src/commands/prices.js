const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { economy } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prices')
    .setDescription('ดูเรทราคา/เรทขายคืน (ข้อความอธิบายจากเซิร์ฟ)'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💲 เรทราคา / เรทขายคืน')
      .setDescription(
        [
          `สกุลเงินหลักในเซิร์ฟ: ${economy.currencySymbol}`,
          '',
          'ตัวอย่าง (คุณสามารถแก้ในโค้ดเองให้ตรงกับเซิร์ฟจริง):',
          '- 1 กล่อง loot ในเกม = 2,000 เหรียญ',
          '- 1 VIP 7 วัน = 5,000 เหรียญ',
          '- 1 VIP 30 วัน = 15,000 เหรียญ',
          '',
          'การขายคืน (ถ้าต้องการใช้ระบบนี้):',
          '- ขายคืน item ที่ยังไม่ได้รับของในเกม อาจให้ได้ 70% ของราคาเดิม',
        ].join('\n'),
      )
      .setColor(0x32cd32);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

