let ctx = null;

export function installCalendarHandlers(context) {
  ctx = context;
  window.changeMonth = changeMonth;
  window.openCalendarJump = openCalendarJump;
  window.applyCalendarJump = applyCalendarJump;
  window.jumpToToday = jumpToToday;
  window.calCellClick = calCellClick;
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
  document.getElementById('jump-month').value = ctx.state.calendarMonth;
  document.getElementById('jump-year').value = ctx.state.calendarYear;
  ctx.openModal('calendar-jump-modal');
}

function applyCalendarJump() {
  const month = parseInt(document.getElementById('jump-month').value, 10);
  const year = parseInt(document.getElementById('jump-year').value, 10);
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
