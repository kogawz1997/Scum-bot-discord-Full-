/**
 * Dashboard auth/security UI helpers split out of the former dashboard monolith so the admin
 * control panel is easier to review without changing browser behavior.
 */    function syncAuthFilterInputs() {
      if (authSearchInput) authSearchInput.value = currentAuthSearch;
      if (authSeveritySelect) authSeveritySelect.value = currentAuthEventSeverity;
      if (authEventTypeInput) authEventTypeInput.value = currentAuthEventType;
      if (authAnomalyOnlySelect) authAnomalyOnlySelect.value = currentAuthAnomalyOnly ? 'true' : '';
    }

    function resetAuthFilters() {
      currentAuthSearch = '';
      currentAuthEventSeverity = '';
      currentAuthEventType = '';
      currentAuthAnomalyOnly = false;
      syncAuthFilterInputs();
    }

    function syncAuthFiltersFromQueryParams(params = new URLSearchParams(window.location.search)) {
      currentAuthSearch = String(params.get('authQ') || '').trim();
      currentAuthEventSeverity = String(params.get('authSeverity') || '').trim().toLowerCase();
      currentAuthEventType = String(params.get('authEventType') || '').trim();
      currentAuthAnomalyOnly = String(params.get('authAnomalyOnly') || '').trim().toLowerCase() === 'true';
      syncAuthFilterInputs();
    }

    function updateDashboardQueryParams(nextValues = {}) {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const entries = Object.entries(nextValues || {});
      for (const [key, value] of entries) {
        const normalized = String(value ?? '').trim();
        if (!normalized) {
          params.delete(key);
        } else {
          params.set(key, normalized);
        }
      }
      const nextSearch = params.toString();
      const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash || ''}`;
      window.history.replaceState(null, '', nextUrl);
    }

    function getInitialActiveTabKey() {
      const tabKey = String(new URLSearchParams(window.location.search).get('tab') || '').trim();
      if (tabButtons.some((button) => String(button.dataset.tab || '').trim() === tabKey)) {
        return tabKey;
      }
      return 'economy';
    }

    function serializeForSearch(value) {
      if (Array.isArray(value)) {
        return value.map((entry) => serializeForSearch(entry)).join(' ');
      }
      if (value && typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value ?? '');
    }

    function matchesSearchQuery(row, query) {
      const normalizedQuery = String(query || '').trim().toLowerCase();
      if (!normalizedQuery) return true;
      return Object.values(row || {}).some((value) =>
        serializeForSearch(value).toLowerCase().includes(normalizedQuery),
      );
    }

    function isSecurityAnomaly(row = {}) {
      const severity = String(row?.severity || row?.level || '').trim().toLowerCase();
      if (severity === 'warn' || severity === 'error') return true;
      const type = String(row?.type || row?.title || '').trim().toLowerCase();
      return /fail|anomaly|mismatch|revoked|denied|blocked|expired/.test(type);
    }

    function filterAuthEvents(rows = []) {
      return (Array.isArray(rows) ? rows : []).filter((row) => {
        if (currentAuthEventSeverity) {
          const severity = String(row?.severity || row?.level || '').trim().toLowerCase();
          if (severity !== currentAuthEventSeverity) return false;
        }
        if (currentAuthEventType) {
          const type = String(row?.type || '').trim().toLowerCase();
          if (!type.includes(String(currentAuthEventType || '').trim().toLowerCase())) return false;
        }
        if (currentAuthAnomalyOnly && !isSecurityAnomaly(row)) return false;
        return matchesSearchQuery(row, currentAuthSearch);
      });
    }

    function filterAuthSessions(rows = []) {
      return (Array.isArray(rows) ? rows : []).filter((row) => matchesSearchQuery(row, currentAuthSearch));
    }

    function filterAuthPermissions(rows = []) {
      return (Array.isArray(rows) ? rows : []).filter((row) => matchesSearchQuery(row, currentAuthSearch));
    }

    function getCurrentAdminSessionId() {
      const sessions = Array.isArray(snapshot?.adminSessions) ? snapshot.adminSessions : [];
      const currentSession = sessions.find((row) => row?.current === true);
      return String(currentSession?.id || '').trim();
    }

    function renderAuthSessionTable(rows = []) {
      if (!authSessionTableWrap) return;
      if (!hasRoleAtLeast(currentUserRole, 'owner')) {
        authSessionTableWrap.innerHTML =
          '<div style="padding:12px; color:#9eb0d9;">ต้องใช้สิทธิ owner เพื่อดูและ revoke admin sessions</div>';
        return;
      }
      const sessions = Array.isArray(rows) ? rows : [];
      if (sessions.length === 0) {
        authSessionTableWrap.innerHTML =
          '<div style="padding:12px; color:#9eb0d9;">ยังไม่มี active session ที่บันทึกอยู่</div>';
        return;
      }
      const head = [
        '<tr>',
        '<th>User</th>',
        '<th>Role</th>',
        '<th>Method</th>',
        '<th>Created / Expire</th>',
        '<th>Step-up / Source</th>',
        '<th>Session</th>',
        '<th>Actions</th>',
        '</tr>',
      ].join('');
      const body = sessions.slice(0, 200).map((row) => {
        const userBadges = [
          row?.current ? '<span class="auth-badge">current</span>' : '',
          row?.current !== true && row?.role === 'owner' ? '<span class="auth-badge warn">owner</span>' : '',
        ].filter(Boolean).join(' ');
        const stepUpBadges = [
          row?.stepUpActive ? '<span class="auth-badge">step-up active</span>' : '<span class="auth-badge warn">step-up idle</span>',
          row?.authSource ? `<span class="auth-badge">${escapeHtml(String(row.authSource))}</span>` : '',
        ].filter(Boolean).join(' ');
        const sessionMeta = [
          row?.id ? `<code>${escapeHtml(String(row.id))}</code>` : '-',
          row?.ip ? `IP: ${escapeHtml(String(row.ip))}` : '',
        ].filter(Boolean).join('<br>');
        return [
          '<tr>',
          `<td><strong>${escapeHtml(String(row?.user || '-'))}</strong>${userBadges ? `<div class="auth-session-meta">${userBadges}</div>` : ''}</td>`,
          `<td>${escapeHtml(String(row?.role || '-'))}</td>`,
          `<td>${escapeHtml(String(row?.authMethod || '-'))}</td>`,
          `<td><div>${escapeHtml(formatDeliveryTime(row?.createdAt || ''))}</div><div class="auth-session-meta">หมดอายุ ${escapeHtml(formatDeliveryTime(row?.expiresAt || ''))}</div></td>`,
          `<td><div>${stepUpBadges || '<span class="auth-badge warn">ไม่มีข้อมูล</span>'}</div><div class="auth-session-meta">ล่าสุด ${escapeHtml(formatDeliveryTime(row?.stepUpVerifiedAt || row?.lastSeenAt || ''))}</div></td>`,
          `<td>${sessionMeta || '-'}</td>`,
          `<td class="row-actions"><button type="button" class="danger" data-auth-session-revoke="${escapeHtml(String(row?.id || ''))}" data-auth-session-current="${row?.current ? 'true' : 'false'}">Revoke</button></td>`,
          '</tr>',
        ].join('');
      }).join('');
      authSessionTableWrap.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }

    function renderAuthRoleMatrix(data = null) {
      if (authRoleMatrixSummary) {
        if (!data) {
          authRoleMatrixSummary.innerHTML =
            '<div class="metric"><div class="k">Role Matrix</div><div class="v">ยังไม่มีข้อมูล</div></div>';
        } else {
          const summary = data.summary || {};
          const visiblePermissions = Array.isArray(data.permissions) ? data.permissions.length : 0;
          const roleSummary = Array.isArray(summary.roles)
            ? summary.roles
                .map((row) => `${row.role}:${Number(row.permissionCount || 0).toLocaleString()}`)
                .join(' | ')
            : '-';
          const metrics = [
            ['Permissions', Number(summary.totalPermissions || 0).toLocaleString()],
            ['Visible', Number(visiblePermissions || 0).toLocaleString()],
            ['Step-up routes', Number(summary.stepUpPermissions || 0).toLocaleString()],
            ['Categories', Number((summary.categories || []).length || 0).toLocaleString()],
            ['Role coverage', roleSummary || '-'],
          ];
          authRoleMatrixSummary.innerHTML = metrics
            .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
            .join('');
        }
      }
      const rows = Array.isArray(data?.permissions)
        ? data.permissions.map((entry) => ({
          category: entry?.category || '-',
          permission: entry?.permission || '-',
          minRole: entry?.minRole || '-',
          stepUp: entry?.stepUp ? 'yes' : 'no',
          path: entry?.path || '-',
          description: entry?.description || '-',
        }))
        : [];
      renderRowsToContainer(authRoleMatrixTableWrap, rows, 'ยังไม่มีข้อมูล role matrix');
    }

    function renderAuthSecurityCenter() {
      if (!hasRoleAtLeast(currentUserRole, 'admin') && isAuthed) {
        if (authSecuritySummary) {
          authSecuritySummary.innerHTML =
            '<div class="metric"><div class="k">Auth</div><div class="v">ต้องใช้สิทธิ admin ขึ้นไป</div></div>';
        }
        if (authSessionTableWrap) {
          authSessionTableWrap.innerHTML =
            '<div style="padding:12px; color:#9eb0d9;">ต้องใช้สิทธิ admin/owner เพื่อดู auth security center</div>';
        }
        renderTimelineCards(authSecurityEventList, [], 'ต้องใช้สิทธิ admin ขึ้นไป');
        renderAuthRoleMatrix(null);
        return;
      }
      const providers = snapshot?.adminAuthProviders && typeof snapshot.adminAuthProviders === 'object'
        ? snapshot.adminAuthProviders
        : null;
      const securityEvents = Array.isArray(snapshot?.adminSecurityEvents) ? snapshot.adminSecurityEvents : [];
      const sessions = Array.isArray(snapshot?.adminSessions) ? snapshot.adminSessions : [];
      const roleMatrix = snapshot?.adminRoleMatrix && typeof snapshot.adminRoleMatrix === 'object'
        ? snapshot.adminRoleMatrix
        : null;
      const filteredSecurityEvents = filterAuthEvents(securityEvents);
      const filteredSessions = filterAuthSessions(sessions);
      const filteredPermissions = filterAuthPermissions(Array.isArray(roleMatrix?.permissions) ? roleMatrix.permissions : []);

      if (!isAuthed) {
        if (authSecuritySummary) {
          authSecuritySummary.innerHTML =
            '<div class="metric"><div class="k">Auth</div><div class="v">ต้องเข้าสู่ระบบก่อน</div></div>';
        }
        renderAuthSessionTable([]);
        renderTimelineCards(authSecurityEventList, [], 'ต้องเข้าสู่ระบบก่อน');
        renderAuthRoleMatrix(null);
        return;
      }

      const warnCount = securityEvents.filter((entry) => String(entry?.severity || '').trim().toLowerCase() === 'warn').length;
      const errorCount = securityEvents.filter((entry) => String(entry?.severity || '').trim().toLowerCase() === 'error').length;
      const latestAnomaly = securityEvents.find((entry) => ['warn', 'error'].includes(String(entry?.severity || '').trim().toLowerCase()));
      const activeFilterTokens = [
        currentAuthSearch ? `search:${currentAuthSearch}` : '',
        currentAuthEventSeverity ? `severity:${currentAuthEventSeverity}` : '',
        currentAuthEventType ? `type:${currentAuthEventType}` : '',
        currentAuthAnomalyOnly ? 'anomaly-only' : '',
      ].filter(Boolean);
      const metrics = [
        ['Current user', currentUserName || '-'],
        ['Current role', currentUserRole || '-'],
        ['2FA', providers?.twoFactor ? 'enabled' : 'disabled'],
        ['Step-up', providers?.stepUp?.enabled ? `enabled (${Number(providers.stepUp.ttlMinutes || 0).toLocaleString()}m)` : 'disabled'],
        ['SSO', providers?.discordSso ? 'enabled' : 'disabled'],
        ['Security events', Number(securityEvents.length || 0).toLocaleString()],
        ['Visible events', Number(filteredSecurityEvents.length || 0).toLocaleString()],
        ['Warn / Error', `${Number(warnCount || 0).toLocaleString()} / ${Number(errorCount || 0).toLocaleString()}`],
        ['Active sessions', hasRoleAtLeast(currentUserRole, 'owner') ? `${Number(filteredSessions.length || 0).toLocaleString()} / ${Number(sessions.length || 0).toLocaleString()}` : 'owner only'],
        ['Visible permissions', Number(filteredPermissions.length || 0).toLocaleString()],
        ['Filters', activeFilterTokens.join(' | ') || 'none'],
        ['Last anomaly', latestAnomaly ? `${latestAnomaly.type || '-'} @ ${formatDeliveryTime(latestAnomaly.at || '')}` : 'none'],
      ];
      if (authSecuritySummary) {
        authSecuritySummary.innerHTML = metrics
          .map(([k, v]) => `<div class="metric"><div class="k">${escapeHtml(String(k))}</div><div class="v">${escapeHtml(String(v))}</div></div>`)
          .join('');
      }

      renderAuthSessionTable(filteredSessions);
      renderTimelineCards(
        authSecurityEventList,
        filteredSecurityEvents.map((entry) => ({
          title: entry?.type || 'security-event',
          at: entry?.at || '',
          status: String(entry?.severity || '').trim().toLowerCase() === 'error'
            ? 'failed'
            : /succeeded|created/i.test(String(entry?.type || ''))
              ? 'completed'
              : 'pending',
          level: entry?.severity || 'info',
          stage: entry?.severity || 'info',
          source: [entry?.actor, entry?.role].filter(Boolean).join(' / ') || '-',
          errorCode: entry?.reason || '',
          message: entry?.detail || entry?.reason || entry?.path || '-',
          commandSummary: [entry?.targetUser ? `target=${entry.targetUser}` : '', entry?.sessionId ? `session=${entry.sessionId}` : '', entry?.ip ? `ip=${entry.ip}` : '']
            .filter(Boolean)
            .join(' • '),
        })),
        activeFilterTokens.length > 0 ? 'ไม่พบ security events ที่ตรงกับ filter' : 'ยังไม่มี security events',
      );
      renderAuthRoleMatrix(roleMatrix ? {
        ...roleMatrix,
        permissions: filteredPermissions,
      } : null);
    }


