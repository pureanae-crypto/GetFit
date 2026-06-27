import { sessionCardHTML } from "./sessions.js";

// ===== DASHBOARD =====
export function renderDashboard(ctx) {
  const pkg = ctx.getActivePackage();
  const stats = ctx.getPackageStats(pkg);
  const bookedSessions = ctx.state.sessions
    .filter(s => s.status === 'booked' && (s.type || 'pt') === 'pt' && (!pkg || s.packageId === pkg.id))
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const todaySession = bookedSessions.find(s => isToday(new Date(s.datetime)));
  const booked = stats.booked;
  const available = stats.available;
  const bookedSegment = Math.min(booked, Math.max(0, stats.total - stats.completed));

  document.getElementById('hero-remaining').textContent = pkg ? ctx.formatHours(stats.remaining) : '-';
  document.getElementById('balance-as-of').textContent = `As of ${ctx.formatToday('short')}`;
  document.getElementById('today-focus').textContent = todaySession
    ? `${formatSessionTime(todaySession)} · ${todaySession.duration || '1.0'} hr PT session`
    : nextSessionText(bookedSessions[0]);
  const balanceBreakdown = document.querySelector('.balance-breakdown');
  if (balanceBreakdown) balanceBreakdown.style.display = '';
  document.getElementById('balance-booked-count').textContent = `(${bookedSessions.length})`;
  document.getElementById('balance-booked-hours').textContent = `${ctx.formatHours(booked)} hrs`;
  document.getElementById('balance-available-hours').textContent = `${ctx.formatHours(available)} hrs`;
  const packageSummary = document.getElementById('overview-package-summary');
  if (packageSummary) packageSummary.style.display = 'none';
  document.getElementById('stat-completed').innerHTML = ctx.formatStatHours(stats.completed);
  document.getElementById('stat-upcoming').innerHTML = ctx.formatStatHours(booked);
  document.getElementById('stat-available').innerHTML = ctx.formatStatHours(available);

  const progressSection = document.getElementById('progress-section');
  if (pkg && stats.total > 0) {
    progressSection.style.display = 'block';
    const usedPercent = Math.min(100, Math.round((stats.completed / stats.total) * 100));
    const bookedPercent = Math.min(100, Math.round((bookedSegment / stats.total) * 100));
    const availablePercent = Math.max(0, 100 - usedPercent - bookedPercent);
    document.getElementById('progress-label').textContent = `${bookedPercent}% booked · ${availablePercent}% available`;
    document.getElementById('progress-completed').style.width = Math.min(100, (stats.completed / stats.total) * 100) + '%';
    document.getElementById('progress-booked').style.width = (bookedSegment / stats.total) * 100 + '%';
    document.getElementById('progress-available').style.width = (available / stats.total) * 100 + '%';
  } else {
    progressSection.style.display = 'none';
  }

  const visibleUpcoming = bookedSessions.slice(0, 5);
  document.getElementById('upcoming-list').innerHTML = bookedSessions.length === 0
    ? `<div class="empty-state upcoming-empty">
        <div class="empty-state-title">No upcoming PT sessions</div>
        <button class="btn btn-primary" onclick="openBookModal()">+ Book PT Session</button>
      </div>`
    : `${visibleUpcoming.map(s => sessionCardHTML(s, { showDelete: true })).join('')}
      <div class="upcoming-actions"><button class="btn btn-primary" onclick="openBookModal()">+ Book PT Session</button></div>`;

  const insight = buildWeeklyInsight(ctx.state.sessions);
  document.getElementById('weekly-insight').innerHTML = `
    <div class="section-label">Weekly Insight</div>
    <div class="insight-title">${insight.title}</div>
    <div class="insight-copy">${insight.copy}</div>
    <div class="insight-meta">${insight.meta}</div>`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompleted = ctx.state.sessions
    .filter(s => s.status === 'completed' && (s.type || 'pt') === 'pt' && new Date(s.completedAt || s.datetime) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  document.getElementById('recent-completed-list').innerHTML = recentCompleted.length === 0
    ? `<div class="empty-state"><div class="empty-state-title">No workouts yet</div><div class="empty-state-sub">Start your first session →</div></div>`
    : recentCompleted.map(sessionCardHTML).join('');
}

function isToday(date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function formatSessionTime(session) {
  return new Date(session.datetime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function nextSessionText(session) {
  if (!session) return 'Ready for your next session';
  const date = new Date(session.datetime);
  const label = date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  return `Next PT: ${label} at ${formatSessionTime(session)}`;
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function sessionVolume(session) {
  if (Number.isFinite(Number(session.totalVolume))) return Number(session.totalVolume);
  return (session.exercises || []).reduce((sum, exercise) => {
    if (!Array.isArray(exercise.sets)) return sum;
    return sum + exercise.sets.reduce((setSum, set) => setSum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
  }, 0);
}

function buildWeeklyInsight(sessions) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const completed = sessions.filter(s => s.status === 'completed');
  const thisWeek = completed.filter(s => new Date(s.completedAt || s.datetime) >= weekStart);
  const lastWeek = completed.filter(s => {
    const date = new Date(s.completedAt || s.datetime);
    return date >= lastWeekStart && date < weekStart;
  });
  const volume = thisWeek.reduce((sum, session) => sum + sessionVolume(session), 0);
  const lastVolume = lastWeek.reduce((sum, session) => sum + sessionVolume(session), 0);
  const muscleCounts = {};
  thisWeek.forEach(session => (session.exercises || []).forEach(exercise => {
    (exercise.muscles || []).forEach(muscle => {
      const label = muscle.replace(/-/g, ' ');
      muscleCounts[label] = (muscleCounts[label] || 0) + 1;
    });
  }));
  const topMuscle = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!thisWeek.length) {
    return { title: 'No workouts yet', copy: 'Start your first session →', meta: 'This week is still open.' };
  }
  const change = lastVolume ? Math.round(((volume - lastVolume) / lastVolume) * 100) : 0;
  const changeText = lastVolume ? `${change >= 0 ? '+' : ''}${change}% vs last week` : 'First tracked week';
  return {
    title: `${thisWeek.length} workout${thisWeek.length === 1 ? '' : 's'} this week`,
    copy: `${Math.round(volume).toLocaleString()} kg volume · ${changeText}`,
    meta: topMuscle ? `Most trained: ${topMuscle}` : 'Keep the rhythm steady.'
  };
}
