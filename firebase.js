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

export function initAuth({ startApp, hideLoading, showAuthError }) {
  onAuthStateChanged(auth, (user) => {
    if (user && ALLOWED_EMAILS.includes(user.email)) {
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('nav-user-email').textContent = user.email;
      startApp();
    } else if (user) {
      signOut(auth);
      hideLoading();
      document.getElementById('auth-screen').classList.remove('hidden');
      showAuthError('This Google account is not authorised.');
    } else {
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
}

let toastHandler = () => {};

export function configureFirebase({ showToast }) {
  toastHandler = showToast || toastHandler;
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

export async function fsSet(collName, id, data) {
  setSyncStatus('syncing');
  try { await setDoc(doc(db, collName, id), data); setSyncStatus('synced'); }
  catch(e) { setSyncStatus('error'); toastHandler('Save failed — check connection'); throw e; }
}
export async function fsDel(collName, id) {
  setSyncStatus('syncing');
  try { await deleteDoc(doc(db, collName, id)); setSyncStatus('synced'); }
  catch(e) { setSyncStatus('error'); toastHandler('Delete failed'); throw e; }
}

// ===== START APP (only called after auth) =====
export function subscribeAppData(state, { hideLoading, renderDashboard, rerenderActive }) {
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
