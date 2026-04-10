const KEY = 'coachella-stream-planner-v1';

const defaultState = () => ({
  savedIds: [],
  soonMinutes: 20,
  lastTab: 'now',
  scheduleDayFilter: 'all',
  scheduleStageFilter: 'all',
  scheduleSavedOnly: false,
  scheduleLiveOnly: false,
  searchQuery: '',
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveState(partial) {
  const prev = loadState();
  const next = { ...prev, ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function toggleSavedId(id) {
  const s = loadState();
  const set = new Set(s.savedIds);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return saveState({ savedIds: [...set] });
}

export function setSavedIds(ids) {
  return saveState({ savedIds: [...ids] });
}
