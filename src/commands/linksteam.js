const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const {
  setLink,
  getLinkByUserId,
  getLinkBySteamId,
  unlinkByUserId,
} = require('../store/linkStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linksteam')
    .setDescription('ลิงก์ SteamID (SCUM) กับ Discord เพื่อโอนเหรียญ/สถิติอัตโนมัติ')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('ลิงก์ SteamID ของคุณกับ Discord')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('SteamID64 (ตัวเลขยาว ๆ)')
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('ชื่อในเกม (ไม่บังคับ)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('me').setDescription('ดูว่า Discord นี้ลิงก์ SteamID อะไรอยู่'),
    )
    .addSubcommand((sub) =>
      sub.setName('unset').setDescription('ยกเลิกลิงก์ SteamID ของคุณ'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('lookup')
        .setDescription('เช็กว่า SteamID นี้ลิงก์กับใคร (ทีมงาน)')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('SteamID64')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setuser')
        .setDescription('ลิงก์ SteamID ให้ผู้ใช้อื่น (ทีมงาน)')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('ผู้ใช้ Discord')
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('SteamID64')
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('ชื่อในเกม (ไม่บังคับ)')
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const steamId = interaction.options.getString('steamid', true);
      const name = interaction.options.getString('name');
      const res = setLink({
        steamId,
        userId: interaction.user.id,
        inGameName: name,
      });
      if (!res.ok) {
        return interaction.reply({
          content: 'SteamID ไม่ถูกต้อง (ต้องเป็นตัวเลขยาว ๆ เช่น SteamID64)',
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: `ลิงก์สำเร็จ ✅\nSteamID: \`${res.steamId}\``,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'me') {
      const link = getLinkByUserId(interaction.user.id);
      if (!link) {
        return interaction.reply({
          content: 'คุณยังไม่ได้ลิงก์ SteamID ใช้ `/linksteam set` ก่อน',
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: `SteamID ของคุณคือ: \`${link.steamId}\`${link.inGameName ? `\nชื่อในเกม: **${link.inGameName}**` : ''}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'unset') {
      const removed = unlinkByUserId(interaction.user.id);
      if (!removed) {
        return interaction.reply({
          content: 'คุณยังไม่มีลิงก์ให้ลบ',
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: `ลบลิงก์สำเร็จ ✅ (SteamID: \`${removed.steamId}\`)`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'lookup') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'คำสั่งนี้สำหรับทีมงานเท่านั้น',
          flags: MessageFlags.Ephemeral,
        });
      }
      const steamId = interaction.options.getString('steamid', true);
      const link = getLinkBySteamId(steamId);
      if (!link) {
        return interaction.reply({ content: 'ไม่พบลิงก์นี้', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({
        content: `SteamID \`${steamId}\` ลิงก์กับ: <@${link.userId}>`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'setuser') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'คำสั่งนี้สำหรับทีมงานเท่านั้น',
          flags: MessageFlags.Ephemeral,
        });
      }
      const user = interaction.options.getUser('user', true);
      const steamId = interaction.options.getString('steamid', true);
      const name = interaction.options.getString('name');
      const res = setLink({ steamId, userId: user.id, inGameName: name });
      if (!res.ok) {
        return interaction.reply({
          content: 'SteamID ไม่ถูกต้อง (ต้องเป็นตัวเลขยาว ๆ เช่น SteamID64)',
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: `ลิงก์สำเร็จ ✅\nSteamID: \`${res.steamId}\`\nผู้ใช้: ${user}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
