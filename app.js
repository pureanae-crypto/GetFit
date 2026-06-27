import { configureFirebase, initAuth, subscribeAppData, fsSet, fsDel } from "./firebase.js";
import { renderDashboard as renderDashboardView } from "./dashboard.js";
import { installSessionHandlers } from "./sessions.js";
import { installLogHandlers, renderLog as renderLogView } from "./log.js";
import { installCalendarHandlers, renderCalendar as renderCalendarView } from "./calendar.js";
import { installExerciseUI } from "./exercise-ui.js";
import { getActivePackage, getPackageStats, installPackageHandlers, renderPackages as renderPackagesView } from "./packages.js";
import { formatCurrency, formatHours, formatPackageDate, formatStatHours, formatToday, genId } from "./utils.js";

// ===== STATE =====
const state = {
  packages: [],
  sessions: [],
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  completingSessionId: null
};

// ===== APP START =====
function hideLoading() {
  document.getElementById('loading-screen').style.display = 'none';
}

function showAuthError(msg) {
  document.getElementById('auth-error').textContent = msg;
}

function startApp() {
  subscribeAppData(state, { hideLoading, renderDashboard, rerenderActive });
}

function rerenderActive() {
  const active = document.querySelector('.view.active');
  if (!active) return;
  const id = active.id;
  if (id === 'view-dashboard') renderDashboard();
  if (id === 'view-calendar') renderCalendarView();
  if (id === 'view-log') renderLog();
  if (id === 'view-packages') renderPackagesView();
}

// ===== VIEWS =====
window.showView = function(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  ['dashboard','calendar','log','packages'].forEach((viewName, i) => {
    if (viewName === name) document.querySelectorAll('.nav-tab')[i].classList.add('active');
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'calendar') renderCalendarView();
  if (name === 'log') renderLog();
  if (name === 'packages') renderPackagesView();
};

function renderDashboard() {
  renderDashboardView({
    state,
    getActivePackage,
    getPackageStats,
    formatHours,
    formatStatHours,
    formatToday,
    formatPackageDate,
    formatCurrency
  });
}

function renderLog() {
  renderLogView({ state });
}

// ===== MODAL HELPERS =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('open');
  });
});

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.style.display = 'none', 2800);
}
window.showToast = showToast;

// ===== MODULE SETUP =====
const moduleContext = {
  state,
  fsSet,
  fsDel,
  genId,
  getActivePackage,
  openModal,
  closeModal,
  showToast,
  rerenderActive
};

installCalendarHandlers(moduleContext);
installPackageHandlers(moduleContext);
installLogHandlers(moduleContext);
const exerciseUI = installExerciseUI({ state });
installSessionHandlers({
  ...moduleContext,
  getExerciseRows: exerciseUI.getExerciseRows,
  addExerciseRow: exerciseUI.addExerciseRow,
  getCxExercises: exerciseUI.getCxExercises,
  loadCxExercises: exerciseUI.loadCxExercises
});

configureFirebase({ showToast });
initAuth({ startApp, hideLoading, showAuthError });
