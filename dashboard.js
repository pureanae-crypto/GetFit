import { sessionCardHTML } from "./sessions.js";

// ===== DASHBOARD =====
export function renderDashboard(ctx) {
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const pkg = ctx.getActivePackage();
  const stats = ctx.getPackageStats(pkg);
  const bookedSessions = ctx.state.sessions
    .filter(s => s.status === 'booked' && (s.type || 'pt') === 'pt' && (!pkg || s.packageId === pkg.id))
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const booked = stats.booked;
  const available = stats.available;
  const bookedSegment = Math.min(booked, Math.max(0, stats.total - stats.completed));

  document.getElementById('hero-remaining').textContent = pkg ? ctx.formatHours(stats.remaining) : '-';
  document.getElementById('balance-as-of').textContent = `As of ${ctx.formatToday('short')}`;
  document.getElementById('balance-booked-hours').textContent = `${ctx.formatHours(booked)} hrs`;
  document.getElementById('balance-available-hours').textContent = `${ctx.formatHours(available)} hrs`;
  document.getElementById('stat-completed').innerHTML = ctx.formatStatHours(stats.completed);
  document.getElementById('stat-upcoming').innerHTML = ctx.formatStatHours(booked);
  document.getElementById('stat-available').innerHTML = ctx.formatStatHours(available);

  const progressSection = document.getElementById('progress-section');
  if (pkg && stats.total > 0) {
    progressSection.style.display = 'block';
    document.getElementById('progress-label').textContent = `Completed ${ctx.formatHours(stats.completed)} · Booked ${ctx.formatHours(booked)} · Remaining ${ctx.formatHours(stats.remaining)} hrs`;
    document.getElementById('progress-completed').style.width = Math.min(100, (stats.completed / stats.total) * 100) + '%';
    document.getElementById('progress-booked').style.width = (bookedSegment / stats.total) * 100 + '%';
    document.getElementById('progress-available').style.width = (available / stats.total) * 100 + '%';
  } else {
    progressSection.style.display = 'none';
  }

  const packageSummary = document.getElementById('overview-package-summary');
  if (packageSummary) {
    if (pkg) {
      const average = stats.total > 0 && pkg.cost ? Number(pkg.cost) / stats.total : 0;
      packageSummary.innerHTML = `
        <div class="overview-package-kicker">Active Package</div>
        <div class="overview-package-main">${escapeHTML(pkg.name || `${ctx.formatHours(stats.total)} hrs Package`)} · ${average ? `${ctx.formatCurrency(average)}/hr` : 'Cost not set'}</div>
        <div class="overview-package-meta">Expires ${ctx.formatPackageDate(pkg.expiry)}</div>`;
    } else {
      packageSummary.innerHTML = `
        <div class="overview-package-kicker">Active Package</div>
        <div class="overview-package-main">No active package</div>
        <div class="overview-package-meta">Add a package to track PT hours and value.</div>`;
    }
  }

  const visibleUpcoming = bookedSessions.slice(0, 5);
  document.getElementById('upcoming-list').innerHTML = bookedSessions.length === 0
    ? `<div class="empty-state upcoming-empty">
        <div class="empty-state-title">No upcoming PT sessions</div>
        <button class="btn btn-primary" onclick="openBookModal()">+ Book PT Session</button>
      </div>`
    : `${visibleUpcoming.map(s => sessionCardHTML(s, { showDelete: true })).join('')}
      <div class="upcoming-actions"><button class="btn btn-primary" onclick="openBookModal()">+ Book PT Session</button></div>`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompleted = ctx.state.sessions
    .filter(s => s.status === 'completed' && (s.type || 'pt') === 'pt' && new Date(s.completedAt || s.datetime) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  document.getElementById('recent-completed-list').innerHTML = recentCompleted.length === 0
    ? `<div class="empty-state"><div class="empty-state-title">No completed sessions in the last 30 days</div></div>`
    : recentCompleted.map(sessionCardHTML).join('');
}
