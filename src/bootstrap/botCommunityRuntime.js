'use strict';

const { Events } = require('discord.js');

function isTextChannel(channel) {
  return Boolean(channel && channel.isTextBased && channel.isTextBased());
}

function createMessageCreateHandler(deps) {
  const {
    client,
    moderation,
    roles,
    channels,
    pushMessage,
    getRecentMessages,
    createPunishmentEntry,
  } = deps;

  return async function handleMessageCreate(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const guild = message.guild;
    const member = message.member;

    pushMessage(message.author.id, Date.now());
    const recentMessages = getRecentMessages(
      message.author.id,
      moderation.spam.intervalMs,
    );
    if (recentMessages.length >= moderation.spam.messages) {
      const mutedRole = guild.roles.cache.find((role) => role.name === roles.muted);
      if (mutedRole && member && !member.roles.cache.has(mutedRole.id)) {
        await member.roles.add(
          mutedRole,
          `ปิดแชทอัตโนมัติจากสแปม ${recentMessages.length} ข้อความ`,
        );
        createPunishmentEntry({
          userId: member.id,
          type: 'mute',
          reason: 'ปิดแชทอัตโนมัติ: สแปมข้อความ',
          staffId: client.user?.id || 'system',
          durationMinutes: moderation.spam.muteMinutes,
        });

        const logChannel = guild.channels.cache.find(
          (channel) => channel.name === channels.adminLog,
        );
        if (isTextChannel(logChannel)) {
          await logChannel.send(
            `🤖 **ปิดแชทอัตโนมัติ** | ผู้ใช้: ${member} | เหตุผล: สแปมเกิน ${moderation.spam.messages} ข้อความ ภายใน ${Math.round(
              moderation.spam.intervalMs / 1000,
            )} วินาที`,
          );
        }
      }
    }

    const contentLower = message.content.toLowerCase();
    const hasSoftWord = moderation.badWordsSoft.some((entry) =>
      contentLower.includes(String(entry || '').toLowerCase()),
    );
    const hasHardWord = moderation.badWordsHard.some((entry) =>
      contentLower.includes(String(entry || '').toLowerCase()),
    );

    if (!hasSoftWord && !hasHardWord) {
      return;
    }

    await message.delete().catch(() => null);

    if (hasHardWord && member) {
      const timeoutMs = moderation.hardTimeoutMinutes * 60 * 1000;
      if (member.moderatable) {
        await member.timeout(timeoutMs, 'ลงโทษอัตโนมัติ: คำหยาบรุนแรง').catch(() => null);
      }
      createPunishmentEntry({
        userId: member.id,
        type: 'timeout',
        reason: 'ลงโทษอัตโนมัติ: คำหยาบรุนแรง',
        staffId: client.user?.id || 'system',
        durationMinutes: moderation.hardTimeoutMinutes,
      });
    } else if (member) {
      createPunishmentEntry({
        userId: member.id,
        type: 'warn',
        reason: 'เตือนอัตโนมัติ: คำหยาบ',
        staffId: client.user?.id || 'system',
        durationMinutes: null,
      });
    }

    const logChannel = guild.channels.cache.find(
      (channel) => channel.name === channels.adminLog,
    );
    if (isTextChannel(logChannel)) {
      await logChannel.send(
        `🤖 **ดูแลแชทอัตโนมัติ** | ข้อความจาก ${message.author} ถูกลบ (คำหยาบ) ใน <#${message.channel.id}>`,
      );
    }
  };
}

function createGuildMemberAddHandler(deps) {
  const { channels } = deps;

  return async function handleGuildMemberAdd(member) {
    const guild = member.guild;
    const channel = guild.channels.cache.find(
      (entry) =>
        entry.name === (channels.inServer || channels.playerJoin)
        && isTextChannel(entry),
    );
    if (!channel) return;

    const text = `👋 สวัสดี ${member} ยินดีต้อนรับสู่ **${guild.name}**! ขอให้สนุกนะ`;
    const avatar = member.user.displayAvatarURL({ extension: 'png', size: 512 });
    const username = encodeURIComponent(member.user.username);
    const avatarEncoded = encodeURIComponent(avatar);
    const background = encodeURIComponent('https://i.imgur.com/O3DHIA5.jpeg');
    const memberLine = encodeURIComponent(`คุณคือสมาชิกคนที่ #${guild.memberCount}`);
    const welcomeLine = encodeURIComponent(`ยินดีต้อนรับสู่ ${guild.name}`);
    const cardUrl = `https://api.popcat.xyz/welcomecard?background=${background}&avatar=${avatarEncoded}&text1=${username}&text2=${memberLine}&text3=${welcomeLine}`;

    await channel.send({
      content: text,
      embeds: [
        {
          color: 0x2f3136,
          image: { url: cardUrl },
        },
      ],
    });
  };
}

function registerBotCommunityRuntime(deps) {
  const { client } = deps;
  const messageCreateHandler = createMessageCreateHandler(deps);
  const guildMemberAddHandler = createGuildMemberAddHandler(deps);

  client.on(Events.MessageCreate, messageCreateHandler);
  client.on(Events.GuildMemberAdd, guildMemberAddHandler);

  return {
    messageCreateHandler,
    guildMemberAddHandler,
  };
}

module.exports = {
  createGuildMemberAddHandler,
  createMessageCreateHandler,
  registerBotCommunityRuntime,
};
