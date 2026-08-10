/** Shared formatting. Dates are shown the way a librarian reads a date slip. */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${formatDate(value)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Whole days from now until the date. Negative means it has passed. */
export const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(value); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

/** "Due in 3 days" / "4 days overdue" — always says which side of the line. */
export const dueLabel = (value) => {
  const d = daysUntil(value);
  if (d === null) return '—';
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
};

export const money = (amount, currency = 'LKR') =>
  amount === null || amount === undefined
    ? '—'
    : `${currency} ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/**
 * The classification colour for a Dewey number. This is what makes the spine
 * labels a real system rather than decoration: 500s are always the same colour
 * on every screen, exactly as coloured tape works on a physical shelf.
 */
export const deweyClass = (dewey) => {
  const n = Math.floor(Number(String(dewey ?? '').split('.')[0]) / 100) * 100;
  const map = {
    0: 'var(--color-dewey-000)', 100: 'var(--color-dewey-100)', 200: 'var(--color-dewey-200)',
    300: 'var(--color-dewey-300)', 400: 'var(--color-dewey-400)', 500: 'var(--color-dewey-500)',
    600: 'var(--color-dewey-600)', 700: 'var(--color-dewey-700)', 800: 'var(--color-dewey-800)',
    900: 'var(--color-dewey-900)',
  };
  return map[Number.isNaN(n) ? 0 : n] ?? map[0];
};

export const DEWEY_RANGES = [
  ['000', 'General & computing'], ['100', 'Philosophy'], ['200', 'Religion'],
  ['300', 'Social sciences'], ['400', 'Language'], ['500', 'Science'],
  ['600', 'Technology'], ['700', 'Arts'], ['800', 'Literature'], ['900', 'History'],
];
