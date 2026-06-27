export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function formatHours(value) {
  return (Math.round((value || 0) * 10) / 10).toFixed(1);
}

export function formatStatHours(value) {
  return `${formatHours(value)}<span class="stat-unit">hrs</span>`;
}

export function formatToday(monthStyle = 'long') {
  return new Date().toLocaleDateString('en', { month: monthStyle, day: 'numeric', year: 'numeric' });
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}

export function formatPackageDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `HKD ${Math.round(amount).toLocaleString()}`;
}
