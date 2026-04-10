/**
 * Parse Schedule.md and youtube_links.csv text into normalized performance rows.
 */

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/** PDT for Coachella 2026 weekend 1 */
const TZ = '-07:00';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toIsoDate(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function parseDayHeader(line) {
  const m = line.match(/^##\s+\w+day,\s+(\w+)\s+(\d+),\s+(\d{4})\s*$/i);
  if (!m) return null;
  const monthName = m[1].toLowerCase();
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const monthIndex = MONTHS[monthName];
  if (monthIndex === undefined) return null;
  const iso = toIsoDate(year, monthIndex, day);
  const dow = new Date(`${iso}T12:00:00${TZ}`).getUTCDay();
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = dayKeys[dow];
  const label = line.replace(/^##\s*/, '').trim();
  return { iso, label, dayKey };
}

function parsePerformanceLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const perf = trimmed.match(/^(.+)\s+\((\d{1,2}:\d{2}),\s*([^)]+)\)\s*$/);
  if (!perf) return null;
  const artist = perf[1].trim();
  const time = perf[2];
  const stage = perf[3].trim();
  return { artist, time, stage };
}

function timeToMsOnDay(isoDate, timeStr) {
  const [h, min] = timeStr.split(':').map((x) => parseInt(x, 10));
  const s = `${isoDate}T${pad2(h)}:${pad2(min)}:00${TZ}`;
  return new Date(s).getTime();
}

function parseYoutubeCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const comma = row.indexOf(',');
    if (comma < 0) continue;
    let stage = row.slice(0, comma).trim();
    let link = row.slice(comma + 1).trim();
    if (link.startsWith('"') && link.endsWith('"')) link = link.slice(1, -1);
    const normalized = stage.replace(/\s+aka\s+main stage/i, '').trim();
    map.set(normalized.toLowerCase(), { stageDisplay: stage, url: link });
  }
  return map;
}

function normalizeStageKey(stage) {
  return stage.trim().toLowerCase();
}

/**
 * @param {string} scheduleMd
 * @param {string} youtubeCsv
 * @returns {{ performances: object[], stages: { name: string, url: string|null }[] }}
 */
export function buildSchedule(scheduleMd, youtubeCsv) {
  const youtubeMap = parseYoutubeCsv(youtubeCsv);
  const lines = scheduleMd.split(/\r?\n/);
  let current = null;
  const raw = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const d = parseDayHeader(line);
      if (d) current = d;
      continue;
    }
    if (!current) continue;
    const p = parsePerformanceLine(line);
    if (!p) continue;
    const startMs = timeToMsOnDay(current.iso, p.time);
    raw.push({
      dayIso: current.iso,
      dayLabel: current.label,
      dayKey: current.dayKey,
      artist: p.artist,
      stage: p.stage,
      startMs,
      timeLabel: p.time,
    });
  }

  const byGroup = new Map();
  for (const r of raw) {
    const key = `${r.dayIso}|${normalizeStageKey(r.stage)}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(r);
  }

  const DEFAULT_LAST_SET_MS = 90 * 60 * 1000;

  for (const group of byGroup.values()) {
    group.sort((a, b) => a.startMs - b.startMs);
    for (let i = 0; i < group.length; i++) {
      const endMs =
        i < group.length - 1 ? group[i + 1].startMs : group[i].startMs + DEFAULT_LAST_SET_MS;
      group[i].endMs = endMs;
    }
  }

  const performances = raw.map((r, idx) => {
    const y = youtubeMap.get(normalizeStageKey(r.stage));
    const url =
      y && y.url && !/no link/i.test(y.url) && y.url.startsWith('http') ? y.url : null;
    return {
      id: `${r.dayIso}|${normalizeStageKey(r.stage)}|${r.startMs}|${idx}`,
      artist: r.artist,
      stage: r.stage,
      dayIso: r.dayIso,
      dayLabel: r.dayLabel,
      dayKey: r.dayKey,
      startMs: r.startMs,
      endMs: r.endMs,
      timeLabel: r.timeLabel,
      youtubeUrl: url,
    };
  });

  performances.sort((a, b) => a.startMs - b.startMs);

  const stageNames = [...new Set(performances.map((p) => p.stage))].sort((a, b) =>
    a.localeCompare(b)
  );
  const stages = stageNames.map((name) => {
    const y = youtubeMap.get(normalizeStageKey(name));
    const url =
      y && y.url && !/no link/i.test(y.url) && y.url.startsWith('http') ? y.url : null;
    return { name, url, displayName: y?.stageDisplay ?? name };
  });

  return { performances, stages };
}
