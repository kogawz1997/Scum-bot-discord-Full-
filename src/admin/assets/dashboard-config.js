/**
 * Dashboard config-editor and simple-config helpers split out of
 * the former dashboard monolith so admin config flows are easier to review.
 */
    function parseConfigEditorValue() {
      const raw = String(configJsonInput.value || '').trim();
      if (!raw) throw new Error('JSON คอนฟิกว่างอยู่');

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('JSON คอนฟิกไม่ถูกต้อง');
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON คอนฟิกต้องเป็นอ็อบเจ็กต์');
      }

      return parsed;
    }

    function fillConfigEditorFromSnapshot() {
      if (!snapshot || !configJsonInput) return;
      configJsonInput.value = JSON.stringify(snapshot.config || {}, null, 2);
    }

    function parseNullableInt(value) {
      const text = String(value || '').trim();
      if (!text) return null;
      const n = Number(text);
      if (!Number.isFinite(n)) return null;
      return Math.trunc(n);
    }

    function splitLines(value) {
      return String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }

    function fillSimpleConfigFromSnapshot() {
      if (!snapshot?.config) return;
      const cfg = snapshot.config;
      cfgServerName.value = String(cfg.serverInfo?.name || '');
      cfgIp.value = String(cfg.serverInfo?.ip || '');
      cfgPort.value = String(cfg.serverInfo?.port || '');
      cfgMaxPlayers.value = cfg.serverInfo?.maxPlayers ?? '';
      cfgDailyReward.value = cfg.economy?.dailyReward ?? '';
      cfgWeeklyReward.value = cfg.economy?.weeklyReward ?? '';
      cfgRestartSchedule.value = Array.isArray(cfg.restartSchedule)
        ? cfg.restartSchedule.join('\n')
        : '';
      cfgRaidTimes.value = Array.isArray(cfg.raidTimes)
        ? cfg.raidTimes.join('\n')
        : '';
      cfgUnknownWeaponLabel.value = String(cfg.killFeed?.unknownWeaponLabel || '');
      cfgDefaultWeaponImage.value = String(cfg.killFeed?.defaultWeaponImage || '');
    }

    function buildSimpleConfigPatch() {
      const patch = {
        serverInfo: {},
        economy: {},
        killFeed: {},
      };

      const serverName = String(cfgServerName.value || '').trim();
      const ip = String(cfgIp.value || '').trim();
      const port = String(cfgPort.value || '').trim();
      const maxPlayers = parseNullableInt(cfgMaxPlayers.value);
      const dailyReward = parseNullableInt(cfgDailyReward.value);
      const weeklyReward = parseNullableInt(cfgWeeklyReward.value);
      const restartSchedule = splitLines(cfgRestartSchedule.value);
      const raidTimes = splitLines(cfgRaidTimes.value);
      const unknownWeaponLabel = String(cfgUnknownWeaponLabel.value || '').trim();
      const defaultWeaponImage = String(cfgDefaultWeaponImage.value || '').trim();

      if (serverName) patch.serverInfo.name = serverName;
      if (ip) patch.serverInfo.ip = ip;
      if (port) patch.serverInfo.port = port;
      if (maxPlayers != null) patch.serverInfo.maxPlayers = maxPlayers;
      if (dailyReward != null) patch.economy.dailyReward = dailyReward;
      if (weeklyReward != null) patch.economy.weeklyReward = weeklyReward;
      if (restartSchedule.length > 0) patch.restartSchedule = restartSchedule;
      if (raidTimes.length > 0) patch.raidTimes = raidTimes;
      if (unknownWeaponLabel) patch.killFeed.unknownWeaponLabel = unknownWeaponLabel;
      if (defaultWeaponImage) patch.killFeed.defaultWeaponImage = defaultWeaponImage;

      if (Object.keys(patch.serverInfo).length === 0) delete patch.serverInfo;
      if (Object.keys(patch.economy).length === 0) delete patch.economy;
      if (Object.keys(patch.killFeed).length === 0) delete patch.killFeed;

      return patch;
    }
