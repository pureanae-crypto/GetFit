import { EXERCISE_DB } from "./exercises.js";
import { getExerciseSets, getExerciseVolume } from "./log.js";

let ctx = null;
let currentEditId = null;
let sessionEntryMode = 'book';

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
  const weekday = dt.toLocaleString('en', { weekday: 'short' }).toUpperCase();
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
    <div class="session-date-block"><div style="display:flex;align-items:center;gap:4px;">${dot}<div class="session-day">${day}</div></div><div class="session-month">${month}</div><div class="session-weekday">${weekday}</div></div>
    <div class="session-info">
      <div class="session-time">${time}${dur}${loc}</div>
      <div class="session-notes">${typeLabel}${notes ? ` · ${notes}` : ''}</div>
    </div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">${actions}</div>
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
  // When editing session details (not logging), preserve existing exercise data
  const savedExercises = (currentEditId && sessionEntryMode === 'book') ? (existing?.exercises ?? exercises) : exercises;
  const sessionData = {
    datetime, duration: document.getElementById('book-duration').value,
    type,
    location: document.getElementById('book-location').value,
    notes: document.getElementById('book-notes').value,
    exercises: savedExercises,
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
