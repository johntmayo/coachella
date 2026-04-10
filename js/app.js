import { buildSchedule } from './parser.js';
import {
  nowMs,
  getSetStatus,
  getCurrentLiveSets,
  getConflictsForSaved,
  getNextSavedSet,
  stageHasLiveNow,
  formatCountdown,
  formatClock,
} from './logic.js';
import { loadState, saveState, toggleSavedId } from './storage.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let performances = [];
let stages = [];
let perfById = new Map();
let state = loadState();
let tickTimer = null;

function perfFromState() {
  return state.savedIds.map((id) => perfById.get(id)).filter(Boolean);
}

function savedSorted() {
  return perfFromState().sort((a, b) => a.startMs - b.startMs);
}

function setTab(tab) {
  state = saveState({ lastTab: tab });
  $$('.nav-btn').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  $$('.view').forEach((v) => {
    v.hidden = v.id !== `view-${tab}`;
  });
}

function bindNav() {
  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTab(btn.dataset.tab);
      render();
    });
  });
}

function bindDelegatedClicks() {
  $('#app').addEventListener('click', (e) => {
    const saveEl = e.target.closest('[data-save]');
    if (saveEl?.dataset.save) {
      e.preventDefault();
      toggleSave(saveEl.dataset.save);
      return;
    }
    const go = e.target.closest('[data-goto]');
    if (go?.dataset.goto) {
      e.preventDefault();
      setTab(go.dataset.goto);
      render();
    }
  });
}

function bindGlobalInputs() {
  const search = $('#search-input');
  if (search) {
    search.value = state.searchQuery;
    search.addEventListener('input', () => {
      state = saveState({ searchQuery: search.value });
      render();
    });
  }

  $('#soon-slider')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    state = saveState({ soonMinutes: v });
    $('#soon-value').textContent = `${v} min`;
    render();
  });

  $('#filter-day')?.addEventListener('change', (e) => {
    state = saveState({ scheduleDayFilter: e.target.value });
    render();
  });
  $('#filter-stage')?.addEventListener('change', (e) => {
    state = saveState({ scheduleStageFilter: e.target.value });
    render();
  });
  $('#filter-saved')?.addEventListener('change', (e) => {
    state = saveState({ scheduleSavedOnly: e.target.checked });
    render();
  });
  $('#filter-live')?.addEventListener('change', (e) => {
    state = saveState({ scheduleLiveOnly: e.target.checked });
    render();
  });
}

function toggleSave(id) {
  toggleSavedId(id);
  state = loadState();
  render();
}

function filterPerformances(list) {
  const q = state.searchQuery.trim().toLowerCase();
  const now = nowMs();
  return list.filter((p) => {
    if (state.scheduleDayFilter !== 'all' && p.dayKey !== state.scheduleDayFilter) return false;
    if (state.scheduleStageFilter !== 'all' && p.stage !== state.scheduleStageFilter) return false;
    if (state.scheduleSavedOnly && !state.savedIds.includes(p.id)) return false;
    if (state.scheduleLiveOnly && getSetStatus(p, now, state.soonMinutes) !== 'live') return false;
    if (q && !p.artist.toLowerCase().includes(q) && !p.stage.toLowerCase().includes(q))
      return false;
    return true;
  });
}

function statusClass(status) {
  return `status-${status}`;
}

function statusLabel(status) {
  if (status === 'live') return 'Live now';
  if (status === 'soon') return 'Starting soon';
  if (status === 'later') return 'Later';
  return 'Ended';
}

function renderNow() {
  const now = nowMs();
  const live = getCurrentLiveSets(performances, now);
  const saved = savedSorted();
  const next = getNextSavedSet(now, saved);
  const soonM = state.soonMinutes;

  const liveBlock = $('#now-live');
  const soonBlock = $('#now-soon');
  const nextBlock = $('#now-next');

  if (live.length === 0) {
    liveBlock.innerHTML = `
      <div class="empty-block">
        <p class="empty-title">Nothing live on the schedule clock</p>
        <p class="empty-sub">Sets use official set times in PDT. Browse the full schedule or open stage streams.</p>
      </div>`;
  } else {
    liveBlock.innerHTML = live
      .map(
        (p) => `
      <article class="hero-card ${statusClass('live')}">
        <div class="hero-card-top">
          <span class="pill pill-live">Live</span>
          <span class="mono">${formatClock(p.startMs)}–${formatClock(p.endMs)}</span>
        </div>
        <h2 class="hero-artist">${escapeHtml(p.artist)}</h2>
        <p class="hero-meta">${escapeHtml(p.stage)} · ${escapeHtml(p.dayLabel)}</p>
        <div class="hero-actions">
          ${p.youtubeUrl ? `<a class="btn btn-primary" href="${escapeAttr(p.youtubeUrl)}" target="_blank" rel="noopener">Open stream</a>` : '<span class="muted">No stream URL</span>'}
          <button type="button" class="btn btn-ghost save-toggle ${state.savedIds.includes(p.id) ? 'is-saved' : ''}" data-save="${escapeAttr(p.id)}">
            ${state.savedIds.includes(p.id) ? 'Saved' : 'Save'}
          </button>
        </div>
      </article>`
      )
      .join('');
  }

  const soonList = performances.filter((p) => getSetStatus(p, now, soonM) === 'soon').slice(0, 6);
  if (soonList.length === 0) {
    soonBlock.innerHTML = `<p class="muted soft">No sets starting in the next ${soonM} minutes.</p>`;
  } else {
    soonBlock.innerHTML = soonList
      .map(
        (p) => `
      <div class="row-card ${statusClass('soon')}">
        <div>
          <div class="row-title">${escapeHtml(p.artist)}</div>
          <div class="row-sub">${escapeHtml(p.stage)} · starts in ${formatCountdown(p.startMs - now)}</div>
        </div>
        ${p.youtubeUrl ? `<a class="btn btn-small" href="${escapeAttr(p.youtubeUrl)}" target="_blank" rel="noopener">Stream</a>` : ''}
      </div>`
      )
      .join('');
  }

  if (!next) {
    nextBlock.innerHTML = `
      <div class="empty-block tight">
        <p class="empty-title">No upcoming saved sets</p>
        <p class="empty-sub">Add acts from the full schedule.</p>
        <button type="button" class="btn btn-primary" data-goto="schedule">Browse schedule</button>
      </div>`;
  } else {
    const st = getSetStatus(next, now, soonM);
    nextBlock.innerHTML = `
      <article class="next-card ${statusClass(st)}">
        <div class="next-label">Your next pick</div>
        <h3 class="next-artist">${escapeHtml(next.artist)}</h3>
        <p class="next-meta">${escapeHtml(next.stage)} · ${formatClock(next.startMs)} · ${statusLabel(st)}</p>
        <div class="hero-actions">
          ${next.youtubeUrl ? `<a class="btn btn-primary" href="${escapeAttr(next.youtubeUrl)}" target="_blank" rel="noopener">Open stream</a>` : ''}
          <button type="button" class="btn btn-ghost save-toggle is-saved" data-save="${escapeAttr(next.id)}">Remove</button>
        </div>
      </article>`;
  }

  const stagesEl = $('#now-stages');
  stagesEl.innerHTML = stages
    .map((s) => {
      const on = stageHasLiveNow(s.name, live);
      const disabled = !s.url;
      const inner = `
      <span class="stage-dot" aria-hidden="true"></span>
      <span class="stage-name">${escapeHtml(s.displayName)}</span>
      ${on ? '<span class="pill pill-live pill-tiny">Live</span>' : ''}`;
      if (disabled) {
        return `<span class="stage-chip is-disabled" aria-disabled="true">${inner}</span>`;
      }
      return `<a class="stage-chip ${on ? 'is-live' : ''}" href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${inner}</a>`;
    })
    .join('');
}

function groupByDay(list) {
  const map = new Map();
  for (const p of list) {
    if (!map.has(p.dayIso)) map.set(p.dayIso, { label: p.dayLabel, items: [] });
    map.get(p.dayIso).items.push(p);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderSchedule() {
  const now = nowMs();
  const soonM = state.soonMinutes;
  const filtered = filterPerformances(performances);
  const groups = groupByDay(filtered);
  const el = $('#schedule-list');
  if (groups.length === 0) {
    el.innerHTML = `<div class="empty-block"><p class="empty-title">No sets match filters</p><p class="empty-sub">Try another day, stage, or search.</p></div>`;
    return;
  }
  el.innerHTML = groups
    .map(
      ([iso, g]) => `
    <section class="day-block" data-day="${escapeAttr(iso)}">
      <header class="day-block-head">
        <h2 class="day-block-title">${escapeHtml(g.label)}</h2>
        <span class="mono muted">${g.items.length} sets</span>
      </header>
      <div class="card-list">
        ${g.items
          .map((p) => {
            const st = getSetStatus(p, now, soonM);
            const saved = state.savedIds.includes(p.id);
            return `
          <article class="perf-card ${statusClass(st)}">
            <div class="perf-card-main">
              <div class="perf-time mono">${escapeHtml(p.timeLabel)}</div>
              <div>
                <h3 class="perf-artist">${escapeHtml(p.artist)}</h3>
                <p class="perf-stage">${escapeHtml(p.stage)}</p>
              </div>
            </div>
            <div class="perf-card-side">
              <span class="pill ${st === 'live' ? 'pill-live' : st === 'soon' ? 'pill-soon' : 'pill-muted'}">${statusLabel(st)}</span>
              <button type="button" class="icon-save ${saved ? 'is-saved' : ''}" data-save="${escapeAttr(p.id)}" aria-label="${saved ? 'Remove from schedule' : 'Save to schedule'}">
                <span aria-hidden="true">${saved ? '★' : '☆'}</span>
              </button>
            </div>
            ${p.youtubeUrl ? `<a class="stream-link" href="${escapeAttr(p.youtubeUrl)}" target="_blank" rel="noopener">YouTube →</a>` : ''}
          </article>`;
          })
          .join('')}
      </div>
    </section>`
    )
    .join('');
}

function renderMy() {
  const now = nowMs();
  const soonM = state.soonMinutes;
  const saved = savedSorted();
  const conflicts = getConflictsForSaved(saved);
  const el = $('#my-list');

  if (saved.length === 0) {
    el.innerHTML = `
      <div class="empty-block">
        <p class="empty-title">Your schedule is empty</p>
        <p class="empty-sub">Tap the star on any set to build your weekend plan.</p>
        <button type="button" class="btn btn-primary" data-goto="schedule">Browse schedule</button>
      </div>`;
    return;
  }

  el.innerHTML = saved
    .map((p) => {
      const st = getSetStatus(p, now, soonM);
      const cf = conflicts.has(p.id);
      return `
    <article class="my-card ${statusClass(st)} ${cf ? 'has-conflict' : ''}">
      ${cf ? '<div class="conflict-banner">Overlaps another saved set</div>' : ''}
      <div class="my-card-top">
        <span class="pill ${st === 'live' ? 'pill-live' : st === 'soon' ? 'pill-soon' : 'pill-muted'}">${statusLabel(st)}</span>
        <span class="mono">${formatClock(p.startMs)}</span>
      </div>
      <h3 class="my-artist">${escapeHtml(p.artist)}</h3>
      <p class="my-stage">${escapeHtml(p.stage)} · ${escapeHtml(p.dayLabel)}</p>
      <div class="my-actions">
        ${p.youtubeUrl ? `<a class="btn btn-primary" href="${escapeAttr(p.youtubeUrl)}" target="_blank" rel="noopener">Stream</a>` : '<span class="muted">No stream linked</span>'}
        <button type="button" class="btn btn-ghost" data-save="${escapeAttr(p.id)}">Remove</button>
      </div>
    </article>`;
    })
    .join('');
}

function renderStreams() {
  const now = nowMs();
  const live = getCurrentLiveSets(performances, now);
  const saved = savedSorted();
  const next = getNextSavedSet(now, saved);
  const el = $('#streams-list');
  el.innerHTML = stages
    .map((s) => {
      const on = stageHasLiveNow(s.name, live);
      const isNext = next && next.stage === s.name;
      return `
    <div class="stream-row ${on ? 'is-live' : ''}">
      <div>
        <div class="stream-name">${escapeHtml(s.displayName)}</div>
        ${isNext ? '<div class="stream-hint">Next saved act is on this stage</div>' : ''}
        ${on ? '<div class="stream-hint live">A set is live on this stage now</div>' : ''}
      </div>
      ${
        s.url
          ? `<a class="btn btn-small" href="${escapeAttr(s.url)}" target="_blank" rel="noopener">Open</a>`
          : '<span class="muted">Link TBA</span>'
      }
    </div>`;
    })
    .join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function render() {
  const tab = state.lastTab || 'now';
  $('#saved-badge').textContent = String(state.savedIds.length);
  $('#saved-badge').classList.toggle('is-zero', state.savedIds.length === 0);

  if (tab === 'now') renderNow();
  else if (tab === 'schedule') renderSchedule();
  else if (tab === 'my') renderMy();
  else if (tab === 'streams') renderStreams();
}

function startTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    render();
  }, 30000);
}

async function loadFiles() {
  const tryText = async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(path);
    return res.text();
  };
  let md;
  try {
    md = await tryText('Schedule.md');
  } catch {
    md = await tryText('schedule.md');
  }
  const csv = await tryText('youtube_links.csv');
  return { md, csv };
}

function populateFilters() {
  const daySel = $('#filter-day');
  const stageSel = $('#filter-stage');
  if (!daySel || !stageSel) return;
  const days = [...new Set(performances.map((p) => p.dayKey))];
  const order = { fri: 0, sat: 1, sun: 2, mon: 3, tue: 4, wed: 5, thu: 6 };
  days.sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
  daySel.innerHTML =
    `<option value="all">All days</option>` +
    days.map((d) => `<option value="${d}">${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('');
  daySel.value = state.scheduleDayFilter;

  stageSel.innerHTML =
    `<option value="all">All stages</option>` +
    stages
      .map((s) => `<option value="${escapeAttr(s.name)}">${escapeHtml(s.displayName)}</option>`)
      .join('');
  stageSel.value = state.scheduleStageFilter;
}

async function init() {
  bindNav();
  bindDelegatedClicks();
  bindGlobalInputs();

  $('#soon-slider').value = String(state.soonMinutes);
  $('#soon-value').textContent = `${state.soonMinutes} min`;

  try {
    const { md, csv } = await loadFiles();
    const built = buildSchedule(md, csv);
    performances = built.performances;
    stages = built.stages;
    perfById = new Map(performances.map((p) => [p.id, p]));
    $('#load-error').hidden = true;
  } catch (e) {
    $('#load-error').hidden = false;
    $('#load-error').textContent =
      'Could not load Schedule.md or youtube_links.csv. Serve this folder over HTTP (not file://) so fetches work.';
    console.error(e);
    return;
  }

  populateFilters();
  const fs = $('#filter-saved');
  const fl = $('#filter-live');
  if (fs) fs.checked = state.scheduleSavedOnly;
  if (fl) fl.checked = state.scheduleLiveOnly;

  setTab(state.lastTab || 'now');
  render();
  startTick();
}

init();
