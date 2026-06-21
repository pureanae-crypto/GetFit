import { sessionCardHTML } from "./sessions.js";

// ===== DASHBOARD =====
export function renderDashboard(ctx) {
  const pkg = ctx.getActivePackage();
  const stats = ctx.getPackageStats(pkg);
  const bookedSessions = ctx.state.sessions
    .filter(s => s.status === 'booked')
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const bookedHours = bookedSessions.reduce((sum, s) => sum + (parseFloat(s.duration) || 1.0), 0);
  const booked = Math.round(bookedHours * 10) / 10;
  const available = Math.round(Math.max(0, stats.remaining - bookedHours) * 10) / 10;
  const bookedSegment = Math.min(booked, Math.max(0, stats.total - stats.completed));

  document.getElementById('hero-remaining').textContent = pkg ? ctx.formatHours(stats.remaining) : '-';
  document.getElementById('balance-as-of').textContent = `As of ${ctx.formatToday('short')}`;
  document.getElementById('balance-booked-label').textContent = `Booked sessions (${bookedSessions.length})`;
  document.getElementById('balance-booked-hours').textContent = `${ctx.formatHours(booked)} hrs`;
  document.getElementById('balance-available-hours').textContent = `${ctx.formatHours(available)} hrs`;
  document.getElementById('stat-completed').innerHTML = ctx.formatStatHours(stats.completed);
  document.getElementById('stat-upcoming').innerHTML = ctx.formatStatHours(booked);
  document.getElementById('stat-available').innerHTML = ctx.formatStatHours(available);

  const progressSection = document.getElementById('progress-section');
  if (pkg && stats.total > 0) {
    progressSection.style.display = 'block';
    document.getElementById('progress-label').textContent = `${ctx.formatHours(stats.completed)} (${ctx.formatHours(booked)}) / ${stats.total} hrs`;
    document.getElementById('progress-completed').style.width = Math.min(100, (stats.completed / stats.total) * 100) + '%';
    document.getElementById('progress-booked').style.width = (bookedSegment / stats.total) * 100 + '%';
    document.getElementById('progress-available').style.width = (available / stats.total) * 100 + '%';
  } else {
    progressSection.style.display = 'none';
  }

  const visibleUpcoming = bookedSessions.slice(0, 5);
  document.getElementById('upcoming-list').innerHTML = bookedSessions.length === 0
    ? `<div class="empty-state upcoming-empty">
        <div class="empty-state-title">No upcoming sessions</div>
        <button class="btn btn-primary" onclick="openBookModal()">+ Book Session</button>
      </div>`
    : `${visibleUpcoming.map(sessionCardHTML).join('')}
      <div class="upcoming-actions"><button class="btn btn-primary" onclick="openBookModal()">+ Book Session</button></div>`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompleted = ctx.state.sessions
    .filter(s => s.status === 'completed' && new Date(s.completedAt || s.datetime) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  document.getElementById('recent-completed-list').innerHTML = recentCompleted.length === 0
    ? `<div class="empty-state"><div class="empty-state-title">No completed sessions in the last 30 days</div></div>`
    : recentCompleted.map(sessionCardHTML).join('');
}
