'use strict';

function createAdminLiveRuntime(options = {}) {
  const {
    liveHeartbeatMs,
    metricsSeriesIntervalMs,
    metricsSeriesRetentionMs,
    createObservabilitySeriesState,
    clampObservabilityWindowMs,
    parseObservabilitySeriesKeys,
    captureObservabilitySeries,
    listObservabilitySeries,
    buildSecurityHeaders,
    jsonReplacer,
    getDeliveryMetricsSnapshot,
    getDeliveryRuntimeSnapshotSync,
    getLoginFailureMetrics,
    getWebhookMetricsSnapshot,
    getAdminRequestLogMetrics,
    getRuntimeSupervisorSnapshot,
  } = options;

  const liveClients = new Set();
  const metricsSeries = createObservabilitySeriesState();
  const metricsSeriesKeys = Object.freeze(Object.keys(metricsSeries));
  let liveHeartbeatTimer = null;
  let metricsSeriesTimer = null;

  function writeLiveEvent(res, eventType, payload) {
    if (!res || res.writableEnded) return;
    const body = JSON.stringify(
      {
        type: String(eventType || 'update'),
        payload: payload && typeof payload === 'object' ? payload : {},
        at: new Date().toISOString(),
      },
      jsonReplacer,
    );
    res.write(`event: ${String(eventType || 'update')}\n`);
    res.write(`data: ${body}\n\n`);
  }

  function stopLiveHeartbeatIfIdle() {
    if (liveClients.size > 0) return;
    if (!liveHeartbeatTimer) return;
    clearInterval(liveHeartbeatTimer);
    liveHeartbeatTimer = null;
  }

  function ensureLiveHeartbeat() {
    if (liveHeartbeatTimer) return;
    liveHeartbeatTimer = setInterval(() => {
      for (const res of liveClients) {
        writeLiveEvent(res, 'heartbeat', { now: Date.now() });
      }
    }, liveHeartbeatMs);
    if (typeof liveHeartbeatTimer.unref === 'function') {
      liveHeartbeatTimer.unref();
    }
  }

  function broadcastLiveUpdate(eventType, payload = {}) {
    if (liveClients.size === 0) return;
    for (const res of liveClients) {
      writeLiveEvent(res, eventType, payload);
    }
  }

  function openLiveStream(req, res) {
    res.writeHead(200, buildSecurityHeaders({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    }));
    res.write(': connected\n\n');
    liveClients.add(res);
    ensureLiveHeartbeat();
    writeLiveEvent(res, 'connected', {
      clients: liveClients.size,
    });

    const cleanup = () => {
      liveClients.delete(res);
      stopLiveHeartbeatIfIdle();
    };
    res.on('close', cleanup);
    res.on('error', cleanup);
    req.on('aborted', cleanup);
  }

  function captureMetricsSeries(now = Date.now()) {
    captureObservabilitySeries({
      seriesState: metricsSeries,
      retentionMs: metricsSeriesRetentionMs,
      now,
      getDeliveryMetricsSnapshot,
      getDeliveryRuntimeStatus: getDeliveryRuntimeSnapshotSync,
      getLoginFailureMetrics,
      getWebhookMetricsSnapshot,
      getAdminRequestLogMetrics,
      getRuntimeSupervisorSnapshot,
    });
  }

  function clampMetricsWindowMs(value) {
    return clampObservabilityWindowMs(value, metricsSeriesRetentionMs);
  }

  function parseMetricsSeriesKeys(value) {
    return parseObservabilitySeriesKeys(value, metricsSeriesKeys);
  }

  function listMetricsSeries(options = {}) {
    return listObservabilitySeries({
      seriesState: metricsSeries,
      retentionMs: metricsSeriesRetentionMs,
      keys: Array.isArray(options.keys) ? options.keys : [],
      windowMs: options.windowMs,
    });
  }

  function ensureMetricsSeriesTimer() {
    if (metricsSeriesTimer) return;
    captureMetricsSeries();
    metricsSeriesTimer = setInterval(() => {
      captureMetricsSeries();
    }, metricsSeriesIntervalMs);
    if (typeof metricsSeriesTimer.unref === 'function') {
      metricsSeriesTimer.unref();
    }
  }

  function stopMetricsSeriesTimer() {
    if (!metricsSeriesTimer) return;
    clearInterval(metricsSeriesTimer);
    metricsSeriesTimer = null;
  }

  function closeAllLiveStreams() {
    if (liveClients.size === 0) {
      stopLiveHeartbeatIfIdle();
      return;
    }
    for (const res of liveClients) {
      try {
        if (!res.writableEnded) {
          res.end();
        }
        if (typeof res.destroy === 'function') {
          res.destroy();
        }
      } catch {}
    }
    liveClients.clear();
    stopLiveHeartbeatIfIdle();
  }

  return {
    broadcastLiveUpdate,
    captureMetricsSeries,
    clampMetricsWindowMs,
    closeAllLiveStreams,
    ensureMetricsSeriesTimer,
    listMetricsSeries,
    openLiveStream,
    parseMetricsSeriesKeys,
    stopMetricsSeriesTimer,
  };
}

module.exports = {
  createAdminLiveRuntime,
};
