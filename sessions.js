import { EXERCISE_DB } from "./exercises.js";

let ctx = null;
let currentEditId = null;
let sessionEntryMode = 'book';
let logTrendMode = 'weekly';
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

export function installSessionHandlers(context) {
  ctx = context;
  window.openBookModal = openBookModal;
  window.openLogWorkoutModal = openLogWorkoutModal;
  window.openEditModal = openEditModal;
  window.saveSession = saveSession;
  window.setBookType = setBookType;
  window.setCompleteType = setCompleteType;
  window.openCompleteModal = (id) => openWorkoutLogModal(id, 'log');
  window.openWorkoutLogModal = openWorkoutLogModal;
  window.saveWorkoutLog = saveWorkoutLog;
  window.openViewModal = openViewModal;
  window.cancelSession = cancelSession;
  window.deleteSession = deleteSession;
  window.exportSingleICS = exportSingleICS;
  window.exportICS = exportICS;
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

function eventDotHTML(session, className = '') {
  const status = session.status === 'cancelled' ? 'cancelled' : session.status === 'completed' ? 'completed' : 'upcoming';
  return `<span class="event-dot status-${status} event-type-${getWorkoutType(session)} ${className}"></span>`;
}

function setSegmentedType(inputId, type) {
  const value = type === 'personal' ? 'personal' : 'pt';
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = value;
  input.closest('.type-selector')?.querySelectorAll('button').forEach(button => {
    button.classList.toggle('active', button.dataset.type === value);
  });
}

function setBookType(type) {
  setSegmentedType('book-type', type);
}

function setCompleteType(type) {
  setSegmentedType('complete-type', type);
}

export function sessionCardHTML(s, options = {}) {
  const dt = new Date(s.datetime);
  const day = dt.getDate();
  const month = dt.toLocaleString('en', { month: 'short' }).toUpperCase();
  const time = dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const dur = s.duration ? ` · ${s.duration} hr` : '';
  const loc = s.location ? ` · ${s.location}` : '';
  const notes = s.notes || (s.exercises?.length ? `${s.exercises.length} exercise${s.exercises.length > 1 ? 's' : ''} logged` : '');
  const dot = eventDotHTML(s, 'session-status-dot');
  const typeLabel = getWorkoutTypeLabel(s);
  const actions = s.status === 'booked'
    ? `<button class="btn btn-ghost btn-sm" onclick="openCompleteModal('${s.id}')">✓ Complete</button>
       <button class="btn btn-ghost btn-sm" onclick="openEditModal('${s.id}')">Edit</button>
       <button class="btn btn-ghost btn-sm" onclick="exportSingleICS('${s.id}')">+ Calendar</button>
       ${options.showDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">Delete</button>` : ''}`
    : `<button class="btn btn-ghost btn-sm" onclick="openViewModal('${s.id}')">View</button>`;
  return `<div class="session-card ${s.status === 'completed' ? 'completed' : ''}">
    <div class="session-date-block"><div style="display:flex;align-items:center;gap:4px;">${dot}<div class="session-day">${day}</div></div><div class="session-month">${month}</div></div>
    <div class="session-info">
      <div class="session-time">${time}${dur}${loc}</div>
      <div class="session-notes">${typeLabel}${notes ? ` · ${notes}` : ''}</div>
    </div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">${actions}</div>
  </div>`;
}

// ===== LOG =====
export function renderLog(ctx) {
  const completed = [...ctx.state.sessions]
    .filter(s => s.status === 'completed')
    .sort((a,b) => new Date(b.completedAt || b.datetime) - new Date(a.completedAt || a.datetime));

  const typeFiltered = filterSessionsByType(completed, logTypeFilter);
  const filtered = filterSessionsByBodyPart(typeFiltered, logBodyFilter);
  const buckets = buildTrendBuckets(filtered, logTrendMode, logBodyFilter);
  const currentVolume = buckets[buckets.length - 1]?.volume || 0;
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

    <section class="log-analytics">
      <div class="log-metric-label">Volume</div>
      <div class="log-metric-value">${formatVolume(currentVolume)} kg <span>${logTrendMode === 'weekly' ? 'this week' : 'this month'}</span></div>
      ${trendChartHTML(buckets)}
      <div class="log-body-summary">${summaryRows}</div>
    </section>

    <div class="log-section-label">Session History</div>
    <div class="log-ledger">${rows}</div>`;
}

function setLogTrendMode(mode) {
  logTrendMode = mode === 'monthly' ? 'monthly' : 'weekly';
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

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getExerciseMeta(name) {
  return EXERCISE_DB.find(e => e.name.toLowerCase() === String(name || '').toLowerCase());
}

function getExerciseSets(exercise) {
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

function getExerciseVolume(exercise) {
  return getExerciseSets(exercise).reduce((sum, set) => sum + set.weight * set.reps * set.sets, 0);
}

function getExercisesVolume(exercises) {
  return Math.round((exercises || []).reduce((sum, exercise) => sum + getExerciseVolume(exercise), 0));
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
  return entries[0]?.[0] || 'All';
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

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function bucketKey(date, mode) {
  const d = mode === 'weekly' ? startOfWeek(date) : startOfMonth(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bucketLabel(date, mode) {
  if (mode === 'monthly') return date.toLocaleDateString('en', { month: 'short' });
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function buildTrendBuckets(sessions, mode, bodyPart) {
  const count = mode === 'weekly' ? 8 : 6;
  const now = new Date();
  const currentStart = mode === 'weekly' ? startOfWeek(now) : startOfMonth(now);
  const buckets = Array.from({ length: count }, (_, i) => {
    const date = new Date(currentStart);
    if (mode === 'weekly') date.setDate(currentStart.getDate() - (count - 1 - i) * 7);
    else date.setMonth(currentStart.getMonth() - (count - 1 - i));
    return { key: bucketKey(date, mode), label: bucketLabel(date, mode), volume: 0 };
  });
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]));
  sessions.forEach(session => {
    const date = new Date(session.completedAt || session.datetime);
    const bucket = bucketMap.get(bucketKey(date, mode));
    if (bucket) bucket.volume += getSessionVolume(session, bodyPart);
  });
  return buckets;
}

function trendChartHTML(buckets) {
  const width = 720;
  const height = 190;
  const padX = 18;
  const padY = 22;
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
    <line x1="${padX}" y1="${baseline}" x2="${width - padX}" y2="${baseline}"></line>
    <polyline points="${line}"></polyline>
    ${points.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2"></circle>`).join('')}
    ${points.map((point, i) => i === 0 || i === points.length - 1 ? `<text x="${point.x.toFixed(1)}" y="${height - 4}" text-anchor="${i === 0 ? 'start' : 'end'}">${point.label}</text>` : '').join('')}
  </svg>`;
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
    const setText = Array.isArray(exercise.sets)
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

// ===== SESSIONS =====
function openBookModal(defaultType = 'pt', mode = 'book') {
  currentEditId = null;
  sessionEntryMode = mode === 'log' ? 'log' : 'book';
  document.getElementById('book-modal-title').textContent = sessionEntryMode === 'log' ? 'Log Workout' : 'Book Session';
  document.getElementById('book-save-btn').textContent = sessionEntryMode === 'log' ? 'Save Workout' : 'Save Session';
  document.getElementById('export-ics-btn').style.display = 'none';
  document.getElementById('ics-notice').style.display = 'none';
  setBookType(defaultType);
  if (!document.getElementById('book-date').value)
    document.getElementById('book-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('exercise-rows').innerHTML = '';
  ctx.openModal('book-modal');
};

function openLogWorkoutModal() {
  openBookModal('personal', 'log');
}

function openEditModal(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  currentEditId = id;
  sessionEntryMode = 'book';
  document.getElementById('book-modal-title').textContent = 'Edit Session';
  document.getElementById('book-save-btn').textContent = 'Update Session';
  document.getElementById('export-ics-btn').style.display = 'inline-flex';
  document.getElementById('ics-notice').style.display = 'block';
  const dt = new Date(s.datetime);
  document.getElementById('book-date').value = dt.toISOString().split('T')[0];
  document.getElementById('book-time').value = dt.toTimeString().slice(0,5);
  setBookType(getWorkoutType(s));
  document.getElementById('book-duration').value = s.duration || '1.5';
  document.getElementById('book-location').value = s.location || '';
  document.getElementById('book-notes').value = s.notes || '';
  document.getElementById('exercise-rows').innerHTML = '';
  (s.exercises || []).forEach(e => ctx.addExerciseRow(e, 'exercise-rows'));
  ctx.openModal('book-modal');
};

async function saveSession() {
  const date = document.getElementById('book-date').value;
  const time = document.getElementById('book-time').value;
  if (!date) { ctx.showToast('Please select a date'); return; }
  const datetime = `${date}T${time||'10:00'}`;
  const pkg = ctx.getActivePackage();
  const type = document.getElementById('book-type').value === 'personal' ? 'personal' : 'pt';
  const id = currentEditId || ctx.genId();
  const existing = currentEditId ? ctx.state.sessions.find(x => x.id === currentEditId) : null;
  const exercises = ctx.getExerciseRows('exercise-rows');
  const isDirectLog = sessionEntryMode === 'log' && !existing;
  const sessionData = {
    datetime, duration: document.getElementById('book-duration').value,
    type,
    location: document.getElementById('book-location').value,
    notes: document.getElementById('book-notes').value,
    exercises,
    status: existing?.status || (isDirectLog ? 'completed' : 'booked'),
    packageId: type === 'pt' ? (existing?.packageId || (pkg ? pkg.id : null)) : null,
    completionNotes: existing?.completionNotes || null,
    completedAt: existing?.completedAt || (isDirectLog ? new Date().toISOString() : null),
    totalVolume: existing?.totalVolume || (isDirectLog ? getExercisesVolume(exercises) : null),
  };
  await ctx.fsSet('sessions', id, sessionData);
  ctx.closeModal('book-modal');
  ctx.showToast(currentEditId ? 'Session updated' : (isDirectLog ? 'Workout logged' : 'Session scheduled'));
};

// ===== WORKOUT LOG MODAL =====
let workoutLogMode = 'log';

function openWorkoutLogModal(id, mode = 'log') {
  workoutLogMode = mode;
  ctx.state.completingSessionId = id;
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const dt = new Date(s.datetime);
  const dateStr = dt.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const trainerStr = s.location || '';
  document.getElementById('wl-subtitle').textContent = trainerStr ? `${dateStr} · ${trainerStr}` : dateStr;
  document.getElementById('wl-save-btn').textContent = mode === 'edit' ? 'Save Changes' : 'Save & Complete';
  setCompleteType(getWorkoutType(s));
  ctx.loadCxExercises(s.exercises || []);
  document.getElementById('complete-notes').value = s.completionNotes || '';
  ctx.openModal('complete-modal');
}

async function saveWorkoutLog() {
  const s = ctx.state.sessions.find(x => x.id === ctx.state.completingSessionId);
  if (!s) return;
  const exercises = ctx.getCxExercises();
  const totalVolume = Math.round(exercises.reduce((sum, e) => sum + e.sets.reduce((acc, set) => acc + set.reps * set.weight, 0), 0));
  const type = document.getElementById('complete-type').value === 'personal' ? 'personal' : 'pt';
  const activePackage = ctx.getActivePackage();
  const update = {
    ...s,
    type,
    packageId: type === 'pt' ? (s.packageId || activePackage?.id || null) : null,
    exercises,
    totalVolume,
    completionNotes: document.getElementById('complete-notes').value
  };
  if (workoutLogMode === 'log') {
    update.status = 'completed';
    update.completedAt = new Date().toISOString();
  }
  await ctx.fsSet('sessions', s.id, update);
  ctx.closeModal('complete-modal');
  ctx.showToast(workoutLogMode === 'edit' ? 'Workout updated' : 'Session completed ✓');
}

// ===== VIEW SESSION =====
function openViewModal(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const dt = new Date(s.datetime);
  const pkg = ctx.state.packages.find(p => p.id === s.packageId);
  const typeLabel = getWorkoutTypeLabel(s);
  const exercises = s.exercises || [];
  const totalSets = exercises.reduce((sum, e) => sum + getExerciseSets(e).reduce((acc, set) => acc + set.sets, 0), 0);
  const totalReps = exercises.reduce((sum, e) => sum + getExerciseSets(e).reduce((acc, set) => acc + set.sets * set.reps, 0), 0);
  const totalVolume = exercises.reduce((sum, e) => sum + getExerciseVolume(e), 0);
  const exDetailHTML = exercises.map(ex => {
    const sets = getExerciseSets(ex);
    const heaviest = Math.max(...sets.map(set => set.weight), 0);
    const dbEntry = EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase());
    const musclesLabel = (ex.muscles || dbEntry?.muscles || []).map(m => m.replace(/-/g,' ')).join(', ');
    let badgeClass = '';
    if (heaviest > 60) badgeClass = 'intensity-3';
    else if (heaviest > 30) badgeClass = 'intensity-2';
    const badges = sets.flatMap(set => Array.from({length: set.sets}, () =>
      `<div class="set-badge ${badgeClass}"><span>${set.weight ? set.weight+'kg' : '—'}</span><span class="set-badge-reps">${set.reps}×</span></div>`
    )).join('');
    return `<div class="ex-detail-card">
      <div class="ex-detail-name">${ex.name}</div>
      ${musclesLabel ? `<div class="ex-detail-muscles-tag">${musclesLabel}</div>` : ''}
      <div class="set-badges">${badges}</div>
    </div>`;
  }).join('');
  document.getElementById('view-session-content').innerHTML = `
    <div class="session-detail-wrap">
      <div style="font-size:18px;font-weight:600;margin-bottom:4px;">${dt.toLocaleDateString('en',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      <div style="font-size:13px;color:var(--gray-600);margin-bottom:8px;">${dt.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}${s.duration?' · '+s.duration+' hr':''}${s.location?' · '+s.location:''}</div>
      <div style="font-size:12px;color:var(--gray-400);margin-bottom:12px;">${eventDotHTML(s)} ${typeLabel}${pkg && getWorkoutType(s) === 'pt' ? ` · Package: ${pkg.name}` : ''}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:16px 0;border-top:1px solid var(--gray-200);border-bottom:1px solid var(--gray-200);">
        <div class="session-stat"><div class="session-stat-val">${totalSets}</div><div class="session-stat-label">Sets</div></div>
        <div class="session-stat"><div class="session-stat-val">${totalReps}</div><div class="session-stat-label">Reps</div></div>
        <div class="session-stat"><div class="session-stat-val">${totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : '—'}</div><div class="session-stat-label">Volume kg</div></div>
      </div>
      ${s.notes?`<div style="font-size:13px;color:var(--gray-600);margin-bottom:12px;">${s.notes}</div>`:''}
      ${exDetailHTML ? `<div style="margin-top:16px;">${exDetailHTML}</div>` : ''}
      ${s.completionNotes?`<div style="margin-top:16px;padding:12px;background:var(--gray-100);font-size:13px;font-style:italic;color:var(--gray-600);">"${s.completionNotes}"</div>`:''}
    </div>`;
  document.getElementById('view-modal-actions').innerHTML = s.status === 'booked'
    ? `<button class="btn btn-ghost" onclick="closeModal('view-modal');openWorkoutLogModal('${s.id}','log')">✓ Complete</button>
       <button class="btn btn-ghost" onclick="closeModal('view-modal');openEditModal('${s.id}')">Edit</button>
       <button class="btn btn-ghost" onclick="exportSingleICS('${s.id}')">+ Calendar</button>
       <button class="btn btn-danger btn-sm" onclick="cancelSession('${s.id}')">Cancel</button>`
    : `<button class="btn btn-ghost" onclick="closeModal('view-modal');openWorkoutLogModal('${s.id}','edit')">Edit Workout</button>
       <button class="btn btn-ghost" onclick="closeModal('view-modal');openEditModal('${s.id}')">Edit Details</button>
       <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">Delete</button>`;
  ctx.openModal('view-modal');
};

// ===== SESSION ACTIONS =====
async function cancelSession(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const startsAt = new Date(s.datetime);
  const hoursUntilStart = (startsAt - new Date()) / 36e5;
  if (hoursUntilStart >= 0 && hoursUntilStart <= 2) {
    await ctx.fsSet('sessions', id, {...s, status:'cancelled'});
    ctx.closeModal('view-modal');
    ctx.rerenderActive();
    ctx.showToast('Session cancelled');
  } else {
    await ctx.fsDel('sessions', id);
    ctx.closeModal('view-modal');
    ctx.rerenderActive();
    ctx.showToast('Session deleted');
  }
}

async function deleteSession(id) {
  if (!confirm('Delete this session permanently?')) return;
  await ctx.fsDel('sessions', id);
  ctx.closeModal('view-modal');
  ctx.rerenderActive();
  ctx.showToast('Session deleted');
}

// ===== ICS =====
function buildICS(s) {
  const dt = new Date(s.datetime);
  const end = new Date(dt.getTime() + (parseFloat(s.duration)||1.5)*3600000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const desc = [s.notes, s.exercises?.map(e=>`${e.name} ${e.sets}x${e.reps} @ ${e.weight}kg`).join('; ')].filter(Boolean).join(' | ');
  const summary = getWorkoutType(s) === 'personal' ? 'Personal Workout' : 'PT Session';
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PT Tracker//EN\r\nBEGIN:VEVENT\r\nUID:${s.id}@pttracker\r\nDTSTAMP:${fmt(new Date())}\r\nDTSTART:${fmt(dt)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:${summary}${s.location?' @ '+s.location:''}\r\n${desc?'DESCRIPTION:'+desc+'\r\n':''}${s.location?'LOCATION:'+s.location+'\r\n':''}END:VEVENT\r\nEND:VCALENDAR`;
}

function exportSingleICS(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const blob = new Blob([buildICS(s)], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${getWorkoutType(s) === 'personal' ? 'personal-workout' : 'pt-session'}-${new Date(s.datetime).toISOString().split('T')[0]}.ics`;
  a.click();
  ctx.showToast('.ics downloaded');
}

function exportICS() {
  if (currentEditId) exportSingleICS(currentEditId);
}
