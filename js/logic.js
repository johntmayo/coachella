/**
 * Client-side schedule / live status helpers (browser local time compared via PDT instants in data).
 */

export function nowMs() {
  return Date.now();
}

export function getSetStatus(perf, now, soonMinutes) {
  const soonMs = soonMinutes * 60 * 1000;
  if (now >= perf.startMs && now < perf.endMs) return 'live';
  if (now < perf.startMs && perf.startMs - now <= soonMs) return 'soon';
  if (now < perf.startMs) return 'later';
  return 'ended';
}

export function isLiveNow(perf, now) {
  return now >= perf.startMs && now < perf.endMs;
}

export function isStartingSoon(perf, now, soonMinutes) {
  const soonMs = soonMinutes * 60 * 1000;
  return now < perf.startMs && perf.startMs - now <= soonMs;
}

export function getCurrentLiveSets(performances, now) {
  return performances.filter((p) => isLiveNow(p, now));
}

export function performancesOverlapping(a, b) {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function hasConflict(perf, savedPerformances) {
  return savedPerformances.some((o) => o.id !== perf.id && performancesOverlapping(perf, o));
}

export function getConflictsForSaved(savedList) {
  const conflicts = new Set();
  const list = [...savedList].sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (performancesOverlapping(list[i], list[j])) {
        conflicts.add(list[i].id);
        conflicts.add(list[j].id);
      }
    }
  }
  return conflicts;
}

export function getNextSavedSet(now, savedSorted) {
  const upcoming = savedSorted.filter((p) => now < p.endMs);
  return upcoming[0] ?? null;
}

export function stageHasLiveNow(stageName, liveSets) {
  return liveSets.some((p) => p.stage === stageName);
}

export function formatCountdown(ms) {
  if (ms <= 0) return 'now';
  const m = Math.ceil(ms / 60000);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h}h ${rm}m` : `${h}h`;
  }
  return `${m} min`;
}

export function formatClock(ms) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(ms));
}
