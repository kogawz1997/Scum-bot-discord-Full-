const { EventEmitter } = require('node:events');

const adminLiveBus = new EventEmitter();
adminLiveBus.setMaxListeners(100);

function publishAdminLiveUpdate(type, payload = {}) {
  adminLiveBus.emit('update', {
    type: String(type || 'update'),
    payload: payload && typeof payload === 'object' ? payload : {},
    at: new Date().toISOString(),
  });
}

module.exports = {
  adminLiveBus,
  publishAdminLiveUpdate,
};
