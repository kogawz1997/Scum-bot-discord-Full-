'use strict';

/** Shared signal and exit hook registration for runtime entrypoints. */

function registerGracefulShutdown(handlers = {}) {
  if (typeof handlers.onSigint === 'function') {
    process.once('SIGINT', handlers.onSigint);
  }
  if (typeof handlers.onSigterm === 'function') {
    process.once('SIGTERM', handlers.onSigterm);
  }
  if (typeof handlers.onExit === 'function') {
    process.once('exit', handlers.onExit);
  }
}

module.exports = {
  registerGracefulShutdown,
};
