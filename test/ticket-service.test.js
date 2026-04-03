const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ticketStorePath = path.resolve(__dirname, '../src/store/ticketStore.js');
const ticketServicePath = path.resolve(__dirname, '../src/services/ticketService.js');

function freshModule(modulePath) {
  delete require.cache[modulePath];
  return require(modulePath);
}

function resetTicketState() {
  const ticketStore = freshModule(ticketStorePath);
  if (typeof ticketStore.replaceTickets === 'function') {
    ticketStore.replaceTickets([], 1);
  }
  delete require.cache[ticketServicePath];
  return {
    ticketStore,
    ticketService: freshModule(ticketServicePath),
  };
}

test('ticket service can assign and reassign an open support ticket', () => {
  const { ticketStore, ticketService } = resetTicketState();
  ticketStore.createTicket({
    guildId: 'tenant-1',
    userId: 'player-1',
    channelId: 'ticket-assign-1',
    category: 'support',
    reason: 'Need operator follow-up',
  });

  const firstAssignment = ticketService.assignSupportTicket({
    channelId: 'ticket-assign-1',
    staffId: 'mod-1',
  });
  assert.equal(firstAssignment.ok, true);
  assert.equal(firstAssignment.ticket.status, 'claimed');
  assert.equal(firstAssignment.ticket.claimedBy, 'mod-1');

  const secondAssignment = ticketService.assignSupportTicket({
    channelId: 'ticket-assign-1',
    staffId: 'owner-1',
  });
  assert.equal(secondAssignment.ok, true);
  assert.equal(secondAssignment.ticket.status, 'claimed');
  assert.equal(secondAssignment.ticket.claimedBy, 'owner-1');
});

test('ticket service can escalate and return a claimed ticket to the active queue', () => {
  const { ticketStore, ticketService } = resetTicketState();
  ticketStore.createTicket({
    guildId: 'tenant-1',
    userId: 'player-2',
    channelId: 'ticket-escalate-1',
    category: 'support',
    reason: 'Needs owner review',
  });
  ticketService.assignSupportTicket({
    channelId: 'ticket-escalate-1',
    staffId: 'mod-2',
  });

  const escalated = ticketService.setSupportTicketEscalation({
    channelId: 'ticket-escalate-1',
    escalated: true,
    staffId: 'owner-1',
  });
  assert.equal(escalated.ok, true);
  assert.equal(escalated.ticket.status, 'escalated');
  assert.equal(escalated.ticket.claimedBy, 'mod-2');

  const restored = ticketService.setSupportTicketEscalation({
    channelId: 'ticket-escalate-1',
    escalated: false,
  });
  assert.equal(restored.ok, true);
  assert.equal(restored.ticket.status, 'claimed');
  assert.equal(restored.ticket.claimedBy, 'mod-2');
});
