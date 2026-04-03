const {
  createTicket,
  getTicketByChannel,
  claimTicket,
  closeTicket,
  listTickets,
  updateTicket,
} = require('../store/ticketStore');

function normalizeText(value) {
  return String(value || '').trim();
}

function buildScopeOptions(params = {}) {
  return {
    tenantId: normalizeText(params.tenantId),
    defaultTenantId: normalizeText(params.defaultTenantId),
    env: params.env,
  };
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeCategory(value) {
  return normalizeText(value).toLowerCase();
}

function isAppealCategory(value) {
  const category = normalizeCategory(value);
  return category === 'appeal' || category.endsWith('-appeal') || category.startsWith('appeal:');
}

function createSupportTicket(params = {}) {
  const guildId = normalizeText(params.guildId);
  const userId = normalizeText(params.userId);
  const channelId = normalizeText(params.channelId);
  const category = normalizeText(params.category);
  const reason = normalizeText(params.reason);

  if (!guildId || !userId || !channelId || !category || !reason) {
    return { ok: false, reason: 'invalid-input' };
  }

  const scopeOptions = buildScopeOptions(params);
  const ticket = createTicket({
    guildId,
    userId,
    channelId,
    category,
    reason,
  }, scopeOptions);
  return { ok: true, ticket };
}

function getTicketByChannelId(channelId, options = {}) {
  const normalized = normalizeText(channelId);
  if (!normalized) return null;
  return getTicketByChannel(normalized, options);
}

function findOpenTicketForUserInGuild(params = {}) {
  const guildId = normalizeText(params.guildId);
  const userId = normalizeText(params.userId);
  if (!guildId || !userId) return null;

  const scopeOptions = buildScopeOptions(params);
  return listTickets(scopeOptions).find(
    (ticket) =>
      String(ticket?.guildId || '') === guildId
      && String(ticket?.userId || '') === userId
      && String(ticket?.status || '') !== 'closed',
    ) || null;
}

function listSupportTickets(params = {}) {
  const guildId = normalizeText(params.guildId);
  const userId = normalizeText(params.userId);
  const status = normalizeStatus(params.status);
  const category = normalizeCategory(params.category);
  const kind = normalizeCategory(params.kind);
  const scopeOptions = buildScopeOptions(params);

  return listTickets(scopeOptions)
    .filter((ticket) => {
      if (guildId && String(ticket?.guildId || '') !== guildId) return false;
      if (userId && String(ticket?.userId || '') !== userId) return false;
      if (status && normalizeStatus(ticket?.status) !== status) return false;
      if (category && normalizeCategory(ticket?.category) !== category) return false;
      if (kind === 'appeal' && !isAppealCategory(ticket?.category)) return false;
      return true;
    })
    .sort((left, right) => {
      const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

function claimSupportTicket(params = {}) {
  const channelId = normalizeText(params.channelId);
  const staffId = normalizeText(params.staffId);
  if (!channelId || !staffId) {
    return { ok: false, reason: 'invalid-input' };
  }
  const ticket = claimTicket(channelId, staffId, buildScopeOptions(params));
  if (!ticket) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, ticket };
}

function assignSupportTicket(params = {}) {
  const channelId = normalizeText(params.channelId);
  const staffId = normalizeText(params.staffId);
  if (!channelId || !staffId) {
    return { ok: false, reason: 'invalid-input' };
  }
  const scopeOptions = buildScopeOptions(params);
  const ticket = getTicketByChannel(channelId, scopeOptions);
  if (!ticket) {
    return { ok: false, reason: 'not-found' };
  }
  const updated = updateTicket(channelId, {
    status: 'claimed',
    claimedBy: staffId,
    closedAt: null,
  }, scopeOptions);
  if (!updated) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, ticket: updated };
}

function closeSupportTicket(params = {}) {
  const channelId = normalizeText(params.channelId);
  if (!channelId) {
    return { ok: false, reason: 'invalid-input' };
  }
  const ticket = closeTicket(channelId, buildScopeOptions(params));
  if (!ticket) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, ticket };
}

function setSupportTicketEscalation(params = {}) {
  const channelId = normalizeText(params.channelId);
  const staffId = normalizeText(params.staffId);
  const escalated = params.escalated === true;
  if (!channelId) {
    return { ok: false, reason: 'invalid-input' };
  }
  const scopeOptions = buildScopeOptions(params);
  const ticket = getTicketByChannel(channelId, scopeOptions);
  if (!ticket) {
    return { ok: false, reason: 'not-found' };
  }

  const claimedBy = normalizeText(ticket.claimedBy) || staffId || null;
  const nextStatus = escalated
    ? 'escalated'
    : claimedBy
      ? 'claimed'
      : 'open';
  const updated = updateTicket(channelId, {
    status: nextStatus,
    claimedBy,
    closedAt: null,
  }, scopeOptions);
  if (!updated) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, ticket: updated };
}

function buildAppealReviewReason(baseReason, resolution, staffId, note, reviewedAt) {
  const lines = [
    normalizeText(baseReason),
    '',
    `[Appeal ${resolution}] by ${normalizeText(staffId) || 'staff'} at ${reviewedAt.toISOString()}`,
  ];
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    lines.push(normalizedNote);
  }
  return lines.filter((line, index, rows) => line || (index > 0 && rows[index - 1] !== '')).join('\n');
}

function reviewSupportAppeal(params = {}) {
  const channelId = normalizeText(params.channelId);
  const resolution = normalizeStatus(params.resolution);
  const staffId = normalizeText(params.staffId) || 'admin-web';
  const note = normalizeText(params.note);
  if (!channelId || !['approved', 'rejected'].includes(resolution)) {
    return { ok: false, reason: 'invalid-input' };
  }
  const scopeOptions = buildScopeOptions(params);
  const ticket = getTicketByChannel(channelId, scopeOptions);
  if (!ticket) {
    return { ok: false, reason: 'not-found' };
  }
  if (!isAppealCategory(ticket.category)) {
    return { ok: false, reason: 'ticket-is-not-appeal' };
  }
  const reviewedAt = new Date();
  const updated = updateTicket(channelId, {
    status: resolution,
    claimedBy: staffId,
    reason: buildAppealReviewReason(ticket.reason, resolution, staffId, note, reviewedAt),
    closedAt: reviewedAt,
  }, scopeOptions);
  if (!updated) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, ticket: updated };
}

module.exports = {
  createSupportTicket,
  getTicketByChannelId,
  findOpenTicketForUserInGuild,
  listSupportTickets,
  claimSupportTicket,
  assignSupportTicket,
  closeSupportTicket,
  setSupportTicketEscalation,
  reviewSupportAppeal,
};
