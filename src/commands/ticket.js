const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { channels, roles } = require('../config');
const {
  createTicket,
  getTicketByChannel,
  claimTicket,
  closeTicket,
} = require('../store/ticketStore');

const CATEGORIES = [
  'แจ้งผู้เล่นโกง',
  'แจ้งบั๊ก',
  'ของหาย',
  'อุทธรณ์การแบน',
  'ขอความช่วยเหลือ',
];

function hasTicketCreatePermissions(guild, parent) {
  const me = guild.members.me;
  if (!me) return false;
  const required = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ];
  const perms = parent ? parent.permissionsFor(me) : me.permissions;
  return perms?.has(required);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('จัดการตั๋วซัพพอร์ต')
    .addSubcommand((sub) =>
      sub
        .setName('open')
        .setDescription('เปิดตั๋วใหม่')
        .addStringOption((option) =>
          option
            .setName('category')
            .setDescription('หมวดของปัญหา')
            .setRequired(true)
            .addChoices(
              ...CATEGORIES.map((c) => ({ name: c, value: c })),
            ),
        )
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('อธิบายปัญหาโดยย่อ')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('claim')
        .setDescription('รับเรื่องทิคเก็ต (ทีมงานเท่านั้น)')
        ,
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('ปิดทิคเก็ตนี้')
        ,
    )
    .addSubcommand((sub) =>
      sub
        .setName('transcript')
        .setDescription('สรุปแชทของทิคเก็ตนี้')
        ,
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'open') {
      return handleOpen(interaction);
    }
    if (sub === 'claim') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'คำสั่งนี้สำหรับทีมงานเท่านั้น',
          flags: MessageFlags.Ephemeral,
        });
      }
      return handleClaim(interaction);
    }
    if (sub === 'close') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'คำสั่งนี้สำหรับทีมงานเท่านั้น',
          flags: MessageFlags.Ephemeral,
        });
      }
      return handleClose(interaction);
    }
    if (sub === 'transcript') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'คำสั่งนี้สำหรับทีมงานเท่านั้น',
          flags: MessageFlags.Ephemeral,
        });
      }
      return handleTranscript(interaction);
    }
  },
};

async function handleOpen(interaction) {
  const category = interaction.options.getString('category', true);
  const reason = interaction.options.getString('reason', true);
  const guild = interaction.guild;

  if (!guild) {
    return interaction.reply({
      content: 'คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์',
      flags: MessageFlags.Ephemeral,
    });
  }

  const ticketsHubChannel = guild.channels.cache.find(
    (c) => c.name === channels.ticketsHub,
  );

  const parent =
    ticketsHubChannel && ticketsHubChannel.parent
      ? ticketsHubChannel.parent
      : null;

  if (!hasTicketCreatePermissions(guild, parent)) {
    return interaction.reply({
      content:
        'บอทไม่มีสิทธิ์พอสำหรับสร้างทิคเก็ต (ต้องมีสิทธิ์ ดูช่อง, ส่งข้อความ, จัดการช่อง, จัดการยศ ในหมวดที่ใช้)',
      flags: MessageFlags.Ephemeral,
    });
  }

  const channelName = `ticket-${interaction.user.username.toLowerCase()}-${
    Math.floor(Math.random() * 9999) + 1
  }`;

  const overwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  const staffRoleNames = Object.values(roles).filter((r) =>
    ['Owner', 'Admin', 'Moderator', 'Helper'].includes(r),
  );
  const staffRoleIds = [];
  for (const roleName of staffRoleNames) {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (role) {
      staffRoleIds.push(role.id);
      overwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }
  }

  let newChannel;
  try {
    newChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parent ?? undefined,
      permissionOverwrites: overwrites,
      topic: `ทิคเก็ตของ ${interaction.user.tag} | หมวด: ${category}`,
    });
  } catch (error) {
    if (error && error.code === 50013) {
      return interaction.reply({
        content:
          'สร้างทิคเก็ตไม่สำเร็จ เพราะบอทยังไม่มีสิทธิ์ในเซิร์ฟเวอร์/หมวดนี้ กรุณาให้สิทธิ์จัดการช่องและจัดการยศ แล้วลองใหม่',
        flags: MessageFlags.Ephemeral,
      });
    }
    throw error;
  }

  createTicket({
    guildId: guild.id,
    userId: interaction.user.id,
    channelId: newChannel.id,
    category,
    reason,
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎫 ทิคเก็ต - ${category}`)
    .setDescription(
      [
        `ผู้ร้องเรียน: ${interaction.user}`,
        `หมวด: **${category}**`,
        '',
        `รายละเอียด: ${reason}`,
        '',
        'ทีมงานจะเข้ามาดูแลคุณให้เร็วที่สุด',
      ].join('\n'),
    )
    .setColor(0x00bfff);

  const mentionText =
    staffRoleIds.length > 0
      ? staffRoleIds.map((id) => `<@&${id}>`).join(' ')
      : null;

  const payload = mentionText
    ? { content: mentionText, embeds: [embed] }
    : { embeds: [embed] };

  await newChannel.send(payload).catch(() => {
    // ถ้า tag role ไม่สำเร็จ (หาไม่เจอ) ก็ส่งเฉพาะ embed
    return newChannel.send({ embeds: [embed] });
  });

  await interaction.reply({
    content: `สร้างทิคเก็ตแล้ว: ${newChannel}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleClaim(interaction) {
  const channel = interaction.channel;
  const ticket = getTicketByChannel(channel.id);
  if (!ticket) {
    return interaction.reply({
      content: 'ช่องนี้ไม่ใช่ทิคเก็ต หรือไม่มีข้อมูลในระบบ',
      flags: MessageFlags.Ephemeral,
    });
  }

  const updated = claimTicket(channel.id, interaction.user.id);
  await channel.send(
    `🔔 ${interaction.user} รับเรื่องทิคเก็ตนี้แล้ว`,
  );
  await interaction.reply({
    content: `คุณรับทิคเก็ตนี้แล้ว (รหัส: ${updated.id})`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleClose(interaction) {
  const channel = interaction.channel;
  const ticket = getTicketByChannel(channel.id);
  if (!ticket) {
    return interaction.reply({
      content: 'ช่องนี้ไม่ใช่ทิคเก็ต หรือไม่มีข้อมูลในระบบ',
      flags: MessageFlags.Ephemeral,
    });
  }

  closeTicket(channel.id);

  await interaction.reply({
    content: 'กำลังปิดและลบห้อง ticket...',
    flags: MessageFlags.Ephemeral,
  });

  try {
    const reason = ticket?.id
      ? `Ticket #${ticket.id} closed by ${interaction.user.tag}`
      : `Ticket closed by ${interaction.user.tag}`;
    await channel.delete(reason);
  } catch (error) {
    if (ticket.userId && channel.permissionOverwrites?.edit) {
      await channel.permissionOverwrites
        .edit(ticket.userId, { SendMessages: false })
        .catch(() => null);
    }

    await channel
      .send('🔒 ปิด ticket แล้ว (แต่ลบห้องไม่สำเร็จ)')
      .catch(() => null);

    await interaction.followUp({
      content:
        'ปิด ticket แล้ว แต่ลบห้องไม่ได้ (ตรวจสิทธิ์ Manage Channels และลำดับยศของบอท)',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleTranscript(interaction) {
  const channel = interaction.channel;
  const ticket = getTicketByChannel(channel.id);
  if (!ticket) {
    return interaction.reply({
      content: 'ช่องนี้ไม่ใช่ทิคเก็ต หรือไม่มีข้อมูลในระบบ',
      flags: MessageFlags.Ephemeral,
    });
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp,
  );

  const lines = sorted.map(
    (m) => `[${new Date(m.createdAt).toISOString()}] ${m.author.tag}: ${m.content}`,
  );

  const content =
    lines.join('\n').slice(0, 1900) ||
    'ไม่มีข้อความในทิคเก็ตนี้ หรือข้อมูลสั้นมาก';

  await interaction.reply({
    content: 'สรุปข้อความ (100 ข้อความล่าสุด):\n' + content,
    flags: MessageFlags.Ephemeral,
  });
}

