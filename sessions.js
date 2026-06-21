import { EXERCISE_DB } from "./exercises.js";

let ctx = null;
let currentEditId = null;

export function installSessionHandlers(context) {
  ctx = context;
  window.openBookModal = openBookModal;
  window.openEditModal = openEditModal;
  window.saveSession = saveSession;
  window.openCompleteModal = openCompleteModal;
  window.confirmComplete = confirmComplete;
  window.openViewModal = openViewModal;
  window.cancelSession = cancelSession;
  window.deleteSession = deleteSession;
  window.exportSingleICS = exportSingleICS;
  window.exportICS = exportICS;
}

export function sessionCardHTML(s, options = {}) {
  const dt = new Date(s.datetime);
  const day = dt.getDate();
  const month = dt.toLocaleString('en', { month: 'short' }).toUpperCase();
  const time = dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const dur = s.duration ? ` · ${s.duration} hr` : '';
  const loc = s.location ? ` · ${s.location}` : '';
  const notes = s.notes || (s.exercises?.length ? `${s.exercises.length} exercise${s.exercises.length > 1 ? 's' : ''} logged` : '');
  const dot = { booked: '<span style="color:#22c55e;font-size:10px;line-height:1;">●</span>', completed: '<span style="color:#9ca3af;font-size:10px;line-height:1;">●</span>', cancelled: '<span style="color:#ef4444;font-size:10px;line-height:1;">●</span>' }[s.status] || '';
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
      ${notes ? `<div class="session-notes">${notes}</div>` : ''}
    </div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">${actions}</div>
  </div>`;
}

// ===== LOG =====
export function renderLog(ctx) {
  const sorted = [...ctx.state.sessions].sort((a,b) => new Date(b.datetime) - new Date(a.datetime));
  if (!sorted.length) {
    document.getElementById('log-list').innerHTML = `<div class="empty-state"><div class="empty-state-title">No sessions yet</div></div>`;
    return;
  }
  document.getElementById('log-list').innerHTML = sorted.map(s => {
    let exHtml = '';
    if (s.exercises?.length) {
      exHtml = `<div class="workout-detail">
        <div class="workout-exercise-row" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-400);">
          <span>Exercise</span><span>Sets</span><span>Reps</span><span>Weight</span>
        </div>
        ${s.exercises.map(e => `<div class="workout-exercise-row"><span>${e.name||'—'}</span><span>${e.sets||'—'}</span><span>${e.reps||'—'}</span><span>${e.weight?e.weight+' kg':'—'}</span></div>`).join('')}
      </div>`;
    }
    const notesHtml = s.completionNotes ? `<div style="margin-top:8px;font-size:12px;color:var(--gray-600);font-style:italic;">"${s.completionNotes}"</div>` : '';
    return `<div style="margin-bottom:8px;">${sessionCardHTML(s)}${exHtml}${notesHtml}</div>`;
  }).join('');
}

// ===== SESSIONS =====
function openBookModal() {
  currentEditId = null;
  document.getElementById('book-modal-title').textContent = 'Book Session';
  document.getElementById('book-save-btn').textContent = 'Save Session';
  document.getElementById('export-ics-btn').style.display = 'none';
  document.getElementById('ics-notice').style.display = 'none';
  if (!document.getElementById('book-date').value)
    document.getElementById('book-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('exercise-rows').innerHTML = '';
  ctx.openModal('book-modal');
};

function openEditModal(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  currentEditId = id;
  document.getElementById('book-modal-title').textContent = 'Edit Session';
  document.getElementById('book-save-btn').textContent = 'Update Session';
  document.getElementById('export-ics-btn').style.display = 'inline-flex';
  document.getElementById('ics-notice').style.display = 'block';
  const dt = new Date(s.datetime);
  document.getElementById('book-date').value = dt.toISOString().split('T')[0];
  document.getElementById('book-time').value = dt.toTimeString().slice(0,5);
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
  const id = currentEditId || ctx.genId();
  const existing = currentEditId ? ctx.state.sessions.find(x => x.id === currentEditId) : null;
  const sessionData = {
    datetime, duration: document.getElementById('book-duration').value,
    location: document.getElementById('book-location').value,
    notes: document.getElementById('book-notes').value,
    exercises: ctx.getExerciseRows('exercise-rows'),
    status: existing?.status || 'booked',
    packageId: existing?.packageId || (pkg ? pkg.id : null),
    completionNotes: existing?.completionNotes || null,
    completedAt: existing?.completedAt || null,
  };
  await ctx.fsSet('sessions', id, sessionData);
  ctx.closeModal('book-modal');
  ctx.showToast(currentEditId ? 'Session updated' : 'Session scheduled');
};

// ===== COMPLETE =====
function openCompleteModal(id) {
  ctx.state.completingSessionId = id;
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const dt = new Date(s.datetime);
  document.getElementById('complete-session-info').textContent =
    dt.toLocaleDateString('en', { weekday:'long', day:'numeric', month:'long' }) + ' at ' +
    dt.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' });
  document.getElementById('complete-exercise-rows').innerHTML = '';
  (s.exercises || []).forEach(e => ctx.addExerciseRow(e, 'complete-exercise-rows'));
  document.getElementById('complete-notes').value = s.completionNotes || '';
  ctx.openModal('complete-modal');
};

async function confirmComplete() {
  const s = ctx.state.sessions.find(x => x.id === ctx.state.completingSessionId);
  if (!s) return;
  const exercises = ctx.getExerciseRows('complete-exercise-rows');
  await ctx.fsSet('sessions', s.id, { ...s, status: 'completed', exercises, completionNotes: document.getElementById('complete-notes').value, completedAt: new Date().toISOString() });
  ctx.closeModal('complete-modal');
  ctx.showToast('Session completed ✓');
};

// ===== VIEW SESSION =====
function openViewModal(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const dt = new Date(s.datetime);
  const pkg = ctx.state.packages.find(p => p.id === s.packageId);
  const exercises = s.exercises || [];
  const intensityMap = ctx.buildMuscleIntensity(exercises);
  const hasMuscles = Object.keys(intensityMap).length > 0;
  const totalSets = exercises.reduce((sum, e) => sum + (parseInt(e.sets) || 0), 0);
  const totalReps = exercises.reduce((sum, e) => { const sets = parseInt(e.sets)||0; const reps = parseInt(e.reps)||0; return sum + sets*reps; }, 0);
  const totalVolume = exercises.reduce((sum, e) => { const sets = parseInt(e.sets)||0; const reps = parseInt(e.reps)||0; const weight = parseFloat(e.weight)||0; return sum + sets*reps*weight; }, 0);
  const exDetailHTML = exercises.map(ex => {
    const sets = parseInt(ex.sets) || 0;
    const reps = parseInt(ex.reps) || 0;
    const weight = parseFloat(ex.weight) || 0;
    const dbEntry = EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase());
    const musclesLabel = (ex.muscles || dbEntry?.muscles || []).map(m => m.replace(/-/g,' ')).join(', ');
    let badgeClass = '';
    if (weight > 60) badgeClass = 'intensity-3';
    else if (weight > 30) badgeClass = 'intensity-2';
    const badges = Array.from({length: sets}, () =>
      `<div class="set-badge ${badgeClass}"><span>${weight ? weight+'kg' : sets+'×'}</span><span class="set-badge-reps">${reps}×</span></div>`
    ).join('');
    return `<div class="ex-detail-card">
      <div class="ex-detail-name">${ex.name}</div>
      ${musclesLabel ? `<div class="ex-detail-muscles-tag">${musclesLabel}</div>` : ''}
      <div class="set-badges">${badges}</div>
    </div>`;
  }).join('');
  const muscleSection = hasMuscles ? `
    <div class="session-muscle-header">
      <div class="muscle-bodies">
        ${ctx.buildMuscleSVG(intensityMap, 'front')}
        ${ctx.buildMuscleSVG(intensityMap, 'back')}
      </div>
      <div class="session-stats-row">
        <div class="session-stat"><div class="session-stat-val">${totalSets}</div><div class="session-stat-label">Sets</div></div>
        <div class="session-stat"><div class="session-stat-val">${totalReps}</div><div class="session-stat-label">Reps</div></div>
        <div class="session-stat"><div class="session-stat-val">${totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : '—'}</div><div class="session-stat-label">Volume kg</div></div>
      </div>
    </div>` : '';
  document.getElementById('view-session-content').innerHTML = `
    <div class="session-detail-wrap">
      <div style="font-size:18px;font-weight:600;margin-bottom:4px;">${dt.toLocaleDateString('en',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      <div style="font-size:13px;color:var(--gray-600);margin-bottom:${hasMuscles?'16px':'8px'};">${dt.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}${s.duration?' · '+s.duration+' hr':''}${s.location?' · '+s.location:''}</div>
      ${pkg?`<div style="font-size:12px;color:var(--gray-400);margin-bottom:12px;">Package: ${pkg.name}</div>`:''}
      ${s.notes?`<div style="font-size:13px;color:var(--gray-600);margin-bottom:12px;">${s.notes}</div>`:''}
      ${muscleSection}
      ${exDetailHTML ? `<div style="margin-top:16px;">${exDetailHTML}</div>` : ''}
      ${s.completionNotes?`<div style="margin-top:16px;padding:12px;background:var(--gray-100);font-size:13px;font-style:italic;color:var(--gray-600);">"${s.completionNotes}"</div>`:''}
    </div>`;
  document.getElementById('view-modal-actions').innerHTML = s.status === 'booked'
    ? `<button class="btn btn-ghost" onclick="closeModal('view-modal');openCompleteModal('${s.id}')">✓ Complete</button>
       <button class="btn btn-ghost" onclick="closeModal('view-modal');openEditModal('${s.id}')">Edit</button>
       <button class="btn btn-ghost" onclick="exportSingleICS('${s.id}')">↓ .ics</button>
       <button class="btn btn-danger btn-sm" onclick="cancelSession('${s.id}')">Cancel</button>`
    : `<button class="btn btn-ghost" onclick="closeModal('view-modal');openEditModal('${s.id}')">Edit</button>
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
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PT Tracker//EN\r\nBEGIN:VEVENT\r\nUID:${s.id}@pttracker\r\nDTSTAMP:${fmt(new Date())}\r\nDTSTART:${fmt(dt)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:PT Session${s.location?' @ '+s.location:''}\r\n${desc?'DESCRIPTION:'+desc+'\r\n':''}${s.location?'LOCATION:'+s.location+'\r\n':''}END:VEVENT\r\nEND:VCALENDAR`;
}

function exportSingleICS(id) {
  const s = ctx.state.sessions.find(x => x.id === id);
  if (!s) return;
  const blob = new Blob([buildICS(s)], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pt-session-${new Date(s.datetime).toISOString().split('T')[0]}.ics`;
  a.click();
  ctx.showToast('.ics downloaded');
}

function exportICS() {
  if (currentEditId) exportSingleICS(currentEditId);
}
