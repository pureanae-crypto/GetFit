import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ===== FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyD-s7p744xyj8LfS_pPL-KYMTsicBmdbAM",
  authDomain: "getfit-73277.firebaseapp.com",
  projectId: "getfit-73277",
  storageBucket: "getfit-73277.firebasestorage.app",
  messagingSenderId: "703281196969",
  appId: "1:703281196969:web:c64192870978e2f7035eb8",
  measurementId: "G-BY3DVLTC03"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ===== AUTH =====
const ALLOWED_EMAILS = [
  'pureanae@gmail.com',
  'alexanderholam@gmail.com'
];

function hideLoading() { document.getElementById('loading-screen').style.display = 'none'; }
function showAuthError(msg) { document.getElementById('auth-error').textContent = msg; }

onAuthStateChanged(auth, (user) => {
  if (user && ALLOWED_EMAILS.includes(user.email)) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('nav-user-email').textContent = user.email;
    startApp();
  } else if (user) {
    // Signed in but not the allowed account
    signOut(auth);
    hideLoading();
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthError('This Google account is not authorised.');
  } else {
    // Not signed in
    hideLoading();
    document.getElementById('auth-screen').classList.remove('hidden');
  }
});

document.getElementById('sign-in-btn').addEventListener('click', async () => {
  const btn = document.getElementById('sign-in-btn');
  btn.disabled = true;
  showAuthError('');
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged handles the rest
  } catch (e) {
    btn.disabled = false;
    if (e.code !== 'auth/popup-closed-by-user') {
      showAuthError('Sign-in failed. Please try again.');
    }
  }
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
  signOut(auth);
});

// ===== STATE =====
let state = {
  packages: [], sessions: [],
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  completingSessionId: null
};
let currentEditId = null;
let pickerContext = 'book';
let pickerActiveCat = 'All';

// ===== EXERCISE DATABASE =====
const EXERCISE_DB = [
  { name:'Hip Thrust', cat:'Glutes', icon:'🍑', muscles:['gluteal','hamstring'] },
  { name:'Romanian Deadlift', cat:'Glutes', icon:'🍑', muscles:['hamstring','gluteal','lower-back'] },
  { name:'Cable Kickback', cat:'Glutes', icon:'🍑', muscles:['gluteal'] },
  { name:'Machine Standing Hip Abduction', cat:'Glutes', icon:'🍑', muscles:['abductors','gluteal'] },
  { name:'Machine Seated Hip Abduction', cat:'Glutes', icon:'🍑', muscles:['abductors','gluteal'] },
  { name:'Single Leg Cable Kickback', cat:'Glutes', icon:'🍑', muscles:['gluteal','hamstring'] },
  { name:'Sumo Squat', cat:'Glutes', icon:'🍑', muscles:['gluteal','quadriceps','adductors'] },
  { name:'Hip Abduction Machine', cat:'Glutes', icon:'🍑', muscles:['abductors','gluteal'] },
  { name:'Glute Bridge', cat:'Glutes', icon:'🍑', muscles:['gluteal','hamstring'] },
  { name:'Donkey Kick', cat:'Glutes', icon:'🍑', muscles:['gluteal'] },
  { name:'Squat', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal','hamstring'] },
  { name:'Leg Press', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal','hamstring'] },
  { name:'Leg Extension', cat:'Legs', icon:'🦵', muscles:['quadriceps'] },
  { name:'Leg Curl', cat:'Legs', icon:'🦵', muscles:['hamstring'] },
  { name:'Walking Lunge', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal','hamstring'] },
  { name:'Reverse Lunge', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal'] },
  { name:'Bulgarian Split Squat', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal'] },
  { name:'Hack Squat', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal'] },
  { name:'Goblet Squat', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal'] },
  { name:'Calf Raise', cat:'Legs', icon:'🦵', muscles:['calves'] },
  { name:'Seated Calf Raise', cat:'Legs', icon:'🦵', muscles:['calves'] },
  { name:'Lying Leg Curl', cat:'Legs', icon:'🦵', muscles:['hamstring'] },
  { name:'Standing Leg Curl', cat:'Legs', icon:'🦵', muscles:['hamstring'] },
  { name:'Adductor Machine', cat:'Legs', icon:'🦵', muscles:['adductors'] },
  { name:'Step Up', cat:'Legs', icon:'🦵', muscles:['quadriceps','gluteal'] },
  { name:'Lat Pulldown', cat:'Back', icon:'🏋️', muscles:['lats','biceps'] },
  { name:'Seated Cable Row', cat:'Back', icon:'🏋️', muscles:['lats','rhomboids','biceps'] },
  { name:'Bent Over Row', cat:'Back', icon:'🏋️', muscles:['lats','rhomboids','rear-deltoids'] },
  { name:'T-Bar Row', cat:'Back', icon:'🏋️', muscles:['lats','rhomboids'] },
  { name:'Deadlift', cat:'Back', icon:'🏋️', muscles:['lower-back','gluteal','hamstring','traps'] },
  { name:'Pull Up', cat:'Back', icon:'🏋️', muscles:['lats','biceps'] },
  { name:'Chin Up', cat:'Back', icon:'🏋️', muscles:['lats','biceps'] },
  { name:'Cable Straight Arm Pulldown', cat:'Back', icon:'🏋️', muscles:['lats'] },
  { name:'Single Arm Dumbbell Row', cat:'Back', icon:'🏋️', muscles:['lats','rhomboids'] },
  { name:'Smith Machine Row', cat:'Back', icon:'🏋️', muscles:['lats','rhomboids'] },
  { name:'Face Pull', cat:'Back', icon:'🏋️', muscles:['rear-deltoids','traps'] },
  { name:'Hyperextension', cat:'Back', icon:'🏋️', muscles:['lower-back','gluteal'] },
  { name:'Good Morning', cat:'Back', icon:'🏋️', muscles:['lower-back','hamstring'] },
  { name:'Barbell Row', cat:'Back', icon:'🏋️', muscles:['lats','rhomboids','biceps'] },
  { name:'Barbell Bench Press', cat:'Chest', icon:'💪', muscles:['chest','triceps','front-deltoids'] },
  { name:'Dumbbell Bench Press', cat:'Chest', icon:'💪', muscles:['chest','triceps','front-deltoids'] },
  { name:'Incline Bench Press', cat:'Chest', icon:'💪', muscles:['chest','front-deltoids','triceps'] },
  { name:'Decline Bench Press', cat:'Chest', icon:'💪', muscles:['chest','triceps'] },
  { name:'Machine Chest Press', cat:'Chest', icon:'💪', muscles:['chest','triceps'] },
  { name:'Cable Fly', cat:'Chest', icon:'💪', muscles:['chest'] },
  { name:'Pec Deck Fly', cat:'Chest', icon:'💪', muscles:['chest'] },
  { name:'Dumbbell Fly', cat:'Chest', icon:'💪', muscles:['chest'] },
  { name:'Push Up', cat:'Chest', icon:'💪', muscles:['chest','triceps','front-deltoids'] },
  { name:'Dip', cat:'Chest', icon:'💪', muscles:['chest','triceps'] },
  { name:'Overhead Press', cat:'Shoulders', icon:'🔝', muscles:['front-deltoids','side-deltoids','triceps'] },
  { name:'Dumbbell Shoulder Press', cat:'Shoulders', icon:'🔝', muscles:['front-deltoids','side-deltoids','triceps'] },
  { name:'Lateral Raise', cat:'Shoulders', icon:'🔝', muscles:['side-deltoids'] },
  { name:'Dumbbell Seated Lateral Raise', cat:'Shoulders', icon:'🔝', muscles:['side-deltoids'] },
  { name:'Front Raise', cat:'Shoulders', icon:'🔝', muscles:['front-deltoids'] },
  { name:'Rear Delt Fly', cat:'Shoulders', icon:'🔝', muscles:['rear-deltoids'] },
  { name:'Arnold Press', cat:'Shoulders', icon:'🔝', muscles:['front-deltoids','side-deltoids','rear-deltoids'] },
  { name:'Upright Row', cat:'Shoulders', icon:'🔝', muscles:['side-deltoids','traps'] },
  { name:'Cable Lateral Raise', cat:'Shoulders', icon:'🔝', muscles:['side-deltoids'] },
  { name:'Machine Shoulder Press', cat:'Shoulders', icon:'🔝', muscles:['front-deltoids','side-deltoids'] },
  { name:'Barbell Curl', cat:'Arms', icon:'💪', muscles:['biceps'] },
  { name:'Dumbbell Curl', cat:'Arms', icon:'💪', muscles:['biceps'] },
  { name:'Hammer Curl', cat:'Arms', icon:'💪', muscles:['biceps'] },
  { name:'Preacher Curl', cat:'Arms', icon:'💪', muscles:['biceps'] },
  { name:'Cable Curl', cat:'Arms', icon:'💪', muscles:['biceps'] },
  { name:'Concentration Curl', cat:'Arms', icon:'💪', muscles:['biceps'] },
  { name:'Tricep Pushdown', cat:'Arms', icon:'💪', muscles:['triceps'] },
  { name:'Skull Crusher', cat:'Arms', icon:'💪', muscles:['triceps'] },
  { name:'Overhead Tricep Extension', cat:'Arms', icon:'💪', muscles:['triceps'] },
  { name:'Cable Tricep Kickback', cat:'Arms', icon:'💪', muscles:['triceps'] },
  { name:'Close Grip Bench Press', cat:'Arms', icon:'💪', muscles:['triceps','chest'] },
  { name:'Wrist Curl', cat:'Arms', icon:'💪', muscles:['forearm'] },
  { name:'Plank', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Crunch', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Cable Crunch', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Leg Raise', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Russian Twist', cat:'Core', icon:'🔥', muscles:['abs','obliques'] },
  { name:'Side Plank', cat:'Core', icon:'🔥', muscles:['obliques'] },
  { name:'Ab Rollout', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Hanging Leg Raise', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Mountain Climber', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Dead Bug', cat:'Core', icon:'🔥', muscles:['abs'] },
  { name:'Power Clean', cat:'Full Body', icon:'⚡', muscles:['quadriceps','gluteal','hamstring','traps','lower-back'] },
  { name:'Kettlebell Swing', cat:'Full Body', icon:'⚡', muscles:['gluteal','hamstring','lower-back'] },
  { name:'Burpee', cat:'Full Body', icon:'⚡', muscles:['chest','quadriceps','abs'] },
  { name:'Treadmill', cat:'Cardio', icon:'🏃', muscles:['quadriceps','calves','hamstring'] },
  { name:'Elliptical', cat:'Cardio', icon:'🏃', muscles:['quadriceps','hamstring','calves'] },
  { name:'Rowing Machine', cat:'Cardio', icon:'🏃', muscles:['lats','rhomboids','biceps','quadriceps'] },
  { name:'Stair Climber', cat:'Cardio', icon:'🏃', muscles:['gluteal','quadriceps','calves'] },
  { name:'Battle Ropes', cat:'Cardio', icon:'🏃', muscles:['front-deltoids','side-deltoids','abs'] },
];

const CATS = ['All', ...new Set(EXERCISE_DB.map(e => e.cat))];

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

// ===== SYNC UI =====
function setSyncStatus(status) {
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  const ind = document.getElementById('sync-indicator');
  dot.className = 'sync-dot ' + status;
  label.textContent = { syncing: 'Saving...', synced: 'Synced', error: 'Offline' }[status] || '';
  ind.classList.add('visible');
  if (status === 'synced') setTimeout(() => ind.classList.remove('visible'), 2000);
}

async function fsSet(collName, id, data) {
  setSyncStatus('syncing');
  try { await setDoc(doc(db, collName, id), data); setSyncStatus('synced'); }
  catch(e) { setSyncStatus('error'); showToast('Save failed — check connection'); throw e; }
}
async function fsDel(collName, id) {
  setSyncStatus('syncing');
  try { await deleteDoc(doc(db, collName, id)); setSyncStatus('synced'); }
  catch(e) { setSyncStatus('error'); showToast('Delete failed'); throw e; }
}

function rerenderActive() {
  const active = document.querySelector('.view.active');
  if (!active) return;
  const id = active.id;
  if (id === 'view-dashboard') renderDashboard();
  if (id === 'view-calendar') renderCalendar();
  if (id === 'view-log') renderLog();
  if (id === 'view-packages') renderPackages();
}

// ===== START APP (only called after auth) =====
function startApp() {
  let packagesLoaded = false, sessionsLoaded = false;
  function checkLoaded() {
    if (packagesLoaded && sessionsLoaded) { hideLoading(); renderDashboard(); }
  }
  onSnapshot(collection(db, 'sessions'), snap => {
    state.sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    sessionsLoaded = true; checkLoaded(); rerenderActive();
  });
  onSnapshot(collection(db, 'packages'), snap => {
    state.packages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    packagesLoaded = true; checkLoaded(); rerenderActive();
  });
  setTimeout(hideLoading, 4000);
}

// ===== UTILS =====
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getActivePackage() { return state.packages.find(p => p.active) || state.packages[state.packages.length - 1] || null; }
function formatHours(value) { return (Math.round((value || 0) * 10) / 10).toFixed(1); }
function formatStatHours(value) { return `${formatHours(value)}<span class="stat-unit">hrs</span>`; }
function formatToday() { return new Date().toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }); }
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
  const pkg = getActivePackage();
  const stats = getPackageStats(pkg);
  const bookedSessions = state.sessions
    .filter(s => s.status === 'booked')
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const bookedHours = bookedSessions.reduce((sum, s) => sum + (parseFloat(s.duration) || 1.0), 0);
  const booked = Math.round(bookedHours * 10) / 10;
  const available = Math.round(Math.max(0, stats.remaining - bookedHours) * 10) / 10;
  const bookedSegment = Math.min(booked, Math.max(0, stats.total - stats.completed));
  const committed = Math.round((stats.completed + booked) * 10) / 10;

  document.getElementById('hero-remaining').textContent = pkg ? formatHours(stats.remaining) : '—';
  document.getElementById('hero-package-name').textContent = formatToday();
  document.getElementById('balance-booked-label').textContent = `Booked sessions (${bookedSessions.length})`;
  document.getElementById('balance-booked-hours').textContent = `${formatHours(booked)} hrs`;
  document.getElementById('balance-available-hours').textContent = `${formatHours(available)} hrs`;
  document.getElementById('stat-completed').innerHTML = formatStatHours(stats.completed);
  document.getElementById('stat-upcoming').innerHTML = formatStatHours(booked);
  document.getElementById('stat-available').innerHTML = formatStatHours(available);
  const progressSection = document.getElementById('progress-section');
  if (pkg && stats.total > 0) {
    progressSection.style.display = 'block';
    document.getElementById('progress-label').textContent = `${formatHours(stats.completed)} (${formatHours(committed)}) / ${stats.total} hrs`;
    document.getElementById('progress-completed').style.width = Math.min(100, (stats.completed / stats.total) * 100) + '%';
    document.getElementById('progress-booked').style.width = (bookedSegment / stats.total) * 100 + '%';
    document.getElementById('progress-available').style.width = (available / stats.total) * 100 + '%';
  } else { progressSection.style.display = 'none'; }
  const visibleUpcoming = bookedSessions.slice(0, 5);
  document.getElementById('upcoming-list').innerHTML = bookedSessions.length === 0
    ? `<div class="empty-state"><div class="empty-state-title">No upcoming sessions</div></div>`
    : visibleUpcoming.map(sessionCardHTML).join('');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompleted = state.sessions
    .filter(s => s.status === 'completed' && new Date(s.completedAt || s.datetime) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  document.getElementById('recent-completed-list').innerHTML = recentCompleted.length === 0
    ? `<div class="empty-state"><div class="empty-state-title">No completed sessions in the last 30 days</div></div>`
    : recentCompleted.map(sessionCardHTML).join('');
}

function sessionCardHTML(s) {
  const dt = new Date(s.datetime);
  const day = dt.getDate();
  const month = dt.toLocaleString('en', { month: 'short' }).toUpperCase();
  const time = dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const dur = s.duration ? ` · ${s.duration} hr` : '';
  const loc = s.location ? ` · ${s.location}` : '';
  const notes = s.notes || (s.exercises?.length ? `${s.exercises.length} exercise${s.exercises.length > 1 ? 's' : ''} logged` : '');
  const badge = { booked: '<span class="badge badge-pending">Upcoming</span>', completed: '<span class="badge badge-done">Done</span>', cancelled: '<span class="badge badge-cancelled">Cancelled</span>' }[s.status] || '';
  const actions = s.status === 'booked'
    ? `<button class="btn btn-ghost btn-sm" onclick="openCompleteModal('${s.id}')">✓ Complete</button>
       <button class="btn btn-ghost btn-sm" onclick="openEditModal('${s.id}')">Edit</button>
       <button class="btn btn-ghost btn-sm" onclick="exportSingleICS('${s.id}')">↓ .ics</button>`
    : `<button class="btn btn-ghost btn-sm" onclick="openViewModal('${s.id}')">View</button>`;
  return `<div class="session-card ${s.status === 'completed' ? 'completed' : ''}">
    <div class="session-date-block"><div class="session-day">${day}</div><div class="session-month">${month}</div></div>
    <div class="session-info">
      <div class="session-time">${time}${dur}${loc}</div>
      ${notes ? `<div class="session-notes">${notes}</div>` : ''}
    </div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">${badge}${actions}</div>
  </div>`;
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
  if (s.status === 'completed' || new Date(s.datetime) < new Date()) return 'completed-dot';
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
window.calCellClick = function(dateStr) {
  const daySessions = state.sessions.filter(s => s.datetime?.startsWith(dateStr));
  if (daySessions.length > 0) openViewModal(daySessions[0].id);
  else { document.getElementById('book-date').value = dateStr; openBookModal(); }
};

// ===== LOG =====
function renderLog() {
  const sorted = [...state.sessions].sort((a,b) => new Date(b.datetime) - new Date(a.datetime));
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
    `<div class="picker-item" onclick="selectExercise(${JSON.stringify(ex.name)})">
      <div class="picker-item-icon">${ex.icon}</div>
      <div class="picker-item-info">
        <div class="picker-item-name">${ex.name}</div>
        <div class="picker-item-muscles">${ex.muscles.map(m => m.replace(/-/g,' ')).join(', ')}</div>
      </div>
    </div>`
  ).join('');
}

window.selectExercise = function(name) {
  const db_entry = EXERCISE_DB.find(e => e.name === name);
  const data = { name, sets: '', reps: '', weight: '', muscles: db_entry?.muscles || [] };
  if (pickerContext === 'book') addExerciseRow(data, 'exercise-rows');
  else addExerciseRow(data, 'complete-exercise-rows');
  closePicker();
};

window.closePicker = function() { document.getElementById('exercise-picker-overlay').classList.remove('open'); };
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

// ===== BOOK SESSION =====
window.openBookModal = function() {
  currentEditId = null;
  document.getElementById('book-modal-title').textContent = 'Book Session';
  document.getElementById('book-save-btn').textContent = 'Save Session';
  document.getElementById('export-ics-btn').style.display = 'none';
  document.getElementById('ics-notice').style.display = 'none';
  if (!document.getElementById('book-date').value)
    document.getElementById('book-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('exercise-rows').innerHTML = '';
  openModal('book-modal');
};

window.openEditModal = function(id) {
  const s = state.sessions.find(x => x.id === id);
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
  (s.exercises || []).forEach(e => addExerciseRow(e, 'exercise-rows'));
  openModal('book-modal');
};

window.saveSession = async function() {
  const date = document.getElementById('book-date').value;
  const time = document.getElementById('book-time').value;
  if (!date) { showToast('Please select a date'); return; }
  const datetime = `${date}T${time||'10:00'}`;
  const pkg = getActivePackage();
  const id = currentEditId || genId();
  const existing = currentEditId ? state.sessions.find(x => x.id === currentEditId) : null;
  const sessionData = {
    datetime, duration: document.getElementById('book-duration').value,
    location: document.getElementById('book-location').value,
    notes: document.getElementById('book-notes').value,
    exercises: getExerciseRows('exercise-rows'),
    status: existing?.status || 'booked',
    packageId: existing?.packageId || (pkg ? pkg.id : null),
    completionNotes: existing?.completionNotes || null,
    completedAt: existing?.completedAt || null,
  };
  await fsSet('sessions', id, sessionData);
  closeModal('book-modal');
  showToast(currentEditId ? 'Session updated' : 'Session booked');
};

// ===== COMPLETE =====
window.openCompleteModal = function(id) {
  state.completingSessionId = id;
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  const dt = new Date(s.datetime);
  document.getElementById('complete-session-info').textContent =
    dt.toLocaleDateString('en', { weekday:'long', day:'numeric', month:'long' }) + ' at ' +
    dt.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' });
  document.getElementById('complete-exercise-rows').innerHTML = '';
  (s.exercises || []).forEach(e => addExerciseRow(e, 'complete-exercise-rows'));
  document.getElementById('complete-notes').value = s.completionNotes || '';
  openModal('complete-modal');
};

window.confirmComplete = async function() {
  const s = state.sessions.find(x => x.id === state.completingSessionId);
  if (!s) return;
  const exercises = getExerciseRows('complete-exercise-rows');
  await fsSet('sessions', s.id, { ...s, status: 'completed', exercises, completionNotes: document.getElementById('complete-notes').value, completedAt: new Date().toISOString() });
  closeModal('complete-modal');
  showToast('Session completed ✓');
};

// ===== VIEW SESSION =====
window.openViewModal = function(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  const dt = new Date(s.datetime);
  const pkg = state.packages.find(p => p.id === s.packageId);
  const exercises = s.exercises || [];
  const intensityMap = buildMuscleIntensity(exercises);
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
        ${buildMuscleSVG(intensityMap, 'front')}
        ${buildMuscleSVG(intensityMap, 'back')}
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
  openModal('view-modal');
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

// ===== SESSION ACTIONS =====
window.cancelSession = async function(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  const startsAt = new Date(s.datetime);
  const hoursUntilStart = (startsAt - new Date()) / 36e5;
  if (hoursUntilStart >= 0 && hoursUntilStart <= 2) {
    await fsSet('sessions', id, {...s, status:'cancelled'});
    closeModal('view-modal');
    rerenderActive();
    showToast('Session cancelled');
  } else {
    await fsDel('sessions', id);
    closeModal('view-modal');
    rerenderActive();
    showToast('Session deleted');
  }
};
window.deleteSession = async function(id) {
  if (!confirm('Delete this session permanently?')) return;
  await fsDel('sessions', id);
  closeModal('view-modal');
  rerenderActive();
  showToast('Session deleted');
};

// ===== ICS =====
function buildICS(s) {
  const dt = new Date(s.datetime);
  const end = new Date(dt.getTime() + (parseFloat(s.duration)||1.5)*3600000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const desc = [s.notes, s.exercises?.map(e=>`${e.name} ${e.sets}x${e.reps} @ ${e.weight}kg`).join('; ')].filter(Boolean).join(' | ');
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PT Tracker//EN\r\nBEGIN:VEVENT\r\nUID:${s.id}@pttracker\r\nDTSTAMP:${fmt(new Date())}\r\nDTSTART:${fmt(dt)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:PT Session${s.location?' @ '+s.location:''}\r\n${desc?'DESCRIPTION:'+desc+'\r\n':''}${s.location?'LOCATION:'+s.location+'\r\n':''}END:VEVENT\r\nEND:VCALENDAR`;
}
window.exportSingleICS = function(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  const blob = new Blob([buildICS(s)], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `pt-session-${new Date(s.datetime).toISOString().split('T')[0]}.ics`; a.click();
  showToast('.ics downloaded');
};
window.exportICS = function() { if (currentEditId) exportSingleICS(currentEditId); };

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
