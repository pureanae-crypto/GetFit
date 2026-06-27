let ctx = null;
let pickerYear = new Date().getFullYear();

export function installCalendarHandlers(context) {
  ctx = context;
  window.changeMonth = changeMonth;
  window.openCalendarJump = openCalendarJump;
  window.applyCalendarJump = applyCalendarJump;
  window.jumpToToday = jumpToToday;
  window.calCellClick = calCellClick;
  window.changeCalendarPickerYear = changeCalendarPickerYear;
  window.selectCalendarMonth = selectCalendarMonth;
}

export function renderCalendar() {
  const { calendarYear: year, calendarMonth: month } = ctx.state;
  document.getElementById('cal-month-label').textContent = new Date(year, month, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
  const today = new Date();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = ['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => `<div class="calendar-day-header">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===d;
    const daySessions = ctx.state.sessions.filter(s => s.datetime?.startsWith(dateStr));
    const dots = daySessions.map(s => `<div class="event-dot cell-dot ${calendarDotClass(s)}"></div>`).join('');
    html += `<div class="calendar-cell ${isToday?'today':''}" onclick="calCellClick('${dateStr}')"><div class="cell-num">${d}</div>${dots}</div>`;
  }
  document.getElementById('calendar-grid').innerHTML = html;
}

function calendarDotClass(session) {
  const status = session.status === 'cancelled' ? 'cancelled' : session.status === 'completed' ? 'completed' : 'upcoming';
  const type = session.type === 'personal' ? 'personal' : 'pt';
  return `status-${status} event-type-${type}`;
}

function changeMonth(dir) {
  ctx.state.calendarMonth += dir;
  if (ctx.state.calendarMonth < 0) { ctx.state.calendarMonth = 11; ctx.state.calendarYear--; }
  if (ctx.state.calendarMonth > 11) { ctx.state.calendarMonth = 0; ctx.state.calendarYear++; }
  renderCalendar();
}

function openCalendarJump() {
  pickerYear = ctx.state.calendarYear;
  renderCalendarMonthPicker();
  ctx.openModal('calendar-jump-modal');
}

function renderCalendarMonthPicker() {
  const monthNames = Array.from({ length: 12 }, (_, i) => new Date(pickerYear, i, 1).toLocaleString('en', { month: 'short' }));
  const currentMonth = ctx.state.calendarMonth;
  const currentYear = ctx.state.calendarYear;
  const today = new Date();
  const modal = document.querySelector('#calendar-jump-modal .modal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-header">
      <button class="btn btn-ghost" style="padding:4px 8px;" onclick="changeCalendarPickerYear(-1)">←</button>
      <div class="modal-title" style="flex:1;text-align:center;">${pickerYear}</div>
      <button class="btn btn-ghost" style="padding:4px 8px;" onclick="changeCalendarPickerYear(1)">→</button>
      <button class="btn btn-ghost" style="padding:4px 8px;" onclick="closeModal('calendar-jump-modal')">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:-4px;">
      ${monthNames.map((name, month) => {
        const isSelected = pickerYear === currentYear && month === currentMonth;
        const isCurrentMonth = pickerYear === today.getFullYear() && month === today.getMonth();
        return `<button class="btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-sm" style="height:42px;${isCurrentMonth && !isSelected ? 'border-color:var(--black);' : ''}" onclick="selectCalendarMonth(${month})">${name}</button>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:10px;justify-content:space-between;border-top:1px solid var(--gray-200);padding-top:16px;margin-top:18px;">
      <button class="btn btn-outline btn-sm" onclick="jumpToToday()">Today</button>
      <button class="btn btn-ghost btn-sm" onclick="closeModal('calendar-jump-modal')">Cancel</button>
    </div>`;
}

function changeCalendarPickerYear(dir) {
  pickerYear = Math.min(2100, Math.max(2020, pickerYear + dir));
  renderCalendarMonthPicker();
}

function selectCalendarMonth(month) {
  ctx.state.calendarMonth = Math.min(11, Math.max(0, month));
  ctx.state.calendarYear = Math.min(2100, Math.max(2020, pickerYear));
  ctx.closeModal('calendar-jump-modal');
  renderCalendar();
}

function applyCalendarJump() {
  const monthInput = document.getElementById('jump-month');
  const yearInput = document.getElementById('jump-year');
  if (!monthInput || !yearInput) {
    selectCalendarMonth(ctx.state.calendarMonth);
    return;
  }
  const month = parseInt(monthInput.value, 10);
  const year = parseInt(yearInput.value, 10);
  if (Number.isNaN(month) || Number.isNaN(year)) { ctx.showToast('Choose a month and year'); return; }
  ctx.state.calendarMonth = Math.min(11, Math.max(0, month));
  ctx.state.calendarYear = Math.min(2100, Math.max(2020, year));
  ctx.closeModal('calendar-jump-modal');
  renderCalendar();
}

function jumpToToday() {
  const today = new Date();
  ctx.state.calendarMonth = today.getMonth();
  ctx.state.calendarYear = today.getFullYear();
  ctx.closeModal('calendar-jump-modal');
  renderCalendar();
}

function calCellClick(dateStr) {
  const daySessions = ctx.state.sessions.filter(s => s.datetime?.startsWith(dateStr));
  if (daySessions.length > 0) window.openViewModal(daySessions[0].id);
  else {
    document.getElementById('book-date').value = dateStr;
    window.openBookModal();
  }
}
