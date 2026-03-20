(function () {
  'use strict';

  /**
   * Browser copy of the operational phase helpers.
   *
   * Keep this file logic-only and side-effect free so owner/tenant surfaces can
   * share the same operator-facing phase language without changing any backend
   * behavior.
   */

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getDeliveryCaseOperationalPhase(detail) {
    const purchaseStatus = normalizeText(detail?.purchase?.status);
    if (detail?.deadLetter) {
      return { key: 'dead-letter', tone: 'danger' };
    }
    if (purchaseStatus === 'delivery_failed') {
      return { key: 'failed', tone: 'danger' };
    }
    if (detail?.queueJob || purchaseStatus === 'pending') {
      return { key: 'queued', tone: 'warning' };
    }
    if (purchaseStatus === 'delivering') {
      return { key: 'executing', tone: 'warning' };
    }
    if (purchaseStatus === 'delivered') {
      return Array.isArray(detail?.auditRows) && detail.auditRows.length > 0
        ? { key: 'verified', tone: 'success' }
        : { key: 'delivered', tone: 'info' };
    }
    return { key: 'created', tone: 'info' };
  }

  function getRestoreOperationalPhase(restoreState, restorePreview) {
    const status = normalizeText(restoreState?.status);
    const rollbackStatus = normalizeText(restoreState?.rollbackStatus);
    if (status === 'running') {
      return { key: 'executing', tone: 'warning' };
    }
    if (status === 'succeeded') {
      return { key: 'completed', tone: 'success' };
    }
    if (status === 'failed' && rollbackStatus === 'succeeded') {
      return { key: 'rolled-back', tone: 'warning' };
    }
    if (status === 'failed') {
      return { key: 'failed', tone: 'danger' };
    }
    if (restorePreview?.backup || restoreState?.previewBackup || restoreState?.previewToken) {
      return { key: 'previewed', tone: 'info' };
    }
    return { key: 'idle', tone: 'neutral' };
  }

  function getConfigApplyOperationalPhase(applyState) {
    const changedCount = Number(applyState?.changedCount || 0);
    if (!applyState || typeof applyState !== 'object') {
      return { key: 'idle', tone: 'neutral' };
    }
    if (applyState.rollback === true) {
      return { key: 'rolled-back', tone: 'warning' };
    }
    if (applyState.restartRequired === true && applyState.restarted === true) {
      return { key: 'applied-restarted', tone: 'success' };
    }
    if (applyState.restartRequired === true) {
      return { key: 'requires-restart', tone: 'warning' };
    }
    if (changedCount > 0) {
      return { key: 'applied', tone: 'success' };
    }
    return { key: 'validated', tone: 'info' };
  }

  window.AdminOperationalStateModel = {
    getConfigApplyOperationalPhase,
    getDeliveryCaseOperationalPhase,
    getRestoreOperationalPhase,
  };
})();
