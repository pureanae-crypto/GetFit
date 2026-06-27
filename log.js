import { EXERCISE_DB } from "./exercises.js";

let ctx = null;
let logTrendMode = 'daily';
let logBodyFilter = 'All';
let logTypeFilter = 'All';
const LOG_BODY_FILTERS = ['All', 'Back', 'Core', 'Shoulders', 'Legs / Glutes', 'Chest', 'Arms'];
const LOG_TYPE_FILTERS = ['All', 'PT Only', 'Personal Only'];
const BODY_PART_SLUGS = {
  Back: ['lats', 'rhomboids', 'traps', 'lower-back', 'rear-deltoids'],
  Core: ['abs', 'obliques'],
  Shoulders: ['front-deltoids', 'side-deltoids', 'rear-deltoids'],
  'Legs / Glutes': ['quadriceps', 'hamstring', 'gluteal', 'abductors', 'adductors', 'calves'],
  Chest: ['chest'],
  Arms: ['biceps', 'triceps', 'forearm']
};

export function installLogHandlers(context) {
  ctx = context;
  window.setLogTrendMode = setLogTrendMode;
  window.setLogBodyFilter = setLogBodyFilter;
  window.setLogTypeFilter = setLogTypeFilter;
  window.toggleLogSession = toggleLogSession;
}

function getWorkoutType(session) {
  return session?.type === 'personal' ? 'personal' : 'pt';
}

function getWorkoutTypeLabel(session) {
  return getWorkoutType(session) === 'personal' ? 'Personal Workout' : 'PT Session';
}

function eventDotHTML(session) {
  const status = session.status === 'cancelled' ? 'cancelled' : session.status === 'completed' ? 'completed' : 'upcoming';
  return `<span class="event-dot status-${status} event-type-${getWorkoutType(session)}"></span>`;
}

// ===== LOG =====
export function renderLog(renderCtx) {
  const completed = [...renderCtx.state.sessions]
    .filter(s => s.status === 'completed')
    .sort((a,b) => new Date(b.completedAt || b.datetime) - new Date(a.completedAt || a.datetime));

  const typeFiltered = filterSessionsByType(completed, logTypeFilter);
  const filtered = filterSessionsByBodyPart(typeFiltered, logBodyFilter);
  const buckets = buildTrendBuckets(filtered, logTrendMode, logBodyFilter);
  const currentBucket = buckets[buckets.length - 1] || { volume: 0, sessions: 0 };
  const distribution = buildBodyPartDistribution(filtered);
  const summaryRows = distribution.length
    ? distribution.map(item => `
        <div class="log-body-row">
          <span>${item.label}</span>
          <span class="log-body-track"><span style="width:${item.percent}%"></span></span>
          <span>${item.percent}%</span>
        </div>`).join('')
    : `<div class="log-muted">No volume for this filter yet</div>`;
  const rows = filtered.length
    ? filtered.map(logSessionRowHTML).join('')
    : `<div class="log-empty">
        <div class="empty-state-title">${completed.length ? 'No completed sessions for this filter' : 'No completed sessions yet'}</div>
        ${completed.length ? '' : '<button class="btn btn-primary btn-sm" onclick="openLogWorkoutModal()">+ Log Workout</button>'}
      </div>`;

  document.getElementById('log-list').innerHTML = `
    <div class="log-page-head">
      <div>
        <div class="log-title">Log</div>
        <div class="log-subtitle">Training history</div>
      </div>
      <div class="log-controls">
        <button class="btn btn-primary btn-sm" onclick="openLogWorkoutModal()">+ Log Workout</button>
        <div class="log-segmented" aria-label="Volume period">
          <button class="${logTrendMode === 'daily' ? 'active' : ''}" onclick="setLogTrendMode('daily')">Daily</button>
          <button class="${logTrendMode === 'weekly' ? 'active' : ''}" onclick="setLogTrendMode('weekly')">Weekly</button>
          <button class="${logTrendMode === 'monthly' ? 'active' : ''}" onclick="setLogTrendMode('monthly')">Monthly</button>
        </div>
        <div class="log-segmented" aria-label="Workout type filter">
          <button class="${logTypeFilter === 'All' ? 'active' : ''}" onclick="setLogTypeFilter('All')">All</button>
          <button class="${logTypeFilter === 'PT Only' ? 'active' : ''}" onclick="setLogTypeFilter('PT Only')">PT Only</button>
          <button class="${logTypeFilter === 'Personal Only' ? 'active' : ''}" onclick="setLogTypeFilter('Personal Only')">Personal Only</button>
        </div>
        <select class="log-filter" onchange="setLogBodyFilter(this.value)" aria-label="Body part filter">
          ${LOG_BODY_FILTERS.map(label => `<option value="${label}" ${label === logBodyFilter ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
    </div>

    ${highlightsHTML(completed)}

    <section class="log-analytics">
      <div class="log-metric-label">Volume</div>
      <div class="log-metric-value">${formatVolume(currentBucket.volume)} kg <span>${trendMetricSuffix(logTrendMode, currentBucket.sessions)}</span></div>
      ${trendChartHTML(buckets, logTrendMode)}
      <div class="log-body-summary">${summaryRows}</div>
    </section>

    <div class="log-section-label">Session History</div>
    <div class="log-ledger">${rows}</div>`;
}

function setLogTrendMode(mode) {
  logTrendMode = ['daily', 'weekly', 'monthly'].includes(mode) ? mode : 'daily';
  ctx?.rerenderActive();
}

function setLogBodyFilter(filter) {
  logBodyFilter = LOG_BODY_FILTERS.includes(filter) ? filter : 'All';
  ctx?.rerenderActive();
}

function setLogTypeFilter(filter) {
  logTypeFilter = LOG_TYPE_FILTERS.includes(filter) ? filter : 'All';
  ctx?.rerenderActive();
}

function toggleLogSession(id) {
  const row = document.querySelector(`[data-log-session="${id}"]`);
  if (!row) return;
  row.classList.toggle('open');
}

function formatVolume(value) {
  return Math.round(value || 0).toLocaleString();
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getExerciseMeta(name) {
  return EXERCISE_DB.find(e => e.name.toLowerCase() === String(name || '').toLowerCase());
}

function isCardioExercise(exercise) {
  return Boolean(exercise?.cardio) || getExerciseMeta(exercise?.name)?.cat === 'Cardio';
}

function cardioSummary(exercise) {
  const name = String(exercise?.name || '').toLowerCase();
  if (exercise?.cardio === 'treadmill' || name.includes('treadmill')) {
    return [
      exercise.speed ? `${exercise.speed} speed` : '',
      exercise.time ? `${exercise.time} min` : '',
      exercise.elevation ? `${exercise.elevation} elev` : ''
    ].filter(Boolean).join(' · ') || 'Cardio logged';
  }
  return [
    exercise.level ? `Level ${exercise.level}` : '',
    exercise.time ? `${exercise.time} min` : ''
  ].filter(Boolean).join(' · ') || 'Cardio logged';
}

export function getExerciseSets(exercise) {
  if (Array.isArray(exercise.sets)) {
    return exercise.sets.map(set => ({
      weight: parseFloat(set.weight) || 0,
      reps: parseInt(set.reps, 10) || 0,
      sets: 1
    })).filter(set => set.reps > 0);
  }
  const count = parseInt(exercise.sets, 10) || 0;
  const reps = parseInt(exercise.reps, 10) || 0;
  const weight = parseFloat(exercise.weight) || 0;
  return count && reps ? [{ weight, reps, sets: count }] : [];
}

export function getExerciseVolume(exercise) {
  if (isCardioExercise(exercise)) return 0;
  return getExerciseSets(exercise).reduce((sum, set) => sum + set.weight * set.reps * set.sets, 0);
}

function getExerciseBodyParts(exercise) {
  const muscles = exercise.muscles?.length ? exercise.muscles : (getExerciseMeta(exercise.name)?.muscles || []);
  const parts = Object.entries(BODY_PART_SLUGS)
    .filter(([, slugs]) => muscles.some(m => slugs.includes(m)))
    .map(([label]) => label);
  return parts.length ? parts : ['Core'];
}

function getSessionBodyVolumes(session) {
  return (session.exercises || []).reduce((acc, exercise) => {
    if (isCardioExercise(exercise)) return acc;
    const volume = getExerciseVolume(exercise);
    const parts = getExerciseBodyParts(exercise);
    parts.forEach(part => { acc[part] = (acc[part] || 0) + volume / parts.length; });
    return acc;
  }, {});
}

function getSessionVolume(session, bodyPart = 'All') {
  if (bodyPart !== 'All') return getSessionBodyVolumes(session)[bodyPart] || 0;
  if (Number.isFinite(Number(session.totalVolume))) return Number(session.totalVolume);
  return Object.values(getSessionBodyVolumes(session)).reduce((sum, value) => sum + value, 0);
}

function getPrimaryBodyPart(session) {
  const entries = Object.entries(getSessionBodyVolumes(session)).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || ((session.exercises || []).some(isCardioExercise) ? 'Cardio' : 'All');
}

function filterSessionsByBodyPart(sessions, filter) {
  if (filter === 'All') return sessions;
  return sessions.filter(session => Object.keys(getSessionBodyVolumes(session)).includes(filter));
}

function filterSessionsByType(sessions, filter) {
  if (filter === 'PT Only') return sessions.filter(session => getWorkoutType(session) === 'pt');
  if (filter === 'Personal Only') return sessions.filter(session => getWorkoutType(session) === 'personal');
  return sessions;
}

function buildBodyPartDistribution(sessions) {
  const totals = sessions.reduce((acc, session) => {
    Object.entries(getSessionBodyVolumes(session)).forEach(([part, volume]) => {
      acc[part] = (acc[part] || 0) + volume;
    });
    return acc;
  }, {});
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return Object.entries(totals)
    .map(([label, volume]) => ({ label: label.toUpperCase(), percent: total ? Math.round(volume / total * 100) : 0, volume }))
    .sort((a, b) => b.volume - a.volume);
}

function bestLift(sessions) {
  let best = null;
  sessions.forEach(session => (session.exercises || []).forEach(exercise => {
    if (isCardioExercise(exercise)) return;
    getExerciseSets(exercise).forEach(set => {
      if (!best || set.weight > best.weight) best = { name: exercise.name || 'Lift', weight: set.weight };
    });
  }));
  return best;
}

function highlightsHTML(sessions) {
  const best = bestLift(sessions);
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  const recentVolume = sessions
    .filter(session => startOfDay(new Date(session.completedAt || session.datetime)) >= startOfDay(sevenDaysAgo))
    .reduce((sum, session) => sum + getSessionVolume(session), 0);
  const weekStart = startOfWeek(now);
  const weekSessions = sessions.filter(session => startOfDay(new Date(session.completedAt || session.datetime)) >= weekStart).length;
  return `<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--gray-200);border-bottom:1px solid var(--gray-200);margin:-6px 0 28px;">
    <div style="padding:12px 18px 12px 0;border-right:1px solid var(--gray-200);">
      <div class="log-metric-label">Best Lift</div>
      <div style="font-size:16px;font-weight:600;line-height:1.2;">${best ? `${formatVolume(best.weight)} kg` : '—'}</div>
      <div class="log-muted">${best ? escapeHTML(best.name) : 'No lifts yet'}</div>
    </div>
    <div style="padding:12px 18px;border-right:1px solid var(--gray-200);">
      <div class="log-metric-label">7-Day Volume</div>
      <div style="font-size:16px;font-weight:600;line-height:1.2;">${formatVolume(recentVolume)} kg</div>
      <div class="log-muted">Latest 7 days</div>
    </div>
    <div style="padding:12px 0 12px 18px;">
      <div class="log-metric-label">This Week</div>
      <div style="font-size:16px;font-weight:600;line-height:1.2;">${weekSessions}</div>
      <div class="log-muted">${pluralize(weekSessions, 'workout')}</div>
    </div>
  </section>`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function bucketKey(date, mode) {
  let d;
  if (mode === 'daily') d = startOfDay(date);
  else d = mode === 'weekly' ? startOfWeek(date) : startOfMonth(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bucketLabel(date, mode) {
  if (mode === 'monthly') return date.toLocaleDateString('en', { month: 'short' });
  if (mode === 'daily') return date.toLocaleDateString('en', { weekday: 'short' });
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function bucketSummaryLabel(date, mode) {
  if (mode === 'monthly') return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  if (mode === 'weekly') {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${date.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
  }
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

function trendMetricSuffix(mode, sessions = 0) {
  if (mode === 'daily') return 'today';
  if (mode === 'monthly') return 'this month';
  return `this week · ${pluralize(sessions, 'workout')}`;
}

function buildTrendBuckets(sessions, mode, bodyPart) {
  const count = mode === 'daily' ? 7 : mode === 'weekly' ? 8 : 6;
  const now = new Date();
  const currentStart = mode === 'daily' ? startOfDay(now) : mode === 'weekly' ? startOfWeek(now) : startOfMonth(now);
  const buckets = Array.from({ length: count }, (_, i) => {
    const date = new Date(currentStart);
    if (mode === 'daily') date.setDate(currentStart.getDate() - (count - 1 - i));
    else if (mode === 'weekly') date.setDate(currentStart.getDate() - (count - 1 - i) * 7);
    else date.setMonth(currentStart.getMonth() - (count - 1 - i));
    return { key: bucketKey(date, mode), label: bucketLabel(date, mode), summaryLabel: bucketSummaryLabel(date, mode), volume: 0, sessions: 0 };
  });
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]));
  sessions.forEach(session => {
    const date = new Date(session.completedAt || session.datetime);
    const bucket = bucketMap.get(bucketKey(date, mode));
    if (bucket) {
      bucket.volume += getSessionVolume(session, bodyPart);
      bucket.sessions += 1;
    }
  });
  return buckets;
}

function trendChartHTML(buckets, mode) {
  const width = 720;
  const height = 190;
  const padX = 18;
  const padY = 24;
  const max = Math.max(...buckets.map(b => b.volume), 1);
  const step = buckets.length > 1 ? (width - padX * 2) / (buckets.length - 1) : 0;
  const points = buckets.map((bucket, i) => {
    const x = padX + step * i;
    const y = height - padY - (bucket.volume / max) * (height - padY * 2);
    return { x, y, ...bucket };
  });
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const baseline = height - padY;
  return `<svg class="log-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Volume trend">
    <style>
      .log-chart-point { cursor: pointer; outline: none; }
      .log-chart-point .log-chart-hit { fill: transparent; stroke: transparent; }
      .log-chart-point .log-chart-tip { opacity: 0; pointer-events: none; transition: opacity 0.12s ease; }
      .log-chart-point .log-chart-tip rect { fill: #0f0f0f; }
      .log-chart-point .log-chart-tip text { fill: #ffffff; font-size: 10px; letter-spacing: 0; }
      .log-chart-point .log-chart-tip .log-chart-tip-value { font-weight: 700; }
      .log-chart-point:hover > circle:first-of-type, .log-chart-point:focus > circle:first-of-type { r: 4; }
      .log-chart-point:hover .log-chart-tip, .log-chart-point:focus .log-chart-tip { opacity: 1; }
    </style>
    <line x1="${padX}" y1="${baseline}" x2="${width - padX}" y2="${baseline}"></line>
    <polyline points="${line}"></polyline>
    ${points.map(point => chartPointHTML(point, mode)).join('')}
    ${points.map((point, i) => i === 0 || i === points.length - 1 || mode === 'daily' ? `<text x="${point.x.toFixed(1)}" y="${height - 4}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${point.label}</text>` : '').join('')}
  </svg>`;
}

function chartPointHTML(point, mode) {
  const bubbleWidth = 148;
  const bubbleHeight = mode === 'weekly' ? 46 : 34;
  const rawX = point.x - bubbleWidth / 2;
  const bubbleX = Math.max(4, Math.min(720 - bubbleWidth - 4, rawX));
  const bubbleY = Math.max(4, point.y - bubbleHeight - 10);
  const labelX = bubbleX + bubbleWidth / 2;
  const sessionLine = mode === 'weekly' ? `<text class="log-chart-tip-value" x="${labelX.toFixed(1)}" y="${(bubbleY + 39).toFixed(1)}" text-anchor="middle">${pluralize(point.sessions, 'workout')}</text>` : '';
  return `<g class="log-chart-point" tabindex="0" aria-label="${escapeHTML(point.summaryLabel)} ${formatVolume(point.volume)} kg ${pluralize(point.sessions, 'workout')}" onclick="this.focus()">
    <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.5"></circle>
    <circle class="log-chart-hit" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="16"></circle>
    <g class="log-chart-tip">
      <rect x="${bubbleX.toFixed(1)}" y="${bubbleY.toFixed(1)}" width="${bubbleWidth}" height="${bubbleHeight}" rx="2"></rect>
      <text class="log-chart-tip-title" x="${labelX.toFixed(1)}" y="${(bubbleY + 13).toFixed(1)}" text-anchor="middle">${escapeHTML(point.summaryLabel)}</text>
      <text class="log-chart-tip-value" x="${labelX.toFixed(1)}" y="${(bubbleY + 27).toFixed(1)}" text-anchor="middle">${formatVolume(point.volume)} kg</text>
      ${sessionLine}
    </g>
  </g>`;
}

function logSessionRowHTML(session) {
  const dt = new Date(session.completedAt || session.datetime);
  const date = dt.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  const duration = `${session.duration || '—'} hrs`;
  const bodyPart = getPrimaryBodyPart(session);
  const volume = getSessionVolume(session);
  const typeLabel = getWorkoutTypeLabel(session);
  const detailRows = (session.exercises || []).map(exercise => {
    const sets = getExerciseSets(exercise);
    const setText = isCardioExercise(exercise)
      ? cardioSummary(exercise)
      : Array.isArray(exercise.sets)
        ? sets.map(set => `${formatVolume(set.weight)}kg × ${set.reps}`).join(', ')
        : sets.map(set => `${formatVolume(set.weight)}kg × ${set.reps} × ${set.sets}`).join(', ');
    return `<div class="log-exercise-row">
      <span>${escapeHTML(exercise.name || 'Exercise')}</span>
      <span>${setText || 'No sets logged'}</span>
    </div>`;
  }).join('');
  const notes = session.completionNotes || session.notes;
  return `<div class="log-session" data-log-session="${session.id}">
    <button class="log-session-main" onclick="toggleLogSession('${session.id}')" type="button">
      <span class="log-session-date">${eventDotHTML(session)}${date}</span>
      <span class="log-session-mobile-meta">${typeLabel} · ${bodyPart} · ${duration} · ${formatVolume(volume)} kg</span>
      <span>${duration}</span>
      <span>${bodyPart}</span>
      <span>${formatVolume(volume)} kg</span>
      <span>${typeLabel} · Completed</span>
    </button>
    <div class="log-session-detail">
      ${detailRows || '<div class="log-muted">No exercises logged</div>'}
      ${notes ? `<div class="log-session-notes">${escapeHTML(notes)}</div>` : ''}
    </div>
  </div>`;
}
