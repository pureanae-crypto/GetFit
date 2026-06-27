import { escapeHTML, formatCurrency, formatHours, formatPackageDate } from "./utils.js";

let ctx = null;

export function installPackageHandlers(context) {
  ctx = context;
  window.openPackageModal = openPackageModal;
  window.savePackage = savePackage;
  window.setActivePackage = setActivePackage;
  window.deletePackage = deletePackage;
  window.togglePackageDetails = togglePackageDetails;
}

export function getActivePackage() {
  return ctx.state.packages.find(p => p.active) || ctx.state.packages[ctx.state.packages.length - 1] || null;
}

export function getPackageStats(pkg) {
  if (!pkg) return { total: 0, completed: 0, booked: 0, available: 0, remaining: 0 };
  const completedHrs = ctx.state.sessions
    .filter(s => s.packageId === pkg.id && (s.type || 'pt') === 'pt' && s.status === 'completed')
    .reduce((sum, s) => sum + (parseFloat(s.duration) || 1.0), 0);
  const bookedHrs = ctx.state.sessions
    .filter(s => s.packageId === pkg.id && (s.type || 'pt') === 'pt' && s.status === 'booked')
    .reduce((sum, s) => sum + (parseFloat(s.duration) || 1.0), 0);
  const total = parseFloat(pkg.sessions) || 0;
  const completed = Math.round(completedHrs * 10) / 10;
  const booked = Math.round(bookedHrs * 10) / 10;
  const available = Math.round(Math.max(0, total - completedHrs - bookedHrs) * 10) / 10;
  return {
    total,
    completed,
    booked,
    available,
    remaining: Math.round(Math.max(0, total - completedHrs) * 10) / 10
  };
}

export function renderPackages() {
  if (!ctx.state.packages.length) {
    document.getElementById('packages-list').innerHTML = `<div class="empty-state package-empty">
      <div class="empty-state-title">No packages yet</div>
      <button class="btn btn-primary btn-sm" onclick="openPackageModal()">+ New Package</button>
    </div>`;
    return;
  }
  const active = getActivePackage();
  const pastPackages = [...ctx.state.packages]
    .filter(pkg => pkg.id !== active?.id)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  document.getElementById('packages-list').innerHTML = `
    ${active ? renderActivePackage(active) : ''}
    <div class="package-history">
      <div class="package-section-label">Past Packages</div>
      ${pastPackages.length
        ? pastPackages.map(renderPastPackage).join('')
        : '<div class="package-muted">No past packages yet</div>'}
    </div>`;
}

function getPackageFinancials(pkg, stats) {
  const totalCost = Number(pkg.cost) || 0;
  const average = stats.total > 0 ? totalCost / stats.total : 0;
  return {
    average,
    used: average * stats.completed,
    booked: average * stats.booked,
    available: average * stats.available
  };
}

function renderPackageRow(label, value) {
  return `<div class="package-ledger-row"><span>${label}</span><span>${value}</span></div>`;
}

function renderActivePackage(pkg) {
  const stats = getPackageStats(pkg);
  const money = getPackageFinancials(pkg, stats);
  const average = money.average ? `${formatCurrency(money.average)} / hr` : 'Not set';
  return `<section class="package-active">
    <div class="package-section-label">Active Package</div>
    <div class="package-primary-row">
      <div>
        <div class="package-name">${escapeHTML(pkg.name || `${formatHours(stats.total)} hrs Package`)}</div>
        <div class="package-subline">${formatHours(stats.total)} hrs purchased</div>
      </div>
      <div class="package-status">Active</div>
    </div>
    <div class="package-ledger">
      ${renderPackageRow('Total Purchased Hours', `${formatHours(stats.total)} hrs`)}
      ${renderPackageRow('Purchased', formatPackageDate(pkg.date))}
      ${renderPackageRow('Expires', formatPackageDate(pkg.expiry))}
      ${renderPackageRow('Payment', escapeHTML(pkg.payment || 'Not set'))}
      ${renderPackageRow('Total Cost', pkg.cost ? formatCurrency(pkg.cost) : 'Not set')}
      ${renderPackageRow('Average Cost', average)}
    </div>
    <div class="package-columns">
      <div>
        <div class="package-section-label">Usage</div>
        <div class="package-ledger">
          ${renderPackageRow('Completed', `${formatHours(stats.completed)} hrs`)}
          ${renderPackageRow('Booked', `${formatHours(stats.booked)} hrs`)}
          ${renderPackageRow('Available', `${formatHours(stats.available)} hrs`)}
          ${renderPackageRow('Remaining', `${formatHours(stats.remaining)} hrs`)}
        </div>
      </div>
      <div>
        <div class="package-section-label">Value</div>
        <div class="package-ledger">
          ${renderPackageRow('Value Used', formatCurrency(money.used))}
          ${renderPackageRow('Value Booked', formatCurrency(money.booked))}
          ${renderPackageRow('Value Available', formatCurrency(money.available))}
        </div>
      </div>
    </div>
    <div class="package-actions">
      <button class="btn btn-ghost btn-sm" onclick="deletePackage('${pkg.id}')">Delete</button>
    </div>
  </section>`;
}

function renderPastPackage(pkg) {
  const stats = getPackageStats(pkg);
  const money = getPackageFinancials(pkg, stats);
  const average = money.average ? `${formatCurrency(money.average)} / hr` : 'Not set';
  return `<div class="package-history-item" id="package-${pkg.id}">
    <button class="package-history-row" type="button" onclick="togglePackageDetails('${pkg.id}')">
      <span>${escapeHTML(pkg.name || `${formatHours(stats.total)} hrs Package`)}</span>
      <span>${formatPackageDate(pkg.date)}</span>
      <span>${formatHours(stats.remaining)} hrs remaining</span>
    </button>
    <div class="package-history-detail">
      <div class="package-ledger">
        ${renderPackageRow('Total Purchased Hours', `${formatHours(stats.total)} hrs`)}
        ${renderPackageRow('Purchased', formatPackageDate(pkg.date))}
        ${renderPackageRow('Expires', formatPackageDate(pkg.expiry))}
        ${renderPackageRow('Payment', escapeHTML(pkg.payment || 'Not set'))}
        ${renderPackageRow('Total Cost', pkg.cost ? formatCurrency(pkg.cost) : 'Not set')}
        ${renderPackageRow('Average Cost', average)}
        ${renderPackageRow('Completed', `${formatHours(stats.completed)} hrs`)}
        ${renderPackageRow('Booked', `${formatHours(stats.booked)} hrs`)}
        ${renderPackageRow('Available', `${formatHours(stats.available)} hrs`)}
        ${renderPackageRow('Remaining', `${formatHours(stats.remaining)} hrs`)}
        ${renderPackageRow('Value Used', formatCurrency(money.used))}
        ${renderPackageRow('Value Booked', formatCurrency(money.booked))}
        ${renderPackageRow('Value Available', formatCurrency(money.available))}
      </div>
      <div class="package-actions">
        <button class="btn btn-outline btn-sm" onclick="setActivePackage('${pkg.id}')">Set Active</button>
        <button class="btn btn-ghost btn-sm" onclick="deletePackage('${pkg.id}')">Delete</button>
      </div>
    </div>
  </div>`;
}

function togglePackageDetails(id) {
  document.getElementById(`package-${id}`)?.classList.toggle('open');
}

function openPackageModal() {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setMonth(expiry.getMonth() + 6);
  document.getElementById('pkg-date').value = today.toISOString().split('T')[0];
  document.getElementById('pkg-expiry').value = expiry.toISOString().split('T')[0];
  ctx.openModal('package-modal');
}

async function savePackage() {
  const name = document.getElementById('pkg-name').value.trim();
  const sessions = parseFloat(document.getElementById('pkg-sessions').value);
  const date = document.getElementById('pkg-date').value;
  if (!name || !sessions || !date) { ctx.showToast('Please fill in name, date, and total hours'); return; }
  await Promise.all(ctx.state.packages.filter(p => p.active).map(p => ctx.fsSet('packages', p.id, {...p, active:false})));
  const id = ctx.genId();
  await ctx.fsSet('packages', id, {
    name,
    date,
    expiry: document.getElementById('pkg-expiry').value || null,
    sessions,
    cost: document.getElementById('pkg-cost').value || null,
    payment: document.getElementById('pkg-payment').value.trim() || null,
    pt: document.getElementById('pkg-pt').value || null,
    notes: document.getElementById('pkg-notes').value || null,
    active: true
  });
  ctx.closeModal('package-modal');
  ctx.showToast('Package saved & set as active');
  ['pkg-name','pkg-sessions','pkg-cost','pkg-payment','pkg-pt','pkg-notes'].forEach(i => document.getElementById(i).value='');
}

async function setActivePackage(id) {
  await Promise.all(ctx.state.packages.map(p => ctx.fsSet('packages', p.id, {...p, active: p.id===id})));
  ctx.showToast('Active package updated');
}

async function deletePackage(id) {
  if (!confirm('Delete this package?')) return;
  await ctx.fsDel('packages', id);
  ctx.showToast('Package deleted');
}
