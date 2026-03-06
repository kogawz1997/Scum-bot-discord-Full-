const { channels, restartSchedule, serverInfo } = require('../config');

function parseDailyTimes(scheduleLines) {
  // รับรูปแบบประมาณ: "ทุกวัน 06:00"
  const times = [];
  for (const line of scheduleLines || []) {
    const m = String(line).match(/(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) continue;
    const key = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    times.push({ hh, mm, key });
  }
  return times;
}

function startRestartScheduler(client) {
  const times = parseDailyTimes(restartSchedule);
  if (times.length === 0) return;

  const sent = new Set(); // key per day

  setInterval(async () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    // ล้างของเก่า (เก็บแค่วันนี้)
    for (const k of Array.from(sent.values())) {
      if (!String(k).startsWith(todayKey)) sent.delete(k);
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const deltas = [10, 5, 1, 0];

    for (const guild of client.guilds.cache.values()) {
      const channel = guild.channels.cache.find(
        (c) => c.name === channels.restartAlerts && c.isTextBased && c.isTextBased(),
      );
      if (!channel) continue;

      for (const t of times) {
        const targetMinutes = t.hh * 60 + t.mm;
        let diff = targetMinutes - nowMinutes;
        if (diff < 0) diff += 24 * 60; // ข้ามวัน

        if (!deltas.includes(diff)) continue;

        const key = `${todayKey}|${guild.id}|${t.key}|${diff}`;
        if (sent.has(key)) continue;
        sent.add(key);

        if (diff === 0) {
          await channel
            .send(`🔄 **${serverInfo.name}** กำลังรีสตาร์ทตอนนี้ (${t.key})`)
            .catch(() => null);
        } else {
          await channel
            .send(`⏳ **${serverInfo.name}** จะรีสตาร์ทใน **${diff} นาที** (รอบ ${t.key})`)
            .catch(() => null);
        }
      }
    }
  }, 60 * 1000);
}

module.exports = {
  startRestartScheduler,
};

