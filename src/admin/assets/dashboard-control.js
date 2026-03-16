/**
 * Dashboard control-panel UI helpers split out of the former dashboard monolith so runtime
 * configuration, env patching, and restart flows are easier to review.
 */    function getControlPanelEnvEntry(scope, key) {
      return controlPanelSettings?.env?.[scope]?.[key] || null;
    }

    function getControlPanelEnvValue(scope, key, fallback = '') {
      const entry = getControlPanelEnvEntry(scope, key);
      if (!entry) return fallback;
      return entry.value ?? fallback;
    }

    function setSelectBooleanValue(element, value) {
      if (!element) return;
      element.value = value ? 'true' : 'false';
    }

    function fillControlPanelConfigFromSnapshot() {
      if (!snapshot?.config) return;
      const cfg = snapshot.config;
      if (cpChannelCommands) cpChannelCommands.value = String(cfg.channels?.commandsChannel || '');
      if (cpChannelAdminLog) cpChannelAdminLog.value = String(cfg.channels?.adminLog || '');
      if (cpChannelShopLog) cpChannelShopLog.value = String(cfg.channels?.shopLog || '');
      if (cpChannelEvidence) cpChannelEvidence.value = String(cfg.channels?.evidence || '');
      if (cpChannelInServer) cpChannelInServer.value = String(cfg.channels?.inServer || '');
      if (cpRoleOwner) cpRoleOwner.value = String(cfg.roles?.owner || '');
      if (cpRoleAdmin) cpRoleAdmin.value = String(cfg.roles?.admin || '');
      if (cpRoleModerator) cpRoleModerator.value = String(cfg.roles?.moderator || '');
      if (cpRoleHelper) cpRoleHelper.value = String(cfg.roles?.helper || '');
      if (cpRoleVip) cpRoleVip.value = String(cfg.roles?.vip || '');
      if (cpRoleVerified) cpRoleVerified.value = String(cfg.roles?.verified || '');

      const delivery = cfg.delivery?.auto || {};
      setSelectBooleanValue(cpDeliveryEnabled, delivery.enabled !== false);
      if (cpDeliveryMode) cpDeliveryMode.value = String(delivery.executionMode || 'rcon');
      if (cpDeliveryVerifyMode) cpDeliveryVerifyMode.value = String(delivery.verifyMode || '');
      if (cpDeliveryQueueInterval) cpDeliveryQueueInterval.value = delivery.queueIntervalMs ?? '';
      if (cpDeliveryMaxRetries) cpDeliveryMaxRetries.value = delivery.maxRetries ?? '';
      if (cpDeliveryRetryDelay) cpDeliveryRetryDelay.value = delivery.retryDelayMs ?? '';
      if (cpDeliveryRetryBackoff) cpDeliveryRetryBackoff.value = delivery.retryBackoff ?? '';
      if (cpDeliveryCommandTimeout) cpDeliveryCommandTimeout.value = delivery.commandTimeoutMs ?? '';
      if (cpDeliveryMagazineStackCount) cpDeliveryMagazineStackCount.value = delivery.magazineStackCount ?? '';
      if (cpDeliveryTeleportMode) cpDeliveryTeleportMode.value = String(delivery.agentTeleportMode || '');
      if (cpDeliveryTeleportTarget) cpDeliveryTeleportTarget.value = String(delivery.agentTeleportTarget || '');
      if (cpDeliveryReturnTarget) cpDeliveryReturnTarget.value = String(delivery.agentReturnTarget || '');
      if (cpDeliveryPreCommands) {
        cpDeliveryPreCommands.value = Array.isArray(delivery.agentPreCommands)
          ? delivery.agentPreCommands.join('\n')
          : '';
      }
      if (cpDeliveryPostCommands) {
        cpDeliveryPostCommands.value = Array.isArray(delivery.agentPostCommands)
          ? delivery.agentPostCommands.join('\n')
          : '';
      }
    }

    function renderControlPanelCommandRegistry() {
      if (!controlCommandWrap) return;
      const commands = Array.isArray(controlPanelSettings?.commands)
        ? controlPanelSettings.commands
        : [];
      if (commands.length === 0) {
        controlCommandWrap.innerHTML = '<div style="padding:12px; color:#9eb0d9;">ยังไม่พบ command registry</div>';
        return;
      }
      const rows = commands.map((entry) => `
        <tr>
          <td><label><input type="checkbox" data-command-disable value="${escapeHtml(entry.name)}" ${entry.disabled ? 'checked' : ''}> ${escapeHtml(entry.name)}</label></td>
          <td>${escapeHtml(entry.description || '-')}</td>
          <td>
            <select data-command-role="${escapeHtml(entry.name)}">
              <option value="public" ${String(entry.requiredRole || 'public') === 'public' ? 'selected' : ''}>public</option>
              <option value="mod" ${String(entry.requiredRole || '') === 'mod' ? 'selected' : ''}>mod</option>
              <option value="admin" ${String(entry.requiredRole || '') === 'admin' ? 'selected' : ''}>admin</option>
              <option value="owner" ${String(entry.requiredRole || '') === 'owner' ? 'selected' : ''}>owner</option>
            </select>
          </td>
          <td>${entry.disabled ? '<span class="badge-text danger">disabled</span>' : '<span class="badge-text ok">enabled</span>'}</td>
        </tr>
      `).join('');
      controlCommandWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Description</th>
              <th>Required Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    function renderManagedServices() {
      const services = Array.isArray(controlPanelSettings?.managedServices)
        ? controlPanelSettings.managedServices
        : [];
      if (controlRestartTargetSelect) {
        const currentValue = String(controlRestartTargetSelect.value || '').trim();
        const options = [
          '<option value="">ไม่ restart อัตโนมัติ</option>',
          '<option value="all">all runtime services</option>',
          ...services.map((entry) =>
            `<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.label)} (${escapeHtml(entry.pm2Name)})</option>`),
        ];
        controlRestartTargetSelect.innerHTML = options.join('');
        if (
          currentValue
          && (
            currentValue === 'all'
            || services.some((entry) => entry.key === currentValue)
          )
        ) {
          controlRestartTargetSelect.value = currentValue;
        }
      }

      const rows = services.map((entry) => ({
        key: entry.key,
        label: entry.label,
        pm2: entry.pm2Name,
        description: entry.description || '-',
      }));
      renderRowsToContainer(controlManagedServicesWrap, rows, 'ยังไม่พบ managed services');
    }

    function renderControlAdminUsers() {
      const rows = Array.isArray(controlPanelSettings?.adminUsers)
        ? controlPanelSettings.adminUsers.map((entry) => ({
          username: entry.username,
          role: entry.role,
          isActive: entry.isActive,
          createdAt: entry.createdAt || '-',
          updatedAt: entry.updatedAt || '-',
        }))
        : [];
      renderRowsToContainer(controlAdminUsersWrap, rows, 'เฉพาะ owner จะเห็นรายชื่อแอดมิน');
    }

    function renderControlPanelSummary() {
      if (!controlPanelSummary) return;
      const commandCount = Array.isArray(controlPanelSettings?.commands)
        ? controlPanelSettings.commands.length
        : 0;
      const disabledCount = Array.isArray(controlPanelSettings?.commandConfig?.disabled)
        ? controlPanelSettings.commandConfig.disabled.length
        : 0;
      const adminCount = Array.isArray(controlPanelSettings?.adminUsers)
        ? controlPanelSettings.adminUsers.length
        : 0;
      const mode = String(snapshot?.config?.delivery?.auto?.executionMode || 'rcon');
      const runtimeMode = String(getControlPanelEnvValue('root', 'DELIVERY_EXECUTION_MODE', mode) || mode);
      controlPanelSummary.innerHTML = `
        <div class="metric"><div class="k">commands</div><div class="v">${commandCount}</div></div>
        <div class="metric"><div class="k">disabled</div><div class="v">${disabledCount}</div></div>
        <div class="metric"><div class="k">admins</div><div class="v">${adminCount}</div></div>
        <div class="metric"><div class="k">delivery</div><div class="v">${escapeHtml(mode)}</div></div>
        <div class="metric"><div class="k">runtime override</div><div class="v">${escapeHtml(runtimeMode)}</div></div>
        <div class="metric"><div class="k">reload</div><div class="v">${controlPanelSettings?.reloadRequired ? 'required for env changes' : 'not required'}</div></div>
      `;
    }

    function fillControlPanelEnvFromSettings() {
      if (!controlPanelSettings) return;
      if (cpGuildId) cpGuildId.value = String(getControlPanelEnvValue('root', 'DISCORD_GUILD_ID', ''));
      setSelectBooleanValue(cpFeatureAdminWeb, Boolean(getControlPanelEnvValue('root', 'BOT_ENABLE_ADMIN_WEB', false)));
      setSelectBooleanValue(cpFeatureDeliveryWorker, Boolean(getControlPanelEnvValue('root', 'BOT_ENABLE_DELIVERY_WORKER', false)));
      setSelectBooleanValue(cpFeatureWorkerDelivery, Boolean(getControlPanelEnvValue('root', 'WORKER_ENABLE_DELIVERY', false)));
      setSelectBooleanValue(cpFeatureRentBikeService, Boolean(getControlPanelEnvValue('root', 'BOT_ENABLE_RENTBIKE_SERVICE', false)));
      setSelectBooleanValue(cpFeatureWorkerRentBike, Boolean(getControlPanelEnvValue('root', 'WORKER_ENABLE_RENTBIKE', false)));
      setSelectBooleanValue(cpFeatureWebhook, Boolean(getControlPanelEnvValue('root', 'BOT_ENABLE_SCUM_WEBHOOK', false)));
      if (cpRuntimeDeliveryExecutionMode) cpRuntimeDeliveryExecutionMode.value = String(getControlPanelEnvValue('root', 'DELIVERY_EXECUTION_MODE', 'rcon'));
      if (cpRconHost) cpRconHost.value = String(getControlPanelEnvValue('root', 'RCON_HOST', ''));
      if (cpRconPort) cpRconPort.value = getControlPanelEnvValue('root', 'RCON_PORT', '');
      if (cpRconProtocol) cpRconProtocol.value = String(getControlPanelEnvValue('root', 'RCON_PROTOCOL', ''));
      if (cpRconTemplate) cpRconTemplate.value = String(getControlPanelEnvValue('root', 'RCON_EXEC_TEMPLATE', ''));
      if (cpRconPassword) cpRconPassword.value = '';
      if (cpAgentBaseUrl) cpAgentBaseUrl.value = String(getControlPanelEnvValue('root', 'SCUM_CONSOLE_AGENT_BASE_URL', ''));
      if (cpAgentHost) cpAgentHost.value = String(getControlPanelEnvValue('root', 'SCUM_CONSOLE_AGENT_HOST', ''));
      if (cpAgentPort) cpAgentPort.value = getControlPanelEnvValue('root', 'SCUM_CONSOLE_AGENT_PORT', '');
      if (cpAgentBackend) cpAgentBackend.value = String(getControlPanelEnvValue('root', 'SCUM_CONSOLE_AGENT_BACKEND', ''));
      if (cpAgentTemplate) cpAgentTemplate.value = String(getControlPanelEnvValue('root', 'SCUM_CONSOLE_AGENT_EXEC_TEMPLATE', ''));
      if (cpAgentToken) cpAgentToken.value = '';
      if (cpWebhookUrl) cpWebhookUrl.value = String(getControlPanelEnvValue('root', 'SCUM_WEBHOOK_URL', ''));
      if (cpWebhookPort) cpWebhookPort.value = getControlPanelEnvValue('root', 'SCUM_WEBHOOK_PORT', '');
      if (cpLogPath) cpLogPath.value = String(getControlPanelEnvValue('root', 'SCUM_LOG_PATH', ''));
      if (cpPortalBaseUrl) cpPortalBaseUrl.value = String(getControlPanelEnvValue('portal', 'WEB_PORTAL_BASE_URL', ''));
      setSelectBooleanValue(cpPortalOpenAccess, Boolean(getControlPanelEnvValue('portal', 'WEB_PORTAL_PLAYER_OPEN_ACCESS', false)));
      setSelectBooleanValue(cpPortalRequireGuild, Boolean(getControlPanelEnvValue('portal', 'WEB_PORTAL_REQUIRE_GUILD_MEMBER', false)));
      if (cpPortalMapUrl) cpPortalMapUrl.value = String(getControlPanelEnvValue('portal', 'WEB_PORTAL_MAP_EXTERNAL_URL', ''));
      renderControlPanelCommandRegistry();
      renderManagedServices();
      renderControlAdminUsers();
      renderControlPanelSummary();
    }

    async function refreshControlPanel(options = {}) {
      if (!isAuthed || !hasRoleAtLeast(currentUserRole, 'admin')) return;
      const { silent = true } = options;
      const res = await api('/admin/api/control-panel/settings');
      controlPanelSettings = res.data || null;
      fillControlPanelEnvFromSettings();
      fillControlPanelConfigFromSnapshot();
      if (!silent) {
        toast('รีโหลด Control Panel แล้ว');
      }
    }

    function getSelectedControlRestartTarget() {
      return String(controlRestartTargetSelect?.value || '').trim();
    }

    async function restartManagedServiceSelection(target, contextLabel = 'runtime service') {
      const normalizedTarget = String(target || '').trim();
      if (!normalizedTarget) return null;
      const res = await api('/admin/api/runtime/restart-service', 'POST', {
        services: [normalizedTarget],
      });
      const restartedLabels = Array.isArray(res.data?.services)
        ? res.data.services.map((entry) => entry.label || entry.key).filter(Boolean)
        : [];
      toast(
        restartedLabels.length > 0
          ? `${contextLabel}: restart แล้ว (${restartedLabels.join(', ')})`
          : `${contextLabel}: restart แล้ว`,
      );
      return res.data || null;
    }

    function buildControlDiscordPatch() {
      return {
        channels: {
          commandsChannel: String(cpChannelCommands?.value || '').trim(),
          adminLog: String(cpChannelAdminLog?.value || '').trim(),
          shopLog: String(cpChannelShopLog?.value || '').trim(),
          evidence: String(cpChannelEvidence?.value || '').trim(),
          inServer: String(cpChannelInServer?.value || '').trim(),
        },
        roles: {
          owner: String(cpRoleOwner?.value || '').trim(),
          admin: String(cpRoleAdmin?.value || '').trim(),
          moderator: String(cpRoleModerator?.value || '').trim(),
          helper: String(cpRoleHelper?.value || '').trim(),
          vip: String(cpRoleVip?.value || '').trim(),
          verified: String(cpRoleVerified?.value || '').trim(),
        },
      };
    }

    function buildControlDeliveryPatch() {
      return {
        delivery: {
          auto: {
            enabled: String(cpDeliveryEnabled?.value || 'true') === 'true',
            executionMode: String(cpDeliveryMode?.value || 'rcon').trim() || 'rcon',
            verifyMode: String(cpDeliveryVerifyMode?.value || '').trim(),
            queueIntervalMs: parseNullableInt(cpDeliveryQueueInterval?.value),
            maxRetries: parseNullableInt(cpDeliveryMaxRetries?.value),
            retryDelayMs: parseNullableInt(cpDeliveryRetryDelay?.value),
            retryBackoff: parseNullableInt(cpDeliveryRetryBackoff?.value),
            commandTimeoutMs: parseNullableInt(cpDeliveryCommandTimeout?.value),
            magazineStackCount: parseNullableInt(cpDeliveryMagazineStackCount?.value),
            agentTeleportMode: String(cpDeliveryTeleportMode?.value || '').trim(),
            agentTeleportTarget: String(cpDeliveryTeleportTarget?.value || '').trim(),
            agentReturnTarget: String(cpDeliveryReturnTarget?.value || '').trim(),
            agentPreCommands: splitLines(cpDeliveryPreCommands?.value || ''),
            agentPostCommands: splitLines(cpDeliveryPostCommands?.value || ''),
          },
        },
      };
    }

    function buildControlCommandPatch() {
      const disabled = Array.from(
        document.querySelectorAll('#controlCommandWrap input[data-command-disable]:checked'),
      ).map((entry) => String(entry.value || '').trim()).filter(Boolean);
      const permissions = {
        ...(controlPanelSettings?.commandConfig?.permissions || {}),
      };
      Array.from(document.querySelectorAll('#controlCommandWrap select[data-command-role]'))
        .forEach((entry) => {
          const name = String(entry.getAttribute('data-command-role') || '').trim();
          if (!name) return;
          permissions[name] = String(entry.value || 'public').trim() || 'public';
        });
      return {
        commands: {
          disabled,
          permissions,
        },
      };
    }

    function buildRuntimeEnvPatch() {
      return {
        root: {
          DISCORD_GUILD_ID: String(cpGuildId?.value || '').trim(),
          BOT_ENABLE_ADMIN_WEB: String(cpFeatureAdminWeb?.value || 'false') === 'true',
          BOT_ENABLE_DELIVERY_WORKER: String(cpFeatureDeliveryWorker?.value || 'false') === 'true',
          WORKER_ENABLE_DELIVERY: String(cpFeatureWorkerDelivery?.value || 'false') === 'true',
          BOT_ENABLE_RENTBIKE_SERVICE: String(cpFeatureRentBikeService?.value || 'false') === 'true',
          WORKER_ENABLE_RENTBIKE: String(cpFeatureWorkerRentBike?.value || 'false') === 'true',
          BOT_ENABLE_SCUM_WEBHOOK: String(cpFeatureWebhook?.value || 'false') === 'true',
          DELIVERY_EXECUTION_MODE: String(cpRuntimeDeliveryExecutionMode?.value || 'rcon').trim() || 'rcon',
        },
      };
    }

    function buildRconAgentEnvPatch() {
      return {
        root: {
          RCON_HOST: String(cpRconHost?.value || '').trim(),
          RCON_PORT: String(cpRconPort?.value || '').trim(),
          RCON_PROTOCOL: String(cpRconProtocol?.value || '').trim(),
          RCON_EXEC_TEMPLATE: String(cpRconTemplate?.value || '').trim(),
          RCON_PASSWORD: String(cpRconPassword?.value || '').trim(),
          SCUM_CONSOLE_AGENT_BASE_URL: String(cpAgentBaseUrl?.value || '').trim(),
          SCUM_CONSOLE_AGENT_HOST: String(cpAgentHost?.value || '').trim(),
          SCUM_CONSOLE_AGENT_PORT: String(cpAgentPort?.value || '').trim(),
          SCUM_CONSOLE_AGENT_BACKEND: String(cpAgentBackend?.value || '').trim(),
          SCUM_CONSOLE_AGENT_EXEC_TEMPLATE: String(cpAgentTemplate?.value || '').trim(),
          SCUM_CONSOLE_AGENT_TOKEN: String(cpAgentToken?.value || '').trim(),
        },
      };
    }

    function buildWatcherPortalEnvPatch() {
      return {
        root: {
          SCUM_WEBHOOK_URL: String(cpWebhookUrl?.value || '').trim(),
          SCUM_WEBHOOK_PORT: String(cpWebhookPort?.value || '').trim(),
          SCUM_LOG_PATH: String(cpLogPath?.value || '').trim(),
        },
        portal: {
          WEB_PORTAL_BASE_URL: String(cpPortalBaseUrl?.value || '').trim(),
          WEB_PORTAL_PLAYER_OPEN_ACCESS: String(cpPortalOpenAccess?.value || 'false') === 'true',
          WEB_PORTAL_REQUIRE_GUILD_MEMBER: String(cpPortalRequireGuild?.value || 'false') === 'true',
          WEB_PORTAL_MAP_EXTERNAL_URL: String(cpPortalMapUrl?.value || '').trim(),
        },
      };
    }


