import { EXERCISE_DB, CATS } from "./exercises.js";

let ctx = null;
let pickerContext = 'book';
let pickerActiveCat = 'All';
let activeCxNameInput = null;
let focusedWeightInput = null;

export function installExerciseUI(context) {
  ctx = context;
  window.openExercisePicker = openExercisePicker;
  window.setPickerCat = setPickerCat;
  window.filterPicker = renderPickerList;
  window.openCxPicker = openCxPicker;
  window.selectExercise = selectExercise;
  window.closePicker = closePicker;
  window.addExerciseRow = addExerciseRow;
  window.addCompleteExercise = addCompleteExercise;
  window.onCxNameInput = onCxNameInput;
  window.addCxSet = addCxSet;
  window.updateCxVolume = updateCxVolume;
  window.getCxExercises = getCxExercises;
  window.loadCxExercises = loadCxExercises;
  window.refreshSetNumbers = refreshSetNumbers;
  window.adjustFocusedWeight = adjustFocusedWeight;

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
  document.getElementById('exercise-picker-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('exercise-picker-overlay')) closePicker();
  });
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

  return {
    addExerciseRow,
    getExerciseRows,
    getCxExercises,
    loadCxExercises
  };
}

function openExercisePicker(context) {
  pickerContext = context;
  pickerActiveCat = 'All';
  document.getElementById('picker-search-input').value = '';
  renderPickerCats();
  renderPickerList();
  document.getElementById('exercise-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('picker-search-input').focus(), 300);
}

function renderPickerCats() {
  document.getElementById('picker-cats').innerHTML = CATS.map(cat =>
    `<button class="picker-cat ${cat === pickerActiveCat ? 'active' : ''}" onclick="setPickerCat('${cat}')">${cat}</button>`
  ).join('');
}

function setPickerCat(cat) {
  pickerActiveCat = cat;
  renderPickerCats();
  renderPickerList();
}

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

function openCxPicker(btn) {
  activeCxNameInput = btn;
  pickerContext = 'cx';
  pickerActiveCat = 'All';
  document.getElementById('picker-search-input').value = btn.dataset.name || '';
  renderPickerCats();
  renderPickerList();
  document.getElementById('exercise-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('picker-search-input').focus(), 300);
}

function selectExercise(name) {
  const dbEntry = EXERCISE_DB.find(e => e.name === name);
  if (pickerContext === 'cx') {
    const weight = getLastUsedWeight(name);
    if (activeCxNameInput) {
      activeCxNameInput.textContent = name;
      activeCxNameInput.dataset.name = name;
      const block = activeCxNameInput.closest('.cx-block');
      if (weight) block.querySelectorAll('.cx-weight').forEach(el => { if (!el.value) el.value = weight; });
      updateCxVolume();
    } else {
      const block = makeCxBlock(name);
      const setsContainer = block.querySelector('.cx-sets');
      setsContainer.appendChild(makeCxSetRow(weight, ''));
      refreshSetNumbers(block);
      document.getElementById('cx-list').appendChild(block);
      updateCxVolume();
    }
  } else {
    const data = { name, sets: '', reps: '', weight: '', muscles: dbEntry?.muscles || [] };
    addExerciseRow(data, pickerContext === 'book' ? 'exercise-rows' : 'complete-exercise-rows');
  }
  activeCxNameInput = null;
  closePicker();
}

function closePicker() {
  document.getElementById('exercise-picker-overlay').classList.remove('open');
  activeCxNameInput = null;
}

function addExerciseRow(data, containerId = 'exercise-rows') {
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
}

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

function getUsedExerciseNames() {
  const names = new Set();
  ctx.state.sessions.forEach(s => (s.exercises || []).forEach(e => { if (e.name) names.add(e.name); }));
  return [...names].sort();
}

function getLastUsedWeight(name) {
  const done = [...ctx.state.sessions]
    .filter(s => s.status === 'completed' && s.exercises?.length)
    .sort((a, b) => new Date(b.completedAt || b.datetime) - new Date(a.completedAt || a.datetime));
  for (const session of done) {
    for (const exercise of session.exercises) {
      if (exercise.name === name) {
        if (Array.isArray(exercise.sets) && exercise.sets.length) return exercise.sets[exercise.sets.length - 1].weight || '';
        if (exercise.weight) return exercise.weight;
      }
    }
  }
  return '';
}

function updateCxDatalist() {
  const dl = document.getElementById('cx-names');
  if (dl) dl.innerHTML = getUsedExerciseNames().map(n => `<option value="${n}">`).join('');
}

function refreshSetNumbers(block) {
  block.querySelectorAll('.cx-set-num').forEach((el, i) => { el.textContent = i + 1; });
}

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

function addCompleteExercise() {
  activeCxNameInput = null;
  pickerContext = 'cx';
  pickerActiveCat = 'All';
  document.getElementById('picker-search-input').value = '';
  renderPickerCats();
  renderPickerList();
  document.getElementById('exercise-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('picker-search-input').focus(), 300);
}

function onCxNameInput(input) {
  const name = input.value.trim();
  if (!name) return;
  const weight = getLastUsedWeight(name);
  if (weight) {
    const block = input.closest('.cx-block');
    block.querySelectorAll('.cx-weight').forEach(el => { if (!el.value) el.value = weight; });
  }
}

function addCxSet(btn) {
  const block = btn.closest('.cx-block');
  const setsContainer = btn.previousElementSibling;
  const prev = setsContainer.querySelectorAll('.cx-weight');
  const lastWeight = prev.length ? prev[prev.length - 1].value : '';
  const row = makeCxSetRow(lastWeight, '');
  setsContainer.appendChild(row);
  refreshSetNumbers(block);
  row.querySelector('.cx-weight').focus();
  updateCxVolume();
}

function updateCxVolume() {
  const vol = getCxExercises().reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0);
  const el = document.getElementById('cx-volume');
  if (el) el.textContent = `Total volume: ${Math.round(vol)} kg`;
}

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

function loadCxExercises(exercises) {
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
}

function adjustFocusedWeight(delta) {
  if (!focusedWeightInput) return;
  const current = parseFloat(focusedWeightInput.value) || 0;
  focusedWeightInput.value = Math.max(0, current + delta);
  updateCxVolume();
  focusedWeightInput.focus();
}
