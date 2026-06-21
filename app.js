import { EXERCISE_DB, CATS } from "./exercises.js";
import { configureFirebase, initAuth, subscribeAppData, fsSet, fsDel } from "./firebase.js";
import { renderDashboard as renderDashboardView } from "./dashboard.js";
import { installSessionHandlers, renderLog as renderSessionLog } from "./sessions.js";

// ===== STATE =====
let state = {
  packages: [], sessions: [],
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  completingSessionId: null
};
let pickerContext = 'book';
let pickerActiveCat = 'All';

// ===== MUSCLE SVG HIGHLIGHTER =====
const MUSCLE_COLORS = { 1: '#f4a261', 2: '#e76f51', 3: '#c1440e' };

function buildMuscleSVG(muscleIntensityMap, side) {
  const f = side === 'front';
  const c = (slug) => {
    const intensity = muscleIntensityMap[slug] || 0;
    if (!intensity) return '#2a2a2a';
    return MUSCLE_COLORS[Math.min(intensity, 3)];
  };
  if (f) {
    return `<svg viewBox="0 0 120 280" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="60" cy="22" rx="16" ry="19" fill="#333" stroke="#444" stroke-width="0.5"/>
  <rect x="53" y="39" width="14" height="12" fill="#333"/>
  <path d="M44 51 Q53 46 60 45 Q67 46 76 51 L72 60 Q60 56 48 60 Z" fill="${c('traps')}"/>
  <path d="M48 60 Q53 58 60 58 L60 58 Q67 58 72 60 L74 78 Q67 82 60 83 Q53 82 46 78 Z" fill="${c('chest')}"/>
  <path d="M44 51 L48 60 L46 78 L38 74 L36 57 Z" fill="${c('front-deltoids')}"/>
  <path d="M76 51 L72 60 L74 78 L82 74 L84 57 Z" fill="${c('front-deltoids')}"/>
  <path d="M36 57 L38 74 L34 74 L32 60 Z" fill="${c('side-deltoids')}"/>
  <path d="M84 57 L82 74 L86 74 L88 60 Z" fill="${c('side-deltoids')}"/>
  <path d="M34 74 L38 74 L40 100 L34 100 Z" fill="${c('biceps')}"/>
  <path d="M82 74 L86 74 L86 100 L80 100 Z" fill="${c('biceps')}"/>
  <path d="M34 100 L40 100 L41 126 L33 126 Z" fill="${c('forearm')}"/>
  <path d="M80 100 L86 100 L87 126 L79 126 Z" fill="${c('forearm')}"/>
  <ellipse cx="37" cy="132" rx="6" ry="8" fill="#2a2a2a"/>
  <ellipse cx="83" cy="132" rx="6" ry="8" fill="#2a2a2a"/>
  <path d="M46 78 Q53 82 60 83 Q67 82 74 78 L76 118 Q68 124 60 125 Q52 124 44 118 Z" fill="${c('abs')}"/>
  <path d="M44 83 L46 78 L44 118 L38 112 L36 92 Z" fill="${c('obliques')}"/>
  <path d="M76 83 L74 78 L76 118 L82 112 L84 92 Z" fill="${c('obliques')}"/>
  <path d="M44 118 Q52 124 60 125 Q68 124 76 118 L76 132 Q68 136 60 137 Q52 136 44 132 Z" fill="${c('adductors')}"/>
  <path d="M44 132 Q52 136 60 137 L58 190 Q50 190 44 185 Z" fill="${c('quadriceps')}"/>
  <path d="M76 132 Q68 136 60 137 L62 190 Q70 190 76 185 Z" fill="${c('quadriceps')}"/>
  <path d="M38 130 L44 132 L44 185 L38 180 Z" fill="${c('abductors')}"/>
  <path d="M82 130 L76 132 L76 185 L82 180 Z" fill="${c('abductors')}"/>
  <ellipse cx="51" cy="193" rx="8" ry="6" fill="#2a2a2a"/>
  <ellipse cx="69" cy="193" rx="8" ry="6" fill="#2a2a2a"/>
  <path d="M43 199 L59 199 L58 240 L44 240 Z" fill="${c('calves')}"/>
  <path d="M61 199 L77 199 L76 240 L62 240 Z" fill="${c('calves')}"/>
  <ellipse cx="51" cy="247" rx="9" ry="5" fill="#2a2a2a"/>
  <ellipse cx="69" cy="247" rx="9" ry="5" fill="#2a2a2a"/>
</svg>`;
  } else {
    return `<svg viewBox="0 0 120 280" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="60" cy="22" rx="16" ry="19" fill="#333" stroke="#444" stroke-width="0.5"/>
  <rect x="53" y="39" width="14" height="12" fill="#333"/>
  <path d="M44 51 Q53 46 60 45 Q67 46 76 51 L72 62 Q60 60 48 62 Z" fill="${c('traps')}"/>
  <path d="M44 51 L48 62 L44 80 L36 76 L34 57 Z" fill="${c('rear-deltoids')}"/>
  <path d="M76 51 L72 62 L76 80 L84 76 L86 57 Z" fill="${c('rear-deltoids')}"/>
  <path d="M32 60 L34 57 L36 76 L32 76 Z" fill="${c('side-deltoids')}"/>
  <path d="M88 60 L86 57 L84 76 L88 76 Z" fill="${c('side-deltoids')}"/>
  <path d="M48 62 Q54 60 60 60 Q66 60 72 62 L72 82 Q66 86 60 87 Q54 86 48 82 Z" fill="${c('rhomboids')}"/>
  <path d="M44 80 L48 82 L48 110 L38 105 L36 84 Z" fill="${c('lats')}"/>
  <path d="M76 80 L72 82 L72 110 L82 105 L84 84 Z" fill="${c('lats')}"/>
  <path d="M32 76 L36 76 L38 105 L32 103 Z" fill="${c('triceps')}"/>
  <path d="M88 76 L84 76 L82 105 L88 103 Z" fill="${c('triceps')}"/>
  <path d="M32 103 L38 105 L39 128 L31 128 Z" fill="${c('forearm')}"/>
  <path d="M82 105 L88 103 L89 128 L81 128 Z" fill="${c('forearm')}"/>
  <ellipse cx="35" cy="134" rx="6" ry="8" fill="#2a2a2a"/>
  <ellipse cx="85" cy="134" rx="6" ry="8" fill="#2a2a2a"/>
  <path d="M48 110 Q54 116 60 117 Q66 116 72 110 L74 132 Q66 138 60 139 Q54 138 46 132 Z" fill="${c('lower-back')}"/>
  <path d="M46 132 Q54 138 60 139 Q66 138 74 132 L74 165 Q66 172 60 173 Q54 172 46 165 Z" fill="${c('gluteal')}"/>
  <path d="M46 165 Q52 172 60 173 L58 218 Q50 218 44 212 Z" fill="${c('hamstring')}"/>
  <path d="M74 165 Q68 172 60 173 L62 218 Q70 218 76 212 Z" fill="${c('hamstring')}"/>
  <path d="M38 165 L46 165 L44 212 L38 208 Z" fill="${c('adductors')}"/>
  <path d="M82 165 L74 165 L76 212 L82 208 Z" fill="${c('adductors')}"/>
  <ellipse cx="51" cy="220" rx="8" ry="5" fill="#2a2a2a"/>
  <ellipse cx="69" cy="220" rx="8" ry="5" fill="#2a2a2a"/>
  <path d="M43 225 L59 225 L58 255 L44 255 Z" fill="${c('calves')}"/>
  <path d="M61 225 L77 225 L76 255 L62 255 Z" fill="${c('calves')}"/>
  <ellipse cx="51" cy="261" rx="9" ry="5" fill="#2a2a2a"/>
  <ellipse cx="69" cy="261" rx="9" ry="5" fill="#2a2a2a"/>
</svg>`;
  }
}

function buildMuscleIntensity(exercises) {
  const muscleVolume = {};
  exercises.forEach(ex => {
    const dbEntry = EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase());
    if (!dbEntry) return;
    const sets = parseInt(ex.sets) || 1;
    const reps = parseInt(ex.reps) || 10;
    const volume = sets * reps;
    dbEntry.muscles.forEach(slug => { muscleVolume[slug] = (muscleVolume[slug] || 0) + volume; });
  });
  const maxVol = Math.max(...Object.values(muscleVolume), 1);
  const intensityMap = {};
  Object.entries(muscleVolume).forEach(([slug, vol]) => {
    const ratio = vol / maxVol;
    intensityMap[slug] = ratio < 0.35 ? 1 : ratio < 0.7 ? 2 : 3;
  });
  return intensityMap;
}

// ===== APP START =====
function hideLoading() { document.getElementById('loading-screen').style.display = 'none'; }
function showAuthError(msg) { document.getElementById('auth-error').textContent = msg; }

function rerenderActive() {
  const active = document.querySelector('.view.active');
  if (!active) return;
  const id = active.id;
  if (id === 'view-dashboard') renderDashboard();
  if (id === 'view-calendar') renderCalendar();
  if (id === 'view-log') renderLog();
  if (id === 'view-packages') renderPackages();
}

function startApp() {
  subscribeAppData(state, { hideLoading, renderDashboard, rerenderActive });
}

// ===== UTILS =====
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getActivePackage() { return state.packages.find(p => p.active) || state.packages[state.packages.length - 1] || null; }
function formatHours(value) { return (Math.round((value || 0) * 10) / 10).toFixed(1); }
function formatStatHours(value) { return `${formatHours(value)}<span class="stat-unit">hrs</span>`; }
function formatToday(monthStyle = 'long') { return new Date().toLocaleDateString('en', { month: monthStyle, day: 'numeric', year: 'numeric' }); }
function getPackageStats(pkg) {
  if (!pkg) return { total: 0, completed: 0, remaining: 0 };
  const completedHrs = state.sessions
    .filter(s => s.packageId === pkg.id && s.status === 'completed')
    .reduce((sum, s) => sum + (parseFloat(s.duration) || 1.0), 0);
  const total = parseFloat(pkg.sessions) || 0;
  const completed = Math.round(completedHrs * 10) / 10;
  return { total, completed, remaining: Math.round(Math.max(0, total - completedHrs) * 10) / 10 };
}

// ===== VIEWS =====
window.showView = function(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  ['dashboard','calendar','log','packages'].forEach((t, i) => {
    if (t === name) document.querySelectorAll('.nav-tab')[i].classList.add('active');
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'calendar') renderCalendar();
  if (name === 'log') renderLog();
  if (name === 'packages') renderPackages();
};

// ===== DASHBOARD =====
function renderDashboard() {
  renderDashboardView({
    state,
    getActivePackage,
    getPackageStats,
    formatHours,
    formatStatHours,
    formatToday
  });
}

// ===== CALENDAR =====
function renderCalendar() {
  const { calendarYear: year, calendarMonth: month } = state;
  document.getElementById('cal-month-label').textContent = new Date(year, month, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===d;
    const daySessions = state.sessions.filter(s => s.datetime?.startsWith(dateStr));
    const dots = daySessions.map(s => `<div class="cell-dot ${calendarDotClass(s)}"></div>`).join('');
    html += `<div class="calendar-cell ${isToday?'today':''}" onclick="calCellClick('${dateStr}')"><div class="cell-num">${d}</div>${dots}</div>`;
  }
  document.getElementById('calendar-grid').innerHTML = html;
}
function calendarDotClass(s) {
  if (s.status === 'cancelled') return 'cancelled-dot';
  if (s.status === 'completed') return 'completed-dot';
  return 'booked-dot';
}
window.changeMonth = function(dir) {
  state.calendarMonth += dir;
  if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
  if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
  renderCalendar();
};
window.openCalendarJump = function() {
  document.getElementById('jump-month').value = state.calendarMonth;
  document.getElementById('jump-year').value = state.calendarYear;
  openModal('calendar-jump-modal');
};
window.applyCalendarJump = function() {
  const month = parseInt(document.getElementById('jump-month').value, 10);
  const year = parseInt(document.getElementById('jump-year').value, 10);
  if (Number.isNaN(month) || Number.isNaN(year)) { showToast('Choose a month and year'); return; }
  state.calendarMonth = Math.min(11, Math.max(0, month));
  state.calendarYear = Math.min(2100, Math.max(2020, year));
  closeModal('calendar-jump-modal');
  renderCalendar();
};
window.jumpToToday = function() {
  const today = new Date();
  state.calendarMonth = today.getMonth();
  state.calendarYear = today.getFullYear();
  closeModal('calendar-jump-modal');
  renderCalendar();
};
window.calCellClick = function(dateStr) {
  const daySessions = state.sessions.filter(s => s.datetime?.startsWith(dateStr));
  if (daySessions.length > 0) openViewModal(daySessions[0].id);
  else { document.getElementById('book-date').value = dateStr; openBookModal(); }
};

// ===== LOG =====
function renderLog() {
  renderSessionLog({ state });
}

// ===== PACKAGES =====
function renderPackages() {
  if (!state.packages.length) {
    document.getElementById('packages-list').innerHTML = `<div class="empty-state"><div class="empty-state-title">No packages yet</div></div>`;
    return;
  }
  document.getElementById('packages-list').innerHTML = [...state.packages].reverse().map(pkg => {
    const stats = getPackageStats(pkg);
    const costPer = pkg.cost && pkg.sessions ? Math.round(pkg.cost/pkg.sessions * 10) / 10 : null;
    const dateStr = new Date(pkg.date).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric' });
    const pct = stats.total > 0 ? Math.round(stats.completed/stats.total*100) : 0;
    return `<div class="package-card ${pkg.active?'active-package':''}">
      ${pkg.active ? '<div class="package-active-tag">Active</div>' : ''}
      <div class="package-name">${pkg.name}</div>
      <div class="package-meta">
        Purchased: ${dateStr}<br>
        Hours: ${stats.completed} done / ${stats.total} total hrs<br>
        ${pkg.cost ? `Cost: HKD ${Number(pkg.cost).toLocaleString()}${costPer ? ` (HKD ${costPer}/hr)` : ''}` : ''}
        ${pkg.pt ? `<br>Trainer: ${pkg.pt}` : ''}
        ${pkg.notes ? `<br>${pkg.notes}` : ''}
      </div>
      <div style="margin-top:12px;">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--gray-400);margin-top:4px;"><span>${stats.remaining} hrs remaining</span><span>${pct}%</span></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        ${!pkg.active ? `<button class="btn btn-outline btn-sm" onclick="setActivePackage('${pkg.id}')">Set Active</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="deletePackage('${pkg.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ===== EXERCISE PICKER =====
window.openExercisePicker = function(context) {
  pickerContext = context;
  pickerActiveCat = 'All';
  document.getElementById('picker-search-input').value = '';
  renderPickerCats();
  renderPickerList();
  document.getElementById('exercise-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('picker-search-input').focus(), 300);
};

function renderPickerCats() {
  document.getElementById('picker-cats').innerHTML = CATS.map(cat =>
    `<button class="picker-cat ${cat === pickerActiveCat ? 'active' : ''}" onclick="setPickerCat('${cat}')">${cat}</button>`
  ).join('');
}

window.setPickerCat = function(cat) {
  pickerActiveCat = cat;
  renderPickerCats();
  renderPickerList();
};

window.filterPicker = function() { renderPickerList(); };

function renderPickerList() {
  const query = document.getElementById('picker-search-input').value.toLowerCase().trim();
  let list = EXERCISE_DB;
  if (pickerActiveCat !== 'All') list = list.filter(e => e.cat === pickerActiveCat);
  if (query) list = list.filter(e => e.name.toLowerCase().includes(query) || e.muscles.some(m => m.includes(query)));
  const container = document.getElementById('picker-list');
  if (!list.length) { container.innerHTML = `<div class="picker-no-results">No exercises found</div>`; return; }
  container.innerHTML = list.map(ex =>
    `<button class="picker-item" type="button" data-exercise-name=${JSON.stringify(ex.name)}>
      <div class="picker-item-info">
        <div class="picker-item-name">${ex.name}</div>
        <div class="picker-item-muscles">${ex.muscles.map(m => m.replace(/-/g,' ')).join(', ')}</div>
      </div>
    </button>`
  ).join('');
}

let activeCxNameInput = null;

window.openCxPicker = function(btn) {
  activeCxNameInput = btn;
  pickerContext = 'cx';
  pickerActiveCat = 'All';
  document.getElementById('picker-search-input').value = btn.dataset.name || '';
  renderPickerCats();
  renderPickerList();
  document.getElementById('exercise-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('picker-search-input').focus(), 300);
};

window.selectExercise = function(name) {
  const db_entry = EXERCISE_DB.find(e => e.name === name);
  if (pickerContext === 'cx') {
    const w = getLastUsedWeight(name);
    if (activeCxNameInput) {
      // Changing name of existing block
      activeCxNameInput.textContent = name;
      activeCxNameInput.dataset.name = name;
      const block = activeCxNameInput.closest('.cx-block');
      if (w) block.querySelectorAll('.cx-weight').forEach(el => { if (!el.value) el.value = w; });
      updateCxVolume();
    } else {
      // New exercise — create block + first set row
      const block = makeCxBlock(name);
      const setsContainer = block.querySelector('.cx-sets');
      setsContainer.appendChild(makeCxSetRow(w, ''));
      refreshSetNumbers(block);
      document.getElementById('cx-list').appendChild(block);
      updateCxVolume();
    }
  } else {
    const data = { name, sets: '', reps: '', weight: '', muscles: db_entry?.muscles || [] };
    addExerciseRow(data, pickerContext === 'book' ? 'exercise-rows' : 'complete-exercise-rows');
  }
  activeCxNameInput = null;
  closePicker();
};

document.getElementById('picker-list').addEventListener('pointerdown', e => {
  const item = e.target.closest('.picker-item');
  if (!item) return;
  e.preventDefault();
  e.stopPropagation();
  selectExercise(item.dataset.exerciseName);
});
document.getElementById('picker-list').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const item = e.target.closest('.picker-item');
  if (!item) return;
  e.preventDefault();
  selectExercise(item.dataset.exerciseName);
});
document.getElementById('exercise-picker-sheet').addEventListener('pointerdown', e => e.stopPropagation());
window.closePicker = function() {
  document.getElementById('exercise-picker-overlay').classList.remove('open');
  activeCxNameInput = null;
};
document.getElementById('exercise-picker-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('exercise-picker-overlay')) closePicker();
});

// ===== EXERCISE ROW =====
window.addExerciseRow = function(data, containerId) {
  if (!containerId) containerId = 'exercise-rows';
  const div = document.createElement('div');
  div.className = 'ex-row-card';
  div.dataset.muscles = JSON.stringify(data?.muscles || []);
  const musclesLabel = data?.muscles?.length
    ? `<div class="ex-row-muscles">${data.muscles.map(m=>m.replace(/-/g,' ')).join(', ')}</div>` : '';
  div.innerHTML = `
    <div class="ex-row-name">
      <button class="ex-row-name-btn" onclick="openExercisePicker('${containerId === 'exercise-rows' ? 'book' : 'complete'}')">${data?.name || 'Choose exercise'}</button>
      ${musclesLabel}
    </div>
    <div class="ex-row-inputs">
      <div class="ex-row-input-group">
        <div class="ex-row-input-label">Sets</div>
        <input class="ex-row-input" type="number" min="1" placeholder="4" value="${data?.sets||''}">
      </div>
      <div class="ex-row-input-group">
        <div class="ex-row-input-label">Reps</div>
        <input class="ex-row-input" type="text" placeholder="10" value="${data?.reps||''}">
      </div>
      <div class="ex-row-input-group">
        <div class="ex-row-input-label">kg</div>
        <input class="ex-row-input" type="number" step="0.5" placeholder="—" value="${data?.weight||''}">
      </div>
    </div>
    <button class="ex-row-remove" onclick="this.closest('.ex-row-card').remove()">×</button>`;
  document.getElementById(containerId).appendChild(div);
};

function getExerciseRows(containerId) {
  return [...document.querySelectorAll(`#${containerId} .ex-row-card`)].reduce((acc, card) => {
    const inputs = card.querySelectorAll('input');
    const nameEl = card.querySelector('.ex-row-name-btn');
    const name = nameEl?.textContent?.trim();
    const muscles = JSON.parse(card.dataset.muscles || '[]');
    if (name && name !== 'Choose exercise') {
      acc.push({ name, sets: inputs[0]?.value.trim(), reps: inputs[1]?.value.trim(), weight: inputs[2]?.value.trim(), muscles });
    }
    return acc;
  }, []);
}

// ===== COMPLETE MODAL EXERCISES =====
function getUsedExerciseNames() {
  const names = new Set();
  state.sessions.forEach(s => (s.exercises || []).forEach(e => { if (e.name) names.add(e.name); }));
  return [...names].sort();
}

function getLastUsedWeight(name) {
  const done = [...state.sessions]
    .filter(s => s.status === 'completed' && s.exercises?.length)
    .sort((a, b) => new Date(b.completedAt || b.datetime) - new Date(a.completedAt || a.datetime));
  for (const s of done) {
    for (const e of s.exercises) {
      if (e.name === name) {
        if (Array.isArray(e.sets) && e.sets.length) return e.sets[e.sets.length - 1].weight || '';
        if (e.weight) return e.weight;
      }
    }
  }
  return '';
}

function updateCxDatalist() {
  const dl = document.getElementById('cx-names');
  if (dl) dl.innerHTML = getUsedExerciseNames().map(n => `<option value="${n}">`).join('');
}

window.refreshSetNumbers = function(block) {
  block.querySelectorAll('.cx-set-num').forEach((el, i) => { el.textContent = i + 1; });
}
function refreshSetNumbers(block) { window.refreshSetNumbers(block); }

function makeCxSetRow(weight, reps) {
  const row = document.createElement('div');
  row.className = 'cx-set-row';
  row.innerHTML = `
    <span class="cx-set-num">1</span>
    <input class="ex-row-input cx-weight" type="number" min="0" step="0.5" placeholder="—" value="${weight || ''}" oninput="updateCxVolume()">
    <input class="ex-row-input cx-reps" type="number" min="1" placeholder="—" value="${reps || ''}" oninput="updateCxVolume()">
    <button class="ex-row-remove" onclick="const b=this.closest('.cx-block');this.closest('.cx-set-row').remove();refreshSetNumbers(b);updateCxVolume()">✕</button>`;
  return row;
}

function makeCxBlock(name) {
  updateCxDatalist();
  const block = document.createElement('div');
  block.className = 'cx-block';
  block.innerHTML = `
    <div class="cx-block-header">
      <button class="cx-name" onclick="openCxPicker(this)" data-name="${name || ''}">${name || 'Tap to choose exercise'}</button>
      <button class="cx-remove-ex" onclick="this.closest('.cx-block').remove();updateCxVolume()">Remove</button>
    </div>
    <div class="cx-col-headers"><span></span><span>KG</span><span>REPS</span><span></span></div>
    <div class="cx-sets"></div>
    <button class="cx-add-set-btn" onclick="addCxSet(this)">+ Add Set</button>`;
  return block;
}

window.addCompleteExercise = function() {
  activeCxNameInput = null;
  pickerContext = 'cx';
  pickerActiveCat = 'All';
  document.getElementById('picker-search-input').value = '';
  renderPickerCats();
  renderPickerList();
  document.getElementById('exercise-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('picker-search-input').focus(), 300);
};

window.onCxNameInput = function(input) {
  const name = input.value.trim();
  if (!name) return;
  const w = getLastUsedWeight(name);
  if (w) {
    const block = input.closest('.cx-block');
    block.querySelectorAll('.cx-weight').forEach(el => { if (!el.value) el.value = w; });
  }
};

window.addCxSet = function(btn) {
  const block = btn.closest('.cx-block');
  const setsContainer = btn.previousElementSibling;
  const prev = setsContainer.querySelectorAll('.cx-weight');
  const lastWeight = prev.length ? prev[prev.length - 1].value : '';
  const row = makeCxSetRow(lastWeight, '');
  setsContainer.appendChild(row);
  refreshSetNumbers(block);
  row.querySelector('.cx-weight').focus();
  updateCxVolume();
};

window.updateCxVolume = function() {
  const vol = getCxExercises().reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0);
  const el = document.getElementById('cx-volume');
  if (el) el.textContent = `Total volume: ${Math.round(vol)} kg`;
};

function getCxExercises() {
  return [...document.querySelectorAll('#cx-list .cx-block')].map(block => ({
    name: (block.querySelector('.cx-name').dataset.name || '').trim(),
    sets: [...block.querySelectorAll('.cx-set-row')].map(row => ({
      reps: parseInt(row.querySelector('.cx-reps').value) || 0,
      weight: parseFloat(row.querySelector('.cx-weight').value) || 0,
      unit: 'kg'
    })).filter(s => s.reps > 0)
  })).filter(e => e.name);
}
window.getCxExercises = getCxExercises;

window.loadCxExercises = function(exercises) {
  const list = document.getElementById('cx-list');
  list.innerHTML = '';
  (exercises || []).forEach(ex => {
    const block = makeCxBlock(ex.name);
    const setsContainer = block.querySelector('.cx-sets');
    const sets = Array.isArray(ex.sets) ? ex.sets : (ex.reps ? [{ reps: ex.reps, weight: ex.weight }] : []);
    sets.forEach(s => setsContainer.appendChild(makeCxSetRow(s.weight, s.reps)));
    refreshSetNumbers(block);
    list.appendChild(block);
  });
  updateCxVolume();
};

// ===== QUICK ADJUST (focused kg) =====
let focusedWeightInput = null;

document.addEventListener('focusin', e => {
  if (e.target.classList.contains('cx-weight')) {
    focusedWeightInput = e.target;
    document.getElementById('cx-adjust-row')?.classList.add('active');
  }
});
document.addEventListener('focusout', e => {
  if (e.target.classList.contains('cx-weight')) {
    setTimeout(() => {
      if (!document.activeElement?.classList.contains('cx-weight')) {
        focusedWeightInput = null;
        document.getElementById('cx-adjust-row')?.classList.remove('active');
      }
    }, 150);
  }
});

window.adjustFocusedWeight = function(delta) {
  if (!focusedWeightInput) return;
  const current = parseFloat(focusedWeightInput.value) || 0;
  focusedWeightInput.value = Math.max(0, current + delta);
  updateCxVolume();
  focusedWeightInput.focus();
};

// ===== PACKAGES =====
window.openPackageModal = function() {
  document.getElementById('pkg-date').value = new Date().toISOString().split('T')[0];
  openModal('package-modal');
};
window.savePackage = async function() {
  const name = document.getElementById('pkg-name').value.trim();
  const sessions = parseFloat(document.getElementById('pkg-sessions').value);
  const date = document.getElementById('pkg-date').value;
  if (!name || !sessions || !date) { showToast('Please fill in name, date, and total hours'); return; }
  await Promise.all(state.packages.filter(p => p.active).map(p => fsSet('packages', p.id, {...p, active:false})));
  const id = genId();
  await fsSet('packages', id, { name, date, sessions, cost: document.getElementById('pkg-cost').value||null, pt: document.getElementById('pkg-pt').value||null, notes: document.getElementById('pkg-notes').value||null, active: true });
  closeModal('package-modal');
  showToast('Package saved & set as active');
  ['pkg-name','pkg-sessions','pkg-cost','pkg-pt','pkg-notes'].forEach(i => document.getElementById(i).value='');
};
window.setActivePackage = async function(id) {
  await Promise.all(state.packages.map(p => fsSet('packages', p.id, {...p, active: p.id===id})));
  showToast('Active package updated');
};
window.deletePackage = async function(id) {
  if (!confirm('Delete this package?')) return;
  await fsDel('packages', id);
  showToast('Package deleted');
};

// ===== MODAL HELPERS =====
window.openModal = function(id) { document.getElementById(id).classList.add('open'); };
window.closeModal = function(id) { document.getElementById(id).classList.remove('open'); };
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target===m) m.classList.remove('open'); });
});

// ===== TOAST =====
let toastTimer;
window.showToast = function(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.style.display='none', 2800);
};

// ===== MODULE SETUP =====
installSessionHandlers({
  state,
  fsSet,
  fsDel,
  getActivePackage,
  genId,
  getExerciseRows,
  addExerciseRow: window.addExerciseRow,
  getCxExercises,
  loadCxExercises: window.loadCxExercises,
  openModal: window.openModal,
  closeModal: window.closeModal,
  showToast: window.showToast,
  rerenderActive,
  buildMuscleIntensity,
  buildMuscleSVG
});
configureFirebase({ showToast: window.showToast });
initAuth({ startApp, hideLoading, showAuthError });
