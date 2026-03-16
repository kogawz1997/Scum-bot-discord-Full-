/**
 * Dashboard observability helpers split out of the former dashboard monolith so charts,
 * metrics refresh, and export flows stay reviewable.
 */
    function drawLineChart(canvas, points, options = {}) {
      if (!canvas || !canvas.getContext) return;
      const width = canvas.clientWidth || canvas.width || 640;
      const height = canvas.clientHeight || canvas.height || 120;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);

      const data = Array.isArray(points) ? points.slice(-120) : [];
      if (data.length === 0) {
        ctx.fillStyle = 'rgba(180, 190, 210, 0.8)';
        ctx.font = '13px Barlow Condensed, sans-serif';
        ctx.fillText('ไม่มีข้อมูล time-series', 12, 24);
        return;
      }

      const values = data.map((point) => Number(point?.value || 0));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = Math.max(0.000001, max - min);
      const left = 12;
      const right = width - 10;
      const top = 12;
      const bottom = height - 18;

      ctx.strokeStyle = 'rgba(140, 170, 220, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      ctx.strokeStyle = options.color || '#57a7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((point, index) => {
        const x = left + ((right - left) * index) / Math.max(1, data.length - 1);
        const y =
          bottom - ((Number(point?.value || 0) - min) / range) * (bottom - top);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const latest = values[values.length - 1];
      ctx.fillStyle = 'rgba(220, 235, 255, 0.95)';
      ctx.font = '12px Barlow Condensed, sans-serif';
      const suffix = options.suffix || '';
      const text = `${options.label || 'ล่าสุด'}: ${latest.toFixed(2)}${suffix}`;
      ctx.fillText(text, left, height - 4);
    }

    function filterSeriesByWindow(points, windowMs) {
      const list = Array.isArray(points) ? points : [];
      const duration = Math.max(60 * 1000, Number(windowMs || 24 * 60 * 60 * 1000));
      const cutoff = Date.now() - duration;
      return list.filter((point) => {
        const at = Date.parse(String(point?.at || ''));
        if (!Number.isFinite(at)) return false;
        return at >= cutoff;
      });
    }

    function renderMetricsCharts() {
      const series = snapshot?.observability?.timeSeries || {};
      drawLineChart(
        chartDeliveryQueue,
        filterSeriesByWindow(series.deliveryQueueLength, currentMetricsWindowMs),
        {
          color: '#57a7ff',
          label: 'Queue',
        },
      );
      drawLineChart(
        chartDeliveryFailRate,
        filterSeriesByWindow(series.deliveryFailRate, currentMetricsWindowMs),
        {
          color: '#ffb84d',
          label: 'Fail rate',
          suffix: '',
        },
      );
      drawLineChart(
        chartLoginFailures,
        filterSeriesByWindow(series.loginFailures, currentMetricsWindowMs),
        {
          color: '#ff6b7b',
          label: 'Failures',
        },
      );
      drawLineChart(
        chartWebhookErrorRate,
        filterSeriesByWindow(series.webhookErrorRate, currentMetricsWindowMs),
        {
          color: '#31d6b6',
          label: 'Error rate',
        },
      );
    }

    function buildObservabilityRequestPath() {
      const params = new URLSearchParams();
      params.set('windowMs', String(currentMetricsWindowMs));
      params.set('series', METRICS_SERIES_NAMES.join(','));
      return `/admin/api/observability?${params.toString()}`;
    }

    function buildObservabilityExportPath(format = 'json') {
      const params = new URLSearchParams();
      params.set('windowMs', String(currentMetricsWindowMs));
      params.set('series', METRICS_SERIES_NAMES.join(','));
      params.set('format', format);
      return `/admin/api/observability/export?${params.toString()}`;
    }

    function buildAuthSecurityExportPath(format = 'json') {
      const params = new URLSearchParams();
      params.set('format', format === 'csv' ? 'csv' : 'json');
      if (currentAuthSearch) params.set('q', currentAuthSearch);
      if (currentAuthEventSeverity) params.set('severity', currentAuthEventSeverity);
      if (currentAuthEventType) params.set('type', currentAuthEventType);
      if (currentAuthAnomalyOnly) params.set('anomalyOnly', 'true');
      return `/admin/api/auth/security-events/export?${params.toString()}`;
    }

    async function refreshObservabilitySnapshot(options = {}) {
      const { silent = true } = options;
      if (!isAuthed) return;
      const res = await api(buildObservabilityRequestPath(), 'GET');
      if (!snapshot || typeof snapshot !== 'object') {
        snapshot = {};
      }
      snapshot.observability = res.data || {};
      renderMetricsCharts();
      if (datasetSelect?.value === 'observability') {
        renderSelectedDataset();
      }
      if (!silent) {
        toast('อัปเดต metrics แล้ว');
      }
    }

    async function exportObservability(format = 'json') {
      const { blob, filename } = await apiBlob(buildObservabilityExportPath(format));
      const fallback = `observability-${new Date().toISOString().replace(/[:.]/g, '-')}.${format === 'csv' ? 'csv' : 'json'}`;
      downloadBlob(filename || fallback, blob);
      toast(`ส่งออก metrics ${format.toUpperCase()} แล้ว`);
    }
