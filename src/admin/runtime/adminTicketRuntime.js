'use strict';

/**
 * Admin-side ticket notifications are best-effort and should not bloat the
 * main HTTP entry file.
 */

function createAdminTicketRuntime() {
  async function tryNotifyTicket(client, ticket, action, staffId) {
    try {
      if (!ticket?.channelId) return;
      const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) return;
      if (action === 'claim') {
        if (!channel.isTextBased || !channel.isTextBased()) return;
        await channel.send(`รับเรื่อง ticket จากเว็บแอดมินโดย <@${staffId}>`).catch(() => null);
        return;
      }
      if (action === 'assign') {
        if (!channel.isTextBased || !channel.isTextBased()) return;
        await channel.send(`[admin-web] assigned ticket to <@${staffId}>`).catch(() => null);
        return;
      }
      if (action === 'escalate') {
        if (!channel.isTextBased || !channel.isTextBased()) return;
        await channel.send(`[admin-web] escalated ticket by <@${staffId}>`).catch(() => null);
        return;
      }
      if (action === 'de-escalate') {
        if (!channel.isTextBased || !channel.isTextBased()) return;
        await channel.send(`[admin-web] returned ticket to the active queue by <@${staffId}>`).catch(() => null);
        return;
      }
      if (action === 'close') {
        if (channel.isTextBased && channel.isTextBased()) {
          await channel.send('ปิด ticket จากเว็บแอดมิน (กำลังลบห้อง)').catch(() => null);
        }

        try {
          const reason = ticket?.id
            ? `Ticket #${ticket.id} closed from admin web`
            : 'Ticket closed from admin web';
          await channel.delete(reason);
          return;
        } catch {
          if (ticket.userId && channel.permissionOverwrites?.edit) {
            await channel.permissionOverwrites
              .edit(ticket.userId, { SendMessages: false })
              .catch(() => null);
          }
          if (channel.isTextBased && channel.isTextBased()) {
            await channel
              .send('ปิด ticket แล้ว (แต่ลบห้องไม่สำเร็จ)')
              .catch(() => null);
          }
        }
      }
    } catch {
      // Best effort only.
    }
  }

  return {
    tryNotifyTicket,
  };
}

module.exports = {
  createAdminTicketRuntime,
};
