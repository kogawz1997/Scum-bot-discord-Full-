const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { serverInfo } = require('../config');
const { getShopItemById, listShopItems } = require('../store/memoryStore');
const { resolveItemIconUrl } = require('../services/itemIconService');
const {
  buildTopKillerEmbed,
  buildTopGunKillEmbed,
  buildTopKdEmbed,
  buildTopPlaytimeEmbed,
  buildTopEconomyEmbed,
  registerLeaderboardPanelMessage,
} = require('../services/leaderboardPanels');

function normalizeDeliveryItems(item) {
  const direct = Array.isArray(item?.deliveryItems) ? item.deliveryItems : [];
  const normalized = direct
    .map((entry) => {
      const gameItemId = String(entry?.gameItemId || '').trim();
      if (!gameItemId) return null;
      const quantity = Math.max(1, Math.trunc(Number(entry?.quantity || 1)));
      return { gameItemId, quantity };
    })
    .filter(Boolean);
  if (normalized.length > 0) return normalized;

  const fallbackId = String(item?.gameItemId || '').trim();
  if (!fallbackId) return [];
  return [
    {
      gameItemId: fallbackId,
      quantity: Math.max(1, Math.trunc(Number(item?.quantity || 1))),
    },
  ];
}

function buildDeliverySummaryLines(item, maxRows = 4) {
  const entries = normalizeDeliveryItems(item);
  if (entries.length === 0) {
    return ['**ไอเทมในเกม:** `-`'];
  }

  const totalQty = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const lines = [
    `**ไอเทมในชุด:** **${entries.length}** รายการ (รวม **${totalQty}** ชิ้น)`,
  ];
  for (const entry of entries.slice(0, maxRows)) {
    lines.push(`- \`${entry.gameItemId}\` x**${entry.quantity}**`);
  }
  if (entries.length > maxRows) {
    lines.push(`- และอีก **${entries.length - maxRows}** รายการ`);
  }
  return lines;
}

function buildShopEmbed(item, imageUrl) {
  const resolvedImageUrl = imageUrl || resolveItemIconUrl(item);
  const kind = String(item.kind || 'item').trim().toLowerCase() === 'vip'
    ? 'vip'
    : 'item';
  const metaLines = kind === 'item'
    ? [
        `**ประเภท:** ITEM`,
        ...buildDeliverySummaryLines(item),
      ]
    : [
        '**ประเภท:** VIP',
      ];
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle(item.name)
    .setDescription(
      [
        ...metaLines,
        '',
        '**รายละเอียด:**',
        item.description || '-',
        '',
        '----------------',
        `**ราคา: ${Number(item.price || 0).toLocaleString()}** เหรียญ`,
        '----------------',
      ].join('\n'),
    );

  if (resolvedImageUrl) {
    embed.setImage(resolvedImageUrl);
  }

  return embed;
}

function buildShopButtons(itemId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`panel-shop-buy:${itemId}`)
      .setLabel('ซื้อเลย')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`panel-shop-cart:${itemId}`)
      .setLabel('เพิ่มลงตะกร้า')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel-shop-checkout')
      .setLabel('ชำระเงิน')
      .setStyle(ButtonStyle.Secondary),
  );
}

async function replyOrEdit(interaction, payload) {
  if (interaction.deferred) {
    return interaction.editReply(payload);
  }
  if (interaction.replied) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('โพสต์แพเนลผู้เล่น/แอดมิน')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('welcome-pack').setDescription('โพสต์แพเนลต้อนรับ'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('verify')
        .setDescription('โพสต์แพเนลยืนยัน SteamID')
        .addStringOption((option) =>
          option
            .setName('image_url')
            .setDescription('ลิงก์รูปภาพ (ไม่บังคับ)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('ticket-admin').setDescription('โพสต์แพเนลทิคเก็ตแอดมิน'),
    )
    .addSubcommand((sub) =>
      sub.setName('top-killer').setDescription('โพสต์อันดับนักฆ่าสูงสุด'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('top-gun-kill')
        .setDescription('โพสต์อันดับฆ่าด้วยอาวุธ'),
    )
    .addSubcommand((sub) =>
      sub.setName('top-kd').setDescription('โพสต์อันดับอัตราคิลต่อเดธ'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('top-playtime')
        .setDescription('โพสต์อันดับเวลาเล่น'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('top-economy')
        .setDescription('โพสต์อันดับเศรษฐกิจ'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('shop-card')
        .setDescription('โพสต์การ์ดสินค้าเดี่ยว')
        .addStringOption((option) =>
          option
            .setName('item_id')
            .setDescription('รหัสสินค้าในร้าน เช่น vip-7d')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('image_url')
            .setDescription('ลิงก์รูปภาพ (ไม่บังคับ)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('shop-feed')
        .setDescription('โพสต์สินค้าหลายรายการด้วยคีย์เวิร์ด')
        .addStringOption((option) =>
          option
            .setName('keyword')
            .setDescription('คีย์เวิร์ดค้นหา เช่น ปืน, รถ')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('จำนวนสูงสุดต่อโพสต์ (1-20)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName('image_url')
            .setDescription('ลิงก์รูปภาพ (ไม่บังคับ)')
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'คำสั่งนี้สำหรับแอดมินเท่านั้น',
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();
    if (sub === 'welcome-pack') return postWelcomePack(interaction);
    if (sub === 'verify') return postVerify(interaction);
    if (sub === 'ticket-admin') return postTicketAdmin(interaction);
    if (sub === 'top-killer') return postTopKiller(interaction);
    if (sub === 'top-gun-kill') return postTopGunKill(interaction);
    if (sub === 'top-kd') return postTopKd(interaction);
    if (sub === 'top-playtime') return postTopPlaytime(interaction);
    if (sub === 'top-economy') return postTopEconomy(interaction);
    if (sub === 'shop-card') return postShopCard(interaction);
    if (sub === 'shop-feed') return postShopFeed(interaction);

    return interaction.reply({
      content: 'ไม่พบคำสั่งย่อย',
      flags: MessageFlags.Ephemeral,
    });
  },
};

async function postWelcomePack(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('แพ็กต้อนรับและลงทะเบียน')
    .setDescription(
      [
        'กดปุ่มด้านล่างเพื่อรับแพ็กต้อนรับและใช้งานเมนูหลัก',
        `รับเหรียญเริ่มต้นและเปิดเมนูหลักของ **${serverInfo.name}**`,
      ].join('\n'),
    )
    .setFooter({ text: '1 บัญชี / รับได้ 1 ครั้ง' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel-welcome-claim')
      .setLabel('รับแพ็กต้อนรับ')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel-welcome-refer')
      .setLabel('แนะนำเพื่อน')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel-quick-daily')
      .setLabel('ของรายวัน')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('panel-quick-server')
      .setLabel('เซิร์ฟเวอร์')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel-quick-stats')
      .setLabel('สถิติ')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row1, row2] });
}

async function postVerify(interaction) {
  const imageUrl = interaction.options.getString('image_url');

  const embed = new EmbedBuilder()
    .setColor(0x32d74b)
    .setTitle('ยืนยันตัวตน')
    .setDescription(
      [
        'กรุณากดปุ่มด้านล่างเพื่อยืนยัน SteamID',
        '',
        '**กรุณายืนยัน SteamID ก่อนเข้าใช้งานเซิร์ฟเวอร์**',
        '',
        'ระบบจะลิงก์บัญชี Discord ของคุณกับ SteamID64 อัตโนมัติ',
      ].join('\n'),
    )
    .setFooter({ text: serverInfo.name });

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel-verify-open')
      .setLabel('ยืนยัน (กดเพื่อยืนยัน)')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function postTicketAdmin(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('แพเนลช่วยเหลือทิคเก็ต')
    .setDescription(
      [
        'ต้องการความช่วยเหลือเรื่องอะไร?',
        'ยินดีต้อนรับสู่ช่องทิคเก็ต หากคุณมีคำถามหรือปัญหา',
        'กรุณากดปุ่ม **เปิดทิคเก็ต** ด้านล่างเพื่อติดต่อทีมงาน',
      ].join('\n'),
    )
    .setFooter({ text: `${serverInfo.name} ฝ่ายซัพพอร์ต` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel-ticket-open')
      .setLabel('เปิดทิคเก็ต')
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function postTopKiller(interaction) {
  const embed = buildTopKillerEmbed(interaction.client, interaction.guildId);
  await interaction.reply({ embeds: [embed] });
  const message = await interaction.fetchReply().catch(() => null);
  if (message) {
    registerLeaderboardPanelMessage('topKiller', message);
  }
}

async function postTopGunKill(interaction) {
  const embed = buildTopGunKillEmbed();
  await interaction.reply({ embeds: [embed] });
  const message = await interaction.fetchReply().catch(() => null);
  if (message) {
    registerLeaderboardPanelMessage('topGunKill', message);
  }
}

async function postTopKd(interaction) {
  const embed = buildTopKdEmbed(interaction.client, interaction.guildId);
  await interaction.reply({ embeds: [embed] });
  const message = await interaction.fetchReply().catch(() => null);
  if (message) {
    registerLeaderboardPanelMessage('topKd', message);
  }
}

async function postTopPlaytime(interaction) {
  const embed = buildTopPlaytimeEmbed(interaction.client, interaction.guildId);
  await interaction.reply({ embeds: [embed] });
  const message = await interaction.fetchReply().catch(() => null);
  if (message) {
    registerLeaderboardPanelMessage('topPlaytime', message);
  }
}

async function postTopEconomy(interaction) {
  const embed = await buildTopEconomyEmbed(interaction.client, interaction.guildId);
  await interaction.reply({ embeds: [embed] });
  const message = await interaction.fetchReply().catch(() => null);
  if (message) {
    registerLeaderboardPanelMessage('topEconomy', message);
  }
}

async function postShopCard(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  const itemId = interaction.options.getString('item_id', true);
  const imageUrl = interaction.options.getString('image_url');

  const item = await getShopItemById(itemId);
  if (!item) {
    return replyOrEdit(interaction, {
      content: `ไม่พบรหัสสินค้า: ${itemId}`,
    });
  }

  const embed = buildShopEmbed(item, imageUrl);
  const row = buildShopButtons(item.id);
  await replyOrEdit(interaction, { embeds: [embed], components: [row] });
}

async function postShopFeed(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const keyword = interaction.options.getString('keyword', true).toLowerCase();
  const limit = interaction.options.getInteger('limit') || 10;
  const imageUrl = interaction.options.getString('image_url');

  const allItems = await listShopItems();
  const matched = allItems
    .filter((item) =>
      [item.id, item.name, item.description || '']
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
    .slice(0, limit);

  if (matched.length === 0) {
    return replyOrEdit(interaction, {
      content: `ไม่พบสินค้าที่ตรงกับคำค้น: ${keyword}`,
    });
  }

  await replyOrEdit(interaction, {
    content: `กำลังโพสต์ฟีดร้านค้า หมวด **${keyword}** จำนวน ${matched.length} รายการ...`,
  });

  for (const item of matched) {
    const embed = buildShopEmbed(item, imageUrl);
    const row = buildShopButtons(item.id);
    await interaction.channel.send({ embeds: [embed], components: [row] });
  }
}
